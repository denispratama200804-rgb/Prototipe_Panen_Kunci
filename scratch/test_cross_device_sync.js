import handler from '../api/supabase-proxy.js';

// Helper untuk membuat mock request dan response
function createMockReqRes(body = {}, query = {}, method = 'POST') {
  const req = {
    method,
    body,
    query,
    headers: {}
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    setHeader() {},
    end() {}
  };

  return { req, res, getResult: () => ({ statusCode, data: responseData }) };
}

async function runTests() {
  console.log('--- STARTING CROSS-DEVICE SYNC TESTS ---');
  const testUserId = 'test_user_cross_device_' + Date.now();

  // Test 1: Add Notification (Simulating Action from Client 1 / Mobile Phone)
  console.log('\n[Test 1] Menambahkan notifikasi dari Client 1 (HP)...');
  const notif1 = {
    id: 'notif_test_' + Date.now(),
    title: 'Penarikan Saldo Berhasil',
    message: 'Dana Rp 150.000 telah masuk ke DANA',
    type: 'withdrawal_success',
    amount: 150000,
    recipient: '08123456789 (DANA)',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  const { req: req1, res: res1, getResult: getRes1 } = createMockReqRes({
    action: 'add_notification',
    userId: testUserId,
    notification: notif1
  });

  await handler(req1, res1);
  const result1 = getRes1();
  console.log('Result 1 status:', result1.statusCode, 'success:', result1.data?.success);
  if (!result1.data?.success) {
    throw new Error('Test 1 Failed: ' + JSON.stringify(result1.data));
  }

  // Test 2: Fetch Notifications (Simulating Client 2 / Laptop syncing from cloud)
  console.log('\n[Test 2] Client 2 (Laptop) mengambil notifikasi dari Cloud Supabase...');
  const { req: req2, res: res2, getResult: getRes2 } = createMockReqRes({
    action: 'get_notifications',
    userId: testUserId
  });

  await handler(req2, res2);
  const result2 = getRes2();
  console.log('Result 2 notifications count:', result2.data?.data?.length);
  const foundNotif = result2.data?.data?.find(n => n.id === notif1.id);
  if (!foundNotif || foundNotif.isRead !== false) {
    throw new Error('Test 2 Failed: Notifikasi belum tersinkron ke Laptop atau status bukan unread');
  }
  console.log('✅ Client 2 (Laptop) berhasil menerima notifikasi yang dikirimkan Client 1!');

  // Test 3: Client 2 marks notification as Read (Laptop clicks notification)
  console.log('\n[Test 3] Client 2 (Laptop) menandai notifikasi sebagai sudah dibaca...');
  const { req: req3, res: res3, getResult: getRes3 } = createMockReqRes({
    action: 'mark_notifications_read',
    userId: testUserId,
    notificationId: notif1.id
  });

  await handler(req3, res3);
  const result3 = getRes3();
  console.log('Result 3 status:', result3.statusCode, 'success:', result3.data?.success);
  if (!result3.data?.success) {
    throw new Error('Test 3 Failed: Gagal menandai sudah dibaca di cloud');
  }

  // Test 4: Client 1 (Phone) syncs again and sees isRead: true
  console.log('\n[Test 4] Client 1 (HP) sinkronisasi ulang dan memastikan status sudah dibaca (isRead: true)...');
  const { req: req4, res: res4, getResult: getRes4 } = createMockReqRes({
    action: 'get_notifications',
    userId: testUserId
  });

  await handler(req4, res4);
  const result4 = getRes4();
  const readNotif = result4.data?.data?.find(n => n.id === notif1.id);
  console.log('Notif isRead status di Client 1 (HP):', readNotif?.isRead);
  if (!readNotif || readNotif.isRead !== true) {
    throw new Error('Test 4 Failed: Status isRead tidak tersinkron kembali ke HP!');
  }
  console.log('✅ Status sudah dibaca tersinkron sempurna dari Laptop ke HP!');

  // Test 5: Admin sends announcement notification to user
  console.log('\n[Test 5] Admin Panel mengirim pengumuman/notifikasi baru ke user...');
  const adminNotif = {
    id: 'notif_admin_' + Date.now(),
    title: 'Pengumuman Maintenance Selesai',
    message: 'Sistem telah berjalan normal kembali.',
    type: 'info',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  const { req: req5, res: res5, getResult: getRes5 } = createMockReqRes({
    action: 'add_notification',
    userId: testUserId,
    notification: adminNotif
  });

  await handler(req5, res5);
  const result5 = getRes5();
  console.log('Result 5 admin notif added:', result5.data?.success);

  // Both HP and Laptop fetch and find both notifications
  const { req: req6, res: res6, getResult: getRes6 } = createMockReqRes({
    action: 'get_notifications',
    userId: testUserId
  });

  await handler(req6, res6);
  const result6 = getRes6();
  const allNotifs = result6.data?.data || [];
  console.log('Total notifikasi tersinkron:', allNotifs.length);
  if (allNotifs.length < 2) {
    throw new Error('Test 5 Failed: Notifikasi dari admin tidak lengkap');
  }
  console.log('✅ Notifikasi admin berhasil masuk dan terbaca oleh HP & Laptop!');

  // Cleanup: Delete notifications for test user
  console.log('\n[Cleanup] Menghapus notifikasi testing...');
  for (const n of allNotifs) {
    const { req: reqDel, res: resDel } = createMockReqRes({
      action: 'delete_notification',
      userId: testUserId,
      notificationId: n.id
    });
    await handler(reqDel, resDel);
  }

  const { req: reqFinal, res: resFinal, getResult: getResFinal } = createMockReqRes({
    action: 'get_notifications',
    userId: testUserId
  });
  await handler(reqFinal, resFinal);
  const finalCount = getResFinal().data?.data?.length || 0;
  console.log('Final notifications count after cleanup:', finalCount);
  if (finalCount !== 0) {
    throw new Error('Cleanup Failed');
  }

  console.log('\n🎉 ALL CROSS-DEVICE SYNC TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
