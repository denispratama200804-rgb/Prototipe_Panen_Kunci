import { AppEvents } from '../events/EventBus.js';

/**
 * Router
 * Prinsip: Single Responsibility Principle (SRP) & Open/Closed Principle (OCP)
 * Menangani routing SPA berbasis Hash. Terbuka terhadap penambahan route baru di routes.js
 * tanpa memodifikasi logic Router.
 */
export class Router {
  /**
   * @param {HTMLElement} mountContainer
   * @param {Array<{ path: string, viewClass: Function, title?: string, requiresAuth?: boolean, guestOnly?: boolean }>} routes
   * @param {import('../container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(mountContainer, routes, container) {
    this._mountContainer = mountContainer;
    this._routes = routes;
    this._container = container;
    this._currentView = null;
    this._currentRoute = null;

    this._onHashChange = this._onHashChange.bind(this);
  }

  /**
   * Inisialisasi router dan pasang event listener hashchange
   */
  init() {
    window.addEventListener('hashchange', this._onHashChange);
    this._onHashChange();
  }

  /**
   * Navigasi ke path tertentu
   * @param {string} path
   */
  navigate(path) {
    const cleanPath = path.startsWith('#') ? path.slice(1) : path;
    window.location.hash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  }

  /**
   * Mengembalikan path saat ini
   * @returns {string}
   */
  getCurrentPath() {
    const hash = window.location.hash.slice(1);
    return hash ? hash.split('?')[0] : '/';
  }

  /**
   * Handler saat hash berubah
   */
  async _onHashChange() {
    const rawHash = window.location.hash.slice(1) || '/';
    const [path] = rawHash.split('?');
    
    // Cari route yang cocok
    let route = this._routes.find(r => r.path === path);
    if (!route) {
      // Fallback ke route root atau default
      route = this._routes.find(r => r.path === '/') || this._routes[0];
    }

    // Auth checks jika AuthService tersedia
    if (this._container.has('AuthService')) {
      const authService = this._container.resolve('AuthService');
      const isAuthenticated = authService.isAuthenticated();

      if (route.requiresAuth && !isAuthenticated) {
        this.navigate('/login');
        return;
      }

      if (route.guestOnly && isAuthenticated) {
        this.navigate('/dashboard');
        return;
      }
    }

    // Unmount view sebelumnya
    if (this._currentView && typeof this._currentView.unmount === 'function') {
      try {
        this._currentView.unmount();
      } catch (err) {
        console.error('Error unmounting view:', err);
      }
    }

    this._currentRoute = route;

    // Set judul halaman
    if (route.title) {
      document.title = `${route.title} - Panen Kunci`;
    }

    // Render view baru
    try {
      this._mountContainer.innerHTML = '';
      const ViewClass = route.viewClass;
      this._currentView = new ViewClass(this._container);

      const html = this._currentView.render();
      if (typeof html === 'string') {
        this._mountContainer.innerHTML = html;
      } else if (html instanceof HTMLElement) {
        this._mountContainer.appendChild(html);
      }

      if (typeof this._currentView.mount === 'function') {
        this._currentView.mount(this._mountContainer);
      }

      // Beritahu EventBus bahwa route telah berganti
      if (this._container.has('EventBus')) {
        const eventBus = this._container.resolve('EventBus');
        eventBus.emit(AppEvents.ROUTE_CHANGED, { path: route.path, route });
      }

      // Scroll ke paling atas
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(`Error rendering view for route ${route.path}:`, err);
      this._mountContainer.innerHTML = `
        <div class="p-8 text-center text-error">
          <p class="font-bold">Terjadi kesalahan memuat tampilan.</p>
          <p class="text-sm text-text-body mt-2">${err.message}</p>
          <button class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm" onclick="window.location.hash='/'">Kembali ke Beranda</button>
        </div>
      `;
    }
  }

  /**
   * Cleanup saat router dimatikan
   */
  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
    if (this._currentView && typeof this._currentView.unmount === 'function') {
      this._currentView.unmount();
    }
  }
}
