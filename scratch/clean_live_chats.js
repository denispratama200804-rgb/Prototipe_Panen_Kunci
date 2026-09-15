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

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const CHAT_STORE_ID = '00000000-0000-0000-0000-000000000002';

async function cleanLiveChat() {
  console.log('🧹 Memulai pembersihan riwayat Live Chat...');

  // 1. Bersihkan tabel live_chat_messages (jika ada)
  const { error: chatError } = await supabase
    .from('live_chat_messages')
    .delete()
    .neq('id', 'dummy_id_to_delete_all'); // This effectively deletes all rows

  if (chatError) {
    // Mungkin tabelnya belum ada, abaikan saja
    console.log('Info: Tabel live_chat_messages tidak ditemukan atau gagal dibersihkan (bisa diabaikan jika menggunakan store).');
  } else {
    console.log('✅ Tabel live_chat_messages berhasil dibersihkan.');
  }

  // 2. Reset JSON di avatar milik Live Chat Store (id: 00000000-0000-0000-0000-000000000002)
  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar: '[]' })
    .eq('id', CHAT_STORE_ID);

  if (updateError) {
    console.error('❌ Gagal mereset Live Chat Store:', updateError.message);
  } else {
    console.log('✅ Data penyimpanan JSON Live Chat Store berhasil dikosongkan.');
  }

  console.log('✨ Selesai! Riwayat Live Chat sekarang sudah bersih dari database.');
}

cleanLiveChat();
