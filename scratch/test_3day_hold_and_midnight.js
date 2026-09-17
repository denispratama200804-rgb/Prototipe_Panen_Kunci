import assert from 'node:assert';
import { ApiKey } from '../src/domain/models/ApiKey.js';
import { AdminDataService } from '../admin_panel/js/services/AdminDataService.js';

// Setup Mock Environment untuk Node.js
global.localStorage = {
  _store: {},
  getItem(key) { return this._store[key] || null; },
  setItem(key, value) { this._store[key] = String(value); },
  removeItem(key) { delete this._store[key]; },
  clear() { this._store = {}; }
};

global.BroadcastChannel = class {
  constructor(name) { this.name = name; }
  postMessage() {}
  close() {}
};

console.log('=== TEST 1: Model ApiKey (3 Days Hold Period & Remaining Time) ===');
const now = Date.now();
// 1. Key baru dibuat (umur 0)
const freshKey = new ApiKey({
  id: 'key_fresh_01',
  keyString: 'sk-kie-test-fresh-key-12345',
  userId: 'usr_test_01',
  createdAt: new Date(now).toISOString(),
  credits: 80
});

assert.strictEqual(freshKey.status, 'pending');
assert.strictEqual(freshKey.isHoldPeriodExpired(), false, 'Key baru belum boleh expired hold-nya');
const remainingFresh = freshKey.getHoldRemaining();
assert.strictEqual(remainingFresh.isReady, false);
assert.strictEqual(remainingFresh.days, 2); // 3 hari minus beberapa milidetik = 2 hari 23 jam
console.log('✓ Fresh key holdRemaining:', remainingFresh.text);

// 2. Key yang sudah berumur 3 hari (72 jam yang lalu)
const threeDaysAgo = new Date(now - (3 * 24 * 60 * 60 * 1000 + 5000)).toISOString();
const matureKey = new ApiKey({
  id: 'key_mature_01',
  keyString: 'sk-kie-test-mature-key-67890',
  userId: 'usr_test_01',
  createdAt: threeDaysAgo,
  credits: 80
});

assert.strictEqual(matureKey.isHoldPeriodExpired(), true, 'Key 3 hari lalu harus sudah expired hold-nya');
const remainingMature = matureKey.getHoldRemaining();
assert.strictEqual(remainingMature.isReady, true);
assert.strictEqual(remainingMature.text, 'Siap divalidasi');
console.log('✓ Mature key holdRemaining:', remainingMature.text);

console.log('\n=== TEST 2: AdminDataService (Auto-Validate & Midnight Inspection) ===');
const adminService = new AdminDataService('test_pk:');

// Setup mock storage user & saldo
adminService._set('wallet_balance_usr_test_01', 0);
adminService._set('wallet_passive_balance_usr_test_01', 3000);
adminService._set('wallet_balance', 0);
adminService._set('wallet_passive_balance', 3000);

// Skenario A: Key belum 3 hari dengan kredit 80 -> Tetap Pending saat diinspeksi
const pendingKeys = [
  {
    id: 'key_fresh_01',
    keyString: 'sk-kie-mock-fresh-80cr',
    userId: 'usr_test_01',
    status: 'pending',
    rewardAmount: 3000,
    credits: 80,
    createdAt: new Date().toISOString(),
    holdUntil: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'key_mature_01',
    keyString: 'sk-kie-mock-mature-80cr',
    userId: 'usr_test_01',
    status: 'pending',
    rewardAmount: 3000,
    credits: 80,
    createdAt: threeDaysAgo,
    holdUntil: threeDaysAgo
  },
  {
    id: 'key_decayed_01',
    keyString: 'sk-kie-mock-decayed-40cr',
    userId: 'usr_test_01',
    status: 'pending',
    rewardAmount: 3000,
    credits: 80, // Sebelumnya 80, tapi dicek sekarang berkurang
    createdAt: new Date().toISOString(),
    holdUntil: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

adminService._set('api_keys', pendingKeys);

// Mock syncKieCredit untuk testing
adminService.syncKieCredit = async (keyId, keyString) => {
  if (keyString.includes('decayed')) {
    // Kredit berkurang jadi 40
    return { success: true, isValidKey: true, credit: 40 };
  }
  if (keyString.includes('unauthorized')) {
    return { success: false, isValidKey: false, credit: 0, error: '401 Unauthorized' };
  }
  // Kredit tetap 80
  return { success: true, isValidKey: true, credit: 80 };
};

// 1. Validasi Key Fresh (< 3 hari)
console.log('Testing key fresh (< 3 hari) dengan 80 kredit:');
const resFresh = await adminService.autoValidateApiKey('key_fresh_01');
assert.strictEqual(resFresh.status, 'pending', 'Key fresh harus tetap PENDING');
assert.strictEqual(resFresh.validated, false);
console.log('✓ Status key fresh:', resFresh.status, '-', resFresh.message);

// 2. Validasi Key Mature (>= 3 hari) dengan 80 kredit -> Harus lolos & valid
console.log('\nTesting key mature (>= 3 hari) dengan 80 kredit:');
const resMature = await adminService.autoValidateApiKey('key_mature_01');
assert.strictEqual(resMature.status, 'valid', 'Key mature harus otomatis VALID');
assert.strictEqual(resMature.validated, true);
console.log('✓ Status key mature:', resMature.status, '-', resMature.message);

// Cek saldo pasif dicairkan ke saldo aktif
const userActiveBal = adminService._get('wallet_balance_usr_test_01');
console.log('✓ Saldo aktif user setelah key mature valid:', userActiveBal);
assert.strictEqual(userActiveBal, 3000);

// Cek notifikasi sukses masuk ke user
const userNotifsMature = adminService._get('notifications_usr_test_01', []);
const matureNotif = userNotifsMature.find(n => n.type === 'success');
assert.ok(matureNotif, 'Harus ada notifikasi sukses untuk user');
console.log('✓ Notifikasi sukses user:', matureNotif.title, '|', matureNotif.message);

// 3. Validasi Key Decayed (kredit berkurang < 80) -> Dinyatakan INVALID
console.log('\nTesting key decayed (kredit berkurang < 80):');
const resDecayed = await adminService.autoValidateApiKey('key_decayed_01');
assert.strictEqual(resDecayed.status, 'invalid', 'Key decayed harus INVALID');
assert.strictEqual(resDecayed.validated, false);
console.log('✓ Status key decayed:', resDecayed.status, '-', resDecayed.message);

// Cek notifikasi penolakan masuk ke user dengan alasan kredit berkurang
const userNotifsDecayed = adminService._get('notifications_usr_test_01', []);
const decayedNotif = userNotifsDecayed.find(n => n.type === 'error');
assert.ok(decayedNotif, 'Harus ada notifikasi error/invalid untuk user');
console.log('✓ Notifikasi invalid user:', decayedNotif.title, '|', decayedNotif.message);

console.log('\n=== TEST 3: runMidnightKieInspection() ===');
// Tambahkan 1 key baru untuk midnight inspection
adminService._set('api_keys', [
  {
    id: 'key_midnight_test',
    keyString: 'sk-kie-mock-fresh-80cr-2',
    userId: 'usr_test_01',
    status: 'pending',
    rewardAmount: 3000,
    credits: 80,
    createdAt: new Date().toISOString()
  }
]);

const midnightRes = await adminService.runMidnightKieInspection();
console.log('✓ Hasil Midnight Inspection:', JSON.stringify(midnightRes, null, 2));
assert.strictEqual(midnightRes.totalInspected, 1);
assert.strictEqual(midnightRes.pendingCount, 1);

// Periksa sisa waktu hitung mundur jam 12 malam WIB
const countdown = adminService.getNextMidnightWIBRemaining();
console.log('✓ Sisa waktu ke jam 12 malam WIB:', countdown.text);
assert.ok(countdown.ms > 0);

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
