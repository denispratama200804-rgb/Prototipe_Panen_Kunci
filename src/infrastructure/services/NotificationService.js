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
}
