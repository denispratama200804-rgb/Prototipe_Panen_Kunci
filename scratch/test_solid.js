import { ServiceContainer } from '../src/core/container/ServiceContainer.js';
import { EventBus, AppEvents } from '../src/core/events/EventBus.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';
import { ApiKeyValidator } from '../src/domain/validators/ApiKeyValidator.js';
import { WithdrawalValidator } from '../src/domain/validators/WithdrawalValidator.js';
import { WithdrawalStrategyFactory } from '../src/infrastructure/strategies/WithdrawalStrategyFactory.js';
import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { WalletService } from '../src/infrastructure/services/WalletService.js';
import { ApiKeyService } from '../src/infrastructure/services/ApiKeyService.js';
import { NotificationService } from '../src/infrastructure/services/NotificationService.js';

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
  console.log('=== Running SOLID Architecture & Domain Logic Tests ===\n');

  // Test 1: Service Container & DIP
  console.log('[1] Testing ServiceContainer (DIP):');
  const container = new ServiceContainer();
  const eventBus = new EventBus();
  const storage = new MemoryStorageAdapter();
  const authValidator = new AuthValidator();
  const apiKeyValidator = new ApiKeyValidator();
  const withdrawalValidator = new WithdrawalValidator(15000);
  const strategyFactory = new WithdrawalStrategyFactory();

  container.registerSingleton('EventBus', eventBus);
  container.registerSingleton('IStorage', storage);
  container.registerSingleton('AuthValidator', authValidator);
  container.registerSingleton('ApiKeyValidator', apiKeyValidator);
  container.registerSingleton('WithdrawalValidator', withdrawalValidator);
  container.registerSingleton('WithdrawalStrategyFactory', strategyFactory);

  assert(container.has('EventBus'), 'EventBus is registered');
  assert(container.has('IStorage'), 'IStorage is registered');
  assert(container.resolve('IStorage') === storage, 'IStorage resolves to registered instance');

  // Test 2: EventBus (SRP & Observer)
  console.log('\n[2] Testing EventBus (SRP):');
  let eventReceived = false;
  const unsub = eventBus.on('test:event', (data) => {
    if (data.msg === 'hello') eventReceived = true;
  });
  eventBus.emit('test:event', { msg: 'hello' });
  assert(eventReceived, 'EventBus dispatches events to listeners');
  unsub();

  // Test 3: Withdrawal Strategies (OCP & LSP)
  console.log('\n[3] Testing WithdrawalStrategyFactory (OCP & LSP):');
  const danaStrategy = strategyFactory.get('dana');
  assert(danaStrategy.getLabel() === 'DANA', 'Dana strategy resolved');
  assert(danaStrategy.calculateFee(50000) === 0, 'Dana fee is 0 (free promo)');
  const allStrategies = strategyFactory.getAll();
  assert(allStrategies.length === 4, 'All 4 strategies registered (DANA, GoPay, OVO, Bank)');

  // Test 4: AuthService
  console.log('\n[4] Testing AuthService:');
  const authService = new AuthService(storage, authValidator, eventBus);
  container.registerSingleton('AuthService', authService);

  const regResult = await authService.register({
    name: 'Denis Pratama',
    email: 'denis@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!'
  });
  assert(regResult.success === true, 'Registration succeeded');
  assert(authService.isAuthenticated() === true, 'User is authenticated');
  assert(authService.getCurrentUser().name === 'Denis Pratama', 'Current user matches registered user');

  // Test 5: WalletService
  console.log('\n[5] Testing WalletService:');
  const walletService = new WalletService(storage, withdrawalValidator, strategyFactory, eventBus);
  container.registerSingleton('WalletService', walletService);

  const initialBalance = walletService.getBalance();
  assert(typeof initialBalance === 'number' && initialBalance >= 0, `Initial balance is valid: ${initialBalance}`);

  // Test 6: ApiKeyService (Duplicate prevention & Reward)
  console.log('\n[6] Testing ApiKeyService (Syntax, Duplicates & Reward):');
  const apiKeyService = new ApiKeyService(storage, apiKeyValidator, walletService, eventBus);
  container.registerSingleton('ApiKeyService', apiKeyService);

  // Submit valid key
  const validKeyString = 'sk-kie-test1234567890abcdef';
  const submitResult = await apiKeyService.submitKey(validKeyString, 'usr_denis');
  assert(submitResult.success === true, 'Valid API Key accepted');
  assert(walletService.getBalance() === initialBalance + 3000, 'Reward Rp 3.000 added to wallet balance');

  // Submit duplicate key (SRS requirement)
  const dupResult = await apiKeyService.submitKey(validKeyString, 'usr_denis');
  assert(dupResult.success === false, 'Duplicate API Key correctly rejected');
  assert(dupResult.message.includes('sudah pernah'), 'Rejection message explains duplication');

  // Test 7: Withdrawal Execution
  console.log('\n[7] Testing Withdrawal:');
  const curBal = walletService.getBalance();
  const withdrawAmount = 20000;
  const withdrawResult = await walletService.withdraw({
    amount: withdrawAmount,
    method: 'dana',
    accountIdentifier: '081234567890',
    userId: 'usr_denis'
  });
  assert(withdrawResult.success === true, 'Withdrawal processed successfully');
  assert(walletService.getBalance() === curBal - withdrawAmount, 'Balance deducted accurately');

  console.log(`\n=== Tests Completed: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
