// supabase/functions/notify-signup/index.ts
// Sends admin email (From: “Be Still Crossville — Booking <booking@…>”)
// and an acknowledgement to the user.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOW_ORIGIN = "*";
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
  preferred_contact?: "email" | "text" | string;
  _meta?: {
    ts?: number;
    userAgent?: string;
    origin?: string;
  };
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_ADMIN       = Deno.env.get("CONTACT_TO_EMAIL")!;
const FROM_BOOKINGS  = Deno.env.get("CONTACT_FROM_EMAIL_BOOKINGS")!;

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
Preferred: ${p.preferred_contact ?? "email"}
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
     <strong>Preferred:</strong> ${p.preferred_contact ?? "email"}<br/>
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
    reply_to: p.email || undefined,
  });
}

async function emailUserAck(p: SignupPayload) {
  if (!p.email) return;

  const subject = "We received your tour request — Be Still Crossville";
  const text = `Hi ${p.name ?? "there"},

Thanks for your interest in "${p.tour ?? "a tour"}". We received your request and will follow up by ${p.preferred_contact ?? "email"} to confirm details and next steps.

— Be Still Crossville
`;
  const html = `
  <p>Hi ${p.name ?? "there"},</p>
  <p>Thanks for your interest in <strong>${p.tour ?? "a tour"}</strong>. We received your request and will follow up by <strong>${p.preferred_contact ?? "email"}</strong> to confirm details and next steps.</p>
  <p>— Be Still Crossville</p>`;

  return sendViaResend({
    from: FROM_BOOKINGS,
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

    await emailAdmin(payload);
    emailUserAck(payload).catch((e) => console.warn("User ack failed (non-blocking):", e));

    return withCors(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  } catch (e) {
    return withCors(new Response(String(e?.message || e), { status: 400 }));
  }
});