import { supabase } from './supabase';

export async function submitVolunteerForm(formData) {
  if ((formData.get('_gotcha') || '').trim()) {
    console.warn('Honeypot caught a bot; ignoring submit.');
    return true;
  }

  const payload = {
    name:  (formData.get('name')  || '').toString().trim(),
    email: (formData.get('email') || '').toString().trim().toLowerCase(),
    phone: (formData.get('phone') || '').toString().trim(),
    tour:  (formData.get('tour')  || '').toString(),
    dates: (formData.get('dates') || '').toString().trim(),
    notes: (formData.get('notes') || '').toString().trim(),
  };

  const { error } = await supabase.from('signups').insert(payload);
  if (error) throw new Error(error.message);

  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Notify email failed (non-blocking):', e);
  }

  return true;
}
