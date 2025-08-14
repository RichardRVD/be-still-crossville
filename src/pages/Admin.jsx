// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import {
  listEvents,        // ✅ lowercase
  upsertEvent,
  deleteEvent as deleteEventRow,
} from "../services/events";

// ----------------------------- Timezone helpers (America/Chicago) -----------------------------
// Convert a `datetime-local` string (e.g. "2025-08-22T19:00") which is a *wall time in Central*
// into a UTC ISO string for storage in timestamptz.
const CHICAGO_TZ = "America/Chicago";

/** Returns the offset (in minutes) of `date` for a given IANA time zone. */
function getZoneOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  // difference (ms) between "what this instant looks like in tz" and the actual UTC instant
  return (asUTC - date.getTime()) / 60000;
}

/** Given "YYYY-MM-DDTHH:mm" wall-time in Central, return UTC ISO string. */
function chicagoLocalInputToUTCISO(localStr) {
  if (!localStr) return null;
  // Parse naive local-wall time components
  const [datePart, timePart] = localStr.split("T");
  const [y, m, d] = datePart.split("-").map((n) => Number(n));
  const [hh, mm] = (timePart || "00:00").split(":").map((n) => Number(n));

  // Create a UTC date from those components (pretend it's UTC first)
  const pretendUTC = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));

  // Find the offset for that instant *in Central* (accounts for DST automatically)
  const offsetMin = getZoneOffsetMinutes(pretendUTC, CHICAGO_TZ);

  // Real UTC instant = pretendUTC - offset
  const realUTCms = pretendUTC.getTime() - offsetMin * 60 * 1000;
  return new Date(realUTCms).toISOString();
}

/** Format a UTC timestamptz string into a Central-time readable string. */
function formatCentral(iso, opts = {}) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(d);
}

// ----------------------------------------------------------------------------------------------

const STATUS_OPTIONS = ["new", "contacted", "scheduled", "completed", "cancelled"];

// tiny helpers for safe link creation
const enc = encodeURIComponent;
function buildMailto(row) {
  const subj = `Be Still Crossville — re: ${row.tour || "your request"}`;
  const body = `Hi ${row.name || "there"},

Thanks for reaching out to Be Still Crossville. I’m following up about "${
    row.tour || "your request"
  }".
(Feel free to reply with the dates that work best and your preferred contact method.)

— Be Still Crossville
https://stillcrossville.com`;
  return `mailto:${row.email}?subject=${enc(subj)}&body=${enc(body)}`;
}
function buildSms(row) {
  const msg = `Hi ${row.name || ""} — this is Be Still Crossville following up about "${
    row.tour || "your request"
  }".`;
  return `sms:${row.phone}?&body=${enc(msg)}`;
}

// Simple input helpers
function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-xs text-black/60">{label}</span>
      <input
        {...props}
        className={"mt-1 w-full rounded-lg border border-black/10 px-2 py-1 " + (props.className || "")}
      />
    </label>
  );
}
function Textarea({ label, rows = 3, ...props }) {
  return (
    <label className="block">
      <span className="text-xs text-black/60">{label}</span>
      <textarea
        rows={rows}
        {...props}
        className={"mt-1 w-full rounded-lg border border-black/10 px-2 py-1 " + (props.className || "")}
      />
    </label>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" className="rounded border-black/20" checked={!!checked} onChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

// ----------------------------- Admin Page -----------------------------
export default function Admin() {
  const [tab, setTab] = useState("signups"); // "signups" | "events"

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-brand.heron">Admin</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTab("signups")}
            className={
              "px-3 py-1.5 rounded-lg border " +
              (tab === "signups"
                ? "border-brand.heron bg-brand.water/20 text-brand.heron"
                : "border-black/10 hover:bg-black/5")
            }
          >
            Signups
          </button>
          <button
            onClick={() => setTab("events")}
            className={
              "px-3 py-1.5 rounded-lg border " +
              (tab === "events"
                ? "border-brand.heron bg-brand.water/20 text-brand.heron"
                : "border-black/10 hover:bg-black/5")
            }
          >
            Events
          </button>
        </div>
      </div>

      {tab === "signups" ? <SignupsPanel /> : <EventsPanel />}
    </section>
  );
}

// ----------------------------- SIGNUPS PANEL -----------------------------
function SignupsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("signups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function onChangeField(id, field, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function saveRow(id, patchOverride) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setSavingId(id);
    setError("");

    const updatePatch = {
      status: row.status || "new",
      admin_note: row.admin_note || null,
      ...(patchOverride || {}),
    };

    const { error } = await supabase.from("signups").update(updatePatch).eq("id", id);
    if (error) setError(error.message);
    setSavingId(null);
  }

  async function markContacted(id) {
    await saveRow(id, { status: "contacted" });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "contacted" } : r)));
  }

  const filtered = useMemo(() => {
    let out = rows;
    if (filter !== "all") out = out.filter((r) => (r.status || "new") === filter);
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((r) =>
        [
          r.name,
          r.email,
          r.phone,
          r.tour,
          r.dates,
          r.notes,
          r.admin_note,
          r.preferred_contact,
        ]
          .join(" | ")
          .toLowerCase()
          .includes(needle)
      );
    }
    return out;
  }, [rows, filter, q]);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <button className="px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5" onClick={load}>
          Refresh
        </button>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-black/10 px-3 py-2"
          title="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, tour, notes…"
          className="flex-1 min-w-[220px] rounded-xl border border-black/10 px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-sm text-black/60">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-black/60">No signups found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Preferred</th>
                <th className="py-2 pr-3">Tour</th>
                <th className="py-2 pr-3">Dates</th>
                <th className="py-2 pr-3">User notes</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Admin note</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-black/5 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {r.created_at ? formatCentral(r.created_at) : "—"}
                  </td>
                  <td className="py-2 pr-3">{r.name || "—"}</td>
                  <td className="py-2 pr-3">
                    {r.email ? (
                      <a className="underline" href={`mailto:${r.email}`}>
                        {r.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3">{r.phone || "—"}</td>
                  <td className="py-2 pr-3">{r.preferred_contact || "—"}</td>
                  <td className="py-2 pr-3">{r.tour || "—"}</td>
                  <td className="py-2 pr-3">{r.dates || "—"}</td>

                  {/* User notes (read-only, copyable) */}
                  <td className="py-2 pr-3 min-w-[220px] max-w-[360px]">
                    <div className="relative">
                      <div className="rounded-lg border border-black/10 p-2 bg-white whitespace-pre-wrap break-words">
                        {r.notes || "—"}
                      </div>
                      {r.notes && (
                        <button
                          className="mt-1 text-xs underline text-brand.heron"
                          onClick={() => navigator.clipboard?.writeText(r.notes || "")}
                          title="Copy notes"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="py-2 pr-3">
                    <select
                      className="rounded-lg border border-black/10 px-2 py-1"
                      value={r.status || "new"}
                      onChange={(e) => onChangeField(r.id, "status", e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 pr-3">
                    <textarea
                      className="w-64 md:w-80 rounded-lg border border-black/10 px-2 py-1"
                      rows={2}
                      value={r.admin_note || ""}
                      onChange={(e) => onChangeField(r.id, "admin_note", e.target.value)}
                      placeholder="Internal notes…"
                    />
                  </td>

                  <td className="py-2 pr-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5 disabled:opacity-60"
                        onClick={() => saveRow(r.id)}
                        disabled={savingId === r.id}
                        title="Save changes"
                      >
                        {savingId === r.id ? "Saving…" : "Save"}
                      </button>

                      <button
                        className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                        onClick={() => markContacted(r.id)}
                        title="Mark as contacted"
                      >
                        Mark contacted
                      </button>

                      {r.email && (
                        <a
                          className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                          href={buildMailto(r)}
                          title="Email reply"
                        >
                          Email
                        </a>
                      )}
                      {r.phone && (
                        <>
                          <a
                            className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                            href={`tel:${r.phone}`}
                            title="Call"
                          >
                            Call
                          </a>
                          <a
                            className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                            href={buildSms(r)}
                            title="Text message"
                          >
                            SMS
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ----------------------------- EVENTS PANEL -----------------------------
function EventsPanel() {
  const emptyEvent = {
    id: undefined,
    title: "",
    tour: "",
    location: "",
    start_at: "",
    end_at: "",
    capacity: 8,
    is_public: true,
    description: "",
  };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // id or 'new'
  const [form, setForm] = useState(emptyEvent);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await listEvents();
      setEvents(data);
    } catch (e) {
      setErr(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing("new");
    setForm({ ...emptyEvent });
  }
  function startEdit(ev) {
    setEditing(ev.id);
    setForm({
      id: ev.id,
      title: ev.title || "",
      tour: ev.tour || "",
      location: ev.location || "",
      // Convert stored UTC to 'YYYY-MM-DDTHH:mm' shown as Central
      start_at: ev.start_at
        ? centralISOToLocalInput(ev.start_at)
        : "",
      end_at: ev.end_at ? centralISOToLocalInput(ev.end_at) : "",
      capacity: ev.capacity ?? 8,
      is_public: !!ev.is_public,
      description: ev.description || "",
    });
  }
  function cancelEdit() {
    setEditing(null);
    setForm(emptyEvent);
  }

  // Convert UTC ISO to 'YYYY-MM-DDTHH:mm' as Central for the input control
  function centralISOToLocalInput(iso) {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: CHICAGO_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(d)
      .replace(", ", "T"); // "YYYY-MM-DD, HH:mm" -> "YYYY-MM-DDTHH:mm"
    return parts.slice(0, 16);
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        ...form,
        // IMPORTANT: interpret inputs as CENTRAL and convert to UTC ISO
        start_at: form.start_at ? chicagoLocalInputToUTCISO(form.start_at) : null,
        end_at: form.end_at ? chicagoLocalInputToUTCISO(form.end_at) : null,
        capacity: Number(form.capacity) || null,
      };
      const saved = await upsertEvent(payload);
      // merge/refresh
      if (editing === "new") {
        setEvents((prev) => [saved, ...prev]);
      } else {
        setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
      }
      cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this event?")) return;
    setErr("");
    try {
      await deleteEventRow(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (editing && editing !== "new" && editing === id) cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to delete");
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Left: list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5" onClick={load}>
            Refresh
          </button>
          <button className="px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5" onClick={startNew}>
            + New event
          </button>
        </div>
        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        {loading ? (
          <p className="text-sm text-black/60">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-black/60">No events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-black/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-brand.heron truncate">{ev.title || ev.tour || "Untitled"}</div>
                    <div className="text-xs text-black/60">
                      {ev.start_at ? formatCentral(ev.start_at) : "—"}{" "}
                      {ev.end_at ? "– " + formatCentral(ev.end_at) : ""}
                      {ev.location ? ` • ${ev.location}` : ""}
                      {ev.is_public ? " • public" : " • private"}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      onClick={() => startEdit(ev)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      onClick={() => onDelete(ev.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {ev.description && (
                  <p className="mt-2 text-sm text-black/70 whitespace-pre-wrap">{ev.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: editor */}
      <div className="card">
        <h2 className="font-semibold text-brand.heron mb-3">
          {editing ? (editing === "new" ? "New event" : "Edit event") : "Event editor"}
        </h2>

        {!editing ? (
          <p className="text-sm text-black/60">Choose an event to edit, or click “New event”.</p>
        ) : (
          <div className="space-y-3">
            <Input
              label="Title (shown publicly if provided)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Sunset Kayak — Meadow Park Lake"
            />
            <Input
              label="Tour (internal or alternate label)"
              value={form.tour}
              onChange={(e) => setForm({ ...form, tour: e.target.value })}
              placeholder="e.g., Sunset Kayak"
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Meadow Park Lake"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Start (Central time)"
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
              />
              <Input
                label="End (Central time)"
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
              <div className="mt-6">
                <Checkbox
                  label="Public (show on site)"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                />
              </div>
            </div>

            <Textarea
              label="Description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional extra details visitors might see…"
            />

            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-brand-heron text-white hover:opacity-90 disabled:opacity-60"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save event"}
              </button>
              <button className="px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}