// supabase/functions/notify-signup/index.ts
// Sends tour/booking signups to ONE inbox, with a distinct From identity.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOW_ORIGIN = "*"; // or "https://stillcrossville.com"
const ALLOW_HEADERS = "authorization, content-type, apikey";

function withCors(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

async function sendEmail(payload: any) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
  const TO_ONE_INBOX   = Deno.env.get("CONTACT_TO_EMAIL")!;            // bestillcrossville@gmail.com
  const FROM_BOOKING   = Deno.env.get("CONTACT_FROM_EMAIL_BOOKINGS")!; // e.g. "Be Still Crossville — Booking <booking@stillcrossville.com>"

  const subject = `[Booking] ${payload.tour ?? "Tour"} — ${payload.name ?? "Someone"}`;
  const text = `A new booking request:

Name : ${payload.name ?? ""}
Email: ${payload.email ?? ""}
Phone: ${payload.phone ?? ""}
Tour : ${payload.tour ?? ""}
Dates: ${payload.dates ?? ""}
Notes: ${payload.notes ?? ""}

— meta —
User‑Agent: ${payload?._meta?.userAgent ?? ""}
Origin    : ${payload?._meta?.origin ?? ""}
When      : ${new Date(payload?._meta?.ts || Date.now()).toISOString()}
`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_BOOKING,
      to: TO_ONE_INBOX,
      subject,
      text,
      reply_to: payload?.email || undefined,
    }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.message || `Resend failed (${resp.status})`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

  try {
    const payload = await req.json();
    await sendEmail(payload);
    return withCors(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  } catch (e) {
    return withCors(new Response(String(e?.message || e), { status: 400 }));
  }
});