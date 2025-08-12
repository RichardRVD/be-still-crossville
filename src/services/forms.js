// src/services/forms.js
import { supabase } from './supabase';

let inFlight = false;

const clamp = (s = '', max = 500) => s.toString().trim().slice(0, max);
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

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

    const { error } = await supabase.from('signups').insert(payload);
    if (error) throw new Error(error.message);

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          _meta: {
            ts: Date.now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            origin: typeof location !== 'undefined' ? location.origin : '',
          },
        }),
        credentials: 'omit',
        mode: 'cors',
      });
    } catch (e) {
      console.warn('Notify email failed (non-blocking):', e);
    }

    return true;
  } finally {
    inFlight = false;
  }
}