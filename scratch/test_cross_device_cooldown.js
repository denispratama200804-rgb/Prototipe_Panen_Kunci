// scratch/test_cross_device_cooldown.js

function simulateCooldownCheck({ lastChangeTime, now = Date.now() }) {
  if (!lastChangeTime) {
    return { allowed: true, daysLeft: 0, nextDate: null };
  }

  const lastTime = new Date(lastChangeTime).getTime();
  if (isNaN(lastTime)) {
    return { allowed: true, daysLeft: 0, nextDate: null };
  }

  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const elapsed = now - lastTime;

  if (elapsed >= cooldownMs) {
    return { allowed: true, daysLeft: 0, nextDate: null };
  }

  const remainingDays = Math.max(1, Math.ceil((cooldownMs - elapsed) / (1000 * 60 * 60 * 24)));
  const nextDate = new Date(lastTime + cooldownMs);

  return {
    allowed: false,
    daysLeft: remainingDays,
    nextDate: nextDate.toISOString()
  };
}

console.log('--- Testing Cross-Device Cooldown Logic ---');

// Test 1: User updated nickname 1 day ago on Device 1
const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
const res1 = simulateCooldownCheck({ lastChangeTime: oneDayAgo });
console.log('Test 1 (Updated 1 day ago):', res1);
if (res1.allowed === false && res1.daysLeft === 29) {
  console.log('[PASS] Test 1: Blocked on new device with 29 days left');
} else {
  console.error('[FAIL] Test 1 failed:', res1);
  process.exit(1);
}

// Test 2: User updated nickname 29 days ago
const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
const res2 = simulateCooldownCheck({ lastChangeTime: twentyNineDaysAgo });
console.log('Test 2 (Updated 29 days ago):', res2);
if (res2.allowed === false && res2.daysLeft === 1) {
  console.log('[PASS] Test 2: Blocked on new device with 1 day left');
} else {
  console.error('[FAIL] Test 2 failed:', res2);
  process.exit(1);
}

// Test 3: User updated nickname 31 days ago
const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
const res3 = simulateCooldownCheck({ lastChangeTime: thirtyOneDaysAgo });
console.log('Test 3 (Updated 31 days ago):', res3);
if (res3.allowed === true) {
  console.log('[PASS] Test 3: Allowed after 30 days cooldown');
} else {
  console.error('[FAIL] Test 3 failed:', res3);
  process.exit(1);
}

// Test 4: User never changed nickname
const res4 = simulateCooldownCheck({ lastChangeTime: null });
console.log('Test 4 (Never changed):', res4);
if (res4.allowed === true) {
  console.log('[PASS] Test 4: Allowed for fresh user');
} else {
  console.error('[FAIL] Test 4 failed:', res4);
  process.exit(1);
}

console.log('\nALL CROSS-DEVICE COOLDOWN SIMULATION TESTS PASSED!');
