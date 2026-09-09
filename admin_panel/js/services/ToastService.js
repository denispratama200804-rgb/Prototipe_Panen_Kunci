/**
 * ToastService
 * Menyediakan notifikasi toast modern dan elegan untuk Admin Panel Panen Kunci.
 */
export class ToastService {
  constructor() {
    this._container = null;
    this._ensureContainer();
  }

  _ensureContainer() {
    if (typeof document === 'undefined') return;
    if (!this._container) {
      this._container = document.getElementById('admin-toast-container');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.id = 'admin-toast-container';
        document.body.appendChild(this._container);
      }
    }
    this._container.className = 'fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 sm:w-96 z-[99999] pointer-events-none min-h-[70px]';
  }

  show({ type = 'info', title = '', message = '', duration = 4000 }) {
    this._ensureContainer();

    if (!this._toasts) this._toasts = [];

    // Jika toast terdepan sama persis, beri efek getar dan reset timer
    const front = this._toasts[0];
    if (front && front.message === message && front.title === title) {
      clearTimeout(front.timer);
      front.timer = setTimeout(() => this._dismiss(front.id), duration);
      front.element.animate([
        { transform: 'translate3d(0, 0, 0) scale(1)' },
        { transform: 'translate3d(-5px, 0, 0) scale(1)' },
        { transform: 'translate3d(5px, 0, 0) scale(1)' },
        { transform: 'translate3d(0, 0, 0) scale(1)' }
      ], { duration: 300, easing: 'ease-in-out' });
      return;
    }

    const toastId = 'adm_toast_' + Math.random().toString(36).substring(2, 9);
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl border shadow-2xl text-white select-none box-border max-w-full';

    let icon = 'info';
    let borderColor = 'border-blue-500/30';
    let iconColor = 'text-blue-400';

    if (type === 'success') {
      icon = 'check_circle';
      borderColor = 'border-emerald-500/40';
      iconColor = 'text-emerald-400';
    } else if (type === 'error') {
      icon = 'cancel';
      borderColor = 'border-rose-500/40';
      iconColor = 'text-rose-400';
    } else if (type === 'warning') {
      icon = 'warning';
      borderColor = 'border-amber-500/40';
      iconColor = 'text-amber-400';
    }

    toast.classList.add(borderColor);
    toast.style.background = 'rgba(11, 19, 41, 0.98)';
    toast.style.boxSizing = 'border-box';
    toast.style.position = 'absolute';
    toast.style.top = '0';
    toast.style.right = '0';
    toast.style.left = '0';
    toast.style.width = '100%';
    toast.style.transformOrigin = 'top center';
    toast.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, filter 0.3s ease';
    toast.style.transform = 'translate3d(0, -16px, 0) scale(0.96)';
    toast.style.opacity = '0';

    toast.innerHTML = `
      <span class="material-symbols-outlined ${iconColor} text-2xl flex-shrink-0 mt-0.5">${icon}</span>
      <div class="flex-1 min-w-0 pr-1">
        ${title ? `<h4 class="text-sm font-bold tracking-wide text-slate-100 mb-0.5 leading-tight">${title}</h4>` : ''}
        <p class="text-xs text-slate-300 leading-relaxed break-words">${message}</p>
      </div>
      <span class="adm-stack-badge hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 shrink-0"></span>
      <button type="button" class="text-slate-400 hover:text-white transition-colors flex-shrink-0 -mr-1 -mt-1 p-1 cursor-pointer">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._dismiss(toastId);
    });

    const timer = setTimeout(() => {
      this._dismiss(toastId);
    }, duration);

    const toastItem = {
      id: toastId,
      element: toast,
      title,
      message,
      timer
    };

    this._container.appendChild(toast);
    this._toasts.unshift(toastItem);

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
    if (!this._toasts) return;
    const total = this._toasts.length;

    this._toasts.forEach((item, index) => {
      const el = item.element;
      const badge = el.querySelector('.adm-stack-badge');

      if (index === 0) {
        el.style.transform = 'translate3d(0, 0, 0) scale(1)';
        el.style.opacity = '1';
        el.style.zIndex = '50';
        el.style.pointerEvents = 'auto';
        el.style.filter = 'none';
        el.style.boxShadow = '0 16px 32px -4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 255, 255, 0.05)';

        if (badge) {
          if (total > 1) {
            badge.textContent = `+${total - 1}`;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
      } else if (index === 1) {
        el.style.transform = 'translate3d(0, 10px, 0) scale(0.95)';
        el.style.opacity = '0.9';
        el.style.zIndex = '40';
        el.style.pointerEvents = 'none';
        el.style.filter = 'brightness(0.9)';
        el.style.boxShadow = '0 10px 20px -4px rgba(0, 0, 0, 0.4)';
        if (badge) badge.classList.add('hidden');
      } else if (index === 2) {
        el.style.transform = 'translate3d(0, 20px, 0) scale(0.90)';
        el.style.opacity = '0.75';
        el.style.zIndex = '30';
        el.style.pointerEvents = 'none';
        el.style.filter = 'brightness(0.8)';
        el.style.boxShadow = '0 6px 14px -4px rgba(0, 0, 0, 0.3)';
        if (badge) badge.classList.add('hidden');
      } else {
        el.style.transform = 'translate3d(0, 26px, 0) scale(0.85)';
        el.style.opacity = '0';
        el.style.zIndex = '20';
        el.style.pointerEvents = 'none';
        if (badge) badge.classList.add('hidden');
      }
    });
  }

  _dismiss(id) {
    if (!this._toasts) return;
    const index = this._toasts.findIndex(t => t.id === id);
    if (index === -1) return;

    const [removed] = this._toasts.splice(index, 1);
    if (removed.timer) clearTimeout(removed.timer);

    const el = removed.element;
    el.style.transform = 'translate3d(0, -18px, 0) scale(0.95)';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 320);

    this._updateStack();
  }

  success(message, title = 'Berhasil') {
    this.show({ type: 'success', title, message });
  }

  error(message, title = 'Gagal') {
    this.show({ type: 'error', title, message });
  }

  warning(message, title = 'Perhatian') {
    this.show({ type: 'warning', title, message });
  }

  info(message, title = 'Informasi') {
    this.show({ type: 'info', title, message });
  }
}

export const toast = new ToastService();
