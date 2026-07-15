import { createClient } from '@supabase/supabase-js';

// Supabase project spwijxqlzzqvlopsojrx. The publishable key is a public client
// key (safe to ship, like an anon key); env vars override for other environments.
const supabaseUrl =
    (import.meta as any).env?.VITE_SUPABASE_URL || 'https://spwijxqlzzqvlopsojrx.supabase.co';
const supabaseKey =
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_MJUS1uue5gX1X8w-LbFeMw_M3TrYtex';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
