import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wsbbdyrnnbjkjmfcplea.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('TXS count:', txs?.length, 'error:', txErr?.message);
  if (txs && txs.length > 0) {
    console.log('Latest TX:', JSON.stringify(txs[0], null, 2));
  }
  const { data: notifs, error: notifErr } = await supabase.from('notifications').select('*').limit(2);
  console.log('NOTIFS table exists?', !notifErr, 'error:', notifErr?.message);

  const { data: storeRow } = await supabase.from('users').select('id, name, email, avatar').in('id', ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']);
  console.log('STORE ROWS:', storeRow?.map(r => ({ id: r.id, name: r.name, email: r.email })));
}

main().catch(console.error);
