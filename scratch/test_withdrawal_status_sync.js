import assert from 'assert';
import { Transaction } from '../src/domain/models/Transaction.js';
import { SaldoDetailView } from '../src/presentation/views/SaldoDetailView.js';
import { DashboardView } from '../src/presentation/views/DashboardView.js';
import { ServiceContainer } from '../src/core/container/ServiceContainer.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { WithdrawalValidator } from '../src/domain/validators/WithdrawalValidator.js';
import { WithdrawalStrategyFactory } from '../src/infrastructure/strategies/WithdrawalStrategyFactory.js';
import { WalletService } from '../src/infrastructure/services/WalletService.js';
import { ApiKeyService } from '../src/infrastructure/services/ApiKeyService.js';
import { ApiKeyValidator } from '../src/domain/validators/ApiKeyValidator.js';

console.log('=== Test: Withdrawal Status Synchronization Bug Fix ===\n');

// 1. Test Transaction Model
console.log('1. Testing Transaction Model rejectionReason parsing...');
const txDirectReason = new Transaction({
  id: 'tx_1',
  type: 'withdrawal',
  amount: 9000,
  title: 'DANA',
  status: 'failed',
  rejectionReason: 'Nomor e-wallet tidak aktif'
});
assert.strictEqual(txDirectReason.rejectionReason, 'Nomor e-wallet tidak aktif', 'Direct rejectionReason should be set');

const txExtractedReason = new Transaction({
  id: 'tx_2',
  type: 'withdrawal',
  amount: 9000,
  title: 'DANA',
  description: 'Penarikan ke 085759433010 (Ditolak: Nomor e-wallet belum terdaftar KYC)',
  status: 'failed'
});
assert.strictEqual(txExtractedReason.rejectionReason, 'Nomor e-wallet belum terdaftar KYC', 'rejectionReason should be extracted from description');
console.log('   ✓ Transaction Model parses rejectionReason correctly.');

// 2. Setup Services & Container for Views
const container = new ServiceContainer();
const eventBus = new EventBus();
const storage = new MemoryStorageAdapter();
const withdrawalValidator = new WithdrawalValidator(9000);
const strategyFactory = new WithdrawalStrategyFactory();
const walletService = new WalletService(storage, withdrawalValidator, strategyFactory, eventBus);
const apiKeyValidator = new ApiKeyValidator();
const apiKeyService = new ApiKeyService(storage, apiKeyValidator, walletService, eventBus);

import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';

const authValidator = new AuthValidator();
const authService = new AuthService(storage, authValidator, eventBus);

container.registerSingleton('EventBus', eventBus);
container.registerSingleton('IStorage', storage);
container.registerSingleton('AuthService', authService);
container.registerSingleton('WalletService', walletService);
container.registerSingleton('ApiKeyService', apiKeyService);

// 3. Test SaldoDetailView Rendering
console.log('\n2. Testing SaldoDetailView recent withdrawals HTML synchronization...');
const saldoDetailView = new SaldoDetailView(container);

const withdrawals = [
  new Transaction({
    id: 'w_success_1',
    type: 'withdrawal',
    amount: 9000,
    title: 'DANA',
    status: 'success',
    createdAt: '2026-09-11T15:51:00.000Z'
  }),
  new Transaction({
    id: 'w_failed',
    type: 'withdrawal',
    amount: 9000,
    title: 'DANA',
    description: 'Penarikan ke 085759433010 (Ditolak: Nomor e-wallet tidak aktif atau belum terdaftar KYC)',
    status: 'failed',
    createdAt: '2026-09-11T15:50:00.000Z'
  }),
  new Transaction({
    id: 'w_success_2',
    type: 'withdrawal',
    amount: 9000,
    title: 'DANA',
    status: 'success',
    createdAt: '2026-09-11T13:43:00.000Z'
  })
];

const html = saldoDetailView._renderRecentWithdrawalsHtml(withdrawals);

// Verifikasi Item Berhasil
assert(html.includes('Berhasil'), 'Should include "Berhasil" badge');
assert(html.includes('Ditransfer'), 'Should include "Ditransfer" status subtext');
assert(html.includes('check'), 'Should include check icon for success');

// Verifikasi Item Ditolak (yang sebelumnya bug menampilkan Berhasil)
assert(html.includes('Ditolak'), 'Should include "Ditolak" badge for rejected withdrawal');
assert(html.includes('Dikembalikan ke Saldo'), 'Should include "Dikembalikan ke Saldo" subtext');
assert(html.includes('line-through'), 'Amount should have line-through styling for failed withdrawal');
assert(html.includes('close'), 'Should include close icon for failed withdrawal');
assert(html.includes('Nomor e-wallet tidak aktif atau belum terdaftar KYC'), 'Should display rejection reason');

// Hitung kemunculan badge
const berhasilMatches = html.match(/Berhasil/g) || [];
const ditolakMatches = html.match(/Ditolak/g) || [];
assert.strictEqual(berhasilMatches.length, 2, 'Should have exactly 2 "Berhasil" badges');
assert.strictEqual(ditolakMatches.length >= 1, true, 'Should have at least 1 "Ditolak" badge');
console.log('   ✓ SaldoDetailView renders 2 Berhasil and 1 Ditolak correctly!');

// 4. Test Pending status as well
console.log('\n3. Testing Pending withdrawal status in SaldoDetailView...');
const pendingWd = [
  new Transaction({
    id: 'w_pending',
    type: 'withdrawal',
    amount: 15000,
    title: 'BCA',
    status: 'pending',
    createdAt: '2026-09-11T16:00:00.000Z'
  })
];
const pendingHtml = saldoDetailView._renderRecentWithdrawalsHtml(pendingWd);
assert(pendingHtml.includes('Pending'), 'Should include "Pending" badge');
assert(pendingHtml.includes('Dalam Antrean'), 'Should include "Dalam Antrean" subtext');
assert(pendingHtml.includes('hourglass_empty'), 'Should include hourglass icon');
console.log('   ✓ Pending withdrawal displays properly with Pending badge & hourglass icon.');

// 5. Test DashboardView recentTx synchronization
console.log('\n4. Testing DashboardView recentTx with failed withdrawal...');
const dashboardView = new DashboardView(container);
const dashboardHtml = dashboardView._renderRecentTxHtml(withdrawals);
assert(dashboardHtml.includes('Ditolak'), 'DashboardView should display "Ditolak" badge for failed transaction');
assert(dashboardHtml.includes('line-through'), 'DashboardView should display line-through amount for failed transaction');
console.log('   ✓ DashboardView displays Ditolak and line-through amount for failed transaction.');

console.log('\n======================================================');
console.log('✅ ALL TESTS PASSED! Withdrawal statuses fully synchronized.');
console.log('======================================================\n');
