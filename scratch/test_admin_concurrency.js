import assert from 'assert';
import { AdminDataService } from '../admin_panel/js/services/AdminDataService.js';

console.log('=== Test: Concurrent approveApiKey in AdminDataService ===\n');

// Mock localStorage for AdminDataService
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

// Mock fetch for Supabase proxy in AdminDataService
global.fetch = async (url, opts) => {
  // simulate slight async network delay
  await new Promise(r => setTimeout(r, 20));
  return {
    ok: true,
    json: async () => ({ success: true })
  };
};

async function runTest() {
  const service = new AdminDataService();

  const testUserId = 'user_admin_concurrency_01';
  const initialKeys = [
    { id: 'key_1', userId: testUserId, keyString: 'sk-ant-key11111111111111111111111111111', status: 'pending', rewardAmount: 10000 },
    { id: 'key_2', userId: testUserId, keyString: 'sk-ant-key22222222222222222222222222222', status: 'pending', rewardAmount: 10000 },
    { id: 'key_3', userId: testUserId, keyString: 'sk-ant-key33333333333333333333333333333', status: 'pending', rewardAmount: 10000 },
    { id: 'key_4', userId: testUserId, keyString: 'sk-ant-key44444444444444444444444444444', status: 'pending', rewardAmount: 10000 }
  ];

  service._set('api_keys', initialKeys);
  service._set(`api_keys_${testUserId}`, initialKeys);
  service._set(`wallet_balance_${testUserId}`, 0);
  service._set(`wallet_passive_balance_${testUserId}`, 40000);
  service._set(`transactions_${testUserId}`, []);

  console.log('1. Memanggil approveApiKey untuk 4 key secara serentak (Promise.all)...');
  await Promise.all([
    service.approveApiKey('key_1'),
    service.approveApiKey('key_2'),
    service.approveApiKey('key_3'),
    service.approveApiKey('key_4')
  ]);

  const finalBal = Number(service._get(`wallet_balance_${testUserId}`, 0));
  const finalPass = Number(service._get(`wallet_passive_balance_${testUserId}`, 0));
  const finalUserKeys = service._get(`api_keys_${testUserId}`, []);
  const validKeysCount = finalUserKeys.filter(k => k.status === 'valid').length;

  console.log('   Final user balance:', finalBal);
  console.log('   Final user passive balance:', finalPass);
  console.log('   Final valid keys in api_keys_${userId}:', validKeysCount, '/ 4');

  assert.strictEqual(finalBal, 40000, `BUG REPRODUCED! Saldo harus 40.000, tapi didapat ${finalBal}!`);
  assert.strictEqual(validKeysCount, 4, `BUG REPRODUCED! 4 key harus valid, tapi hanya ${validKeysCount} yang valid!`);
  console.log('   ✓ Berhasil! Saldo user 40.000 dan ke-4 key tersimpan valid.');
}

runTest().catch(err => {
  console.error('\n❌ ' + err.message);
  process.exit(1);
});
