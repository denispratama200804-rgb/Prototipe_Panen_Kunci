import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Provider
 * Prinsip: Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 *
 * Mendukung pembacaan kredensial baik dengan prefix VITE_ maupun NEXT_PUBLIC_.
 */

const env = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});

let rawUrl = (
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  'https://wsbbdyrnnbjkjmfcplea.supabase.co'
).trim();

let rawKey = (
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ghDJqet_7JXvy6KV0VOV9g_l1BobacI'
).trim();

// Failsafe: Jika masih terbaca project Supabase lama, alihkan otomatis ke project terbaru
if (rawUrl.includes('bmuthjyibkrcqyygjcxe')) {
  rawUrl = 'https://wsbbdyrnnbjkjmfcplea.supabase.co';
}
if (!rawKey || rawKey.includes('f55Le0iO_SVa36YRE88xqg_98uf2U5V') || rawKey.includes('your-anon-key')) {
  rawKey = 'sb_publishable_ghDJqet_7JXvy6KV0VOV9g_l1BobacI';
}

export const supabaseUrl = rawUrl;
export const supabaseAnonKey = rawKey;
export const googleClientId = (
  env.VITE_GOOGLE_CLIENT_ID ||
  env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  env.GOOGLE_CLIENT_ID ||
  ''
).trim();

// URL production aplikasi — digunakan agar redirect OAuth Google selalu ke Vercel, bukan IP lokal
export const appBaseUrl = (
  env.VITE_APP_URL ||
  env.NEXT_PUBLIC_APP_URL ||
  env.APP_URL ||
  ''
).trim().replace(/\/$/, ''); // hilangkan trailing slash


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
