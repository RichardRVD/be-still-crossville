import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function Logo({ className }) {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const { data } = supabase
      .storage
      .from('media')
      .getPublicUrl('logo.png');

    if (data?.publicUrl) {
      setLogoUrl(data.publicUrl);
    }
  }, []);

  return (
    <img
      src={logoUrl || ''}
      alt="Be Still Crossville Logo"
      className={className}
    />
  );
}