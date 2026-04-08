import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_ADMIN = Deno.env.get("CONTACT_TO_EMAIL")!;
const FROM_BOOKINGS = Deno.env.get("CONTACT_FROM_EMAIL_BOOKINGS")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type StripeEvent = {
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type BookingRow = {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string;
  tour_title: string;
  event_title: string | null;
  requested_dates: string;
  party_size: number;
  currency: string;
  unit_amount: number;
  total_amount: number;
  payment_status: string;
  notes: string | null;
  stripe_checkout_session_id: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sign(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;

  const pieces = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = pieces.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = pieces.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = await sign(STRIPE_WEBHOOK_SECRET, payload);
  return signatures.some((candidate) => timingSafeEqualHex(candidate, expected));
}

function formatMoney(amountInCents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((amountInCents || 0) / 100);
}

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
}

async function sendBookingEmails(booking: BookingRow) {
  const total = formatMoney(booking.total_amount, booking.currency);
  const subjectAdmin = `[Paid Booking] ${booking.tour_title} — ${booking.customer_name}`;
  const subjectUser = `Your Be Still Crossville booking is confirmed`;

  const adminText = `A booking has been paid.

Booking: ${booking.booking_reference}
Name: ${booking.customer_name}
Email: ${booking.customer_email}
Phone: ${booking.customer_phone || ""}
Preferred contact: ${booking.preferred_contact}
Tour: ${booking.tour_title}
Event: ${booking.event_title || ""}
Dates: ${booking.requested_dates}
Party size: ${booking.party_size}
Unit price: ${formatMoney(booking.unit_amount, booking.currency)}
Total: ${total}
Notes: ${booking.notes || ""}
`;

  const adminHtml = `
    <h2>Paid booking received</h2>
    <p><strong>Booking:</strong> ${booking.booking_reference}<br/>
    <strong>Name:</strong> ${booking.customer_name}<br/>
    <strong>Email:</strong> ${booking.customer_email}<br/>
    <strong>Phone:</strong> ${booking.customer_phone || ""}<br/>
    <strong>Preferred contact:</strong> ${booking.preferred_contact}<br/>
    <strong>Tour:</strong> ${booking.tour_title}<br/>
    <strong>Event:</strong> ${booking.event_title || ""}<br/>
    <strong>Dates:</strong> ${booking.requested_dates}<br/>
    <strong>Party size:</strong> ${booking.party_size}<br/>
    <strong>Unit price:</strong> ${formatMoney(booking.unit_amount, booking.currency)}<br/>
    <strong>Total:</strong> ${total}</p>
    <p><strong>Notes:</strong><br/>${(booking.notes || "").replace(/\n/g, "<br/>")}</p>
  `;

  const userText = `Hi ${booking.customer_name},

Your booking is confirmed.

Booking reference: ${booking.booking_reference}
Tour: ${booking.tour_title}
Date: ${booking.requested_dates}
Party size: ${booking.party_size}
Total paid: ${total}

We will follow up with final details soon.

Be Still Crossville
`;

  const userHtml = `
    <p>Hi ${booking.customer_name},</p>
    <p>Your booking is confirmed.</p>
    <p><strong>Booking reference:</strong> ${booking.booking_reference}<br/>
    <strong>Tour:</strong> ${booking.tour_title}<br/>
    <strong>Date:</strong> ${booking.requested_dates}<br/>
    <strong>Party size:</strong> ${booking.party_size}<br/>
    <strong>Total paid:</strong> ${total}</p>
    <p>We will follow up with final details soon.</p>
    <p>Be Still Crossville</p>
  `;

  await sendViaResend({
    from: FROM_BOOKINGS,
    to: TO_ADMIN,
    subject: subjectAdmin,
    text: adminText,
    html: adminHtml,
    reply_to: booking.customer_email,
  });

  await sendViaResend({
    from: FROM_BOOKINGS,
    to: booking.customer_email,
    subject: subjectUser,
    text: userText,
    html: userHtml,
  });
}

async function findBooking(session: Record<string, unknown>) {
  const metadata = (session.metadata || {}) as Record<string, string>;
  const bookingId = metadata.booking_id;
  const sessionId = session.id?.toString();

  if (bookingId) {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as BookingRow;
  }

  if (!sessionId) return null;

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BookingRow | null) || null;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const rawBody = await req.text();
    const isValid = await verifyStripeSignature(rawBody, req.headers.get("stripe-signature"));
    if (!isValid) return json({ error: "Invalid Stripe signature." }, 400);

    const event = JSON.parse(rawBody) as StripeEvent;
    const session = (event.data?.object || {}) as Record<string, unknown>;
    const booking = await findBooking(session);
    if (!booking) return json({ ok: true });

    const eventType = event.type || "";
    const paymentIntent = session.payment_intent?.toString() || null;
    const paid = session.payment_status === "paid";

    if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
      const nextStatus = paid ? "paid" : "processing";
      const wasPaid = booking.payment_status === "paid";

      const { data: updated, error } = await supabase
        .from("bookings")
        .update({
          payment_status: nextStatus,
          stripe_payment_intent_id: paymentIntent,
          paid_at: paid ? new Date().toISOString() : null,
        })
        .eq("id", booking.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      if (paid && !wasPaid) {
        await sendBookingEmails(updated as BookingRow);
      }
    }

    if (
      eventType === "checkout.session.expired" ||
      eventType === "checkout.session.async_payment_failed"
    ) {
      const { error } = await supabase
        .from("bookings")
        .update({
          payment_status: "cancelled",
          stripe_payment_intent_id: paymentIntent,
        })
        .eq("id", booking.id);

      if (error) throw new Error(error.message);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("stripe-webhook failed", error);
    return json({ error: error instanceof Error ? error.message : "Webhook failed." }, 400);
  }
});
