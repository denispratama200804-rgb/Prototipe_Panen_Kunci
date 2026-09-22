import assert from 'assert';
import { User } from '../src/domain/models/User.js';
import { ServiceContainer } from '../src/core/container/ServiceContainer.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';
import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { WalletService } from '../src/infrastructure/services/WalletService.js';
import { ApiKeyService } from '../src/infrastructure/services/ApiKeyService.js';
import { WithdrawalValidator } from '../src/domain/validators/WithdrawalValidator.js';
import { WithdrawalStrategyFactory } from '../src/infrastructure/strategies/WithdrawalStrategyFactory.js';
import { ApiKeyValidator } from '../src/domain/validators/ApiKeyValidator.js';
import { NotificationService } from '../src/infrastructure/services/NotificationService.js';
import { ProfileView } from '../src/presentation/views/ProfileView.js';

console.log('=== RUNNING TESTS: GANTI NICKNAME & COOLDOWN 1 BULAN ===');

// 1. Test User Domain Model: canChangeNickname
console.log('\n1. Testing User.canChangeNickname()...');

const newUser = new User({
  id: 'usr-1',
  name: 'Siti Asti',
  email: 'sitiasti942@gmail.com'
});

const newCheck = newUser.canChangeNickname();
assert.strictEqual(newCheck.allowed, true, 'User baru harus diizinkan ganti nickname');
assert.strictEqual(newCheck.daysLeft, 0, 'Sisa hari harus 0 untuk user baru');
console.log('   ✓ User baru yang belum pernah ganti nickname dapat mengganti nickname.');

// User yang baru saja mengganti nickname detik ini
const justUpdatedUser = new User({
  id: 'usr-2',
  name: 'Siti Keren',
  email: 'sitiasti942@gmail.com',
  nicknameUpdatedAt: new Date().toISOString()
});

const blockedCheck = justUpdatedUser.canChangeNickname();
assert.strictEqual(blockedCheck.allowed, false, 'User yang baru ganti nickname harus diblokir');
assert(blockedCheck.daysLeft >= 29 && blockedCheck.daysLeft <= 30, `Sisa hari harus sekitar 30 hari (terbaca: ${blockedCheck.daysLeft})`);
assert(blockedCheck.nextDate instanceof Date, 'nextDate harus merupakan instance Date');
console.log(`   ✓ User yang baru ganti nickname diblokir selama 30 hari (sisa: ${blockedCheck.daysLeft} hari).`);

// User yang mengganti nickname 15 hari lalu
const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
const halfCooldownUser = new User({
  id: 'usr-3',
  name: 'Siti Tengah',
  email: 'sitiasti942@gmail.com',
  nicknameUpdatedAt: fifteenDaysAgo
});

const halfCheck = halfCooldownUser.canChangeNickname();
assert.strictEqual(halfCheck.allowed, false, 'User 15 hari lalu belum boleh ganti nama');
assert.strictEqual(halfCheck.daysLeft, 15, `Sisa hari harus 15 (terbaca: ${halfCheck.daysLeft})`);
console.log('   ✓ User yang ganti nickname 15 hari lalu dihitung sisa 15 hari dengan benar.');

// User yang mengganti nickname 31 hari lalu (sudah lewat 1 bulan)
const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
const readyUser = new User({
  id: 'usr-4',
  name: 'Siti Lama',
  email: 'sitiasti942@gmail.com',
  nicknameUpdatedAt: thirtyOneDaysAgo
});

const readyCheck = readyUser.canChangeNickname();
assert.strictEqual(readyCheck.allowed, true, 'User 31 hari lalu harus sudah diizinkan ganti nama lagi');
assert.strictEqual(readyCheck.daysLeft, 0, 'Sisa hari harus 0');
console.log('   ✓ User yang sudah melewati 30 hari (1 bulan) kembali diizinkan ganti nickname.');

// 2. Test JSON Serialization
console.log('\n2. Testing User.toJSON() serialization...');
const serialized = justUpdatedUser.toJSON();
assert(serialized.nicknameUpdatedAt !== undefined, 'toJSON harus menyertakan nicknameUpdatedAt');
assert.strictEqual(serialized.name, 'Siti Keren');
console.log('   ✓ toJSON() menyertakan nicknameUpdatedAt dengan benar:', serialized.nicknameUpdatedAt);

// 3. Test Container & AuthService.updateNickname
console.log('\n3. Testing AuthService.updateNickname()...');
const container = new ServiceContainer();
const eventBus = new EventBus();
const storage = new MemoryStorageAdapter();
const authValidator = new AuthValidator();
const authService = new AuthService(storage, authValidator, eventBus);
const withdrawalValidator = new WithdrawalValidator(9000);
const strategyFactory = new WithdrawalStrategyFactory();
const walletService = new WalletService(storage, withdrawalValidator, strategyFactory, eventBus);
const apiKeyValidator = new ApiKeyValidator();
const apiKeyService = new ApiKeyService(storage, apiKeyValidator, walletService, eventBus);
const notificationService = new NotificationService(eventBus, storage);

container.registerSingleton('EventBus', eventBus);
container.registerSingleton('IStorage', storage);
container.registerSingleton('AuthService', authService);
container.registerSingleton('WalletService', walletService);
container.registerSingleton('ApiKeyService', apiKeyService);
container.registerSingleton('NotificationService', notificationService);

// Login as new user
authService._currentUser = newUser;
authService._session = { userId: newUser.id, name: newUser.name, email: newUser.email, role: 'user' };

// Test invalid nickname validations
await assert.rejects(
  async () => await authService.updateNickname(''),
  /tidak boleh kosong/,
  'Harus tolak jika kosong'
);
await assert.rejects(
  async () => await authService.updateNickname('ab'),
  /minimal/,
  'Harus tolak jika kurang dari 3 karakter'
);
await assert.rejects(
  async () => await authService.updateNickname('Siti Asti'),
  /sama dengan nickname saat ini/,
  'Harus tolak jika sama persis'
);
console.log('   ✓ Validasi input nama kosong, terlalu pendek, atau nama yang sama bekerja dengan tepat.');

// Update nickname for the first time (successful)
const updateRes = await authService.updateNickname('Siti Cantik');
assert.strictEqual(updateRes.success, true);
assert.strictEqual(authService.getCurrentUser().name, 'Siti Cantik');
assert(authService.getCurrentUser().nicknameUpdatedAt !== null);
console.log('   ✓ Berhasil update nickname pertama kali ke "Siti Cantik", timestamp tercatat.');

// Try updating again immediately (should be blocked by 30-day cooldown)
await assert.rejects(
  async () => await authService.updateNickname('Siti Baru'),
  /sebulan sekali/,
  'Harus ditolak jika mencoba ganti nama sebelum 30 hari'
);
console.log('   ✓ Percobaan ganti nickname kedua langsung ditolak oleh batasan cooldown 30 hari.');

// 4. Test ProfileView Rendering
console.log('\n4. Testing ProfileView Rendering...');
const profileView = new ProfileView(container);
const renderedHtml = profileView.render();
assert(renderedHtml.includes('btnEditNickname'), 'ProfileView harus merender tombol #btnEditNickname');
assert(renderedHtml.includes('Ganti nickname lagi dalam'), 'ProfileView harus menampilkan sisa hari cooldown');
assert(renderedHtml.includes('Siti Cantik'), 'ProfileView harus menampilkan nama user terkini');
console.log('   ✓ ProfileView merender tombol edit nickname dan countdown cooldown dengan benar.');

// Test ProfileView for eligible user
authService._currentUser = readyUser;
const eligibleHtml = profileView.render();
assert(eligibleHtml.includes('btnEditNickname'), 'ProfileView harus merender tombol edit');
assert(eligibleHtml.includes('Siti Lama'), 'ProfileView harus menampilkan Siti Lama');
assert(!eligibleHtml.includes('Ganti nickname lagi dalam'), 'Tidak boleh ada peringatan countdown untuk user eligible');
console.log('   ✓ ProfileView merender tampilan untuk pengguna yang eligible ganti nama.');

console.log('\n=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===\n');
process.exit(0);
