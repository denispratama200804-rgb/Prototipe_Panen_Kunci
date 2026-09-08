import { AppEvents } from '../../core/events/EventBus.js';

/**
 * ToastComponent
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan pesan toast notification modern dengan sistem tumpukan 3D bertingkat (Stacked Deck).
 * Menumpuk notifikasi baru di depan dan notifikasi sebelumnya ke belakang secara rapi
 * agar tidak menghabiskan ruang layar.
 */
export class ToastComponent {
  /**
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._container = null;
    this._toasts = []; // [{ id, element, type, message, timer, timerStart, remainingTime }]
    this._isHovered = false;
    this._init();
  }

  _init() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none min-h-[64px]';
      document.body.appendChild(container);
    }
    this._container = container;

    // Pause timer saat cursor mouse berada di atas toast container
    container.addEventListener('mouseenter', () => {
      this._isHovered = true;
      this._toasts.forEach(t => {
        if (t.timer) {
          clearTimeout(t.timer);
          t.timer = null;
          const elapsed = Date.now() - t.timerStart;
          t.remainingTime = Math.max(1000, t.remainingTime - elapsed);
        }
      });
    });

    // Lanjutkan timer saat cursor mouse meninggalkan container
    container.addEventListener('mouseleave', () => {
      this._isHovered = false;
      this._toasts.forEach(t => {
        t.timerStart = Date.now();
        t.timer = setTimeout(() => {
          this._removeToast(t.id);
        }, t.remainingTime);
      });
    });

    this._eventBus.on(AppEvents.SHOW_TOAST, ({ message, type = 'info', duration = 3500 }) => {
      this.show(message, type, duration);
    });
  }

  show(message, type = 'info', duration = 3500) {
    // 1. Jika pesan identik sudah ada di kartu paling depan (front), beri efek shake & refresh timer
    const frontToast = this._toasts[0];
    if (frontToast && frontToast.message === message && frontToast.type === type) {
      this._resetTimer(frontToast, duration);
      this._shakeToast(frontToast.element);
      return;
    }

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

    const toastId = 'toast_' + Math.random().toString(36).substring(2, 9);
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `${bgStyles[type] || bgStyles.info} px-4 py-3 rounded-2xl flex items-center gap-3 pointer-events-auto text-sm font-medium border border-white/10 backdrop-blur-md select-none`;
    
    // Penataan styling absolute untuk sistem tumpuk ke belakang (stacked deck)
    toast.style.position = 'absolute';
    toast.style.top = '0';
    toast.style.left = '0';
    toast.style.right = '0';
    toast.style.width = '100%';
    toast.style.transformOrigin = 'top center';
    toast.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease';
    toast.style.transform = 'translate3d(0, -16px, 0) scale(0.96)';
    toast.style.opacity = '0';

    toast.innerHTML = `
      <span class="material-symbols-outlined text-[22px] shrink-0" style="font-variation-settings: 'FILL' 1;">
        ${icons[type] || 'info'}
      </span>
      <span class="flex-1 leading-snug break-words">${message}</span>
      <span class="toast-stack-badge hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white/90 shrink-0"></span>
      <button type="button" class="text-white/80 hover:text-white p-1 ml-auto shrink-0 focus:outline-none transition-colors" aria-label="Tutup">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    `;

    toast.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      this._removeToast(toastId);
    });

    const toastItem = {
      id: toastId,
      element: toast,
      type,
      message,
      remainingTime: duration,
      timerStart: Date.now(),
      timer: null
    };

    // Pasang timer auto-dismiss jika tidak sedang di-hover
    if (!this._isHovered) {
      toastItem.timer = setTimeout(() => {
        this._removeToast(toastId);
      }, duration);
    }

    this._container.appendChild(toast);
    this._toasts.unshift(toastItem);

    // Batasi tumpukan maksimum di memori hingga 6 kartu
    if (this._toasts.length > 6) {
      const oldest = this._toasts.pop();
      if (oldest.timer) clearTimeout(oldest.timer);
      oldest.element.remove();
    }

    requestAnimationFrame(() => {
      this._updateStack();
    });
  }

  _updateStack() {
    const total = this._toasts.length;

    this._toasts.forEach((item, index) => {
      const el = item.element;
      const badge = el.querySelector('.toast-stack-badge');

      if (index === 0) {
        // Kartu Utama di Depan (Paling depan, ukuran penuh, interaktif)
        el.style.transform = 'translate3d(0, 0, 0) scale(1)';
        el.style.opacity = '1';
        el.style.zIndex = '50';
        el.style.pointerEvents = 'auto';
        el.style.filter = 'none';
        el.style.boxShadow = '0 14px 28px -4px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)';

        if (badge) {
          if (total > 1) {
            badge.textContent = `+${total - 1}`;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
      } else if (index === 1) {
        // Tingkat 2 (Menumpuk tepat di belakang, sedikit turun & mengecil)
        el.style.transform = 'translate3d(0, 10px, 0) scale(0.95)';
        el.style.opacity = '0.9';
        el.style.zIndex = '40';
        el.style.pointerEvents = 'none';
        el.style.filter = 'brightness(0.92)';
        el.style.boxShadow = '0 10px 20px -4px rgba(0, 0, 0, 0.3)';
        if (badge) badge.classList.add('hidden');
      } else if (index === 2) {
        // Tingkat 3 (Menumpuk lebih ke belakang)
        el.style.transform = 'translate3d(0, 20px, 0) scale(0.90)';
        el.style.opacity = '0.75';
        el.style.zIndex = '30';
        el.style.pointerEvents = 'none';
        el.style.filter = 'brightness(0.82)';
        el.style.boxShadow = '0 6px 14px -4px rgba(0, 0, 0, 0.25)';
        if (badge) badge.classList.add('hidden');
      } else {
        // Tingkat 4 ke atas (Disembunyikan di tumpukan belakang)
        el.style.transform = 'translate3d(0, 26px, 0) scale(0.85)';
        el.style.opacity = '0';
        el.style.zIndex = '20';
        el.style.pointerEvents = 'none';
        if (badge) badge.classList.add('hidden');
      }
    });
  }

  _shakeToast(element) {
    element.animate([
      { transform: 'translate3d(0, 0, 0) scale(1)' },
      { transform: 'translate3d(-6px, 0, 0) scale(1)' },
      { transform: 'translate3d(6px, 0, 0) scale(1)' },
      { transform: 'translate3d(-4px, 0, 0) scale(1)' },
      { transform: 'translate3d(4px, 0, 0) scale(1)' },
      { transform: 'translate3d(0, 0, 0) scale(1)' }
    ], {
      duration: 350,
      easing: 'ease-in-out'
    });
  }

  _resetTimer(toastItem, duration) {
    if (toastItem.timer) {
      clearTimeout(toastItem.timer);
    }
    toastItem.remainingTime = duration;
    toastItem.timerStart = Date.now();
    if (!this._isHovered) {
      toastItem.timer = setTimeout(() => {
        this._removeToast(toastItem.id);
      }, duration);
    }
  }

  _removeToast(id) {
    const index = this._toasts.findIndex(t => t.id === id);
    if (index === -1) return;

    const [removed] = this._toasts.splice(index, 1);
    if (removed.timer) {
      clearTimeout(removed.timer);
    }

    const el = removed.element;
    el.style.transform = 'translate3d(0, -18px, 0) scale(0.95)';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';

    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 320);

    this._updateStack();
  }
}
