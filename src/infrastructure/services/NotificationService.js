import { AppEvents } from '../../core/events/EventBus.js';

/**
 * NotificationService
 * Prinsip: Single Responsibility Principle (SRP)
 * Bertanggung jawab mengirim pesan notifikasi (Toast) dan memicu Modal dialog.
 */
export class NotificationService {
  /**
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
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
