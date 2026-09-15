import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : undefined;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SECRET_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SECRET_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('Mengambil semua API keys...');
  const { data: apiKeys, error: keyErr } = await supabase.from('api_keys').select('*');
  if (keyErr) return console.error('Error api keys:', keyErr);

  console.log('Mengambil semua transaksi deposit...');
  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').eq('type', 'deposit');
  if (txErr) return console.error('Error txs:', txErr);

  let updated = 0;
  for (const tx of txs) {
    if (!tx.description) continue;
    // Cari API key yang cocok dengan deskripsi
    const matchedKey = apiKeys.find(k => {
      const suffix = k.key_string ? k.key_string.slice(-4) : '';
      const masked = k.key_string && k.key_string.length > 12
        ? `${k.key_string.slice(0, 9)}...${k.key_string.slice(-4)}`
        : (k.key_string || '');
      
      return (
        (suffix && tx.description.includes(suffix)) ||
        (masked && tx.description.includes(masked)) ||
        (k.key_string && tx.description.includes(k.key_string)) ||
        (k.id && tx.description.includes(k.id))
      );
    });

    if (matchedKey && matchedKey.created_at) {
      if (tx.created_at !== matchedKey.created_at) {
        console.log(`Update tx ${tx.id} ke tanggal ${matchedKey.created_at}`);
        await supabase.from('transactions').update({ created_at: matchedKey.created_at }).eq('id', tx.id);
        updated++;
      }
    }
  }

  console.log(`Selesai! Berhasil memperbaiki ${updated} transaksi.`);
}

main();
