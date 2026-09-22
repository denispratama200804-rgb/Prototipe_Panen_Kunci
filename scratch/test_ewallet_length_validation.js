import assert from 'assert';

console.log('=== Test: Bank Account & E-Wallet Length Validation ===\n');

function validatePaymentInput(rawInput, type = 'ewallet') {
  const maxLen = type === 'ewallet' ? 14 : 16;
  const minLen = 10;

  let clean = (rawInput || '').replace(/\D/g, '');
  if (clean.length > maxLen) {
    clean = clean.slice(0, maxLen);
  }

  const len = clean.length;
  let hint = '';
  let status = '';

  if (len === 0) {
    hint = `Min. ${minLen} - Maks. ${maxLen} digit`;
    status = 'empty';
  } else if (len < minLen) {
    hint = `${len}/${maxLen} digit (Min. ${minLen} digit)`;
    status = 'too_short';
  } else {
    hint = `${len}/${maxLen} digit (Sesuai)`;
    status = 'valid';
  }

  const isValidForSave = len >= minLen && len <= maxLen;

  return { clean, len, maxLen, minLen, hint, status, isValidForSave };
}

// --- E-WALLET TESTS (Min 10, Max 14) ---
console.log('--- 1. Validasi E-Wallet (Min 10, Max 14) ---');
const ewEmpty = validatePaymentInput('', 'ewallet');
assert.strictEqual(ewEmpty.status, 'empty');
assert.strictEqual(ewEmpty.isValidForSave, false);

const ewShort = validatePaymentInput('08123456', 'ewallet'); // 8 digits
assert.strictEqual(ewShort.len, 8);
assert.strictEqual(ewShort.status, 'too_short');
assert.strictEqual(ewShort.hint, '8/14 digit (Min. 10 digit)');
assert.strictEqual(ewShort.isValidForSave, false);

const ewMin = validatePaymentInput('0812345678', 'ewallet'); // 10 digits
assert.strictEqual(ewMin.len, 10);
assert.strictEqual(ewMin.status, 'valid');
assert.strictEqual(ewMin.hint, '10/14 digit (Sesuai)');
assert.strictEqual(ewMin.isValidForSave, true);

const ewUser = validatePaymentInput('087790270362', 'ewallet'); // 12 digits
assert.strictEqual(ewUser.len, 12);
assert.strictEqual(ewUser.status, 'valid');
assert.strictEqual(ewUser.hint, '12/14 digit (Sesuai)');
assert.strictEqual(ewUser.isValidForSave, true);

const ewMax = validatePaymentInput('08123456789012', 'ewallet'); // 14 digits
assert.strictEqual(ewMax.len, 14);
assert.strictEqual(ewMax.status, 'valid');
assert.strictEqual(ewMax.hint, '14/14 digit (Sesuai)');
assert.strictEqual(ewMax.isValidForSave, true);

const ewOver = validatePaymentInput('08123456789012999', 'ewallet'); // 17 digits -> truncated to 14
assert.strictEqual(ewOver.len, 14);
assert.strictEqual(ewOver.clean, '08123456789012');
assert.strictEqual(ewOver.status, 'valid');
assert.strictEqual(ewOver.hint, '14/14 digit (Sesuai)');
console.log('✓ Semua tes e-wallet (Min 10, Max 14) berhasil!');

// --- BANK ACCOUNT TESTS (Min 10, Max 16) ---
console.log('\n--- 2. Validasi Nomor Rekening Bank (Min 10, Max 16) ---');
const bankEmpty = validatePaymentInput('', 'bank');
assert.strictEqual(bankEmpty.status, 'empty');
assert.strictEqual(bankEmpty.hint, 'Min. 10 - Maks. 16 digit');
assert.strictEqual(bankEmpty.isValidForSave, false);

const bankShort = validatePaymentInput('12345678', 'bank'); // 8 digits
assert.strictEqual(bankShort.len, 8);
assert.strictEqual(bankShort.status, 'too_short');
assert.strictEqual(bankShort.hint, '8/16 digit (Min. 10 digit)');
assert.strictEqual(bankShort.isValidForSave, false);

const bankMin = validatePaymentInput('1234567890', 'bank'); // 10 digits
assert.strictEqual(bankMin.len, 10);
assert.strictEqual(bankMin.status, 'valid');
assert.strictEqual(bankMin.hint, '10/16 digit (Sesuai)');
assert.strictEqual(bankMin.isValidForSave, true);

// Screenshot BCA number: 9837847432847 (13 digits)
const bankUser = validatePaymentInput('9837847432847', 'bank');
assert.strictEqual(bankUser.len, 13);
assert.strictEqual(bankUser.status, 'valid');
assert.strictEqual(bankUser.hint, '13/16 digit (Sesuai)');
assert.strictEqual(bankUser.isValidForSave, true);

const bankMax = validatePaymentInput('1234567890123456', 'bank'); // 16 digits
assert.strictEqual(bankMax.len, 16);
assert.strictEqual(bankMax.status, 'valid');
assert.strictEqual(bankMax.hint, '16/16 digit (Sesuai)');
assert.strictEqual(bankMax.isValidForSave, true);

const bankOver = validatePaymentInput('1234567890123456999', 'bank'); // 19 digits -> truncated to 16
assert.strictEqual(bankOver.len, 16);
assert.strictEqual(bankOver.clean, '1234567890123456');
assert.strictEqual(bankOver.status, 'valid');
assert.strictEqual(bankOver.hint, '16/16 digit (Sesuai)');
console.log('✓ Semua tes rekening bank (Min 10, Max 16) berhasil!');

console.log('\n Seluruh tes validasi rekening & e-wallet selesai dan lulus 100%!');
