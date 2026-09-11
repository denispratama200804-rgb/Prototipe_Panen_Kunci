import assert from 'assert';
import { User } from '../src/domain/models/User.js';
import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { ProfileView } from '../src/presentation/views/ProfileView.js';
import { ServiceContainer } from '../src/core/container/ServiceContainer.js';
import { WalletService } from '../src/infrastructure/services/WalletService.js';
import { ApiKeyService } from '../src/infrastructure/services/ApiKeyService.js';
import { WithdrawalValidator } from '../src/domain/validators/WithdrawalValidator.js';
import { WithdrawalStrategyFactory } from '../src/infrastructure/strategies/WithdrawalStrategyFactory.js';
import { ApiKeyValidator } from '../src/domain/validators/ApiKeyValidator.js';
import { NotificationService } from '../src/infrastructure/services/NotificationService.js';

console.log('=== Test: User KYC & E-Wallet Verification Flow ===\n');

// 1. Test User Domain Model
console.log('1. Testing User Model hasPaymentDetails & isVerified:');
const newUser = new User({
  id: 'usr_new_1',
  name: 'Budi Baru',
  email: 'budibaru@gmail.com',
  isVerified: false
});
assert.strictEqual(newUser.isVerified, false, 'New user without payment should be unverified');
assert.strictEqual(newUser.hasPaymentDetails(), false, 'New user should not have payment details');

const userWithDana = new User({
  id: 'usr_dana',
  name: 'Fakhrul DANA',
  email: 'fakhrul@gmail.com',
  bankName: 'DANA',
  phone: '085759433010',
  accountNumber: '**** **** 3010'
});
assert.strictEqual(userWithDana.hasPaymentDetails(), true, 'User with DANA should have payment details');
assert.strictEqual(userWithDana.isVerified, true, 'User with DANA should automatically be verified');
console.log('   ✓ User Model correctly verifies accounts only when payment details exist.');

// 2. Setup Container & Services
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
const notificationService = new NotificationService();

container.registerSingleton('EventBus', eventBus);
container.registerSingleton('IStorage', storage);
container.registerSingleton('AuthService', authService);
container.registerSingleton('WalletService', walletService);
container.registerSingleton('ApiKeyService', apiKeyService);
container.registerSingleton('NotificationService', notificationService);

// 3. Testing Registration & updateProfile Flow
console.log('\n2. Testing Registration & Profile update flow:');
const regResult = await authService.register({
  name: 'Andi Pratama',
  email: 'andipratama@test.com',
  password: 'Password123!'
});
assert.strictEqual(regResult.success, true, 'Registration should succeed');
const currentUser = authService.getCurrentUser();
assert.strictEqual(currentUser.isVerified, false, 'Newly registered user MUST be unverified');
console.log('   ✓ Newly registered user is unverified (isVerified = false)');

// 4. Test ProfileView Rendering for Unverified User
const profileView = new ProfileView(container);
const unverifiedHtml = profileView.render();
assert(unverifiedHtml.includes('Belum Terverifikasi'), 'ProfileView should display "Belum Terverifikasi"');
console.log('   ✓ ProfileView displays "Belum Terverifikasi" badge for new user.');

// 5. User registers e-wallet via updateProfile
console.log('\n3. User registers E-Wallet (DANA):');
await authService.updateProfile({
  bankName: 'DANA',
  phone: '081234567890',
  accountHolder: 'ANDI PRATAMA',
  accountNumber: '081234567890'
});

const updatedUser = authService.getCurrentUser();
assert.strictEqual(updatedUser.isVerified, true, 'User MUST be verified after registering e-wallet');
console.log('   ✓ User is now verified (isVerified = true)');

// 6. Test ProfileView Rendering for Verified User
const verifiedHtml = profileView.render();
assert(verifiedHtml.includes('Akun Terverifikasi'), 'ProfileView should display "Akun Terverifikasi"');
assert(verifiedHtml.includes('verified'), 'ProfileView should display verified icon');
console.log('   ✓ ProfileView displays "Akun Terverifikasi" with green verified badge.');

console.log('\n=============================================================');
console.log('✅ ALL KYC & E-WALLET VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('=============================================================\n');
