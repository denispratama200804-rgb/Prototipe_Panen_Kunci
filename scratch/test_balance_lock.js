import assert from 'assert';
import { TarikSaldoView } from '../src/presentation/views/TarikSaldoView.js';
import { User } from '../src/domain/models/User.js';
import { ServiceContainer } from '../src/core/container/ServiceContainer.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';
import { WithdrawalValidator } from '../src/domain/validators/WithdrawalValidator.js';
import { WithdrawalStrategyFactory } from '../src/infrastructure/strategies/WithdrawalStrategyFactory.js';
import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { WalletService } from '../src/infrastructure/services/WalletService.js';
import { NotificationService } from '../src/infrastructure/services/NotificationService.js';

console.log('=== Test: Tarik Saldo Locked When Balance < Minimum Limit ===\n');

const container = new ServiceContainer();
const eventBus = new EventBus();
const storage = new MemoryStorageAdapter();
const authValidator = new AuthValidator();
const withdrawalValidator = new WithdrawalValidator(9000);
const strategyFactory = new WithdrawalStrategyFactory();
const notification = new NotificationService();
const authService = new AuthService(storage, authValidator, eventBus);
const walletService = new WalletService(storage, withdrawalValidator, strategyFactory, eventBus);

container.registerSingleton('EventBus', eventBus);
container.registerSingleton('IStorage', storage);
container.registerSingleton('AuthService', authService);
container.registerSingleton('WalletService', walletService);
container.registerSingleton('WithdrawalStrategyFactory', strategyFactory);
container.registerSingleton('NotificationService', notification);

walletService.minWithdrawal = 9000;

const testUser = new User({
  id: 'usr-lock-test',
  name: 'Fakhrul',
  email: 'fakhrul@example.com',
  bankName: 'DANA',
  phone: '085759433010',
  accountNumber: '**** **** 3010',
  accountHolder: 'FAKHRUL'
});
authService._currentUser = testUser;

const view = new TarikSaldoView(container);

// Skenario 1: Saldo Rp 0 (di bawah minimal Rp 9.000) -> Halaman HARUS Terkunci
walletService._balance = 0;
console.log('1. Pengujian Saat Saldo Rp 0 (Batas Minimal: Rp 9.000):');
const htmlLocked = view.render();
assert.ok(htmlLocked.includes('Penarikan Saldo Terkunci'), 'Harus menampilkan kartu Penarikan Saldo Terkunci');
assert.ok(htmlLocked.includes('id="withdrawAmount"'), 'Input withdrawAmount harus ada');
assert.ok(htmlLocked.includes('disabled readonly'), 'Input nominal harus disabled & readonly saat terkunci');
assert.ok(htmlLocked.includes('id="btnSubmitWithdrawal"'), 'Tombol submit harus ada');
assert.ok(htmlLocked.includes('disabled'), 'Tombol submit harus disabled saat terkunci');
assert.ok(htmlLocked.includes('Penarikan Terkunci'), 'Teks tombol submit harus mengindikasikan Terkunci');
console.log('   ✓ Kartu peringatan "Penarikan Saldo Terkunci" muncul');
console.log('   ✓ Input nominal terkunci (disabled & readonly)');
console.log('   ✓ Tombol submit dinonaktifkan dengan teks "Penarikan Terkunci"');

// Skenario 2: Saldo Rp 5.000 (masih di bawah minimal Rp 9.000) -> Masih Terkunci
walletService._balance = 5000;
console.log('\n2. Pengujian Saat Saldo Rp 5.000 (Batas Minimal: Rp 9.000):');
const htmlLocked5k = view.render();
assert.ok(htmlLocked5k.includes('Penarikan Saldo Terkunci'), 'Harus tetap terkunci');
assert.ok(htmlLocked5k.includes('Kurang Rp 4.000'), 'Harus menginformasikan kekurangan saldo Rp 4.000');
console.log('   ✓ Status halaman tetap terkunci');
console.log('   ✓ Progress bar dan rincian kekurangan saldo tampil akurat: Kurang Rp 4.000');

// Skenario 3: Saldo Rp 12.000 (mencapai minimal Rp 9.000) -> Halaman Terbuka (Unlocked)
walletService._balance = 12000;
console.log('\n3. Pengujian Saat Saldo Rp 12.000 (Mencukupi Batas Minimal Rp 9.000):');
const htmlUnlocked = view.render();
assert.ok(!htmlUnlocked.includes('Penarikan Saldo Terkunci'), 'Peringatan terkunci TIDAK boleh muncul');
assert.ok(!htmlUnlocked.includes('disabled readonly'), 'Input nominal TIDAK boleh disabled');
assert.ok(htmlUnlocked.includes('Lanjutkan Penarikan'), 'Tombol submit harus bertuliskan Lanjutkan Penarikan');
console.log('   ✓ Kunci terbuka: kartu peringatan terkunci hilang');
console.log('   ✓ Input nominal aktif dan dapat diisi pengguna');
console.log('   ✓ Tombol "Lanjutkan Penarikan" aktif dan siap digunakan');

console.log('\n=== Semua Pengujian Logika Terkunci Berhasil (3/3 Passed) ===');
