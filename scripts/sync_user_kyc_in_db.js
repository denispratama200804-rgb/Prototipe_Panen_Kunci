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

async function syncKyc() {
  console.log('🔄 Memulai sinkronisasi status KYC pengguna di Supabase Database...\n');

  const { data: users, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('❌ Gagal mengambil data pengguna:', error.message);
    process.exit(1);
  }

  let updatedCount = 0;
  for (const user of users) {
    // Lewati system config
    if (user.id === '00000000-0000-0000-0000-000000000001' || user.role === 'system_config') continue;

    const bank = (user.bank_name || '').trim();
    const acc = (user.account_number || '').trim();
    const phone = (user.phone || '').trim();
    const hasPayment = Boolean(bank && bank !== '-' && ((acc && acc !== '-') || (phone && phone !== '-')));

    const targetVerified = Boolean(user.role === 'admin' || hasPayment);

    if (user.is_verified !== targetVerified) {
      console.log(`Mengubah status user "${user.name}" (${user.email}): is_verified: ${user.is_verified} -> ${targetVerified} (Memiliki rekening: ${hasPayment})`);
      const { error: updErr } = await supabase
        .from('users')
        .update({ is_verified: targetVerified })
        .eq('id', user.id);

      if (updErr) {
        console.error(`  ❌ Gagal update user ${user.id}:`, updErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Sinkronisasi selesai! Total ${updatedCount} pengguna diperbarui.`);

  // Verifikasi akhir
  const { data: finalUsers } = await supabase.from('users').select('name, email, bank_name, is_verified');
  console.log('\n📋 Ringkasan status verifikasi pengguna saat ini:');
  finalUsers.forEach(u => {
    if (u.name === 'System Config') return;
    const statusText = u.is_verified ? '✅ TERVERIFIKASI' : '⏳ BELUM TERVERIFIKASI';
    const bankText = u.bank_name ? `Rekening: ${u.bank_name}` : 'Belum ada rekening';
    console.log(`- ${u.name.padEnd(25)} | ${statusText.padEnd(23)} | ${bankText}`);
  });
}

syncKyc().catch(console.error);
