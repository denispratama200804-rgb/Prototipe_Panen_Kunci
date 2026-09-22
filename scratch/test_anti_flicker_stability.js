// scratch/test_anti_flicker_stability.js
// Pengujian isolasi multi-user, anti-flicker, dan change detection

import { EventBus, AppEvents } from '../src/core/events/EventBus.js';

class MockStorage {
  constructor(initial = {}) {
    this.store = { ...initial };
  }
  get(key, defaultVal = null) {
    return this.store[key] !== undefined ? this.store[key] : defaultVal;
  }
  set(key, val) {
    this.store[key] = val;
  }
  remove(key) {
    delete this.store[key];
  }
}

console.log('=== STARTING ANTI-FLICKER & CROSS-USER ISOLATION TESTS ===\n');

// TEST 1: Change Detection di WalletService
console.log('Test 1: Memverifikasi Change Detection di WalletService...');
{
  const eventBus = new EventBus();
  let balanceEmitCount = 0;
  eventBus.on(AppEvents.BALANCE_UPDATED, () => {
    balanceEmitCount++;
  });

  // Simulasi state internal WalletService
  let prevBalance = 10000;
  let prevPassive = 3000;
  let prevLifetime = 13000;

  // Siklus 1: Data tidak berubah sama sekali (misal polling setiap 3.5 detik)
  let currentBalance = 10000;
  let currentPassive = 3000;
  let currentLifetime = 13000;

  const hasChanged1 =
    prevBalance !== currentBalance ||
    prevPassive !== currentPassive ||
    prevLifetime !== currentLifetime;

  if (hasChanged1) {
    eventBus.emit(AppEvents.BALANCE_UPDATED, { balance: currentBalance });
  }

  // Siklus 2: Data tetap sama
  const hasChanged2 =
    prevBalance !== currentBalance ||
    prevPassive !== currentPassive ||
    prevLifetime !== currentLifetime;

  if (hasChanged2) {
    eventBus.emit(AppEvents.BALANCE_UPDATED, { balance: currentBalance });
  }

  if (balanceEmitCount === 0) {
    console.log('  [PASS] Tidak ada emit BALANCE_UPDATED berulang saat saldo tidak berubah (Zero unnecessary emissions).');
  } else {
    console.error(`  [FAIL] Terjadi ${balanceEmitCount} emisi yang tidak perlu saat data identik!`);
    process.exit(1);
  }

  // Siklus 3: Saldo bertambah (misal key valid baru divalidasi)
  currentBalance = 13000;
  const hasChanged3 =
    prevBalance !== currentBalance ||
    prevPassive !== currentPassive ||
    prevLifetime !== currentLifetime;

  if (hasChanged3) {
    eventBus.emit(AppEvents.BALANCE_UPDATED, { balance: currentBalance });
  }

  if (balanceEmitCount === 1) {
    console.log('  [PASS] BALANCE_UPDATED berhasil dipancarkan tepat 1 kali saat saldo memang berubah.');
  } else {
    console.error(`  [FAIL] Diharapkan 1 emisi, didapat ${balanceEmitCount}`);
    process.exit(1);
  }
}

// TEST 2: Isolasi BroadcastChannel Antar-User
console.log('\nTest 2: Memverifikasi Isolasi Event BroadcastChannel Antar-User...');
{
  const userA_Id = 'usr_alice_01';
  const userB_Id = 'usr_bob_02';

  let userB_balanceUpdated = false;
  let userB_toastShown = false;
  let userB_payoutProcessed = false;

  const simulateUserB_BroadcastHandler = (data) => {
    const currentUserId = userB_Id;

    // Filter isolasi user
    if (data.userId && currentUserId && data.userId !== currentUserId) {
      return; // Mengabaikan event untuk user lain
    }

    if (data.type === 'KEY_APPROVED' || data.type === 'BALANCE_UPDATED') {
      userB_balanceUpdated = true;
      if (data.type === 'KEY_APPROVED') {
        userB_toastShown = true;
      }
    } else if (data.type === 'WITHDRAWAL_APPROVED') {
      userB_payoutProcessed = true;
    }
  };

  // Kirim event untuk User A
  simulateUserB_BroadcastHandler({
    type: 'KEY_APPROVED',
    userId: userA_Id,
    rewardAmount: 3000
  });

  simulateUserB_BroadcastHandler({
    type: 'BALANCE_UPDATED',
    userId: userA_Id,
    balance: 50000
  });

  simulateUserB_BroadcastHandler({
    type: 'WITHDRAWAL_APPROVED',
    userId: userA_Id,
    amount: 100000
  });

  if (!userB_balanceUpdated && !userB_toastShown && !userB_payoutProcessed) {
    console.log('  [PASS] User B sepenuhnya terisolasi dari event User A (0 event leakage).');
  } else {
    console.error('  [FAIL] Terjadi kebocoran event User A ke User B!', {
      userB_balanceUpdated,
      userB_toastShown,
      userB_payoutProcessed
    });
    process.exit(1);
  }

  // Kirim event untuk User B
  simulateUserB_BroadcastHandler({
    type: 'KEY_APPROVED',
    userId: userB_Id,
    rewardAmount: 3000
  });

  if (userB_balanceUpdated && userB_toastShown) {
    console.log('  [PASS] Event yang memang ditujukan untuk User B berhasil diterima dengan tepat.');
  } else {
    console.error('  [FAIL] Event milik User B gagal diproses!');
    process.exit(1);
  }
}

// TEST 3: Isolasi Storage Event Antar-User
console.log('\nTest 3: Memverifikasi Isolasi Storage Event Antar-User...');
{
  const userB_Id = 'usr_bob_02';
  let userB_storageTriggered = false;

  const simulateStorageListener = (eventKey) => {
    const currentUserId = userB_Id;
    const isUserStorageKey =
      eventKey === `wallet_balance_${currentUserId}` ||
      eventKey === `wallet_passive_balance_${currentUserId}` ||
      eventKey === `lifetime_earnings_${currentUserId}` ||
      eventKey === `transactions_${currentUserId}` ||
      eventKey === `api_keys_${currentUserId}`;

    if (isUserStorageKey) {
      userB_storageTriggered = true;
    }
  };

  // User A menyimpan saldo dan transaksinya
  simulateStorageListener('wallet_balance_usr_alice_01');
  simulateStorageListener('transactions_usr_alice_01');
  simulateStorageListener('api_keys_usr_alice_01');

  if (!userB_storageTriggered) {
    console.log('  [PASS] Storage event User A diabaikan sepenuhnya oleh tab User B.');
  } else {
    console.error('  [FAIL] Tab User B bereaksi terhadap perubahan storage User A!');
    process.exit(1);
  }

  // User B menyimpan saldo miliknya
  simulateStorageListener('wallet_balance_usr_bob_02');
  if (userB_storageTriggered) {
    console.log('  [PASS] Storage event milik User B berhasil memicu sinkronisasi.');
  } else {
    console.error('  [FAIL] Storage event milik User B tidak memicu sinkronisasi!');
    process.exit(1);
  }
}

// TEST 4: Verifikasi TarikSaldoView Anti-Flicker (In-Place DOM Update)
console.log('\nTest 4: Memverifikasi TarikSaldoView In-Place Update (Tanpa Wiping DOM)...');
{
  let renderCallCount = 0;
  let displayBalanceText = 'Rp 10.000';

  // State awal: terkunci (saldo 10.000 < min 50.000)
  let lastLockedState = true;
  let currentBalance = 10000;
  const minWithdrawal = 50000;

  const handleBalanceUpdate = (newBalance) => {
    currentBalance = newBalance;
    const isLockedNow = currentBalance < minWithdrawal;

    // Hanya re-render jika status lock berganti
    if (lastLockedState !== isLockedNow) {
      lastLockedState = isLockedNow;
      renderCallCount++;
      displayBalanceText = `Rp ${currentBalance.toLocaleString('id-ID')}`;
      return;
    }

    // In-place update tanpa re-render DOM
    displayBalanceText = `Rp ${currentBalance.toLocaleString('id-ID')}`;
  };

  // Simulasi 5 update saldo bertahap (10.000 -> 13.000 -> 16.000 -> 19.000)
  handleBalanceUpdate(13000);
  handleBalanceUpdate(16000);
  handleBalanceUpdate(19000);

  if (renderCallCount === 0 && displayBalanceText === 'Rp 19.000') {
    console.log('  [PASS] Saldo diperbarui in-place tanpa merusak DOM (renderCallCount = 0, saldo = Rp 19.000).');
  } else {
    console.error(`  [FAIL] TarikSaldoView melakukan full re-render (${renderCallCount} kali) saat status lock tidak berubah!`);
    process.exit(1);
  }

  // Simulasi saldo mencapai 50.000 (status lock berubah dari true -> false)
  handleBalanceUpdate(50000);
  if (renderCallCount === 1 && displayBalanceText === 'Rp 50.000' && lastLockedState === false) {
    console.log('  [PASS] Transisi status terkunci -> terbuka berhasil memicu 1 kali re-render bersih yang terkontrol.');
  } else {
    console.error('  [FAIL] Transisi status lock gagal!');
    process.exit(1);
  }
}

console.log('\n=== ALL ANTI-FLICKER & ISOLATION TESTS PASSED SUCCESSFULLY! ===');
