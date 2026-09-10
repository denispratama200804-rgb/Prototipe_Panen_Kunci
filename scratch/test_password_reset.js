import { ServiceContainer } from '../src/core/container/ServiceContainer.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';
import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { NotificationService } from '../src/infrastructure/services/NotificationService.js';
import { routes } from '../src/core/router/routes.js';
import { ResetPasswordView } from '../src/presentation/views/ResetPasswordView.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== Running Password Reset & AuthService Unit Tests ===\n');

  const container = new ServiceContainer();
  const eventBus = new EventBus();
  const storage = new MemoryStorageAdapter();
  const authValidator = new AuthValidator();

  container.registerSingleton('EventBus', eventBus);
  container.registerSingleton('IStorage', storage);
  container.registerSingleton('AuthValidator', authValidator);

  const notificationService = new NotificationService(eventBus, storage);
  container.registerSingleton('NotificationService', notificationService);

  const authService = new AuthService(storage, authValidator, eventBus, null);
  container.registerSingleton('AuthService', authService);

  // 1. Test routes configuration
  console.log('[1] Testing routes configuration:');
  const resetRoute = routes.find(r => r.path === '/reset-password');
  assert(Boolean(resetRoute), 'Route /reset-password is registered');
  assert(resetRoute?.viewClass === ResetPasswordView, 'Route /reset-password maps to ResetPasswordView');
  assert(resetRoute?.requiresAuth === false, 'Route /reset-password allows guest access');

  // 2. Test ResetPasswordView rendering
  console.log('\n[2] Testing ResetPasswordView rendering:');
  const view = new ResetPasswordView(container);
  const html = view.render();
  assert(html.includes('Kata Sandi Baru'), 'ResetPasswordView renders heading');
  assert(html.includes('id="newPassword"'), 'ResetPasswordView includes newPassword input');
  assert(html.includes('id="confirmPassword"'), 'ResetPasswordView includes confirmPassword input');
  assert(html.includes('id="submitResetBtn"'), 'ResetPasswordView includes submit button');
  assert(html.includes('id="toggleNewPassword"'), 'ResetPasswordView includes password visibility toggle');

  // 3. Test sendPasswordResetEmail validations
  console.log('\n[3] Testing sendPasswordResetEmail validations:');
  const emptyRes = await authService.sendPasswordResetEmail('');
  assert(!emptyRes.success && emptyRes.message.includes('wajib diisi'), 'Empty email rejected with appropriate message');

  const invalidRes = await authService.sendPasswordResetEmail('not-an-email');
  assert(!invalidRes.success && invalidRes.message.includes('tidak valid'), 'Invalid email format rejected');

  const unknownRes = await authService.sendPasswordResetEmail('unknownuser9988@gmail.com');
  assert(!unknownRes.success && unknownRes.message.includes('tidak terdaftar'), 'Unregistered email rejected');

  // Register a mock user in storage
  storage.set('registered_accounts', [
    { id: 'usr_test_1', email: 'testuser@gmail.com', name: 'Test User', password: 'oldpassword123' }
  ]);

  const existingRes = await authService.sendPasswordResetEmail('testuser@gmail.com');
  assert(existingRes.success, 'Registered email accepted for reset');

  // 4. Test updateUserPassword
  console.log('\n[4] Testing updateUserPassword validations:');
  const shortPassRes = await authService.updateUserPassword('123');
  assert(!shortPassRes.success && shortPassRes.message.includes('minimal 6'), 'Short password rejected');

  const validPassRes = await authService.updateUserPassword('newsecretpassword123');
  assert(validPassRes.success, 'Valid password accepted and updated');

  console.log(`\n=== Tests Completed: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
