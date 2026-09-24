import { AppEvents } from '../../core/events/EventBus.js';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';

/**
 * NotificationService
 * Prinsip: Single Responsibility Principle (SRP)
 * Bertanggung jawab mengelola notifikasi, toast, modal dialog,
 * serta sinkronisasi data notifikasi lintas-perangkat (HP <-> Laptop) via Supabase Cloud.
 */
export class NotificationService {
  /**
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   * @param {import('../../core/interfaces/IStorage.js').IStorage} [storage]
   */
  constructor(eventBus, storage = null) {
    this._eventBus = eventBus;
    this._storage = storage;
    this._realtimeChannel = null;
    this._isSyncing = false;
    this._broadcastChannel = null;

    if (typeof window !== 'undefined') {
      // 1. Cross-tab synchronization via BroadcastChannel
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this._broadcastChannel = new BroadcastChannel('panenkunci_sync');
          this._broadcastChannel.onmessage = (event) => {
            const data = event.data;
            if (!data) return;
            const currentUserId = this._getUserId();
            if (data.userId && currentUserId && data.userId !== currentUserId) return;

            if (
              data.type === 'NOTIFICATION_ADDED' ||
              data.type === 'NOTIFICATIONS_MARKED_READ' ||
              data.type === 'NOTIFICATION_DELETED' ||
              data.type === 'NOTIFICATIONS_UPDATED'
            ) {
              this.syncFromRemote().catch(() => {});
            }
          };
        } catch (_) {}
      }

      // 2. Cross-tab synchronization via storage event
      window.addEventListener('storage', (e) => {
        if (!e.key) return;
        const userId = this._getUserId();
        if (e.key === `notifications_${userId}` || e.key === `transactions_${userId}`) {
          this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);
        }
      });

      // 3. Tab Visibility & Focus listener: sinkronisasi otomatis saat user membuka/beralih kembali ke tab
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncFromRemote().catch(() => {});
        }
      });
      window.addEventListener('focus', () => {
        this.syncFromRemote().catch(() => {});
      });

      // 4. Polling berkala (failover jika websocket terputus) setiap 3.5 detik saat tab aktif
      this._pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          const userId = this._getUserId();
          if (userId) {
            this.syncFromRemote().catch(() => {});
          }
        }
      }, 3500);

      // 5. Supabase Realtime Subscription untuk Notifikasi Terpusat
      this._setupRealtimeSubscription();
    }

    // Auto-sync notifications saat user login/logout/ganti akun
    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this._setupRealtimeSubscription();
      this.syncFromRemote().catch(() => {});
    });

    // Real-time Payout Notifications (Diterima / Ditolak)
    this._eventBus.on('PAYOUT_PROCESSED', (payload) => {
      if (!payload) return;
      const isSuccess = payload.type === 'success' || ['success', 'valid', 'approved', 'completed', 'berhasil'].includes(payload.status);
      const title = payload.title || (isSuccess ? 'Penarikan Saldo Diterima!' : 'Permintaan Penarikan Ditolak');

      this.addNotification({
        id: 'notif_live_' + (payload.transactionId || Math.random().toString(36).substring(2, 9)),
        transactionId: payload.transactionId,
        userId: payload.userId || this._getUserId(),
        type: isSuccess ? 'withdrawal_success' : 'withdrawal_failed',
        title,
        message: payload.message,
        amount: payload.amount || payload.refundAmount,
        proofImage: payload.proofImage || '',
        proofNotes: payload.proofNotes || '',
        createdAt: new Date().toISOString()
      });

      // Munculkan toast interaktif
      this.toast(payload.message, isSuccess ? 'success' : 'error', 6000);

      // Munculkan dialog modal pop-up interaktif ke layar pengguna
      this.showModal({
        title,
        message: payload.message,
        type: isSuccess ? 'success' : 'error',
        confirmText: 'Buka Notifikasi',
        onConfirm: () => {
          document.getElementById('header-notif-btn')?.click();
        }
      });
    });

    // Auto-sync notifications when transactions are loaded from remote/local
    this._eventBus.on(AppEvents.TRANSACTIONS_LOADED, (payload) => {
      if (payload && Array.isArray(payload.transactions)) {
        this.syncFromTransactions(payload.transactions);
      }
    });

    // Jalankan sync perdana dari remote di background
    this.syncFromRemote().catch(() => {});
  }

  /**
   * Menghubungkan Supabase Realtime channel untuk memantau perubahan notifikasi langsung dari cloud
   * @private
   */
  _setupRealtimeSubscription() {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      if (this._realtimeChannel) {
        supabase.removeChannel(this._realtimeChannel);
        this._realtimeChannel = null;
      }

      const userId = this._getUserId();
      this._realtimeChannel = supabase
        .channel(`client_notifs_${userId || 'public'}_${Date.now()}`)
        // 1. Pantau central store (NOTIFICATION_STORE_ID) di tabel users
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
            filter: 'id=eq.00000000-0000-0000-0000-000000000004'
          },
          () => {
            this.syncFromRemote().catch(() => {});
          }
        )
        // 2. Pantau perubahan transaksi penarikan user
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions'
          },
          (payload) => {
            const currentUserId = this._getUserId();
            const isTarget = !payload.new?.user_id || payload.new?.user_id === currentUserId || payload.old?.user_id === currentUserId;
            if (isTarget) {
              this.syncFromRemote().catch(() => {});
            }
          }
        )
        // 3. Pantau tabel notifications langsung jika ada
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications'
          },
          (payload) => {
            const currentUserId = this._getUserId();
            const isTarget = !payload.new?.user_id || payload.new?.user_id === currentUserId || payload.old?.user_id === currentUserId;
            if (isTarget) {
              this.syncFromRemote().catch(() => {});
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[NotificationService] Realtime subscription init warning:', e.message);
    }
  }

  /**
   * Sinkronisasi data notifikasi dari database Supabase Cloud
   * Menjamin notifikasi HP dan Laptop selalu identik secara real-time
   * @returns {Promise<Array<Object>>}
   */
  async syncFromRemote() {
    const userId = this._getUserId();
    if (!userId || this._isSyncing) return this.getNotifications();
    this._isSyncing = true;

    try {
      let remoteNotifs = null;

      // Ambil notifikasi dari Server Proxy Supabase
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_notifications',
            userId: userId
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data)) {
            remoteNotifs = json.data;
          }
        }
      } catch (fetchErr) {
        console.warn('[NotificationService] Fetch remote notifications error:', fetchErr.message);
      }

      if (!Array.isArray(remoteNotifs)) {
        return this.getNotifications();
      }

      const key = `notifications_${userId}`;
      const localNotifs = this._storage?.get(key) || [];
      const notifMap = new Map();

      // Cloud adalah sumber kebenaran (authoritative)
      remoteNotifs.forEach(rn => {
        const id = rn.id || rn.transactionId;
        if (id) notifMap.set(id, { ...rn });
      });

      let changed = false;

      // Reconcile: jika ada notifikasi lokal yang belum tersimpan di cloud, unggah ke cloud
      const unsavedLocal = [];
      localNotifs.forEach(ln => {
        const id = ln.id || ln.transactionId;
        if (!notifMap.has(id)) {
          unsavedLocal.push(ln);
          notifMap.set(id, ln);
          changed = true;
        } else {
          const rn = notifMap.get(id);
          // Jika lokal sudah dibaca tapi remote belum, sinkronkan ke cloud
          if (ln.isRead && !rn.isRead) {
            rn.isRead = true;
            changed = true;
            this._sendMarkReadToRemote(id, false);
          }
        }
      });

      // Simpan item lokal yang belum ada di remote ke Supabase
      if (unsavedLocal.length > 0) {
        unsavedLocal.forEach(un => this._sendAddToRemote(un));
      }

      const merged = Array.from(notifMap.values())
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const prevJson = JSON.stringify(localNotifs.map(n => ({ id: n.id, isRead: Boolean(n.isRead) })));
      const nextJson = JSON.stringify(merged.map(n => ({ id: n.id, isRead: Boolean(n.isRead) })));

      if (changed || prevJson !== nextJson) {
        if (this._storage) {
          this._storage.set(key, merged);
          this._storage.set('notifications', merged);
        }
        this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);
      }

      return merged;
    } catch (err) {
      console.warn('[NotificationService] syncFromRemote error:', err.message);
      return this.getNotifications();
    } finally {
      this._isSyncing = false;
    }
  }

  /**
   * Mengirim penambahan notifikasi ke serverless proxy Supabase
   * @private
   */
  _sendAddToRemote(notification) {
    const userId = this._getUserId();
    if (!userId || !notification) return;
    fetch('/api/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_notification',
        userId,
        notification
      })
    }).catch(() => {});
  }

  /**
   * Mengirim penandaan sudah dibaca ke serverless proxy Supabase
   * @private
   */
  _sendMarkReadToRemote(notificationId = null, all = false) {
    const userId = this._getUserId();
    if (!userId) return;
    fetch('/api/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_notifications_read',
        userId,
        notificationId,
        all
      })
    }).catch(() => {});
  }

  /**
   * Mengirim penghapusan notifikasi ke serverless proxy Supabase
   * @private
   */
  _sendDeleteToRemote(notificationId) {
    const userId = this._getUserId();
    if (!userId || !notificationId) return;
    fetch('/api/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_notification',
        userId,
        notificationId
      })
    }).catch(() => {});
  }

  /**
   * Mengambil ID user aktif
   * @private
   */
  _getUserId() {
    if (!this._storage) return 'usr_budi_01';
    const user = this._storage.get('current_user');
    return user?.id || 'usr_budi_01';
  }

  /**
   * Mengambil daftar notifikasi tersimpan untuk pengguna aktif
   * @returns {Array<Object>}
   */
  getNotifications() {
    if (!this._storage) return [];
    const userId = this._getUserId();
    const userNotifs = this._storage.get(`notifications_${userId}`);
    if (Array.isArray(userNotifs) && userNotifs.length > 0) {
      return userNotifs;
    }
    const globalNotifs = this._storage.get('notifications');
    if (Array.isArray(globalNotifs)) {
      return globalNotifs.filter(n => !n.userId || n.userId === userId);
    }
    return [];
  }

  /**
   * Mengambil jumlah notifikasi yang belum dibaca
   * @returns {number}
   */
  getUnreadCount() {
    const notifs = this.getNotifications();
    return notifs.filter(n => !n.isRead).length;
  }

  /**
   * Menandai satu notifikasi sebagai sudah dibaca
   * @param {string} id
   */
  markAsRead(id) {
    if (!this._storage) return;
    const userId = this._getUserId();
    const key = `notifications_${userId}`;
    let notifs = this.getNotifications();
    let changed = false;

    notifs = notifs.map(n => {
      if (n.id === id || (n.transactionId && n.transactionId === id)) {
        changed = true;
        return { ...n, isRead: true };
      }
      return n;
    });

    if (changed) {
      this._storage.set(key, notifs);
      this._storage.set('notifications', notifs);
      this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);

      if (this._broadcastChannel) {
        try {
          this._broadcastChannel.postMessage({
            type: 'NOTIFICATIONS_MARKED_READ',
            userId,
            notificationId: id
          });
        } catch (_) {}
      }

      this._sendMarkReadToRemote(id, false);
    }
  }

  /**
   * Menandai semua notifikasi sebagai sudah dibaca
   */
  markAllAsRead() {
    if (!this._storage) return;
    const userId = this._getUserId();
    const key = `notifications_${userId}`;
    const notifs = this.getNotifications().map(n => ({ ...n, isRead: true }));
    this._storage.set(key, notifs);
    this._storage.set('notifications', notifs);
    this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);

    if (this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage({
          type: 'NOTIFICATIONS_MARKED_READ',
          userId,
          all: true
        });
      } catch (_) {}
    }

    this._sendMarkReadToRemote(null, true);
  }

  /**
   * Menghapus satu notifikasi
   * @param {string} id
   */
  deleteNotification(id) {
    if (!this._storage || !id) return;
    const userId = this._getUserId();
    const key = `notifications_${userId}`;
    let notifs = this.getNotifications();
    notifs = notifs.filter(n => n.id !== id && n.transactionId !== id);
    this._storage.set(key, notifs);
    this._storage.set('notifications', notifs);
    this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);

    if (this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage({
          type: 'NOTIFICATION_DELETED',
          userId,
          notificationId: id
        });
      } catch (_) {}
    }

    this._sendDeleteToRemote(id);
  }

  /**
   * Menambahkan notifikasi baru
   * @param {Object} notif
   */
  addNotification(notif) {
    if (!this._storage) return;
    const userId = notif.userId || this._getUserId();
    const key = `notifications_${userId}`;
    const notifs = this.getNotifications();
    const item = {
      id: notif.id || 'notif_' + Math.random().toString(36).substring(2, 9),
      userId,
      title: notif.title || 'Notifikasi',
      message: notif.message || '',
      type: notif.type || 'info',
      amount: notif.amount,
      fee: notif.fee,
      netPayout: notif.netPayout,
      method: notif.method,
      recipient: notif.recipient,
      transactionId: notif.transactionId,
      proofImage: notif.proofImage || '',
      proofNotes: notif.proofNotes || '',
      rejectionReason: notif.rejectionReason || '',
      createdAt: notif.createdAt || new Date().toISOString(),
      isRead: Boolean(notif.isRead)
    };

    const existingIdx = notifs.findIndex(n => n.id === item.id || (item.transactionId && n.transactionId === item.transactionId));
    if (existingIdx !== -1) {
      notifs[existingIdx] = { ...notifs[existingIdx], ...item };
    } else {
      notifs.unshift(item);
    }

    this._storage.set(key, notifs);
    this._storage.set('notifications', notifs);
    this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED, item);

    if (this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage({
          type: 'NOTIFICATION_ADDED',
          userId,
          notification: item
        });
      } catch (_) {}
    }

    this._sendAddToRemote(item);
  }

  /**
   * Menampilkan toast notification
   * @param {string} message
   * @param {'info'|'success'|'error'|'warning'} [type]
   * @param {number} [duration]
   */
  toast(message, type = 'info', duration = 3500) {
    this._eventBus.emit(AppEvents.SHOW_TOAST, { message, type, duration });
  }

  /**
   * Shortcut toast sukses
   * @param {string} message
   */
  success(message) {
    this.toast(message, 'success');
  }

  /**
   * Shortcut toast error
   * @param {string} message
   */
  error(message) {
    this.toast(message, 'error');
  }

  /**
   * Shortcut toast info
   * @param {string} message
   */
  info(message) {
    this.toast(message, 'info');
  }

  /**
   * Shortcut toast warning
   * @param {string} message
   */
  warning(message) {
    this.toast(message, 'warning');
  }

  /**
   * Menampilkan modal dialog
   * @param {Object} modalOptions
   * @param {string} modalOptions.title
   * @param {string} [modalOptions.message]
   * @param {string} [modalOptions.html]
   * @param {'success'|'error'|'info'|'confirm'} [modalOptions.type]
   * @param {string} [modalOptions.confirmText]
   * @param {string} [modalOptions.cancelText]
   * @param {Function} [modalOptions.onConfirm]
   * @param {Function} [modalOptions.onCancel]
   */
  showModal(modalOptions) {
    this._eventBus.emit(AppEvents.SHOW_MODAL, modalOptions);
  }

  /**
   * Menutup modal dialog aktif
   */
  closeModal() {
    this._eventBus.emit(AppEvents.CLOSE_MODAL);
  }

  /**
   * Menyinkronkan notifikasi dari data riwayat transaksi penarikan
   * Menjamin notifikasi penarikan diterima & ditolak otomatis muncul meski antar-perangkat/Supabase
   * @param {Array<Object>} transactions
   */
  syncFromTransactions(transactions) {
    if (!this._storage || !Array.isArray(transactions) || transactions.length === 0) return;
    const userId = this._getUserId();
    const key = `notifications_${userId}`;
    let notifs = this.getNotifications();
    let hasNew = false;
    const newItemsToCloud = [];

    // Filter transaksi penarikan milik user yang statusnya sudah selesai (success atau failed)
    const processedWithdrawals = transactions.filter(t =>
      t.type === 'withdrawal' &&
      ['success', 'valid', 'approved', 'completed', 'berhasil', 'failed', 'rejected', 'ditolak'].includes(t.status) &&
      (!t.userId || t.userId === userId)
    );

    processedWithdrawals.forEach(tx => {
      const existingIdx = notifs.findIndex(n =>
        n.transactionId === tx.id ||
        n.id === `notif_wd_${tx.id}`
      );

      const isSuccess = ['success', 'valid', 'approved', 'completed', 'berhasil'].includes(tx.status);
      const amt = Number(tx.amount || 0);
      const fee = Number(tx.fee !== undefined ? tx.fee : 1000);
      const netPayout = Number(tx.net_payout || tx.netPayout || (amt - fee));
      const formattedAmt = `Rp ${amt.toLocaleString('id-ID')}`;

      let reason = tx.rejectionReason || '';
      if (!reason && tx.description && tx.description.includes('Ditolak:')) {
        reason = tx.description.split('Ditolak:')[1].replace(')', '').trim();
      }
      if (!reason && !isSuccess) reason = 'Data rekening tidak sesuai / tidak terdaftar';

      let title = '';
      let message = '';
      if (isSuccess) {
        title = 'Penarikan Saldo Diterima';
        message = `Pencairan dana sebesar ${formattedAmt} ke ${tx.recipient || tx.method || 'rekening Anda'} telah berhasil dikirim oleh Admin.`;
      } else {
        title = 'Permintaan Penarikan Ditolak';
        message = `Penarikan sebesar ${formattedAmt} ditolak (${reason}). Dana telah dikembalikan ke saldo aktif Anda.`;
      }

      if (existingIdx === -1) {
        const newNotif = {
          id: `notif_wd_${tx.id}`,
          transactionId: tx.id,
          userId,
          type: isSuccess ? 'withdrawal_success' : 'withdrawal_failed',
          title,
          message,
          amount: amt,
          fee,
          netPayout,
          method: tx.method || '',
          recipient: tx.recipient || '',
          proofImage: tx.proofImage || tx.proof_image || '',
          proofNotes: tx.proofNotes || tx.proof_notes || '',
          rejectionReason: !isSuccess ? reason : '',
          createdAt: tx.processedAt || tx.updatedAt || tx.updated_at || tx.createdAt || tx.created_at || new Date().toISOString(),
          isRead: false
        };

        notifs.unshift(newNotif);
        newItemsToCloud.push(newNotif);
        hasNew = true;
      } else {
        // Lengkapi data jika sebelumnya belum lengkap
        const existing = notifs[existingIdx];
        let changed = false;
        if (!existing.amount && amt) { existing.amount = amt; changed = true; }
        if (existing.fee === undefined) { existing.fee = fee; changed = true; }
        if (existing.netPayout === undefined) { existing.netPayout = netPayout; changed = true; }
        if (!existing.recipient && tx.recipient) { existing.recipient = tx.recipient; changed = true; }
        if (!existing.method && tx.method) { existing.method = tx.method; changed = true; }
        if (!existing.proofImage && (tx.proofImage || tx.proof_image)) {
          existing.proofImage = tx.proofImage || tx.proof_image;
          changed = true;
        }
        if (!existing.rejectionReason && !isSuccess && reason) {
          existing.rejectionReason = reason;
          changed = true;
        }
        if (changed) hasNew = true;
      }
    });

    if (hasNew) {
      this._storage.set(key, notifs);
      this._storage.set('notifications', notifs);
      this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);

      // Sinkronkan notifikasi penarikan baru ke cloud Supabase
      newItemsToCloud.forEach(item => this._sendAddToRemote(item));
    }
  }
}
