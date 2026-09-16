import { AppEvents } from '../../core/events/EventBus.js';

/**
 * BottomNavComponent
 * Prinsip: Single Responsibility Principle (SRP)
 * Menangani navigasi bawah aplikasi mobile dengan indikator rute aktif dan badge.
 */
export class BottomNavComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    this._container = container;
    this._eventBus = container.resolve('EventBus');
    this._authService = container.resolve('AuthService');
    this._notification = container.resolve('NotificationService');
    this._element = null;
    this._currentPath = '/dashboard';
  }

  mount(containerEl) {
    this._element = document.createElement('nav');
    this._element.className = 'fixed bottom-0 left-0 right-0 z-40 glass border-t border-surface-container-high/40 transition-all duration-300';
    containerEl.appendChild(this._element);

    this.render();

    this._eventBus.on(AppEvents.ROUTE_CHANGED, ({ path }) => {
      this._currentPath = path;
      this.render();
    });

    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this.render();
    });
  }

  render() {
    if (!this._element) return;

    const path = this._currentPath;
    const isAuth = this._authService.isAuthenticated();
    const user = this._authService.getCurrentUser();
    const isVerified = Boolean(user?.isVerified);

    // Sembunyikan bottom nav di halaman landing, login, register, dan live chat (/chat)
    const currentHash = (window.location.hash || '').replace(/^#\/?/, '/').split('?')[0];
    const hiddenRoutes = ['/', '/login', '/register', '/chat'];
    if (!isAuth || hiddenRoutes.includes(path) || hiddenRoutes.includes(currentHash) || path.startsWith('/chat')) {
      this._element.classList.add('hidden');
      return;
    } else {
      this._element.classList.remove('hidden');
    }

    const navItems = [
      { path: '/dashboard', label: 'Home', icon: 'dashboard' },
      { path: '/saldo', label: 'Saldo', icon: 'account_balance_wallet' },
      { path: '/setor', label: 'Setor', icon: 'vpn_key', highlight: true },
      { path: '/riwayat', label: 'Riwayat', icon: 'history' },
      { path: '/profil', label: 'Profil', icon: 'person' },
    ];

    this._element.innerHTML = `
      <div class="h-16 max-w-md mx-auto px-2 flex items-center justify-around">
        ${navItems.map(item => {
          const isActive = path === item.path;
          const isLocked = item.path === '/setor' && !isVerified;
          
          if (item.highlight) {
            return `
              <a href="${isLocked ? 'javascript:void(0)' : '#' + item.path}" id="${isLocked ? 'btnBottomNavSetorLocked' : ''}" class="flex flex-col items-center justify-center -mt-5 group cursor-pointer" title="${isLocked ? 'Setor Key Terkunci - Akun Belum Terverifikasi' : item.label}">
                <div class="w-12 h-12 rounded-full ${isActive ? 'bg-secondary ring-4 ring-secondary/20' : (isLocked ? 'bg-primary/80' : 'bg-primary group-hover:bg-primary-container')} text-white flex items-center justify-center shadow-lg transition-all active:scale-95 relative">
                  ${isLocked ? `
                    <div class="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-bold shadow border border-amber-300">
                      <span class="material-symbols-outlined text-[10px]">lock</span>
                    </div>
                  ` : ''}
                  <span class="material-symbols-outlined text-[24px] ${isLocked ? 'text-amber-300' : ''}" style="font-variation-settings: 'FILL' 1;">${isLocked ? 'lock' : item.icon}</span>
                </div>
                <span class="text-[10px] font-semibold mt-1 ${isActive ? 'text-secondary font-bold' : (isLocked ? 'text-amber-500 font-bold' : 'text-on-surface-variant')}">${item.label}</span>
              </a>
            `;
          }

          return `
            <a href="#${item.path}" class="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-colors ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}">
              <span class="material-symbols-outlined text-[22px]" style="${isActive ? "font-variation-settings: 'FILL' 1;" : ''}">${item.icon}</span>
              <span class="text-[11px] leading-tight">${item.label}</span>
              ${isActive ? '<div class="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"></div>' : '<div class="w-1.5 h-1.5 mt-0.5"></div>'}
            </a>
          `;
        }).join('')}
      </div>
    `;

    // Pasang listener jika tombol Setor dalam status terkunci
    const lockedBottomBtn = this._element.querySelector('#btnBottomNavSetorLocked');
    lockedBottomBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this._notification?.showModal({
        title: 'Fitur Setor Key Terkunci',
        message: 'Akun Anda berstatus <strong>Belum Terverifikasi</strong>.<br><br>Untuk mencegah kendala pencairan dana, Anda diwajibkan melengkapi rekening bank atau e-wallet pencairan di profil Anda terlebih dahulu sebelum dapat menyetor API Key.',
        type: 'warning',
        confirmText: 'Verifikasi Akun Sekarang',
        cancelText: 'Nanti Saja',
        showCancel: true,
        onConfirm: () => {
          sessionStorage.setItem('panenkunci:auto_open_bank', 'true');
          window.location.hash = '/profil';
        }
      });
    });
  }
}
