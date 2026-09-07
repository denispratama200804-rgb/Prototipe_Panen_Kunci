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
    if (!this._container) {
      this._container = document.getElementById('admin-toast-container');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.id = 'admin-toast-container';
        this._container.className = 'fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full';
        document.body.appendChild(this._container);
      }
    }
  }

  show({ type = 'info', title = '', message = '', duration = 4000 }) {
    this._ensureContainer();

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto transform transition-all duration-300 translate-x-full opacity-0 flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border shadow-2xl text-white';

    let icon = 'info';
    let borderColor = 'border-blue-500/30';
    let bgColor = 'bg-slate-900/90';
    let iconColor = 'text-blue-400';

    if (type === 'success') {
      icon = 'check_circle';
      borderColor = 'border-emerald-500/40';
      bgColor = 'bg-slate-900/95';
      iconColor = 'text-emerald-400';
    } else if (type === 'error') {
      icon = 'cancel';
      borderColor = 'border-rose-500/40';
      bgColor = 'bg-slate-900/95';
      iconColor = 'text-rose-400';
    } else if (type === 'warning') {
      icon = 'warning';
      borderColor = 'border-amber-500/40';
      bgColor = 'bg-slate-900/95';
      iconColor = 'text-amber-400';
    }

    toast.classList.add(borderColor);
    toast.style.background = 'rgba(15, 23, 42, 0.95)';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.05)';

    toast.innerHTML = `
      <span class="material-symbols-outlined ${iconColor} text-2xl flex-shrink-0 mt-0.5">${icon}</span>
      <div class="flex-1 min-w-0">
        ${title ? `<h4 class="text-sm font-semibold tracking-wide text-slate-100 mb-0.5">${title}</h4>` : ''}
        <p class="text-xs text-slate-300 leading-relaxed">${message}</p>
      </div>
      <button type="button" class="text-slate-400 hover:text-white transition-colors flex-shrink-0 -mr-1 -mt-1 p-1">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => this._dismiss(toast));

    this._container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
      toast.classList.add('translate-x-0', 'opacity-100');
    });

    // Auto dismiss
    const timer = setTimeout(() => {
      this._dismiss(toast);
    }, duration);

    toast._timer = timer;
  }

  _dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
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
