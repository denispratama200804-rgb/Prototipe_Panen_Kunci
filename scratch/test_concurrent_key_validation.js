import assert from 'assert';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { WalletService } from '../src/infrastructure/services/WalletService.js';
import { ApiKeyService } from '../src/infrastructure/services/ApiKeyService.js';
import { WithdrawalValidator } from '../src/domain/validators/WithdrawalValidator.js';
import { WithdrawalStrategyFactory } from '../src/infrastructure/strategies/WithdrawalStrategyFactory.js';
import { ApiKeyValidator } from '../src/domain/validators/ApiKeyValidator.js';
import { ApiKey } from '../src/domain/models/ApiKey.js';

console.log('=== Test: Concurrent Key Validation & Balance Sync ===\n');

// Mock Repositories that accurately simulate HTTP snapshot semantics
class MockApiKeyRepository {
  constructor() {
    this.keys = [];
  }
  async getAll(userId) {
    // Snapshot the current state when the request is received
    const snapshot = this.keys.map(k => new ApiKey({ ...k }));
    // Simulate network roundtrip latency (60ms)
    await new Promise(r => setTimeout(r, 60));
    return snapshot.filter(k => !userId || k.userId === userId);
  }
  async create(key) {
    this.keys.push(key);
    return key;
  }
}

class MockTransactionRepository {
  constructor() {
    this.txs = [];
  }
  async getAll(userId) {
    const snapshot = this.txs.map(t => ({ ...t }));
    await new Promise(r => setTimeout(r, 10));
    return snapshot.filter(t => !userId || t.userId === userId);
  }
  async create(tx) {
    this.txs.push(tx);
    return tx;
  }
  async updateStatus(id, status) {
    const t = this.txs.find(x => x.id === id);
    if (t) t.status = status;
  }
}

async function runTest() {
  const storage = new MemoryStorageAdapter();
  const eventBus = new EventBus();
  const withdrawalValidator = new WithdrawalValidator(2000);
  const strategyFactory = new WithdrawalStrategyFactory();
  const txRepo = new MockTransactionRepository();
  const keyRepo = new MockApiKeyRepository();

  const walletService = new WalletService(storage, withdrawalValidator, strategyFactory, eventBus, txRepo, keyRepo);
  const apiKeyValidator = new ApiKeyValidator();
  const apiKeyService = new ApiKeyService(storage, apiKeyValidator, walletService, eventBus, keyRepo);

  const testUserId = 'user_test_concurrency_01';
  storage.set('current_user', { id: testUserId, name: 'Siti Asti', email: 'sitiasti@example.com' });

  // 1. User submits 4 keys
  console.log('1. User menyetorkan 4 API Key...');
  const keyStrings = [
    'sk-ant-api03-concurrencykey11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
    'sk-ant-api03-concurrencykey22222222222222222222222222222222222222222222222222222222222222222222222222222222222222222',
    'sk-ant-api03-concurrencykey33333333333333333333333333333333333333333333333333333333333333333333333333333333333333333',
    'sk-ant-api03-concurrencykey44444444444444444444444444444444444444444444444444444444444444444444444444444444444444444'
  ];

  for (let i = 0; i < 4; i++) {
    const k = new ApiKey({
      id: `remote_key_${i + 1}`,
      userId: testUserId,
      keyString: keyStrings[i],
      status: 'pending',
      rewardAmount: 10000,
      createdAt: new Date().toISOString()
    });
    keyRepo.keys.push(k);
    walletService.addPassiveDeposit(10000, k);
  }

  // Key 1 dan 2 divalidasi sistem
  keyRepo.keys[0].status = 'valid';
  keyRepo.keys[1].status = 'valid';

  console.log('\n2. Memulai syncFromRemote() pertama (Key 1 & 2 valid di remote)...');
  const sync1 = walletService.syncFromRemote();

  // Sementara sync1 masih in-flight di background (pada 20ms):
  // Key 3 dan 4 divalidasi oleh sistem di Supabase dan BroadcastChannel memicu sync lanjutan!
  await new Promise(r => setTimeout(r, 20));
  keyRepo.keys[2].status = 'valid';
  keyRepo.keys[3].status = 'valid';

  console.log('   Key 3 & 4 selesai divalidasi di server, Broadcast memicu sync lanjutan...');
  const sync2 = walletService.syncFromRemote();
  const sync3 = walletService.syncFromRemote();

  await Promise.all([sync1, sync2, sync3]);

  console.log('\n3. Hasil saldo setelah seluruh sync selesai:');
  console.log('   Saldo aktif akhir:', walletService.getBalance());
  console.log('   Saldo pasif akhir:', walletService.getPassiveBalance());

  assert.strictEqual(walletService.getBalance(), 40000, `BUG REPRODUCED! Saldo aktif harus 40.000 (dari 4 key @ Rp 10.000), tapi didapat ${walletService.getBalance()} (hanya 2 key yang masuk)!`);
  assert.strictEqual(walletService.getPassiveBalance(), 0, 'Saldo pasif harus 0!');
  console.log('   ✓ Berhasil! Semua 4 key masuk ke saldo aktif (Rp 40.000).');
}

runTest().catch(err => {
  console.error('\n❌ ' + err.message);
  process.exit(1);
});
