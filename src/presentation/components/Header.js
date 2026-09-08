import { AppEvents } from '../../core/events/EventBus.js';

/**
 * HeaderComponent
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan bar atas (Header) dengan judul dinamis, logo, tombol kembali, dan avatar profil.
 */
export class HeaderComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    this._container = container;
    this._eventBus = container.resolve('EventBus');
    this._authService = container.resolve('AuthService');
    this._element = null;
    const initialHash = (window.location.hash || '').replace(/^#\/?/, '/').split('?')[0];
    this._currentPath = initialHash ? `/${initialHash.replace(/^\//, '')}` : '/';
  }

  mount(containerEl) {
    this._element = document.createElement('header');
    this._element.className = 'fixed top-0 w-full z-40 glass shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/40 transition-all duration-300';
    containerEl.appendChild(this._element);

    this.render();

    this._eventBus.on(AppEvents.ROUTE_CHANGED, ({ path }) => {
      this._currentPath = path;
      this.render();
    });

    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this.render();
    });

    this._eventBus.on(AppEvents.USER_UPDATED, () => {
      this.render();
    });

    window.addEventListener('hashchange', () => {
      const hash = (window.location.hash || '').replace(/^#\/?/, '/').split('?')[0];
      this._currentPath = hash ? `/${hash.replace(/^\//, '')}` : '/';
      this.render();
    });
  }

  render() {
    if (!this._element) return;

    // Deteksi path secara akurat dari state maupun hash URL aktif
    const currentHash = (window.location.hash || '').replace(/^#\/?/, '/').split('?')[0];
    const path = (this._currentPath || currentHash || '/').trim();

    const isLogin = path === '/login' || path === 'login' || currentHash === '/login' || currentHash === 'login';
    const isRegister = path === '/register' || path === 'register' || currentHash === '/register' || currentHash === 'register';
    const isAuthPage = isLogin || isRegister;
    const isProfilePage = path === '/profil' || path === 'profil' || currentHash === '/profil' || currentHash === 'profil';

    const isAuth = this._authService.isAuthenticated();
    const user = this._authService.getCurrentUser();

    const pageTitles = {
      '/dashboard': 'Dashboard',
      '/saldo': 'Detail Saldo',
      '/setor': 'Setor API Key',
      '/tarik': 'Tarik Saldo',
      '/riwayat': 'Riwayat Transaksi',
      '/profil': 'Profil Pengguna',
      '/login': 'Masuk Akun',
      '/register': 'Daftar Akun'
    };

    const title = pageTitles[path] || (isLogin ? 'Masuk Akun' : (isRegister ? 'Daftar Akun' : 'Panen Kunci'));

    if (path === '/') {
      this._element.innerHTML = `
        <div class="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <img src="/Logo_PK.jpg" alt="Panen Kunci Logo" class="h-8 w-auto object-contain rounded-md" onerror="this.src='/logo.png'"/>
            <span class="font-headline-md text-lg font-bold text-primary tracking-tight">Panen Kunci</span>
          </div>
          <div class="flex items-center gap-2">
            <a href="#/login" class="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all">
              Login
            </a>
          </div>
        </div>
      `;
      return;
    }

    this._element.innerHTML = `
      <div class="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button type="button" id="header-back-btn" class="w-9 h-9 -ml-1 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-colors active:scale-95 cursor-pointer" aria-label="Kembali">
            <span class="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <img src="/Logo_PK.jpg" alt="Logo" class="h-8 w-auto object-contain rounded-md" onerror="this.src='/logo.png'"/>
          <h1 class="font-headline-md text-base sm:text-lg font-bold text-on-surface truncate">${title}</h1>
        </div>

        <div class="flex items-center gap-2.5">
          ${isAuthPage ? `
            <!-- Di halaman login dan register: TIDAK menampilkan profil sama sekali -->
            <div class="w-8 h-8"></div>
          ` : (isAuth ? `
            ${user?.role === 'admin' ? `
              <a href="/admin_panel/index.html" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-600/15 text-purple-600 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all" title="Buka Panel Admin">
                <span class="material-symbols-outlined text-[14px]">shield_person</span>
                <span>Admin</span>
              </a>
            ` : ''}
            ${!isProfilePage ? `
              <a href="#/profil" class="relative group flex items-center gap-2" title="Buka Profil">
                <div class="relative">
                  <img src="${user?.avatar || '/avatar.png'}" alt="${user?.name || 'User'}" class="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all" onerror="this.onerror=null; this.src='/avatar.png';"/>
                  <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${user?.isVerified ? 'bg-secondary' : 'bg-outline'} rounded-full border-2 border-white"></div>
                </div>
              </a>
            ` : '<div class="w-8 h-8"></div>'}
          ` : `
            <a href="#/login" class="text-xs font-semibold text-primary hover:underline">Masuk</a>
          `)}
        </div>
      </div>
    `;

    const backBtn = this._element.querySelector('#header-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const currentHash = window.location.hash;
        window.history.back();
        setTimeout(() => {
          if (window.location.hash === currentHash) {
            window.location.hash = '/';
          }
        }, 200);
      });
    }
  }
}
