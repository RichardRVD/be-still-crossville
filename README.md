# Be Still Crossville

Starter site for Be Still Crossville, now extended with a Stripe-backed booking checkout flow for tours.

## Booking Checkout Setup

1. Run the Supabase migration in [`supabase/migrations/20260408_add_bookings_and_tour_pricing.sql`](/Users/richardrodriguez-vandusen/Desktop/git/be-still-crossville/supabase/migrations/20260408_add_bookings_and_tour_pricing.sql).
2. Set tour pricing in the admin UI so each bookable tour has `price_per_person`, `max_party_size`, and checkout enabled.
3. Deploy the Supabase edge functions:
   `create-checkout-session`
   `stripe-webhook`
4. Configure frontend env vars in `.env`:
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_ANON_KEY`
5. Configure Supabase function secrets:
   `SUPABASE_URL`
   `SUPABASE_SERVICE_ROLE_KEY`
   `STRIPE_SECRET_KEY`
   `STRIPE_WEBHOOK_SECRET`
   `PUBLIC_SITE_URL`
   `RESEND_API_KEY`
   `CONTACT_TO_EMAIL`
   `CONTACT_FROM_EMAIL_BOOKINGS`
6. Point your Stripe webhook to:
   `/functions/v1/stripe-webhook`

The tours page now creates pending bookings, redirects customers into Stripe Checkout, and marks bookings paid through the webhook before confirmation emails are sent.
