// src/services/forms.js
import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON     = import.meta.env.VITE_SUPABASE_ANON_KEY;

let inFlight = false;

const clamp  = (s = '', max = 500) => s.toString().trim().slice(0, max);
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ---------- Volunteer / Tours form ----------
export async function submitVolunteerForm(formData) {
  // Honeypot
  if ((formData.get('_gotcha') || '').toString().trim()) {
    console.warn('Honeypot caught a bot; ignoring submit.');
    return true;
  }

  if (inFlight) return true;
  inFlight = true;

  try {
    const payload = {
      name:  clamp(formData.get('name'), 100),
      email: clamp((formData.get('email') || '').toString().toLowerCase(), 200),
      phone: clamp(formData.get('phone'), 40),
      tour:  clamp(formData.get('tour'), 120),
      dates: clamp(formData.get('dates'), 120),
      notes: clamp(formData.get('notes'), 1000),
    };

    if (!payload.name) throw new Error('Please enter your name.');
    if (!isEmail(payload.email)) throw new Error('Please enter a valid email.');

    // 1) Save to Supabase (this uses supabase-js; it's fine that it includes apikey)
    const { error } = await supabase.from('signups').insert(payload);
    if (error) throw new Error(error.message);

    // 2) Ping Edge Function to email you + auto-reply user (NO apikey header!)
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/notify-signup`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON}`,
        },
        body: JSON.stringify({
          ...payload,
          _meta: {
            ts: Date.now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            origin: typeof location !== 'undefined' ? location.origin : '',
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.warn('notify-signup failed:', res.status, txt);
      }
    } catch (e) {
      console.warn('Notify signup email failed (non-blocking):', e);
    }

    return true;
  } finally {
    inFlight = false;
  }
}

// ---------- Contact form ----------
export async function submitContactForm(formData) {
  // Honeypot
  if ((formData.get('_gotcha') || '').toString().trim()) return true;

  const name    = clamp(formData.get('name'), 100);
  const email   = clamp((formData.get('email') || '').toString().toLowerCase(), 200);
  const message = clamp(formData.get('message'), 2000);

  if (!name) throw new Error('Please enter your name.');
  if (!isEmail(email)) throw new Error('Please enter a valid email.');
  if (!message) throw new Error('Please enter a message.');

  const res = await fetch(`${BASE_URL}/functions/v1/contact`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON}`,   // DO send this
      // DO NOT send 'apikey': it will fail preflight
    },
    body: JSON.stringify({
      name, email, message,
      _meta: {
        ts: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        origin: typeof location !== 'undefined' ? location.origin : '',
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => 'Request failed');
    throw new Error(txt);
  }
  return true;
}