// Deno Edge Function: contact
// Sends a general contact message via Resend.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOW_ORIGIN = "*";
const ALLOW_HEADERS = "authorization, content-type";

function withCors(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

async function sendEmail(name: string, email: string, message: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
  const to = Deno.env.get("CONTACT_TO_EMAIL")!;
  const from = Deno.env.get("CONTACT_FROM_EMAIL")!;

  const subject = `Contact form: ${name}`;
  const text =
`Name: ${name}
Email: ${email}

Message:
${message}`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
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
    const { name = "", email = "", message = "" } = await req.json();
    if (!name || !email || !message) throw new Error("Missing fields");
    const result = await sendEmail(String(name), String(email), String(message));
    return withCors(new Response(JSON.stringify({ ok: true, id: result?.id }), { status: 200 }));
  } catch (e) {
    return withCors(new Response(String(e?.message || e), { status: 400 }));
  }
});