import { EventBus } from '../src/core/events/EventBus.js';
import { LocalStorageAdapter } from '../src/infrastructure/storage/LocalStorageAdapter.js';
import { ApiKeyValidator } from '../src/domain/validators/ApiKeyValidator.js';
import { WithdrawalValidator } from '../src/domain/validators/WithdrawalValidator.js';
import { WithdrawalStrategyFactory } from '../src/infrastructure/strategies/WithdrawalStrategyFactory.js';
import { WalletService } from '../src/infrastructure/services/WalletService.js';
import { ApiKeyService } from '../src/infrastructure/services/ApiKeyService.js';
import { ApiKey } from '../src/domain/models/ApiKey.js';

// Mock Memory Storage
class MemoryStorage {
  constructor() { this.store = new Map(); }
  get(key, def = null) { return this.store.has(key) ? JSON.parse(JSON.stringify(this.store.get(key))) : def; }
  set(key, val) { this.store.set(key, JSON.parse(JSON.stringify(val))); }
  remove(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

async function testConsistency() {
  console.log('=== Testing Consistency between Dashboard and History ===\n');

  const storage = new MemoryStorage();
  const eventBus = new EventBus();
  const apiKeyValidator = new ApiKeyValidator();
  const withdrawalValidator = new WithdrawalValidator();
  const strategyFactory = new WithdrawalStrategyFactory();

  const userId = 'usr_test_consistency';
  storage.set('current_user', { id: userId, name: 'Tester', email: 'tester@panenkunci.id' });

  // Mock repository with remote duplicate simulation
  const remoteDb = [];
  const mockApiKeyRepo = {
    async getByKeyString(keyStr) {
      return remoteDb.find(k => k.keyString === keyStr) || null;
    },
    async create(apiKey) {
      if (remoteDb.some(k => k.keyString === apiKey.keyString)) {
        throw new Error('duplicate key value violates unique constraint');
      }
      const clone = new ApiKey({ ...apiKey, id: 'remote_' + Math.random().toString(36).substring(2, 7) });
      remoteDb.push(clone);
      return clone;
    },
    async getAll(uId) {
      return remoteDb.filter(k => k.userId === uId);
    }
  };

  const walletService = new WalletService(storage, withdrawalValidator, strategyFactory, eventBus);
  const apiKeyService = new ApiKeyService(storage, apiKeyValidator, walletService, eventBus, mockApiKeyRepo);

  console.log('[Test 1] Submit 2 valid keys:');
  const r1 = await apiKeyService.submitKey('sk-kie-validtestkey0001', userId);
  const r2 = await apiKeyService.submitKey('sk-kie-validtestkey0002', userId);
  console.log('Key 1 submit:', r1.success);
  console.log('Key 2 submit:', r2.success);

  let allKeys = apiKeyService.getAllKeys();
  let txs = walletService.getTransactions();
  let passive = walletService.getPassiveBalance();

  console.log(`Keys in Riwayat: ${allKeys.length}`);
  console.log(`Txs in Dashboard: ${txs.length}`);
  console.log(`Passive Balance: Rp ${passive}`);

  if (allKeys.length !== 2 || txs.length !== 2 || passive !== 6000) {
    throw new Error('Inconsistency after valid submissions!');
  }
  console.log('✓ 2 valid keys match 2 transactions and Rp 6.000 passive balance');

  console.log('\n[Test 2] Attempt to submit duplicate key (should be rejected and NOT create orphan tx):');
  const dupRes = await apiKeyService.submitKey('sk-kie-validtestkey0001', userId);
  console.log('Duplicate submit success:', dupRes.success, '| Message:', dupRes.message);

  allKeys = apiKeyService.getAllKeys();
  txs = walletService.getTransactions();
  passive = walletService.getPassiveBalance();

  console.log(`Keys in Riwayat: ${allKeys.length}`);
  console.log(`Txs in Dashboard: ${txs.length}`);
  console.log(`Passive Balance: Rp ${passive}`);

  if (allKeys.length !== 2 || txs.length !== 2 || passive !== 6000) {
    throw new Error(`Inconsistency after duplicate attempt: keys=${allKeys.length}, txs=${txs.length}, passive=${passive}`);
  }
  console.log('✓ Duplicate key was rejected with NO orphan transaction created');

  console.log('\n[Test 3] Attempt to submit key that fails remote insert:');
  // Inject into remoteDb behind the scenes to simulate race condition / global duplicate
  remoteDb.push(new ApiKey({ id: 'k_race', keyString: 'sk-kie-already_exists_globally', userId: 'other_user', status: 'valid' }));
  const failRes = await apiKeyService.submitKey('sk-kie-already_exists_globally', userId);
  console.log('Global duplicate submit success:', failRes.success, '| Message:', failRes.message);

  allKeys = apiKeyService.getAllKeys();
  txs = walletService.getTransactions();
  passive = walletService.getPassiveBalance();

  console.log(`Keys in Riwayat: ${allKeys.length}`);
  console.log(`Txs in Dashboard: ${txs.length}`);
  console.log(`Passive Balance: Rp ${passive}`);

  if (allKeys.length !== 2 || txs.length !== 2 || passive !== 6000) {
    throw new Error(`Inconsistency after remote failure: keys=${allKeys.length}, txs=${txs.length}, passive=${passive}`);
  }
  console.log('✓ Global duplicate failed safely with zero side-effects');

  console.log('\nALL CONSISTENCY TESTS PASSED SUCCESSFULLY! 🎉');
}

testConsistency().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
