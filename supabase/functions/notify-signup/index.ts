import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const TO = Deno.env.get("NOTIFY_TO");
    if (!RESEND_API_KEY || !TO) {
      return new Response("Missing RESEND_API_KEY or NOTIFY_TO", { status: 500, headers: corsHeaders });
    }

    const payload = await req.json().catch(() => ({}));
    const subject = `New Be Still Crossville signup: ${payload?.name ?? "Unknown"} — ${payload?.tour ?? "Tour"}`;
    const text = [
      `Name:  ${payload?.name ?? "-"}`,
      `Email: ${payload?.email ?? "-"}`,
      `Phone: ${payload?.phone ?? "-"}`,
      `Tour:  ${payload?.tour ?? "-"}`,
      `Dates: ${payload?.dates ?? "-"}`,
      `Notes: ${payload?.notes ?? "-"}`,
      `When:  ${new Date().toISOString()}`,
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Be Still Crossville <notifications@stillcrossville.com>",
        to: [TO],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(`Email failed: ${t}`, { status: 500, headers: corsHeaders });
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    return new Response(`Bad request: ${String(e)}`, { status: 400, headers: corsHeaders });
  }
});
