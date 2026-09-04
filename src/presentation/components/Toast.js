import { AppEvents } from '../../core/events/EventBus.js';

/**
 * ToastComponent
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan pesan toast notification non-blocking di pojok layar.
 */
export class ToastComponent {
  /**
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._container = null;
    this._init();
  }

  _init() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }
    this._container = container;

    this._eventBus.on(AppEvents.SHOW_TOAST, ({ message, type = 'info', duration = 3500 }) => {
      this.show(message, type, duration);
    });
  }

  show(message, type = 'info', duration = 3500) {
    const bgStyles = {
      info: 'bg-primary text-on-primary border-primary-container',
      success: 'bg-secondary text-on-secondary border-secondary-container',
      error: 'bg-error-ruby text-white border-error',
      warning: 'bg-warning-amber text-on-surface border-warning-amber',
    };

    const icons = {
      info: 'info',
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
    };

    const toast = document.createElement('div');
    toast.className = `${bgStyles[type] || bgStyles.info} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 transform translate-y-[-12px] opacity-0 pointer-events-auto text-sm font-medium border border-white/10 backdrop-blur-md`;
    
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[22px] shrink-0" style="font-variation-settings: 'FILL' 1;">${icons[type] || 'info'}</span>
      <span class="flex-1 leading-snug">${message}</span>
      <button type="button" class="text-white/80 hover:text-white p-1 ml-auto shrink-0 focus:outline-none transition-colors" aria-label="Tutup">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    `;

    toast.querySelector('button').addEventListener('click', () => {
      this._removeToast(toast);
    });

    this._container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-[-12px]');
    });

    setTimeout(() => {
      this._removeToast(toast);
    }, duration);
  }

  _removeToast(toast) {
    if (toast.parentElement) {
      toast.classList.add('opacity-0', 'translate-y-[-12px]');
      setTimeout(() => toast.remove(), 300);
    }
  }
}
