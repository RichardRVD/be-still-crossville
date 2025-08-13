import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const resendKey = Deno.env.get("RESEND_API_KEY")!;
const toEmail   = Deno.env.get("CONTACT_TO_EMAIL") || "bestillcrossville@gmail.com";
const fromEmail = Deno.env.get("CONTACT_FROM_EMAIL") || "Be Still Crossville <hello@stillcrossville.com>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return new Response("Missing fields", { status: 400, headers: corsHeaders });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `New contact message from ${name}`,
        reply_to: email,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!r.ok) return new Response(await r.text(), { status: 500, headers: corsHeaders });

    return new Response("Sent", { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(String(e?.message || e), { status: 500, headers: corsHeaders });
  }
});