// src/components/TourCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listPublicEvents } from "../services/events";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CT_TZ = "America/Chicago";

function parseDateSafe(v) {
  if (!v) return new Date(NaN);
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const s = v.includes("T") ? v : v.replace(" ", "T");
    return new Date(s);
  }
  return new Date(v);
}

function ymdInCT(isoLike) {
  const d = parseDateSafe(isoLike);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const Y = parts.find((p) => p.type === "year")?.value;
  const M = parts.find((p) => p.type === "month")?.value;
  const D = parts.find((p) => p.type === "day")?.value;
  return `${Y}-${M}-${D}`;
}

function sameLocalYMD(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDay(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTimeRange(ev) {
  try {
    const s = parseDateSafe(ev.start_at);
    const e = ev.end_at ? parseDateSafe(ev.end_at) : null;
    const t1 = s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const t2 = e ? e.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    return e ? `${t1} – ${t2}` : t1;
  } catch {
    return "";
  }
}

export default function TourCalendar({ onUseEvent }) {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const from = startOfMonth(subMonths(month, 1));
    const to = endOfMonth(addMonths(month, 1));
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const rows = await listPublicEvents({ from, to });
        if (!cancelled) setEvents(rows || []);
      } catch (e) {
        console.warn("Calendar events load failed:", e);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month]);

  const eventsByCTDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const key = ymdInCT(ev.start_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    if (typeof window !== "undefined") {
      window.__eventsByCTDayKeys = [...map.keys()];
      window.__eventsRaw = events;
    }
    return map;
  }, [events]);

  const grid = useMemo(() => {
    const mStart = startOfMonth(month);
    const first = startOfWeek(mStart, { weekStartsOn: 0 });
    const last = endOfWeek(endOfMonth(mStart), { weekStartsOn: 0 });
    const cells = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      cells.push(new Date(d));
    }
    return cells;
  }, [month]);

  const selectedCTKey = ymdInCT(selected.toISOString());
  const selectedList = eventsByCTDay.get(selectedCTKey) || [];

  function cellHasEvent(d) {
    const key = ymdInCT(d.toISOString());
    return eventsByCTDay.has(key);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-6">
      {/* Calendar */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 w-full md:max-w-[420px]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-black/10 px-2 py-1"
              onClick={() => setMonth(subMonths(month, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border border-black/10 px-2 py-1"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-xs text-black/60 mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-center py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === month.getMonth();
            const isSel = sameLocalYMD(d, selected);
            const has = cellHasEvent(d);

            const base =
              "aspect-square rounded-xl text-sm transition relative overflow-hidden";
            const bg =
              isSel
                ? "bg-brand-heron text-white"
                : has
                ? "bg-blue-200/50 ring-1 ring-blue-300/60 hover:bg-blue-200/70"
                : "hover:bg-black/5";

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(new Date(d))}
                className={`${base} ${bg}`}
                style={{ opacity: inMonth ? 1 : 0.35 }}
                aria-label={d.toDateString()}
              >
                <div className={`grid place-items-center h-full ${isSel ? "" : "text-black"}`}>
                  {d.getDate()}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 text-[11px] text-black/50">Shaded days have events</div>
      </div>

      {/* Sidebar list for selected day */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 w-full">
        <div className="font-medium mb-2">Events on {fmtDay(selected)}</div>

        {loading && <p className="text-sm text-black/60">Loading…</p>}

        {!loading && selectedList.length === 0 && (
          <p className="text-sm text-black/60">No events on this day.</p>
        )}

        <div className="space-y-3">
          {selectedList.map((ev) => (
            <div key={ev.id} className="rounded-xl border border-black/10 p-3">
              <div className="font-medium">{ev.title || ev.tour || "Event"}</div>
              <div className="text-xs text-black/60">
                {fmtTimeRange(ev)}
                {ev.location ? ` — ${ev.location}` : ""}
              </div>
              {ev.description && (
                <div className="text-sm mt-1 text-black/70">{ev.description}</div>
              )}
              <button
                type="button"
                className="mt-2 rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5"
                onClick={() => onUseEvent?.(ev)}
              >
                Select
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}