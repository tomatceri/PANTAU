import { createClient } from '@supabase/supabase-js';

// Clean Supabase project URL (ensure no trailing /rest/v1/ suffix for createClient)
const rawUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://gpestxvjcnjymoqlkefx.supabase.co';

export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZXN0eHZqY25qeW1vcWxrZWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjY0NDcsImV4cCI6MjEwODY0MjQ0N30.jnHtbepEylwBdjH4wCsvdE2oPdZaSJkq1CW30kntTLw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
