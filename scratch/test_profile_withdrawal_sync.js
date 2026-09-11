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

console.log('=== Test: Profile & Tarik Saldo Method Synchronization ===\n');

// 1. Setup DI container
const container = new ServiceContainer();
const eventBus = new EventBus();
const storage = new MemoryStorageAdapter();
const authValidator = new AuthValidator();
const withdrawalValidator = new WithdrawalValidator(50000);
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

const view = new TarikSaldoView(container);

// Test Case 1: User with DANA in profile
const userDana = new User({
  id: 'usr-1',
  name: 'Fakhrul',
  email: 'fakhrul@example.com',
  bankName: 'DANA',
  phone: '085759433010',
  accountNumber: '**** **** 3010',
  accountHolder: 'FAKHRUL'
});

const resDana = view._resolveUserPaymentMethod(userDana);
console.log('1. User dengan rekening DANA:');
assert.strictEqual(resDana.method, 'dana', 'Method harus dana');
assert.strictEqual(resDana.label, 'DANA');
assert.strictEqual(resDana.registeredAccount, '085759433010');
console.log('   ✓ DANA terdeteksi dan nomor HP e-wallet terisi otomatis: ' + resDana.registeredAccount);

// Test Case 2: User with Bank Transfer (BCA) in profile
const userBca = new User({
  id: 'usr-2',
  name: 'Budi Santoso',
  email: 'budi@example.com',
  bankName: 'BCA',
  phone: '08123456789',
  accountNumber: '1234567890',
  accountHolder: 'BUDI SANTOSO'
});

const resBca = view._resolveUserPaymentMethod(userBca);
console.log('\n2. User dengan rekening Bank BCA:');
assert.strictEqual(resBca.method, 'bank', 'Method harus bank');
assert.strictEqual(resBca.isBank, true);
assert.strictEqual(resBca.registeredAccount, '1234567890');
assert.ok(resBca.label.includes('BCA'), 'Label harus menyebutkan BCA');
console.log('   ✓ Bank Transfer (BCA) terdeteksi dan nomor rekening terisi otomatis: ' + resBca.registeredAccount);

// Test Case 3: User with GoPay in profile
const userGopay = new User({
  id: 'usr-3',
  name: 'Asti',
  email: 'asti@example.com',
  bankName: 'GoPay',
  phone: '087790270362',
  accountNumber: '',
  accountHolder: 'ASTI'
});

const resGopay = view._resolveUserPaymentMethod(userGopay);
console.log('\n3. User dengan rekening GoPay:');
assert.strictEqual(resGopay.method, 'gopay', 'Method harus gopay');
assert.strictEqual(resGopay.label, 'GoPay');
assert.strictEqual(resGopay.registeredAccount, '087790270362');
console.log('   ✓ GoPay terdeteksi dan nomor HP e-wallet terisi otomatis: ' + resGopay.registeredAccount);

// Test Case 4: User with ShopeePay in profile
const userSpay = new User({
  id: 'usr-4',
  name: 'Siti',
  email: 'siti@example.com',
  bankName: 'ShopeePay',
  phone: '081399887766',
  accountHolder: 'SITI'
});

const resSpay = view._resolveUserPaymentMethod(userSpay);
console.log('\n4. User dengan rekening ShopeePay:');
assert.strictEqual(resSpay.method, 'shopeepay', 'Method harus shopeepay');
assert.strictEqual(resSpay.registeredAccount, '081399887766');
console.log('   ✓ ShopeePay terdeteksi dan nomor HP e-wallet terisi otomatis: ' + resSpay.registeredAccount);

// Test Case 5: HTML Output verification (Checked & Disabled attributes)
authService._currentUser = userDana;
const html = view.render();
assert.ok(html.includes('value="dana" checked'), 'DANA harus checked');
assert.ok(html.includes('value="gopay" disabled'), 'GoPay harus disabled');
assert.ok(html.includes('value="bank" disabled'), 'Bank Transfer harus disabled');
assert.ok(html.includes('value="085759433010"'), 'Input rekening harus bernilai nomor dari profil');
assert.ok(html.includes('readonly'), 'Input rekening harus readonly terkunci');
console.log('\n5. Verifikasi Render HTML:');
console.log('   ✓ Radio DANA terpasang checked');
console.log('   ✓ Radio lainnya terpasang disabled & locked');
console.log('   ✓ Input nomor rekening readonly dan terisi sesuai profil');

// Test Case 6: Dynamic sync when user updates profile
authService._currentUser = userBca;
const htmlBca = view.render();
assert.ok(htmlBca.includes('value="bank" checked'), 'Bank harus checked setelah update profil');
assert.ok(htmlBca.includes('value="dana" disabled'), 'DANA harus disabled setelah update profil');
assert.ok(htmlBca.includes('value="1234567890"'), 'Input rekening harus terisi nomor rekening BCA');
console.log('\n6. Verifikasi Sinkronisasi Dinamis Saat Profil Diubah:');
console.log('   ✓ Pilihan penarikan seketika berubah mengikuti profil baru (BCA)');
console.log('   ✓ Metode lain otomatis terkunci');

console.log('\n=== Semua Pengujian Sinkronisasi Berhasil (6/6 Passed) ===');
