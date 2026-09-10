import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Load .env into process.env for Node test runner
const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
});

// Mock browser environment for node
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

async function run() {
  const { AdminDataService } = await import('../admin_panel/js/services/AdminDataService.js');
  console.log('=== Testing AdminDataService Supabase User Sync ===');
  const service = new AdminDataService();

  console.log('Fetching users via fetchUsersFromSupabase()...');
  const users = await service.fetchUsersFromSupabase();

  console.log(`Successfully fetched ${users.length} users!`);
  assert(Array.isArray(users), 'Returned users is an array');

  // Check if real users from Supabase are present
  const admin = users.find(u => u.email === 'admin@panenkunci.id');
  console.log('Admin user found:', admin?.email, 'Verified:', admin?.isVerified);
  assert(Boolean(admin), 'Admin user exists in synced data');

  const asti = users.find(u => u.email === 'stiiastii200409@gmail.com');
  console.log('Asti user found:', asti?.email, 'Name:', asti?.name);
  assert(Boolean(asti), 'Asti user exists in synced data');

  console.log('Testing updateUser (KYC toggle)...');
  await service.updateUser(asti.id, { isVerified: true });
  const updatedAsti = service.getUsers().find(u => u.id === asti.id);
  assert(updatedAsti.isVerified === true, 'Asti isVerified updated in cache');

  console.log('Reverting KYC state for test clean-up...');
  await service.updateUser(asti.id, { isVerified: false });
  const revertedAsti = service.getUsers().find(u => u.id === asti.id);
  assert(revertedAsti.isVerified === false, 'Asti isVerified reverted in cache');

  console.log('>>> ALL ADMIN SYNC TESTS PASSED! <<<');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
