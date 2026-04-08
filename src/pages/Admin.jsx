// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import {
  createEventsBatch,
  deleteFutureSeriesEvents,
  listEvents,
  updateFutureSeriesEvents,
  upsertEvent,
  deleteEvent as deleteEventRow,
} from "../services/events";
import { listAllTours } from "../services/tours";

// ----------------------------- Timezone helpers (America/Chicago) -----------------------------
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
  return (asUTC - date.getTime()) / 60000;
}

/** Given "YYYY-MM-DDTHH:mm" wall-time in Central, return UTC ISO string. */
function chicagoLocalInputToUTCISO(localStr) {
  if (!localStr) return null;
  const [datePart, timePart] = localStr.split("T");
  const [y, m, d] = datePart.split("-").map((n) => Number(n));
  const [hh, mm] = (timePart || "00:00").split(":").map((n) => Number(n));
  const pretendUTC = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const offsetMin = getZoneOffsetMinutes(pretendUTC, CHICAGO_TZ);
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

const STATUS_OPTIONS = ["new", "contacted", "scheduled", "completed", "cancelled"];
const BOOKING_PAYMENT_STATUS_OPTIONS = ["pending", "processing", "paid", "cancelled"];
const WEEKDAY_OPTIONS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

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
function formatMoney(cents, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((Number(cents || 0)) / 100);
}
function buildBookingMailto(row) {
  const subj = `Be Still Crossville — booking ${row.booking_reference || ""}`;
  const body = `Hi ${row.customer_name || "there"},

I’m following up on your booking for "${row.tour_title || "your outing"}" scheduled for ${
    row.requested_dates || "your selected date"
  }.

— Be Still Crossville
https://stillcrossville.com`;
  return `mailto:${row.customer_email}?subject=${enc(subj)}&body=${enc(body)}`;
}
function buildBookingSms(row) {
  const msg = `Hi ${row.customer_name || ""} — this is Be Still Crossville following up about your booking for "${
    row.tour_title || "your outing"
  }".`;
  return `sms:${row.customer_phone}?&body=${enc(msg)}`;
}

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
function CapacityMeter({ capacity, booked }) {
  const total = Number(capacity || 0);
  const used = Number(booked || 0);
  if (!total) return <span className="text-xs text-black/50">No capacity set</span>;

  const pct = Math.min((used / total) * 100, 100);
  const tone =
    used >= total ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="w-full max-w-[220px]">
      <div className="mb-1 flex items-center justify-between text-xs text-black/60">
        <span>{used} booked</span>
        <span>{Math.max(total - used, 0)} left</span>
      </div>
      <div className="h-2 rounded-full bg-black/10 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
function localDateTimePartsToUTCISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return chicagoLocalInputToUTCISO(`${dateStr}T${timeStr}`);
}
function buildRecurringInstances(series, existingEvents) {
  const start = series.start_date ? new Date(`${series.start_date}T00:00:00`) : null;
  const end = series.end_date ? new Date(`${series.end_date}T00:00:00`) : null;
  if (!start || !end || start > end) return [];

  const weekdays = new Set((series.weekdays || []).map(Number));
  if (weekdays.size === 0) return [];

  const existingKeys = new Set(
    (existingEvents || []).map((ev) => `${ev.tour_id || (ev.tour || ev.title || "").trim().toLowerCase()}|${ev.start_at}`)
  );

  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!weekdays.has(d.getDay())) continue;

    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const startISO = localDateTimePartsToUTCISO(dateStr, series.start_time);
    const endISO = localDateTimePartsToUTCISO(dateStr, series.end_time);
    if (!startISO || !endISO) continue;

    const identity = series.tour_id || (series.tour || series.title || "").trim().toLowerCase();
    const key = `${identity}|${startISO}`;
    out.push({
      title: series.title.trim() || null,
      tour: series.tour.trim(),
      tour_id: series.tour_id || null,
      location: series.location.trim(),
      start_at: startISO,
      end_at: endISO,
      capacity: Number(series.capacity) || null,
      price_per_person:
        series.price_per_person === "" || series.price_per_person == null
          ? null
          : Number(series.price_per_person),
      is_public: !!series.is_public,
      checkout_enabled: !!series.checkout_enabled,
      description: series.description.trim(),
      series_id: series.series_id || null,
      duplicate: existingKeys.has(key),
      preview_key: key,
    });
  }

  return out;
}

// ----------------------------- Admin Page -----------------------------
export default function Admin() {
  const [tab, setTab] = useState("bookings"); // "bookings" | "signups" | "events" | "tours"

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-brand.heron">Admin</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTab("bookings")}
            className={
              "px-3 py-1.5 rounded-lg border " +
              (tab === "bookings"
                ? "border-brand.heron bg-brand.water/20 text-brand.heron"
                : "border-black/10 hover:bg-black/5")
            }
          >
            Bookings
          </button>
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
          <button
            onClick={() => setTab("tours")}
            className={
              "px-3 py-1.5 rounded-lg border " +
              (tab === "tours"
                ? "border-brand.heron bg-brand.water/20 text-brand.heron"
                : "border-black/10 hover:bg-black/5")
            }
          >
            Tours
          </button>
        </div>
      </div>

      {tab === "bookings" ? <BookingsPanel /> : tab === "signups" ? <SignupsPanel /> : tab === "events" ? <EventsPanel /> : <ToursPanel />}
    </section>
  );
}

function BookingsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("bookings")
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
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    setSavingId(id);
    setError("");

    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: row.payment_status || "pending",
        ...(patchOverride || {}),
      })
      .eq("id", id);

    if (error) setError(error.message);
    setSavingId(null);
  }

  async function changeBookingStatus(id, value) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, payment_status: value } : row)));
    await saveRow(id, { payment_status: value });
  }

  const filtered = useMemo(() => {
    let out = rows;
    if (filter !== "all") out = out.filter((r) => (r.payment_status || "pending") === filter);
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((r) =>
        [
          r.booking_reference,
          r.customer_name,
          r.customer_email,
          r.customer_phone,
          r.tour_title,
          r.event_title,
          r.requested_dates,
          r.notes,
          r.payment_status,
        ]
          .join(" | ")
          .toLowerCase()
          .includes(needle)
      );
    }
    return out;
  }, [rows, filter, q]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, row) => {
        acc.count += 1;
        acc.guests += Number(row.party_size || 0);
        if (row.payment_status === "paid") acc.revenue += Number(row.total_amount || 0);
        return acc;
      },
      { count: 0, guests: 0, revenue: 0 }
    );
  }, [filtered]);

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
          title="Filter by payment status"
        >
          <option value="all">All payments</option>
          {BOOKING_PAYMENT_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search booking ref, guest, email, tour…"
          className="flex-1 min-w-[220px] rounded-xl border border-black/10 px-3 py-2"
        />
      </div>

      <p className="mb-4 text-sm text-black/60">
        Bookings are paid or reserved tour records. Contact form and freeform interest submissions stay in the Signups tab.
      </p>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <div className="text-xs text-black/60">Bookings shown</div>
          <div className="mt-1 text-2xl font-semibold text-brand.heron">{summary.count}</div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <div className="text-xs text-black/60">Guests shown</div>
          <div className="mt-1 text-2xl font-semibold text-brand.heron">{summary.guests}</div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <div className="text-xs text-black/60">Paid revenue shown</div>
          <div className="mt-1 text-2xl font-semibold text-brand.heron">{formatMoney(summary.revenue)}</div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-sm text-black/60">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-black/60">No bookings found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <div key={row.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-brand.heron">
                      {row.booking_reference || "Booking"}
                    </div>
                    <span className="rounded-full bg-brand.water/20 px-2 py-1 text-xs text-brand.heron">
                      {row.payment_status || "pending"}
                    </span>
                    <span className="rounded-full bg-black/5 px-2 py-1 text-xs text-black/70">
                      {formatMoney(row.total_amount, row.currency)}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-black/80">
                    {row.customer_name || "Guest"} • {row.party_size || 0} guest{Number(row.party_size || 0) === 1 ? "" : "s"}
                  </div>
                  <div className="text-sm text-black/70">
                    {row.tour_title || "Untitled outing"}
                    {row.event_title ? ` • ${row.event_title}` : ""}
                  </div>
                  <div className="text-sm text-black/70">
                    {row.requested_dates || "No date"}{row.paid_at ? ` • paid ${formatCentral(row.paid_at)}` : ""}
                  </div>
                  <div className="text-xs text-black/60 mt-1">
                    Created {row.created_at ? formatCentral(row.created_at) : "—"}
                    {row.unit_amount != null ? ` • ${formatMoney(row.unit_amount, row.currency)} each` : ""}
                  </div>
                  {row.notes && (
                    <div className="mt-2 rounded-lg border border-black/10 bg-black/[0.02] p-2 text-sm text-black/70 whitespace-pre-wrap">
                      {row.notes}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-wrap gap-2 md:justify-end">
                  <select
                    className="rounded-lg border border-black/10 px-2 py-1 text-sm"
                    value={row.payment_status || "pending"}
                    onChange={(e) => changeBookingStatus(row.id, e.target.value)}
                  >
                    {BOOKING_PAYMENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {savingId === row.id && (
                    <span className="px-3 py-1.5 text-sm text-black/50">Saving…</span>
                  )}
                  {row.customer_email && (
                    <a
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      href={buildBookingMailto(row)}
                    >
                      Email
                    </a>
                  )}
                  {row.customer_phone && (
                    <a
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      href={`tel:${row.customer_phone}`}
                    >
                      Call
                    </a>
                  )}
                  {row.customer_phone && (
                    <a
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      href={buildBookingSms(row)}
                    >
                      SMS
                    </a>
                  )}
                  {row.customer_email && (
                    <button
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          [
                            row.booking_reference,
                            row.customer_name,
                            row.customer_email,
                            row.customer_phone,
                            row.tour_title,
                            row.event_title,
                            row.requested_dates,
                            row.payment_status,
                          ]
                            .filter(Boolean)
                            .join(" | ")
                        )
                      }
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
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

  async function changeSignupStatus(id, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: value } : r)));
    await saveRow(id, { status: value });
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

      <p className="mb-4 text-sm text-black/60">
        Signups are manual inquiries and freeform requests. Stripe checkout reservations appear in the Bookings tab.
      </p>

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
                      onChange={(e) => changeSignupStatus(r.id, e.target.value)}
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
                        {savingId === r.id ? "Saving…" : "Save note"}
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
    tour_id: "",
    location: "",
    start_at: "",
    end_at: "",
    capacity: 8,
    price_per_person: "",
    is_public: true,
    checkout_enabled: true,
    description: "",
  };

  const [events, setEvents] = useState([]);
  const [tourOptions, setTourOptions] = useState([]);
  const [bookingCounts, setBookingCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("single");
  const [editing, setEditing] = useState(null); // id or 'new'
  const [form, setForm] = useState(emptyEvent);
  const [seriesEditTarget, setSeriesEditTarget] = useState(null);
  const [seriesForm, setSeriesForm] = useState({
    series_id: "",
    title: "",
    tour: "",
    tour_id: "",
    location: "",
    start_date: "",
    end_date: "",
    start_time: "18:00",
    end_time: "20:00",
    weekdays: [2, 4],
    capacity: 8,
    price_per_person: 30,
    is_public: true,
    checkout_enabled: true,
    description: "",
  });
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [data, toursData, bookingRows] = await Promise.all([
        listEvents(),
        listAllTours(),
        supabase
          .from("bookings")
          .select("event_id,party_size,payment_status")
          .not("event_id", "is", null)
          .in("payment_status", ["pending", "processing", "paid"]),
      ]);
      setEvents(data);
      setTourOptions(toursData);
      if (bookingRows.error) throw new Error(bookingRows.error.message);
      const counts = (bookingRows.data || []).reduce((acc, row) => {
        const key = row.event_id;
        acc[key] = (acc[key] || 0) + Number(row.party_size || 0);
        return acc;
      }, {});
      setBookingCounts(counts);
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
    setMode("single");
    setEditing("new");
    setForm({ ...emptyEvent });
  }
  function startEdit(ev) {
    setMode("single");
    setSeriesEditTarget(null);
    setEditing(ev.id);
      setForm({
        id: ev.id,
        title: ev.title || "",
        tour: ev.tour || "",
        tour_id: ev.tour_id || "",
        location: ev.location || "",
        start_at: ev.start_at ? centralISOToLocalInput(ev.start_at) : "",
        end_at: ev.end_at ? centralISOToLocalInput(ev.end_at) : "",
        capacity: ev.capacity ?? 8,
        price_per_person: ev.price_per_person ?? "",
        is_public: !!ev.is_public,
        checkout_enabled: ev.checkout_enabled !== false,
        description: ev.description || "",
      });
  }
  function cancelEdit() {
    setEditing(null);
    setForm(emptyEvent);
    setSeriesEditTarget(null);
  }

  function startEditFutureSeries(ev) {
    setMode("single");
    setEditing(`series-future-${ev.id}`);
    setSeriesEditTarget(ev);
    setForm({
      id: ev.id,
      title: ev.title || "",
      tour: ev.tour || "",
      tour_id: ev.tour_id || "",
      location: ev.location || "",
      start_at: ev.start_at ? centralISOToLocalInput(ev.start_at) : "",
      end_at: ev.end_at ? centralISOToLocalInput(ev.end_at) : "",
      capacity: ev.capacity ?? 8,
      price_per_person: ev.price_per_person ?? "",
      is_public: !!ev.is_public,
      checkout_enabled: ev.checkout_enabled !== false,
      description: ev.description || "",
    });
  }

  const recurringPreview = useMemo(
    () => buildRecurringInstances(seriesForm, events),
    [events, seriesForm]
  );

  const recurringReady = recurringPreview.filter((item) => !item.duplicate);

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
      .replace(", ", "T");
    return parts.slice(0, 16);
  }

  function handleSelectTour(tourId) {
    const selected = tourOptions.find((tour) => tour.id === tourId);
    setForm((current) => ({
      ...current,
      tour_id: tourId,
      tour: selected?.title || current.tour,
    }));
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        ...form,
        tour_id: form.tour_id || null,
        start_at: form.start_at ? chicagoLocalInputToUTCISO(form.start_at) : null,
        end_at: form.end_at ? chicagoLocalInputToUTCISO(form.end_at) : null,
        capacity: Number(form.capacity) || null,
        price_per_person:
          form.price_per_person === "" || form.price_per_person == null
            ? null
            : Number(form.price_per_person),
        checkout_enabled: !!form.checkout_enabled,
      };
      if (seriesEditTarget?.series_id) {
        const updated = await updateFutureSeriesEvents({
          seriesId: seriesEditTarget.series_id,
          fromStartAt: seriesEditTarget.start_at,
          patch: {
            title: payload.title,
            tour: payload.tour,
            tour_id: payload.tour_id,
            location: payload.location,
            capacity: payload.capacity,
            price_per_person: payload.price_per_person,
            is_public: payload.is_public,
            checkout_enabled: payload.checkout_enabled,
            description: payload.description,
          },
        });
        const updatedById = new Map(updated.map((item) => [item.id, item]));
        setEvents((prev) => prev.map((item) => updatedById.get(item.id) || item));
      } else {
        const saved = await upsertEvent(payload);
        if (editing === "new") {
          setEvents((prev) => [saved, ...prev]);
        } else {
          setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
        }
      }
      cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteFutureSeries(ev) {
    if (!ev.series_id) return;
    if (!confirm("Delete this event and all future events in the series?")) return;
    setErr("");
    try {
      const deleted = await deleteFutureSeriesEvents({
        seriesId: ev.series_id,
        fromStartAt: ev.start_at,
      });
      const ids = new Set((deleted || []).map((item) => item.id));
      setEvents((prev) => prev.filter((item) => !ids.has(item.id)));
      if (seriesEditTarget?.series_id === ev.series_id) cancelEdit();
    } catch (e) {
      setErr(e.message || "Failed to delete future series events");
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

  async function createRecurringSeries() {
    setSaving(true);
    setErr("");
    try {
      if (!seriesForm.tour.trim()) throw new Error("Recurring series needs a tour label.");
      if (!seriesForm.start_date || !seriesForm.end_date) throw new Error("Choose a start and end date.");
      if (!seriesForm.start_time || !seriesForm.end_time) throw new Error("Choose start and end times.");
      if (seriesForm.weekdays.length === 0) throw new Error("Choose at least one weekday.");
      if (recurringReady.length === 0) throw new Error("No new recurring events to create.");

      const seriesId = crypto.randomUUID();
      const previewWithSeries = buildRecurringInstances(
        { ...seriesForm, series_id: seriesId },
        events
      );
      const rows = previewWithSeries
        .filter((item) => !item.duplicate)
        .map(({ duplicate, preview_key, ...item }) => item);
      const created = await createEventsBatch(rows);
      setEvents((prev) => [...created, ...prev]);
      setMode("single");
      setEditing(null);
    } catch (e) {
      setErr(e.message || "Failed to create recurring events");
    } finally {
      setSaving(false);
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
          <button
            className="px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5"
            onClick={() => {
              setMode("series");
              setEditing("series");
            }}
          >
            + Recurring series
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
                      {ev.price_per_person != null ? ` • $${Number(ev.price_per_person).toFixed(2)}/person` : ""}
                      {ev.capacity ? ` • cap ${ev.capacity}` : ""}
                      {ev.series_id ? ` • series ${String(ev.series_id).slice(0, 8)}` : ""}
                      {ev.is_public ? " • public" : " • private"}
                      {ev.checkout_enabled === false ? " • checkout off" : " • checkout on"}
                    </div>
                    <div className="mt-2">
                      <CapacityMeter capacity={ev.capacity} booked={bookingCounts[ev.id] || 0} />
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      onClick={() => startEdit(ev)}
                    >
                      Edit
                    </button>
                    {ev.series_id && (
                      <button
                        className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                        onClick={() => startEditFutureSeries(ev)}
                      >
                        Edit future
                      </button>
                    )}
                    <button
                      className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                      onClick={() => onDelete(ev.id)}
                    >
                      Delete
                    </button>
                    {ev.series_id && (
                      <button
                        className="px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5"
                        onClick={() => onDeleteFutureSeries(ev)}
                      >
                        Delete future
                      </button>
                    )}
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
          {editing
            ? editing === "new"
              ? "New event"
              : editing === "series"
              ? "Recurring series"
              : seriesEditTarget
              ? "Edit future series events"
              : "Edit event"
            : "Event editor"}
        </h2>

        {!editing ? (
          <p className="text-sm text-black/60">Choose an event to edit, or click “New event”.</p>
        ) : mode === "series" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Title (optional public title)"
                value={seriesForm.title}
                onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
                placeholder="e.g., Sunset Kayak — Meadow Park Lake"
              />
              <label className="block">
                <span className="text-xs text-black/60">Tour</span>
                <select
                  className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1"
                  value={seriesForm.tour_id}
                  onChange={(e) => {
                    const selected = tourOptions.find((tour) => tour.id === e.target.value);
                    setSeriesForm({
                      ...seriesForm,
                      tour_id: e.target.value,
                      tour: selected?.title || "",
                    });
                  }}
                >
                  <option value="">Choose a tour</option>
                  {tourOptions.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Input
              label="Location"
              value={seriesForm.location}
              onChange={(e) => setSeriesForm({ ...seriesForm, location: e.target.value })}
              placeholder="e.g., Meadow Park Lake"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Start date"
                type="date"
                value={seriesForm.start_date}
                onChange={(e) => setSeriesForm({ ...seriesForm, start_date: e.target.value })}
              />
              <Input
                label="End date"
                type="date"
                value={seriesForm.end_date}
                onChange={(e) => setSeriesForm({ ...seriesForm, end_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Start time (Central)"
                type="time"
                value={seriesForm.start_time}
                onChange={(e) => setSeriesForm({ ...seriesForm, start_time: e.target.value })}
              />
              <Input
                label="End time (Central)"
                type="time"
                value={seriesForm.end_time}
                onChange={(e) => setSeriesForm({ ...seriesForm, end_time: e.target.value })}
              />
            </div>

            <div>
              <span className="text-xs text-black/60">Weekdays</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => {
                  const active = seriesForm.weekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() =>
                        setSeriesForm((current) => ({
                          ...current,
                          weekdays: active
                            ? current.weekdays.filter((v) => v !== day.value)
                            : [...current.weekdays, day.value].sort(),
                        }))
                      }
                      className={
                        "px-3 py-1.5 rounded-lg text-sm border " +
                        (active
                          ? "border-brand.heron bg-brand.water/20 text-brand.heron"
                          : "border-black/10 hover:bg-black/5")
                      }
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Capacity"
                type="number"
                min={1}
                value={seriesForm.capacity}
                onChange={(e) => setSeriesForm({ ...seriesForm, capacity: e.target.value })}
              />
              <Input
                label="Price per person"
                type="number"
                min={0}
                step="0.01"
                value={seriesForm.price_per_person}
                onChange={(e) => setSeriesForm({ ...seriesForm, price_per_person: e.target.value })}
                placeholder="Blank uses tour price"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="mt-6">
                <Checkbox
                  label="Public (show on site)"
                  checked={seriesForm.is_public}
                  onChange={(e) => setSeriesForm({ ...seriesForm, is_public: e.target.checked })}
                />
              </div>
              <div className="mt-6">
                <Checkbox
                  label="Enable checkout"
                  checked={seriesForm.checkout_enabled}
                  onChange={(e) => setSeriesForm({ ...seriesForm, checkout_enabled: e.target.checked })}
                />
              </div>
            </div>

            <Textarea
              label="Description"
              rows={3}
              value={seriesForm.description}
              onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
              placeholder="Optional details repeated for every event in the series…"
            />

            <div className="rounded-xl border border-black/10 p-3">
              <div className="font-medium text-brand.heron">Preview</div>
              <div className="mt-1 text-sm text-black/60">
                {recurringReady.length} new event{recurringReady.length === 1 ? "" : "s"} ready to create
                {recurringPreview.length > recurringReady.length
                  ? ` • ${recurringPreview.length - recurringReady.length} duplicate${recurringPreview.length - recurringReady.length === 1 ? "" : "s"} skipped`
                  : ""}
              </div>
              <div className="mt-3 max-h-56 overflow-auto space-y-2">
                {recurringPreview.length === 0 ? (
                  <p className="text-sm text-black/50">Set the date range and weekdays to preview events.</p>
                ) : (
                  recurringPreview.map((item) => (
                    <div
                      key={item.preview_key}
                      className={
                        "rounded-lg border px-3 py-2 text-sm " +
                        (item.duplicate
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-black/10 bg-white text-black/70")
                      }
                    >
                      {formatCentral(item.start_at)}
                      {item.end_at ? ` – ${formatCentral(item.end_at)}` : ""}
                      {item.duplicate ? " • duplicate" : ""}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-brand-heron text-white hover:opacity-90 disabled:opacity-60"
                onClick={createRecurringSeries}
                disabled={saving}
              >
                {saving ? "Creating…" : `Create ${recurringReady.length} events`}
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5"
                onClick={() => {
                  setMode("single");
                  cancelEdit();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              label="Title (shown publicly if provided)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Sunset Kayak — Meadow Park Lake"
            />
            <label className="block">
              <span className="text-xs text-black/60">Tour</span>
              <select
                className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1"
                value={form.tour_id}
                onChange={(e) => handleSelectTour(e.target.value)}
              >
                <option value="">Choose a tour</option>
                {tourOptions.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.title}
                  </option>
                ))}
              </select>
            </label>
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
              <Input
                label="Event price per person (optional)"
                type="number"
                min={0}
                step="0.01"
                value={form.price_per_person}
                onChange={(e) => setForm({ ...form, price_per_person: e.target.value })}
                placeholder="Uses tour price if blank"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="mt-6">
                <Checkbox
                  label="Public (show on site)"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                />
              </div>
              <div className="mt-6">
                <Checkbox
                  label="Enable checkout"
                  checked={form.checkout_enabled}
                  onChange={(e) => setForm({ ...form, checkout_enabled: e.target.checked })}
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
                {saving ? "Saving…" : seriesEditTarget ? "Save future events" : "Save event"}
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

// ----------------------------- TOURS PANEL (catalog) -----------------------------
const TOUR_CATEGORIES = [
  "Kayak",
  "Paddle Board",
  "Hike",
  "Walk",
  "Camping",
  "Backpacking",
  "Seasonal",
  "Other",
];

function ToursPanel() {
  const empty = {
    id: undefined,
    title: "",
    description: "",
    category: "Hike",
    tags: "",
    is_public: true,
    sort_order: 100,
    price_per_person: 30,
    max_party_size: 8,
    checkout_enabled: true,
  };

  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // id or 'new'
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("tours")
      .select("id,title,description,category,tags,is_public,sort_order,price_per_person,max_party_size,checkout_enabled,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    setTours(data || []);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setEditing("new");
    setForm({ ...empty });
  }
  function startEdit(row) {
    setEditing(row.id);
    setForm({
      id: row.id,
      title: row.title || "",
      description: row.description || "",
      category: row.category || "Hike",
      tags: (row.tags || []).join(", "),
      is_public: !!row.is_public,
      sort_order: row.sort_order ?? 100,
      price_per_person: row.price_per_person ?? 0,
      max_party_size: row.max_party_size ?? 8,
      checkout_enabled: row.checkout_enabled !== false,
    });
  }
  function cancel() {
    setEditing(null);
    setForm(empty);
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        id: form.id || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        is_public: !!form.is_public,
        sort_order: Number(form.sort_order) || 100,
        price_per_person: Number(form.price_per_person) || 0,
        max_party_size: Number(form.max_party_size) || 8,
        checkout_enabled: !!form.checkout_enabled,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const { data, error } = await supabase.from("tours").upsert(payload).select().single();
      if (error) throw new Error(error.message);
      if (editing === "new") {
        setTours((prev) => [data, ...prev]);
      } else {
        setTours((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      }
      cancel();
    } catch (e) {
      setErr(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this tour?")) return;
    setErr("");
    const { error } = await supabase.from("tours").delete().eq("id", id);
    if (error) setErr(error.message);
    setTours((prev) => prev.filter((t) => t.id !== id));
    if (editing && editing !== "new" && editing === id) cancel();
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Left: list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5" onClick={refresh}>
            Refresh
          </button>
          <button className="px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5" onClick={startNew}>
            + New tour
          </button>
        </div>
        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        {loading ? (
          <p className="text-sm text-black/60">Loading…</p>
        ) : tours.length === 0 ? (
          <p className="text-sm text-black/60">No tours yet.</p>
        ) : (
          <div className="space-y-3">
            {tours.map((t) => (
              <div key={t.id} className="rounded-xl border border-black/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-brand.heron truncate">{t.title}</div>
                    <div className="text-xs text-black/60">
                      {t.category} • {(t.tags || []).join(" • ")} {t.is_public ? "• public" : "• private"}
                      {typeof t.sort_order === "number" ? ` • sort ${t.sort_order}` : ""}
                      {typeof t.price_per_person === "number" ? ` • $${Number(t.price_per_person).toFixed(2)}/person` : ""}
                      {typeof t.max_party_size === "number" ? ` • max ${t.max_party_size}` : ""}
                      {t.checkout_enabled === false ? " • checkout off" : " • checkout on"}
                    </div>
                    {t.description && <p className="text-sm text-black/70 mt-1">{t.description}</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg border hover:bg-black/5" onClick={() => startEdit(t)}>
                      Edit
                    </button>
                    <button className="px-3 py-1.5 rounded-lg border hover:bg-black/5" onClick={() => remove(t.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: editor */}
      <div className="card">
        <h2 className="font-semibold text-brand.heron mb-3">
          {editing ? (editing === "new" ? "New tour" : "Edit tour") : "Tour editor"}
        </h2>

        {!editing ? (
          <p className="text-sm text-black/60">Choose a tour to edit, or click “New tour”.</p>
        ) : (
          <div className="space-y-3">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Sunset Kayak – Meadow Park Lake"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-black/60">Category</span>
                <select
                  className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {TOUR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Sort order (lower first)"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Price per person (USD)"
                type="number"
                min="0"
                step="0.01"
                value={form.price_per_person}
                onChange={(e) => setForm({ ...form, price_per_person: e.target.value })}
              />
              <Input
                label="Max party size"
                type="number"
                min="1"
                value={form.max_party_size}
                onChange={(e) => setForm({ ...form, max_party_size: e.target.value })}
              />
            </div>
            <Input
              label="Tags (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Easy, Sunset, Water"
            />
            <div className="mt-1">
              <Checkbox
                label="Public (show on site)"
                checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
              />
            </div>
            <div className="mt-1">
              <Checkbox
                label="Enable checkout"
                checked={form.checkout_enabled}
                onChange={(e) => setForm({ ...form, checkout_enabled: e.target.checked })}
              />
            </div>
            <Textarea
              label="Description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description visitors will see…"
            />
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-brand-heron text-white hover:opacity-90 disabled:opacity-60"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save tour"}
              </button>
              <button className="px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5" onClick={cancel}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
