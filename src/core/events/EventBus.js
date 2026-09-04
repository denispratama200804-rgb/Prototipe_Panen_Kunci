/**
 * EventBus
 * Prinsip: Single Responsibility Principle (SRP)
 * Mengatur komunikasi antar modul/komponen secara asynchronous dan decoupled
 * menggunakan Observer pattern.
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Berlangganan event
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Berhenti berlangganan
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
  }

  /**
   * Publikasikan event ke semua pelanggan
   * @param {string} event
   * @param {any} [data]
   */
  emit(event, data) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err);
        }
      });
    }
  }
}

// Common Event Names Constants
export const AppEvents = {
  AUTH_STATE_CHANGED: 'auth:state_changed',
  USER_UPDATED: 'user:updated',
  BALANCE_UPDATED: 'wallet:balance_updated',
  API_KEY_SUBMITTED: 'apikey:submitted',
  WITHDRAWAL_COMPLETED: 'wallet:withdrawal_completed',
  ROUTE_CHANGED: 'router:route_changed',
  SHOW_TOAST: 'notification:show_toast',
  SHOW_MODAL: 'notification:show_modal',
  CLOSE_MODAL: 'notification:close_modal',
};
