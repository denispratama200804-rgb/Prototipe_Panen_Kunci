// scratch/test_nickname_validation.js

function validateNickname(rawInput) {
  const sanitized = (rawInput || '').trim().replace(/\s+/g, ' ');

  if (!sanitized) {
    return { valid: false, error: 'Nickname tidak boleh kosong.' };
  }
  if (!/^[a-zA-Z\s]+$/.test(sanitized)) {
    return { valid: false, error: 'Nickname hanya boleh berisi huruf abjad dan spasi (tidak boleh mengandung angka atau simbol).' };
  }
  if (sanitized.replace(/\s+/g, '').length < 3) {
    return { valid: false, error: 'Nickname minimal harus terdiri dari 3 huruf abjad.' };
  }
  if (sanitized.length > 30) {
    return { valid: false, error: 'Nickname maksimal 30 karakter.' };
  }

  return { valid: true, sanitized };
}

function testRealtimeClean(input) {
  return input.replace(/[^a-zA-Z\s]/g, '');
}

console.log('--- Testing Nickname Validation ---');

const testCases = [
  { input: '679', expectValid: false, desc: 'Current user numerical nickname "679"' },
  { input: '679abc', expectValid: false, desc: 'Mixed numbers and letters' },
  { input: 'Denis123', expectValid: false, desc: 'Letters with numbers at end' },
  { input: 'Denis_Pratama', expectValid: false, desc: 'Letters with underscore' },
  { input: 'Denis-Pratama', expectValid: false, desc: 'Letters with hyphen' },
  { input: 'Denis@Dev', expectValid: false, desc: 'Letters with @' },
  { input: 'Denis.Dev', expectValid: false, desc: 'Letters with period' },
  { input: 'Denis!#$', expectValid: false, desc: 'Letters with special symbols' },
  { input: 'De', expectValid: false, desc: 'Less than 3 letters' },
  { input: '   ', expectValid: false, desc: 'Whitespace only' },
  { input: 'a b', expectValid: false, desc: 'Only 2 letters with space' },
  { input: 'Denis', expectValid: true, desc: 'Single word alphabet' },
  { input: 'Denis Pratama', expectValid: true, desc: 'Two words with space' },
  { input: 'Denis   Pratama', expectValid: true, desc: 'Multiple spaces normalized to single space' },
  { input: 'Nate Americk', expectValid: true, desc: 'Another valid name' },
  { input: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef', expectValid: false, desc: 'Exceeds 30 characters' }
];

let failed = 0;
for (const tc of testCases) {
  const res = validateNickname(tc.input);
  const passed = res.valid === tc.expectValid;
  if (passed) {
    console.log(`[PASS] ${tc.desc}: "${tc.input}" -> valid=${res.valid} ${res.valid ? `(clean: "${res.sanitized}")` : `(${res.error})`}`);
  } else {
    console.error(`[FAIL] ${tc.desc}: "${tc.input}" -> expected valid=${tc.expectValid}, got ${res.valid}`);
    failed++;
  }
}

console.log('\n--- Testing Realtime Input Cleaning ---');
console.log('Raw "679" cleaned to:', JSON.stringify(testRealtimeClean('679')));
console.log('Raw "Denis123#_@" cleaned to:', JSON.stringify(testRealtimeClean('Denis123#_@')));
console.log('Raw "Budi Pratama" cleaned to:', JSON.stringify(testRealtimeClean('Budi Pratama')));

if (failed === 0) {
  console.log('\nALL 16 NICKNAME TESTS PASSED SUCCESSFULLY!');
} else {
  console.error(`\n${failed} TESTS FAILED!`);
  process.exit(1);
}
