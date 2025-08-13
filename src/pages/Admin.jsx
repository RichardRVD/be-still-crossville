// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

const STATUS_OPTIONS = ["new", "contacted", "scheduled", "completed", "cancelled"];

// tiny helpers for safe link creation
const enc = encodeURIComponent;
function buildMailto(row) {
  const subj = `Be Still Crossville — re: ${row.tour || "your request"}`;
  const body =
`Hi ${row.name || "there"},

Thanks for reaching out to Be Still Crossville. I’m following up about "${row.tour || "your request"}".
(Feel free to reply with the dates that work best and your preferred contact method.)

— Be Still Crossville
https://stillcrossville.com`;
  return `mailto:${row.email}?subject=${enc(subj)}&body=${enc(body)}`;
}
function buildSms(row) {
  const msg =
`Hi ${row.name || ""} — this is Be Still Crossville following up about "${row.tour || "your request"}".`;
  return `sms:${row.phone}?&body=${enc(msg)}`;
}

export default function Admin() {
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
  useEffect(() => { load(); }, []);

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
          r.name, r.email, r.phone, r.tour, r.dates, r.notes, r.admin_note,
        ].join(" | ").toLowerCase().includes(needle)
      );
    }
    return out;
  }, [rows, filter, q]);

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand.heron mb-4">Admin — Signups</h1>

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
            <option key={s} value={s}>{s}</option>
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
                <th className="py-2 pr-3">Tour</th>
                <th className="py-2 pr-3">Dates</th>
                <th className="py-2 pr-3">User notes</th> {/* NEW */}
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Admin note</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-black/5 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-3">{r.name || "—"}</td>
                  <td className="py-2 pr-3">
                    {r.email ? (
                      <a className="underline" href={`mailto:${r.email}`}>{r.email}</a>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-3">{r.phone || "—"}</td>
                  <td className="py-2 pr-3">{r.tour || "—"}</td>
                  <td className="py-2 pr-3">{r.dates || "—"}</td>

                  {/* NEW: User notes column (read-only, with copy) */}
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
                        <option key={s} value={s}>{s}</option>
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
    </section>
  );
}