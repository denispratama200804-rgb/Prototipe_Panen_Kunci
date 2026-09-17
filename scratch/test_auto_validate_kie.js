// Test suite for Auto Validation of API Keys (Active & 80 Credits)
import assert from 'assert';

// Mock localStorage in Node
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Mock BroadcastChannel
global.BroadcastChannel = class {
  constructor(name) { this.name = name; }
  postMessage() {}
  close() {}
};

let currentKeysInDb = [];

// Mock fetch
global.fetch = async (url, options = {}) => {
  const body = options.body ? JSON.parse(options.body) : {};

  if (body.action === 'get_api_keys' || url.includes('type=api_keys')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: currentKeysInDb })
    };
  }

  // Mock sync_kie_credit
  if (body.action === 'sync_kie_credit' || body.action === 'auto_validate_key') {
    const key = body.apiKey || body.keyString || '';
    if (key.includes('active-80')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          isValidKey: true,
          isValid: true,
          status: 'valid',
          credit: 80,
          message: 'Berhasil sinkronisasi kredit Kie.ai'
        })
      };
    } else if (key.includes('active-low-credit')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          isValidKey: true,
          isValid: false,
          status: 'invalid',
          credit: 25,
          message: 'Kredit Kie.ai tidak memenuhi syarat (25 cr / syarat: 80 cr)'
        })
      };
    } else {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          isValidKey: false,
          isValid: false,
          status: 'invalid',
          credit: 0,
          error: 'API Key tidak valid atau otentikasi gagal di Kie.ai.'
        })
      };
    }
  }

  // Generic mock for other proxy calls
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [] })
  };
};

async function runTests() {
  console.log('--- Testing Auto-Validation of API Keys in AdminDataService ---');

  const { AdminDataService } = await import('../admin_panel/js/services/AdminDataService.js');
  const service = new AdminDataService('test_panen:');

  // Set initial state
  const testKeys = [
    {
      id: 'key_test_valid_80',
      keyString: 'sk-kie-active-80-abcdefghij',
      userId: 'usr_user_1',
      userName: 'User Satu',
      userEmail: 'user1@example.com',
      status: 'pending',
      rewardAmount: 3000,
      credits: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'key_test_low_credit',
      keyString: 'sk-kie-active-low-credit-xyz',
      userId: 'usr_user_2',
      userName: 'User Dua',
      userEmail: 'user2@example.com',
      status: 'pending',
      rewardAmount: 3000,
      credits: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'key_test_unauth',
      keyString: 'sk-kie-invalid-key-99999',
      userId: 'usr_user_3',
      userName: 'User Tiga',
      userEmail: 'user3@example.com',
      status: 'pending',
      rewardAmount: 3000,
      credits: 0,
      createdAt: new Date().toISOString()
    }
  ];

  currentKeysInDb = testKeys;
  service._set('api_keys', testKeys);
  service._set('wallet_passive_balance', 9000);
  service._set('wallet_balance', 0);
  service._set('wallet_passive_balance_usr_user_1', 3000);
  service._set('wallet_balance_usr_user_1', 0);

  // Test 1: Auto-validate key with active & 80 credit
  console.log('1. Testing key with active Kie.ai and 80 credits...');
  const res1 = await service.autoValidateApiKey('key_test_valid_80');
  console.log('Result 1:', res1);
  assert.strictEqual(res1.success, true, 'Result should be successful');
  assert.strictEqual(res1.validated, true, 'Key should be validated');
  assert.strictEqual(res1.status, 'valid', 'Status should be valid');
  assert.strictEqual(res1.credit, 80, 'Credit should be 80');

  // Check balance shift
  const passive = service._get('wallet_passive_balance');
  const active = service._get('wallet_balance');
  console.log(`Passive balance: ${passive}, Active balance: ${active}`);
  assert.strictEqual(passive, 6000, 'Passive balance should decrease by 3000');
  assert.strictEqual(active, 3000, 'Active balance should increase by 3000');

  // Test 2: Auto-validate key with low credit (< 80)
  console.log('\n2. Testing key with low credit (25 credits < 80)...');
  const res2 = await service.autoValidateApiKey('key_test_low_credit');
  console.log('Result 2:', res2);
  assert.strictEqual(res2.validated, false, 'Key should not be validated');
  assert.strictEqual(res2.status, 'invalid', 'Status should be invalid');
  assert(res2.message.includes('80 cr'), 'Rejection message should mention 80 cr requirement');

  // Test 3: Auto-validate unauthenticated / inactive key
  console.log('\n3. Testing inactive / 401 key...');
  const res3 = await service.autoValidateApiKey('key_test_unauth');
  console.log('Result 3:', res3);
  assert.strictEqual(res3.validated, false, 'Key should not be validated');
  assert.strictEqual(res3.status, 'invalid', 'Status should be invalid');

  // Test 4: Batch Auto-Validation on multiple pending keys
  console.log('\n4. Testing batch autoValidateAllPendingKeys()...');
  const batchKeys = [
    {
      id: 'batch_key_1_valid',
      keyString: 'sk-kie-active-80-first',
      userId: 'usr_batch_1',
      status: 'pending',
      rewardAmount: 3000,
      credits: 0
    },
    {
      id: 'batch_key_2_low',
      keyString: 'sk-kie-active-low-credit-second',
      userId: 'usr_batch_2',
      status: 'pending',
      rewardAmount: 3000,
      credits: 0
    }
  ];
  currentKeysInDb = batchKeys;
  service._set('api_keys', batchKeys);

  const batchRes = await service.autoValidateAllPendingKeys();
  console.log('Batch Result:', batchRes);
  assert.strictEqual(batchRes.success, true);
  assert.strictEqual(batchRes.total, 2);
  assert.strictEqual(batchRes.validatedCount, 1);
  assert.strictEqual(batchRes.rejectedCount, 1);

  console.log('\n✅ All Auto-Validation unit tests (including batch) passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
