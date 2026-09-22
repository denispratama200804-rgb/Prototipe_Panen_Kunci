import assert from 'assert';

console.log('=== Test: Account Number Constraints (Min 10, Max 16 Digits) ===\n');

// 1. Test digit filter & max 16 digits
function filterAccountNumber(input) {
  return input.replace(/\D/g, '').slice(0, 16);
}

assert.strictEqual(filterAccountNumber('12345'), '12345');
assert.strictEqual(filterAccountNumber('1234abcd5678'), '12345678');
assert.strictEqual(filterAccountNumber('1234-5678-9012-3456-7890'), '1234567890123456'); // Capped to 16
assert.strictEqual(filterAccountNumber('1234-5678-9012-3456').length, 16);
console.log('✓ Filter non-digits dan pemotongan maksimal 16 digit berfungsi dengan benar.');

// 2. Test validation logic
function validateAccountNumber(acc) {
  const digits = (acc || '').trim().replace(/\D/g, '');
  if (!digits) {
    return { valid: false, message: 'Nomor Rekening bank wajib diisi!' };
  }
  if (digits.length < 10) {
    return { valid: false, message: 'Nomor Rekening minimal 10 digit angka!' };
  }
  if (digits.length > 16) {
    return { valid: false, message: 'Nomor Rekening maksimal 16 digit angka!' };
  }
  return { valid: true, value: digits };
}

// Case a: 1 digit (from user's screenshot)
const res1 = validateAccountNumber('1');
assert.strictEqual(res1.valid, false);
assert.strictEqual(res1.message, 'Nomor Rekening minimal 10 digit angka!');
console.log('✓ Input "1" (seperti di screenshot) ditolak karena kurang dari 10 digit.');

// Case b: 9 digits
const res9 = validateAccountNumber('123456789');
assert.strictEqual(res9.valid, false);
assert.strictEqual(res9.message, 'Nomor Rekening minimal 10 digit angka!');
console.log('✓ Input 9 digit ditolak.');

// Case c: 10 digits (BCA standard)
const res10 = validateAccountNumber('1234567890');
assert.strictEqual(res10.valid, true);
assert.strictEqual(res10.value, '1234567890');
console.log('✓ Input 10 digit (misal BCA) berhasil divalidasi.');

// Case d: 15 digits (BRI standard)
const res15 = validateAccountNumber('001201000123508');
assert.strictEqual(res15.valid, true);
assert.strictEqual(res15.value, '001201000123508');
console.log('✓ Input 15 digit (misal BRI) berhasil divalidasi.');

// Case e: 16 digits
const res16 = validateAccountNumber('1234567890123456');
assert.strictEqual(res16.valid, true);
assert.strictEqual(res16.value, '1234567890123456');
console.log('✓ Input 16 digit (maksimal) berhasil divalidasi.');

// Case f: 17 digits before filter
const raw17 = '12345678901234567';
const filtered17 = filterAccountNumber(raw17);
assert.strictEqual(filtered17.length, 16);
const res17 = validateAccountNumber(filtered17);
assert.strictEqual(res17.valid, true);
assert.strictEqual(res17.value.length, 16);
console.log('✓ Input lebih dari 16 digit otomatis dipotong menjadi maksimal 16 digit.');

console.log('\n=== Semua pengujian validasi nomor rekening berhasil (PASSED) ===');
