// supabase/functions/contact/index.ts
// Sends admin email (From: “Be Still Crossville — Contact <contact@…>”)
// and an acknowledgement to the user.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOW_ORIGIN = "*"; // or "https://stillcrossville.com"
const ALLOW_HEADERS = "authorization, content-type";

function withCors(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

type EmailPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  preferred_contact?: "email" | "text" | string;
  _meta?: {
    ts?: number;
    userAgent?: string;
    origin?: string;
  };
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_ADMIN       = Deno.env.get("CONTACT_TO_EMAIL")!;                // bestillcrossville@gmail.com
const FROM_CONTACT   = Deno.env.get("CONTACT_FROM_EMAIL_CONTACT")!;      // 'Be Still Crossville — Contact <contact@stillcrossville.com>'

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

async function emailAdmin(p: EmailPayload) {
  const subject = `[Contact] ${p.name}`;
  const text = `New contact form submission:

Name:  ${p.name}
Email: ${p.email}
Phone: ${p.phone ?? ""}
Preferred: ${p.preferred_contact ?? "email"}

Message:
${p.message}

-- meta --
UA: ${p._meta?.userAgent ?? ""}
Origin: ${p._meta?.origin ?? ""}
When: ${new Date(p._meta?.ts || Date.now()).toISOString()}
`;
  const html = `
  <h2>New contact form submission</h2>
  <p><strong>Name:</strong> ${p.name}<br/>
     <strong>Email:</strong> ${p.email}<br/>
     <strong>Phone:</strong> ${p.phone ?? ""}<br/>
     <strong>Preferred:</strong> ${p.preferred_contact ?? "email"}</p>
  <p><strong>Message:</strong><br/>${p.message.replace(/\n/g, "<br/>")}</p>
  <hr/>
  <p style="font-size:12px;color:#666">
    UA: ${p._meta?.userAgent ?? ""}<br/>
    Origin: ${p._meta?.origin ?? ""}<br/>
    When: ${new Date(p._meta?.ts || Date.now()).toISOString()}
  </p>`;

  return sendViaResend({
    from: FROM_CONTACT,
    to: TO_ADMIN,
    subject,
    text,
    html,
    reply_to: p.email,
  });
}

async function emailUserAck(p: EmailPayload) {
  const subject = "We received your message — Be Still Crossville";
  const text = `Hi ${p.name},

Thanks for reaching out to Be Still Crossville. We received your message and will get back to you soon.

Your message:
${p.message}

— Be Still Crossville
`;
  const html = `
  <p>Hi ${p.name},</p>
  <p>Thanks for reaching out to <strong>Be Still Crossville</strong>. We received your message and will get back to you soon.</p>
  <p><strong>Your message:</strong><br/>${p.message.replace(/\n/g, "<br/>")}</p>
  <p>— Be Still Crossville</p>`;

  return sendViaResend({
    from: FROM_CONTACT,
    to: p.email,
    subject,
    text,
    html,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

  try {
    const b = (await req.json()) as Partial<EmailPayload>;
    const name = (b.name ?? "").toString().trim();
    const email = (b.email ?? "").toString().trim().toLowerCase();
    const message = (b.message ?? "").toString().trim();

    if (!name || !email || !message) throw new Error("Missing fields");

    const payload: EmailPayload = {
      name,
      email,
      message,
      phone: (b.phone ?? "").toString().trim(),
      preferred_contact: (b.preferred_contact ?? "email").toString(),
      _meta: b._meta ?? {},
    };

    await emailAdmin(payload);
    emailUserAck(payload).catch((e) => console.warn("User ack failed (non-blocking):", e));

    return withCors(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  } catch (e) {
    return withCors(new Response(String(e?.message || e), { status: 400 }));
  }
});