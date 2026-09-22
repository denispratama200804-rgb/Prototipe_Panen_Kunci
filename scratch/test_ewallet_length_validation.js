import assert from 'assert';

console.log('=== Test: Bank Account, E-Wallet & Account Holder Name Validation ===\n');

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

function filterAccountHolder(rawInput) {
  // Hanya huruf abjad (A-Z, a-z) dan spasi
  const clean = (rawInput || '').replace(/[^a-zA-Z\s]/g, '');
  const trimmed = clean.trim().replace(/\s+/g, ' ');
  const isValid = Boolean(trimmed) && /^[a-zA-Z\s]+$/.test(trimmed);
  return { clean, trimmed, isValid };
}

// --- E-WALLET TESTS (Min 10, Max 14) ---
console.log('--- 1. Validasi E-Wallet (Min 10, Max 14) ---');
const ewEmpty = validatePaymentInput('', 'ewallet');
assert.strictEqual(ewEmpty.status, 'empty');
assert.strictEqual(ewEmpty.isValidForSave, false);

const ewShort = validatePaymentInput('08123456', 'ewallet'); // 8 digits
assert.strictEqual(ewShort.len, 8);
assert.strictEqual(ewShort.status, 'too_short');

const ewUser = validatePaymentInput('087790270362', 'ewallet'); // 12 digits
assert.strictEqual(ewUser.len, 12);
assert.strictEqual(ewUser.status, 'valid');
assert.strictEqual(ewUser.hint, '12/14 digit (Sesuai)');
assert.strictEqual(ewUser.isValidForSave, true);

const ewOver = validatePaymentInput('08123456789012999', 'ewallet'); // 17 digits -> truncated to 14
assert.strictEqual(ewOver.len, 14);
assert.strictEqual(ewOver.clean, '08123456789012');
console.log('✓ Semua tes e-wallet (Min 10, Max 14) berhasil!');

// --- BANK ACCOUNT TESTS (Min 10, Max 16) ---
console.log('\n--- 2. Validasi Nomor Rekening Bank (Min 10, Max 16) ---');
const bankEmpty = validatePaymentInput('', 'bank');
assert.strictEqual(bankEmpty.status, 'empty');

const bankUser = validatePaymentInput('9837847432847', 'bank'); // 13 digits
assert.strictEqual(bankUser.len, 13);
assert.strictEqual(bankUser.status, 'valid');
assert.strictEqual(bankUser.hint, '13/16 digit (Sesuai)');
assert.strictEqual(bankUser.isValidForSave, true);

const bankOver = validatePaymentInput('1234567890123456999', 'bank'); // 19 digits -> truncated to 16
assert.strictEqual(bankOver.len, 16);
assert.strictEqual(bankOver.clean, '1234567890123456');
console.log('✓ Semua tes rekening bank (Min 10, Max 16) berhasil!');

// --- ACCOUNT HOLDER NAME TESTS (Alphabet only, no numbers, no symbols) ---
console.log('\n--- 3. Validasi Nama Pemilik Akun (Hanya Huruf Abjad & Spasi) ---');
const nameValid = filterAccountHolder('Siti Asti');
assert.strictEqual(nameValid.clean, 'Siti Asti');
assert.strictEqual(nameValid.trimmed, 'Siti Asti');
assert.strictEqual(nameValid.isValid, true);
console.log('✓ Nama valid "Siti Asti" diterima');

const nameWithNumbers = filterAccountHolder('Siti Asti 123');
assert.strictEqual(nameWithNumbers.clean, 'Siti Asti ');
assert.strictEqual(nameWithNumbers.trimmed, 'Siti Asti');
assert.strictEqual(nameWithNumbers.isValid, true);
console.log('✓ Angka otomatis difilter dari "Siti Asti 123" -> "Siti Asti"');

const nameWithSymbols = filterAccountHolder('Siti_Asti@#$!');
assert.strictEqual(nameWithSymbols.clean, 'SitiAsti');
assert.strictEqual(nameWithSymbols.trimmed, 'SitiAsti');
assert.strictEqual(nameWithSymbols.isValid, true);
console.log('✓ Simbol otomatis difilter dari "Siti_Asti@#$!" -> "SitiAsti"');

const nameOnlySymbols = filterAccountHolder('12345!@#$%^');
assert.strictEqual(nameOnlySymbols.clean, '');
assert.strictEqual(nameOnlySymbols.trimmed, '');
assert.strictEqual(nameOnlySymbols.isValid, false);
console.log('✓ Input tanpa huruf abjad ditolak');

console.log('\n Seluruh tes validasi selesai dan lulus 100%!');
