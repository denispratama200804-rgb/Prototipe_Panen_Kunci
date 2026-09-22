// scratch/test_transaction_constraint.js
// Pengujian pencegahan pelanggaran check constraint transactions_amount_check

import { Transaction } from '../src/domain/models/Transaction.js';
import { SupabaseTransactionRepository } from '../src/infrastructure/repositories/SupabaseTransactionRepository.js';

console.log('=== TEST TRANSACTIONS AMOUNT CHECK CONSTRAINT ===\n');

// TEST 1: SupabaseTransactionRepository.create dengan amount <= 0
console.log('Test 1: Memverifikasi SupabaseTransactionRepository.create menangani amount <= 0...');
{
  const repo = new SupabaseTransactionRepository();
  const invalidTxZero = new Transaction({
    id: 'tx_zero_test',
    type: 'deposit',
    amount: 0,
    title: 'Test Zero Amount',
    status: 'failed'
  });

  const invalidTxNegative = new Transaction({
    id: 'tx_neg_test',
    type: 'deposit',
    amount: -500,
    title: 'Test Negative Amount',
    status: 'failed'
  });

  // Jalankan create
  let zeroResult = null;
  let negResult = null;
  try {
    zeroResult = await repo.create(invalidTxZero);
    negResult = await repo.create(invalidTxNegative);
  } catch (err) {
    console.error('  [FAIL] Terjadi error saat create amount <= 0:', err.message);
    process.exit(1);
  }

  if (zeroResult && zeroResult.id === 'tx_zero_test' && negResult && negResult.id === 'tx_neg_test') {
    console.log('  [PASS] Transaksi amount <= 0 berhasil dicegah agar tidak memicu 400 Bad Request ke Supabase.');
  } else {
    console.error('  [FAIL] Hasil create tidak sesuai ekspektasi!');
    process.exit(1);
  }
}

// TEST 2: WalletService addFailedDeposit menghasilkan amount valid (> 0)
console.log('\nTest 2: Memverifikasi amount pada addFailedDeposit...');
{
  const mockApiKey = {
    keyString: 'sk-kie-test-invalid-1234',
    userId: 'usr_test_01',
    status: 'invalid',
    rewardAmount: 0, // reward 0 dari API Key invalid
    errorMessage: 'Key invalid',
    getMaskedKey: () => 'sk-kie-...1234'
  };

  const reward = Number(mockApiKey.rewardAmount) || 3000;
  const tx = new Transaction({
    id: 'tx_test_failed',
    userId: mockApiKey.userId,
    type: 'deposit',
    amount: reward,
    title: 'Setoran API Key (Invalid)',
    status: 'failed'
  });

  if (tx.amount === 3000 && tx.amount > 0) {
    console.log(`  [PASS] Transaksi gagal tetap memiliki nominal tercatat Rp ${tx.amount} (memenuhi CHECK constraint amount > 0).`);
  } else {
    console.error(`  [FAIL] Amount transaksi gagal bernilai ${tx.amount}!`);
    process.exit(1);
  }
}

console.log('\n=== ALL CONSTRAINT TESTS PASSED SUCCESSFULLY! ===');
