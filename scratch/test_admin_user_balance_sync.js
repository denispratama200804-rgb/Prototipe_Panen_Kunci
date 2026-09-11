import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Mock browser environment for node
const store = {};
globalThis.localStorage = {
  getItem(k) { return store[k] || null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; },
  clear() { for (const k in store) delete store[k]; }
};

// Mock BroadcastChannel
globalThis.BroadcastChannel = class {
  constructor(name) { this.name = name; }
  postMessage() {}
  close() {}
};

async function testBalanceSync() {
  console.log('=== Testing User Balance Sync (Admin Panel vs User App) ===\n');

  const { AdminDataService } = await import('../admin_panel/js/services/AdminDataService.js');
  const service = new AdminDataService();

  // Setup mock user: fakhrul
  const fakhrulId = 'f755a02c-41ca-4ef4-8d1c-92b75fdfb23f';
  const fakhrulEmail = 'rachmanfakhrul@gmail.com';

  const mockUsers = [
    {
      id: fakhrulId,
      name: 'fakhrul',
      email: fakhrulEmail,
      phone: '085759433010',
      bankName: 'DANA',
      accountNumber: '085759433010',
      accountHolder: 'FAKHRUL',
      role: 'user',
      isVerified: true,
      customBalance: 9000 // <--- simulating the previous bug where customBalance was stale at 9000!
    }
  ];
  const prefix = service.prefix;
  localStorage.setItem(`${prefix}all_users`, JSON.stringify(mockUsers));

  // Setup 4 valid API Keys for fakhrul (4 x 3.000 = 12.000)
  const mockKeys = [
    { id: 'k1', userId: fakhrulId, userEmail: fakhrulEmail, status: 'valid', rewardAmount: 3000 },
    { id: 'k2', userId: fakhrulId, userEmail: fakhrulEmail, status: 'valid', rewardAmount: 3000 },
    { id: 'k3', userId: fakhrulId, userEmail: fakhrulEmail, status: 'valid', rewardAmount: 3000 },
    { id: 'k4', userId: fakhrulId, userEmail: fakhrulEmail, status: 'valid', rewardAmount: 3000 }
  ];
  localStorage.setItem(`${prefix}api_keys`, JSON.stringify(mockKeys));

  // 0 withdrawals
  localStorage.setItem(`${prefix}transactions`, JSON.stringify([]));

  // Also simulate user app having saved wallet_balance_... to 12000
  localStorage.setItem(`${prefix}wallet_balance_${fakhrulId}`, '12000');

  console.log('1. Testing AdminDataService.getUsers() calculation:');
  const users = service.getUsers();
  const fakhrul = users.find(u => u.id === fakhrulId);

  console.log('   - Total Keys:', fakhrul.totalKeys);
  console.log('   - Valid Keys:', fakhrul.validKeys);
  console.log('   - Balance Dompet in Admin:', fakhrul.balance);

  assert.strictEqual(fakhrul.totalKeys, 4, 'Total keys should be 4');
  assert.strictEqual(fakhrul.validKeys, 4, 'Valid keys should be 4');
  assert.strictEqual(fakhrul.balance, 12000, 'Saldo Dompet in Admin Panel MUST be 12.000, NOT 9.000!');
  console.log('   ✓ Balance correctly resolved to 12.000 (synced with user dashboard)!\n');

  console.log('2. Testing admin manual balance adjustment ("Atur Saldo"):');
  await service.updateUser(fakhrulId, { balance: 25000, manualBalance: 25000 });
  const updatedUser = service.getUsers().find(u => u.id === fakhrulId);
  console.log('   - Adjusted Balance:', updatedUser.balance);
  assert.strictEqual(updatedUser.balance, 25000, 'Admin manual balance adjustment should be 25.000');
  
  const syncedStorageBal = Number(localStorage.getItem(`${prefix}wallet_balance_${fakhrulId}`));
  console.log('   - Synced in wallet_balance storage:', syncedStorageBal);
  assert.strictEqual(syncedStorageBal, 25000, 'User storage wallet balance must be synced to 25.000');
  console.log('   ✓ Admin "Atur Saldo" updates both admin cache and user wallet storage!\n');

  console.log('3. Testing new key deposit when on dynamic balance:');
  // Revert manual balance and add a 5th key
  await service.updateUser(fakhrulId, { manualBalance: undefined, customBalance: undefined });
  mockKeys.push({ id: 'k5', userId: fakhrulId, userEmail: fakhrulEmail, status: 'valid', rewardAmount: 3000 });
  localStorage.setItem(`${prefix}api_keys`, JSON.stringify(mockKeys));
  localStorage.removeItem(`${prefix}wallet_balance_${fakhrulId}`);

  const dynamicUsers = service.getUsers();
  const fakhrul5Keys = dynamicUsers.find(u => u.id === fakhrulId);
  console.log('   - Valid Keys with 5th key:', fakhrul5Keys.validKeys);
  console.log('   - Dynamic Balance with 5th key:', fakhrul5Keys.balance);
  assert.strictEqual(fakhrul5Keys.validKeys, 5, 'Valid keys should be 5');
  assert.strictEqual(fakhrul5Keys.balance, 15000, 'Balance with 5 keys must dynamically be 15.000');
  console.log('   ✓ Dynamic balance automatically reflects newly approved keys!\n');

  console.log('====================================================');
  console.log('✅ ALL ADMIN USER BALANCE SYNC TESTS PASSED!');
  console.log('====================================================');
}

testBalanceSync().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
