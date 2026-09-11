import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Error: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di file .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function cleanDatabase() {
  console.log('🧹 [1/3] Memulai pembersihan data di Supabase Database...\n');

  // 1. Hapus semua riwayat transaksi
  console.log('Menghapus seluruh riwayat transaksi (tabel transactions)...');
  const { error: txErr, count: txCount } = await supabase
    .from('transactions')
    .delete({ count: 'exact' })
    .not('id', 'is', null);

  if (txErr) {
    console.error('❌ Gagal menghapus tabel transactions:', txErr.message);
  } else {
    console.log(`✅ Berhasil menghapus seluruh transaksi (${txCount ?? 'semua'} record dihapus).`);
  }

  // 2. Hapus semua API Key
  console.log('Menghapus seluruh API Key (tabel api_keys)...');
  const { error: keyErr, count: keyCount } = await supabase
    .from('api_keys')
    .delete({ count: 'exact' })
    .not('id', 'is', null);

  if (keyErr) {
    console.error('❌ Gagal menghapus tabel api_keys:', keyErr.message);
  } else {
    console.log(`✅ Berhasil menghapus seluruh API Key (${keyCount ?? 'semua'} record dihapus).`);
  }

  // 3. Verifikasi kondisi akhir tabel
  console.log('\n🔍 [2/3] Memverifikasi status akhir tabel di Supabase:');
  const { data: remainingKeys, error: rkErr } = await supabase.from('api_keys').select('id');
  const { data: remainingTxs, error: rtErr } = await supabase.from('transactions').select('id');
  const { data: users, error: uErr } = await supabase.from('users').select('id, name, email');

  console.log(`- Sisa API Key di database: ${remainingKeys ? remainingKeys.length : 0}`);
  console.log(`- Sisa Transaksi di database: ${remainingTxs ? remainingTxs.length : 0}`);
  console.log(`- Pengguna terdaftar (tetap aman): ${users ? users.length : 0} akun pengguna`);

  if ((remainingKeys?.length === 0) && (remainingTxs?.length === 0)) {
    console.log('\n✨ [3/3] Database Supabase telah BERSIH dari seluruh key dan riwayat!');
  } else {
    console.warn('\n⚠️ Peringatan: Masih ada beberapa baris tersisa di tabel.');
  }
}

cleanDatabase().catch(err => {
  console.error('Fatal error during cleanDatabase:', err);
  process.exit(1);
});
