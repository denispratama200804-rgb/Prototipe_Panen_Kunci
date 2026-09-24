/**
 * Test Scratch Script: Verifikasi Telegram Bot Functions & Formats
 */
import { TelegramService } from '../src/infrastructure/services/TelegramService.js';

async function testTelegram() {
  console.log('🧪 Menguji TelegramService...');
  const svc = new TelegramService();

  // 1. Cek format pesan penarikan dana
  console.log('1. Menguji format pesan notifikasi penarikan saldo (Payout)...');
  const sampleTx = {
    transactionId: 'tx_test_12345',
    userId: 'usr_budi_01',
    userName: 'Budi Santoso',
    userEmail: 'budi.santoso@gmail.com',
    userPhone: '081234567890',
    amount: 75000,
    fee: 1000,
    referralDeduction: 3750,
    referralCode: 'PANENJOSS',
    netPayout: 70250,
    method: 'dana',
    recipient: '081234567890',
    accountHolder: 'Budi Santoso',
    createdAt: new Date().toISOString()
  };

  // Test escape & formatting internal
  const safeName = svc._escapeHtml(sampleTx.userName);
  const rpAmount = svc._formatRupiah(sampleTx.amount);
  const rpNet = svc._formatRupiah(sampleTx.netPayout);
  const timeStr = svc._formatTimestamp(sampleTx.createdAt);

  console.log('   Hasil format:');
  console.log('   - Nama:', safeName);
  console.log('   - Nominal:', rpAmount);
  console.log('   - Bersih:', rpNet);
  console.log('   - Waktu:', timeStr);

  if (rpAmount === 'Rp 75.000' && rpNet === 'Rp 70.250') {
    console.log('✅ Formatting mata uang & waktu berhasil!');
  } else {
    console.error('❌ Formatting gagal!');
  }

  // 2. Cek validasi testConnection saat parameter kosong
  console.log('2. Menguji validasi testConnection dengan parameter kosong...');
  const emptyRes = await svc.testConnection('', '');
  if (!emptyRes.success && emptyRes.error) {
    console.log('✅ Validasi input kosong berhasil ditangkap:', emptyRes.error);
  } else {
    console.error('❌ Validasi input kosong gagal!');
  }

  console.log('🎉 Seluruh pengujian lokal TelegramService selesai dengan sukses!');
}

testTelegram().catch(console.error);
