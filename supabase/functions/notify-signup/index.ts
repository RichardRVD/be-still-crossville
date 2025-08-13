// Deno Edge Function: notify-signup
// Sends an email via Resend when a new tour signup is created.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOW_ORIGIN = "*";
const ALLOW_HEADERS = "authorization, content-type";

function withCors(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

async function sendEmail(payload: any) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
  const to = Deno.env.get("CONTACT_TO_EMAIL")!;
  const from = Deno.env.get("CONTACT_FROM_EMAIL")!;

  const subject = `New Be Still Crossville signup: ${payload.name} — ${payload.tour ?? ""}`;
  const text =
`Name: ${payload.name}
Email: ${payload.email}
Phone: ${payload.phone ?? ""}
Tour: ${payload.tour ?? ""}
Dates: ${payload.dates ?? ""}
Notes: ${payload.notes ?? ""}`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("Resend error", resp.status, data);
    throw new Error(data?.message || `Resend failed (${resp.status})`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  try {
    const payload = await req.json();
    const result = await sendEmail(payload);
    return withCors(new Response(JSON.stringify({ ok: true, id: result?.id }), { status: 200 }));
  } catch (e) {
    return withCors(new Response(String(e?.message || e), { status: 400 }));
  }
});