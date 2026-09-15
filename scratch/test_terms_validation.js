import assert from 'node:assert';
import { AuthValidator } from '../src/domain/validators/AuthValidator.js';
import { AuthService } from '../src/infrastructure/services/AuthService.js';
import { MemoryStorageAdapter } from '../src/infrastructure/storage/MemoryStorageAdapter.js';
import { EventBus } from '../src/core/events/EventBus.js';

console.log('=== Test: Validasi Persetujuan Syarat & Ketentuan Layanan ===\n');

// 1. AuthValidator Tests
const validator = new AuthValidator();

console.log('[1] Testing AuthValidator with agreeTerms = false:');
const invalidResult = validator.validate({
  name: 'Budi Santoso',
  email: 'budi@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  agreeTerms: false
});
assert.strictEqual(invalidResult.isValid, false, 'Validation should fail when agreeTerms is false');
assert.ok(invalidResult.errors.some(e => e.includes('Syarat & Ketentuan')), 'Error must mention Syarat & Ketentuan');
console.log('  ✓ Correctly rejected when agreeTerms is false:', invalidResult.errors);

console.log('\n[2] Testing AuthValidator with agreeTerms = true:');
const validResult = validator.validate({
  name: 'Budi Santoso',
  email: 'budi@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  agreeTerms: true
});
assert.strictEqual(validResult.isValid, true, 'Validation should pass when agreeTerms is true');
console.log('  ✓ Successfully passed when agreeTerms is true');

// 2. AuthService Integration Test
console.log('\n[3] Testing AuthService.register with agreeTerms = false:');
const storage = new MemoryStorageAdapter();
const eventBus = new EventBus();
const authService = new AuthService(storage, validator, eventBus);

const serviceFailResult = await authService.register({
  name: 'Budi Santoso',
  email: 'budi.terms@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  agreeTerms: false
});
assert.strictEqual(serviceFailResult.success, false, 'Registration must fail when terms not agreed');
assert.ok(serviceFailResult.errors.some(e => e.includes('Syarat & Ketentuan')), 'Error must specify terms requirement');
console.log('  ✓ AuthService registration blocked without terms agreement');

console.log('\n[4] Testing AuthService.register with agreeTerms = true:');
const serviceSuccessResult = await authService.register({
  name: 'Budi Santoso',
  email: 'budi.terms@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  agreeTerms: true
});
assert.strictEqual(serviceSuccessResult.success, true, 'Registration must succeed when terms agreed');
console.log('  ✓ AuthService registration succeeded with terms agreement');

console.log('\n=== All Tests Passed Successfully! ===');
process.exit(0);
