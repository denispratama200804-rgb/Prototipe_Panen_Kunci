import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Provider
 * Prinsip: Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 *
 * Mendukung pembacaan kredensial baik dengan prefix VITE_ maupun NEXT_PUBLIC_.
 */

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const supabaseUrl = rawUrl;
export const supabaseAnonKey = rawKey;
export const googleClientId = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  ''
).trim();

/**
 * Memeriksa apakah Supabase telah dikonfigurasi dengan URL & Key yang valid
 * Supabase URL harus berupa URL web yang valid (diawali http:// atau https://)
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  const isUrlValid = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
  const isPlaceholder = supabaseUrl.includes('your-project-ref') || supabaseAnonKey.includes('your-anon-key');

  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    isUrlValid &&
    !isPlaceholder
  );
}

// Inisialisasi client. Gunakan URL valid jika sudah diatur, atau fallback dummy agar modul tidak meledak saat import.
const dummyUrl = 'https://placeholder.supabase.co';
const dummyKey = 'placeholder-anon-key';

export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : dummyUrl,
  isSupabaseConfigured() ? supabaseAnonKey : dummyKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

if (!isSupabaseConfigured()) {
  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    console.warn(
      `[Supabase] Nilai URL yang diberikan ("${supabaseUrl}") bukan URL valid. ` +
      'URL Supabase harus berformat web, contoh: https://abcdefghijklm.supabase.co'
    );
  } else {
    console.warn(
      '[Supabase] Supabase belum dikonfigurasi sepenuhnya di file .env. Menggunakan penyimpanan lokal.'
    );
  }
}
