import assert from 'assert';

console.log('=== Test: E-Wallet Length Validation (Min: 10, Max: 14) ===\n');

function validateEwalletNumber(rawInput) {
  let clean = (rawInput || '').replace(/\D/g, '');
  if (clean.length > 14) {
    clean = clean.slice(0, 14);
  }

  const len = clean.length;
  let hint = '';
  let status = '';

  if (len === 0) {
    hint = 'Min. 10 - Maks. 14 digit';
    status = 'empty';
  } else if (len < 10) {
    hint = `${len}/14 digit (Min. 10 digit)`;
    status = 'too_short';
  } else {
    hint = `${len}/14 digit (Sesuai)`;
    status = 'valid';
  }

  const isValidForSave = len >= 10 && len <= 14;

  return { clean, len, hint, status, isValidForSave };
}

// Test 1: Empty input
const t1 = validateEwalletNumber('');
assert.strictEqual(t1.len, 0);
assert.strictEqual(t1.status, 'empty');
assert.strictEqual(t1.isValidForSave, false);
console.log('✓ Test 1 Passed: Empty input ditolak (harus diisi)');

// Test 2: Input kurang dari 10 digit (misal: 8 digit)
const t2 = validateEwalletNumber('08123456');
assert.strictEqual(t2.len, 8);
assert.strictEqual(t2.status, 'too_short');
assert.strictEqual(t2.hint, '8/14 digit (Min. 10 digit)');
assert.strictEqual(t2.isValidForSave, false);
console.log('✓ Test 2 Passed: 8 digit ditolak (kurang dari 10 digit)');

// Test 3: Input tepat 10 digit
const t3 = validateEwalletNumber('0812345678');
assert.strictEqual(t3.len, 10);
assert.strictEqual(t3.status, 'valid');
assert.strictEqual(t3.hint, '10/14 digit (Sesuai)');
assert.strictEqual(t3.isValidForSave, true);
console.log('✓ Test 3 Passed: 10 digit valid (batas minimum)');

// Test 4: Input 12 digit (seperti pada screenshot user: 087790270362)
const t4 = validateEwalletNumber('087790270362');
assert.strictEqual(t4.len, 12);
assert.strictEqual(t4.status, 'valid');
assert.strictEqual(t4.hint, '12/14 digit (Sesuai)');
assert.strictEqual(t4.isValidForSave, true);
console.log('✓ Test 4 Passed: 12 digit valid (contoh nomor user: 087790270362)');

// Test 5: Input tepat 14 digit
const t5 = validateEwalletNumber('08123456789012');
assert.strictEqual(t5.len, 14);
assert.strictEqual(t5.status, 'valid');
assert.strictEqual(t5.hint, '14/14 digit (Sesuai)');
assert.strictEqual(t5.isValidForSave, true);
console.log('✓ Test 5 Passed: 14 digit valid (batas maksimum)');

// Test 6: Input melebihi 14 digit (dipotong otomatis ke 14 digit)
const t6 = validateEwalletNumber('081234567890123456');
assert.strictEqual(t6.len, 14);
assert.strictEqual(t6.clean, '08123456789012');
assert.strictEqual(t6.status, 'valid');
assert.strictEqual(t6.hint, '14/14 digit (Sesuai)');
assert.strictEqual(t6.isValidForSave, true);
console.log('✓ Test 6 Passed: Input lebih dari 14 digit dipotong otomatis');

// Test 7: Input dengan format karakter non-digit (spasi, strip)
const t7 = validateEwalletNumber('0812-3456-7890');
assert.strictEqual(t7.len, 12);
assert.strictEqual(t7.clean, '081234567890');
assert.strictEqual(t7.status, 'valid');
assert.strictEqual(t7.hint, '12/14 digit (Sesuai)');
console.log('✓ Test 7 Passed: Karakter non-digit otomatis difilter');

console.log('\n Semua tes validasi nomor e-wallet (Min 10, Max 14) berhasil 100%!');
