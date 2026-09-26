import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase configuration missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided.'
  );
}

// Fallback to dummy values if not provided to prevent createClient from crashing during build or static inspection
const clientUrl = supabaseUrl || 'https://placeholder.supabase.co';
const clientAnonKey = supabaseAnonKey || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')
);

export const supabase = createClient(clientUrl, clientAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'kisansaarthi_supabase_auth'
  }
});

export default supabase;
