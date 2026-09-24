import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envStr = fs.readFileSync('.env', 'utf8');
const env = {};
envStr.split(/\r?\n/).forEach(line => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY);

async function check() {
  const { data: user } = await sb.from('users').select('*').eq('email', 'sitiasti942@gmail.com').single();
  const { data: keys } = await sb.from('api_keys').select('*').eq('user_id', user.id);
  const { data: txs } = await sb.from('transactions').select('*').eq('user_id', user.id);

  console.log('User ID:', user.id);
  console.log('User balance column in users table:', user.balance);

  const validKeys = keys.filter(k => k.status === 'valid');
  const pendingKeys = keys.filter(k => k.status === 'pending');
  const invalidKeys = keys.filter(k => k.status === 'invalid');

  console.log(`Keys breakdown: Valid=${validKeys.length}, Pending=${pendingKeys.length}, Invalid=${invalidKeys.length}`);
  const totalValidKeysReward = validKeys.reduce((acc, k) => acc + (Number(k.reward_amount) || 0), 0);
  console.log('Total Valid Keys Reward:', totalValidKeysReward);

  const depositTxsSuccess = txs.filter(t => t.type === 'deposit' && t.status === 'success');
  console.log('Deposit txs success count:', depositTxsSuccess.length);
  const totalDepositTxs = depositTxsSuccess.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  console.log('Total Deposit Txs Amount:', totalDepositTxs);

  const withdrawalTxs = txs.filter(t => t.type === 'withdrawal');
  console.log('Withdrawal txs count:', withdrawalTxs.length);
  withdrawalTxs.forEach(w => {
    console.log(`  Withdrawal: id=${w.id}, status=${w.status}, amount=${w.amount}, created_at=${w.created_at}`);
  });

  const activeWithdrawals = withdrawalTxs.filter(w => ['success', 'valid', 'approved', 'completed', 'pending', 'berhasil'].includes(String(w.status || '').toLowerCase()));
  const totalActiveWithdrawals = activeWithdrawals.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
  console.log('Total Active Withdrawals:', totalActiveWithdrawals);

  // Recent 4 keys specifically
  const recent4KeyStrings = [
    '7bcf95c3a819de9c0954afc7927919b6',
    'f83757ad53c05ae8f5d1e79324000b7b',
    '59aaf0a7b401b0f782fe0285aaad3a29',
    '9a366bde5a7591b032e309371d86b627'
  ];
  console.log('\n--- The 4 Keys in question ---');
  for (const ks of recent4KeyStrings) {
    const k = keys.find(x => x.key_string === ks);
    console.log(`Key ${ks.slice(-6)}:`, k ? { id: k.id, status: k.status, reward: k.reward_amount, created_at: k.created_at } : 'NOT FOUND');
  }
}
check();
