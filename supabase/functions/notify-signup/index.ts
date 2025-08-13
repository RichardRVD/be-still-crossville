// supabase/functions/notify-signup/index.ts
// Sends an email to you AND an acknowledgement to the user (Tours/Booking form)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOW_ORIGIN = "*"; // or "https://stillcrossville.com"
const ALLOW_HEADERS = "authorization, content-type";

function withCors(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

type SignupPayload = {
  name?: string;
  email?: string;
  phone?: string;
  tour?: string;
  dates?: string;
  notes?: string;
  _meta?: {
    ts?: number;
    userAgent?: string;
    origin?: string;
  };
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_ADMIN = Deno.env.get("CONTACT_TO_EMAIL")!; // e.g. bestillcrossville@gmail.com
const FROM_BOOKINGS = Deno.env.get("CONTACT_FROM_EMAIL_BOOKINGS")!; // e.g. Be Still Crossville — Booking <booking@stillcrossville.com>

async function sendViaResend(body: Record<string, unknown>) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("Resend error", resp.status, data);
    throw new Error(data?.message || `Resend failed (${resp.status})`);
  }
  return data;
}

async function emailAdmin(p: SignupPayload) {
  const subject = `[Booking] ${p.tour ?? "Tour"} — ${p.name ?? "Someone"}`;
  const text = `A new booking request:

Name:  ${p.name ?? ""}
Email: ${p.email ?? ""}
Phone: ${p.phone ?? ""}
Tour:  ${p.tour ?? ""}
Dates: ${p.dates ?? ""}
Notes: ${p.notes ?? ""}

-- meta --
UA: ${p._meta?.userAgent ?? ""}
Origin: ${p._meta?.origin ?? ""}
When: ${new Date(p._meta?.ts || Date.now()).toISOString()}
`;
  const html = `
  <h2>New booking request</h2>
  <p><strong>Name:</strong> ${p.name ?? ""}<br/>
  <strong>Email:</strong> ${p.email ?? ""}<br/>
  <strong>Phone:</strong> ${p.phone ?? ""}<br/>
  <strong>Tour:</strong> ${p.tour ?? ""}<br/>
  <strong>Dates:</strong> ${p.dates ?? ""}</p>
  <p><strong>Notes:</strong><br/>${(p.notes ?? "").replace(/\n/g, "<br/>")}</p>
  <hr/>
  <p style="font-size:12px;color:#666">
    UA: ${p._meta?.userAgent ?? ""}<br/>
    Origin: ${p._meta?.origin ?? ""}<br/>
    When: ${new Date(p._meta?.ts || Date.now()).toISOString()}
  </p>`;

  return sendViaResend({
    from: FROM_BOOKINGS,
    to: TO_ADMIN,
    subject,
    text,
    html,
    reply_to: p.email || undefined, // reply goes to the guest if present
  });
}

async function emailUserAck(p: SignupPayload) {
  if (!p.email) return; // nothing to do

  const subject = "We received your tour request — Be Still Crossville";
  const text = `Hi ${p.name ?? "there"},

Thanks for your interest in "${p.tour ?? "a tour"}". We received your request and will follow up by email soon to confirm details and next steps.

If you'd like to contribute now, you can use our Pay‑What‑You‑Want link on the site anytime. Cash/Venmo on the day is fine too.

— Be Still Crossville
`;
  const html = `
  <p>Hi ${p.name ?? "there"},</p>
  <p>Thanks for your interest in <strong>${p.tour ?? "a tour"}</strong>. We received your request and will follow up by email soon to confirm details and next steps.</p>
  <p>If you’d like to contribute now, you can use our Pay‑What‑You‑Want link on the site anytime. Cash/Venmo on the day is fine too.</p>
  <p>— Be Still Crossville</p>`;

  return sendViaResend({
    from: FROM_BOOKINGS, // shows as “Be Still Crossville — Booking”
    to: p.email,
    subject,
    text,
    html,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

  try {
    const payload = (await req.json()) as SignupPayload;

    // Send to admin, then acknowledgement to user (non-blocking second send)
    await emailAdmin(payload);
    emailUserAck(payload).catch((e) => console.warn("User ack failed (non-blocking):", e));

    return withCors(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  } catch (e) {
    return withCors(new Response(String(e?.message || e), { status: 400 }));
  }
});