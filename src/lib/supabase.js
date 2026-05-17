// ─── Supabase Client ───────────────────────────────────────────────────────
// Obtené estas credenciales en: app.supabase.com
// Proyecto → Settings → API → Project URL + anon/public key

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
