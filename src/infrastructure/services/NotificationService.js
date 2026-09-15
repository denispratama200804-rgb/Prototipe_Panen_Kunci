import { AppEvents } from '../../core/events/EventBus.js';

/**
 * NotificationService
 * Prinsip: Single Responsibility Principle (SRP)
 * Bertanggung jawab mengirim pesan notifikasi (Toast) dan memicu Modal dialog.
 */
export class NotificationService {
  /**
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   * @param {import('../../core/interfaces/IStorage.js').IStorage} [storage]
   */
  constructor(eventBus, storage = null) {
    this._eventBus = eventBus;
    this._storage = storage;

    // Cross-tab synchronization via storage event
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && (e.key.includes('notifications') || e.key.includes('transactions'))) {
          this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);
        }
      });
    }

    // Real-time Payout Notifications (Diterima / Ditolak)
    this._eventBus.on('PAYOUT_PROCESSED', (payload) => {
      if (!payload) return;
      const isSuccess = payload.type === 'success' || payload.status === 'success';
      const title = payload.title || (isSuccess ? 'Penarikan Saldo Diterima!' : 'Permintaan Penarikan Ditolak');

      this.addNotification({
        id: 'notif_live_' + (payload.transactionId || Math.random().toString(36).substring(2, 9)),
        transactionId: payload.transactionId,
        userId: payload.userId,
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
    notifs = notifs.map(n => n.id === id ? { ...n, isRead: true } : n);
    this._storage.set(key, notifs);
    this._storage.set('notifications', notifs);
    this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);
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
      method: notif.method,
      recipient: notif.recipient,
      transactionId: notif.transactionId,
      proofImage: notif.proofImage || '',
      proofNotes: notif.proofNotes || '',
      createdAt: notif.createdAt || new Date().toISOString(),
      isRead: false
    };
    notifs.unshift(item);
    this._storage.set(key, notifs);
    this._storage.set('notifications', notifs);
    this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED, item);
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

    // Filter transaksi penarikan milik user yang statusnya sudah selesai (success atau failed)
    const processedWithdrawals = transactions.filter(t =>
      t.type === 'withdrawal' &&
      (t.status === 'success' || t.status === 'failed') &&
      (!t.userId || t.userId === userId)
    );

    processedWithdrawals.forEach(tx => {
      const exists = notifs.some(n =>
        n.transactionId === tx.id ||
        n.id === `notif_wd_${tx.id}`
      );

      if (!exists) {
        const isSuccess = tx.status === 'success';
        const amt = Number(tx.amount || 0);
        const formattedAmt = `Rp ${amt.toLocaleString('id-ID')}`;

        let title = '';
        let message = '';
        if (isSuccess) {
          title = 'Penarikan Saldo Diterima';
          message = `Pencairan dana sebesar ${formattedAmt} ke ${tx.recipient || tx.method || 'rekening Anda'} telah berhasil dikirim oleh Admin.`;
        } else {
          title = 'Permintaan Penarikan Ditolak';
          let reason = tx.rejectionReason || '';
          if (!reason && tx.description && tx.description.includes('Ditolak:')) {
            reason = tx.description.split('Ditolak:')[1].replace(')', '').trim();
          }
          if (!reason) reason = 'Data rekening tidak sesuai';
          message = `Penarikan sebesar ${formattedAmt} ditolak (${reason}). Dana telah dikembalikan ke saldo aktif Anda.`;
        }

        const newNotif = {
          id: `notif_wd_${tx.id}`,
          transactionId: tx.id,
          userId,
          type: isSuccess ? 'withdrawal_success' : 'withdrawal_failed',
          title,
          message,
          amount: amt,
          method: tx.method || '',
          recipient: tx.recipient || '',
          proofImage: tx.proofImage || '',
          proofNotes: tx.proofNotes || '',
          createdAt: tx.processedAt || tx.updatedAt || tx.updated_at || tx.createdAt || tx.created_at || new Date().toISOString(),
          isRead: false
        };

        notifs.unshift(newNotif);
        hasNew = true;
      }
    });

    if (hasNew) {
      this._storage.set(key, notifs);
      this._storage.set('notifications', notifs);
      this._eventBus.emit(AppEvents.NOTIFICATIONS_UPDATED);
    }
  }
}
