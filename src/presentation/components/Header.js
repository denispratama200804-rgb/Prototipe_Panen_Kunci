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
    this._currentPath = '/';
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
  }

  render() {
    if (!this._element) return;

    const path = this._currentPath;
    const isAuth = this._authService.isAuthenticated();
    const user = this._authService.getCurrentUser();

    // Sembunyikan header pada halaman landing & auth tertentu jika diinginkan, atau tampilkan header branding
    const isSubPage = ['/saldo', '/setor', '/tarik'].includes(path);
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

    const title = pageTitles[path] || 'Panen Kunci';

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

    const isAuthPage = ['/login', '/register'].includes(path);

    this._element.innerHTML = `
      <div class="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button type="button" id="header-back-btn" class="w-9 h-9 -ml-1 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-colors active:scale-95 cursor-pointer" aria-label="Kembali">
            <span class="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <img src="/Logo_PK.jpg" alt="Logo" class="h-8 w-auto object-contain rounded-md" onerror="this.src='/logo.png'"/>
          <h1 class="font-headline-md text-base sm:text-lg font-bold text-on-surface truncate">${title}</h1>
        </div>

        <div class="flex items-center gap-3">
          ${isAuthPage ? '' : (isAuth ? `
            <a href="#/profil" class="relative group" title="Buka Profil">
              <img src="${user?.avatar || '/avatar.png'}" alt="${user?.name || 'User'}" class="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all" onerror="this.onerror=null; this.src='/avatar.png';"/>
              <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${user?.isVerified ? 'bg-secondary' : 'bg-outline'} rounded-full border-2 border-white"></div>
            </a>
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
