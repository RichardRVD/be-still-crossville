const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

function requireEnv(value, label) {
  if (!value) {
    throw new Error(`${label} is not configured.`);
  }
  return value;
}

export async function createCheckoutSession(payload) {
  requireEnv(BASE_URL, "VITE_SUPABASE_URL");
  requireEnv(ANON, "VITE_SUPABASE_ANON_KEY");

  const res = await fetch(`${BASE_URL}/functions/v1/create-checkout-session`, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  if (!res.ok) {
    throw new Error(body?.error || text || "Unable to start checkout.");
  }

  return body;
}
