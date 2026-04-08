import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const ALLOW_ORIGIN = "*";
const ALLOW_HEADERS = "authorization, content-type";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://stillcrossville.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type CheckoutRequest = {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    preferred_contact?: string;
  };
  booking?: {
    tour_title?: string;
    event_id?: string | null;
    event_title?: string | null;
    dates?: string;
    party_size?: number;
    notes?: string;
  };
  pricing?: {
    currency?: string;
    unit_amount?: number;
  };
  urls?: {
    success_url?: string;
    cancel_url?: string;
  };
};

function withCors(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res;
}

function json(body: Record<string, unknown>, status = 200) {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function clamp(value: unknown, max: number) {
  return (value || "").toString().trim().slice(0, max);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.floor(parsed);
}

function normalizeUrl(url: string | undefined, fallbackPath: string) {
  const candidate = clamp(url, 500);
  if (!candidate) return `${SITE_URL}${fallbackPath}`;
  return candidate;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const payload = (await req.json()) as CheckoutRequest;
    const customerName = clamp(payload.customer?.name, 120);
    const customerEmail = clamp(payload.customer?.email?.toLowerCase(), 200);
    const customerPhone = clamp(payload.customer?.phone, 40);
    const preferredContact = clamp(payload.customer?.preferred_contact || "email", 10);
    const tourTitle = clamp(payload.booking?.tour_title, 160);
    const requestedDates = clamp(payload.booking?.dates, 160);
    const eventId = clamp(payload.booking?.event_id, 80) || null;
    const requestedPartySize = toPositiveInt(payload.booking?.party_size);
    const notes = clamp(payload.booking?.notes, 1000);

    if (!customerName) throw new Error("Name is required.");
    if (!isEmail(customerEmail)) throw new Error("A valid email is required.");
    if (!tourTitle) throw new Error("Tour selection is required.");
    if (!requestedDates) throw new Error("A date is required.");
    if (requestedPartySize < 1) throw new Error("Party size must be at least 1.");

    const { data: tour, error: tourError } = await supabase
      .from("tours")
      .select("id,title,price_per_person,max_party_size,checkout_enabled,is_public")
      .eq("title", tourTitle)
      .maybeSingle();

    if (tourError) throw new Error(tourError.message);
    if (!tour) throw new Error("This tour is not configured for checkout yet.");
    if (!tour.is_public) throw new Error("This tour is not available for booking.");
    if (tour.checkout_enabled === false) throw new Error("Online checkout is not enabled for this tour yet.");

    let chosenUnitAmount = Math.round(Number(tour.price_per_person || 0) * 100);

    const maxPartySize = Math.max(Number(tour.max_party_size || 1), 1);
    if (requestedPartySize > maxPartySize) {
      throw new Error(`This tour allows up to ${maxPartySize} guests per booking.`);
    }

    let eventTitle = clamp(payload.booking?.event_title, 160) || tourTitle;
    if (eventId) {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id,title,tour,capacity,is_public,checkout_enabled,price_per_person")
        .eq("id", eventId)
        .maybeSingle();

      if (eventError) throw new Error(eventError.message);
      if (!event) throw new Error("Selected event was not found.");
      if (!event.is_public) throw new Error("Selected event is not available.");
      if (event.checkout_enabled === false) throw new Error("Online checkout is disabled for this event.");

      eventTitle = event.title || event.tour || tourTitle;
      if (event.price_per_person != null) {
        chosenUnitAmount = Math.round(Number(event.price_per_person || 0) * 100);
      }

      if (event.capacity) {
        const { data: existingBookings, error: bookingError } = await supabase
          .from("bookings")
          .select("party_size")
          .eq("event_id", event.id)
          .in("payment_status", ["pending", "processing", "paid"]);

        if (bookingError) throw new Error(bookingError.message);

        const seatsReserved = (existingBookings || []).reduce(
          (sum, row) => sum + Number(row.party_size || 0),
          0,
        );
        if (requestedPartySize > Math.max(Number(event.capacity) - seatsReserved, 0)) {
          throw new Error("There is not enough remaining capacity for that group size.");
        }
      }
    }

    if (chosenUnitAmount <= 0) throw new Error("This tour does not have a valid price yet.");

    const totalAmount = chosenUnitAmount * requestedPartySize;
    const bookingReference = `BSC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: bookingReference,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        preferred_contact: preferredContact || "email",
        tour_title: tour.title,
        event_id: eventId,
        event_title: eventTitle,
        requested_dates: requestedDates,
        party_size: requestedPartySize,
        currency: "usd",
        unit_amount: chosenUnitAmount,
        total_amount: totalAmount,
        payment_status: "pending",
        notes: notes || null,
        metadata: {
          requested_from: req.headers.get("origin") || "",
        },
      })
      .select("id,booking_reference")
      .single();

    if (insertError) throw new Error(insertError.message);

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", normalizeUrl(payload.urls?.success_url, "/tours?checkout=success"));
    form.set("cancel_url", normalizeUrl(payload.urls?.cancel_url, "/tours?checkout=cancelled"));
    form.set("customer_email", customerEmail);
    form.set("client_reference_id", booking.id);
    form.set("metadata[booking_id]", booking.id);
    form.set("metadata[booking_reference]", booking.booking_reference);
    form.set("metadata[tour_title]", tour.title);
    form.set("metadata[event_id]", eventId || "");
    form.set("metadata[requested_dates]", requestedDates);
    form.set("phone_number_collection[enabled]", "true");
    form.set("line_items[0][quantity]", String(requestedPartySize));
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(chosenUnitAmount));
    form.set("line_items[0][price_data][product_data][name]", tour.title);
    form.set(
      "line_items[0][price_data][product_data][description]",
      `${requestedDates}${eventTitle ? ` • ${eventTitle}` : ""}`.slice(0, 255),
    );

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const stripeBody = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok) {
      console.error("Stripe session creation failed", stripeRes.status, stripeBody);
      throw new Error(stripeBody?.error?.message || "Unable to create Stripe checkout.");
    }

    const sessionId = stripeBody?.id?.toString();
    const sessionUrl = stripeBody?.url?.toString();
    if (!sessionId || !sessionUrl) throw new Error("Stripe checkout session was incomplete.");

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ stripe_checkout_session_id: sessionId })
      .eq("id", booking.id);

    if (updateError) throw new Error(updateError.message);

    return json({
      ok: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      sessionId,
      url: sessionUrl,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Checkout failed." }, 400);
  }
});
