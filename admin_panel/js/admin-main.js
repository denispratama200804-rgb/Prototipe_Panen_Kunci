/**
 * Admin Panel Bootstrap & Router Engine
 * Panen Kunci Executive Control Center
 * Arsitektur: Modern App Hub Dashboard + Responsive Desktop & Mobile Web
 */
import { adminDataService } from './services/AdminDataService.js';
import { toast } from './services/ToastService.js';
import { Navbar } from './components/Navbar.js';
import { themeService } from './services/ThemeService.js';

import { HubDashboardView } from './views/HubDashboardView.js';
import { ApiKeysView } from './views/ApiKeysView.js';
import { WithdrawalsView } from './views/WithdrawalsView.js';
import { UsersView } from './views/UsersView.js';
import { SettingsView } from './views/SettingsView.js';

class AdminApp {
  constructor() {
    this.appRoot = document.getElementById('admin-app');
    this.currentTab = this._getInitialTab();
    this.currentViewInstance = null;

    this.navbar = new Navbar({
      onRefresh: () => this.refreshCurrentView(true, false),
      onNavigate: tab => this.navigate(tab),
      onSeed: () => this._handleSeedDemo(),
      onLogout: () => this._handleLogout()
    });

    this.views = {
      dashboard: new HubDashboardView(
        adminDataService,
        tab => this.navigate(tab),
        () => this._handleSeedDemo(),
        toast
      ),
      apikeys: new ApiKeysView(adminDataService, toast),
      withdrawals: new WithdrawalsView(adminDataService, toast),
      users: new UsersView(adminDataService, toast),
      settings: new SettingsView(adminDataService, toast)
    };
  }

  _getInitialTab() {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'apikeys', 'withdrawals', 'users', 'settings'];
    return validTabs.includes(hash) ? hash : 'dashboard';
  }

  init() {
    if (!this.appRoot) {
      console.error('#admin-app container not found.');
      return;
    }

    // Inisialisasi status tema (Malam / Siang)
    themeService.init();

    // ── Session Guard: Pastikan yang mengakses memiliki sesi Administrator ──
    const isAdmin = localStorage.getItem('panenkunci:admin_logged_in') === 'true' ||
                    localStorage.getItem('panenkunci:auth_role') === 'admin';

    if (!isAdmin) {
      this.appRoot.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-screen bg-[#060b18] text-white p-6">
          <div class="max-w-md w-full bg-[#0d1527] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div class="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-3xl">lock</span>
            </div>
            <h2 class="text-xl font-bold mb-2">Akses Dibatasi</h2>
            <p class="text-sm text-gray-400 mb-6">Halaman ini hanya dapat diakses oleh Administrator. Sesi Anda bukan admin atau belum login.</p>
            <a href="/#/login" class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all">
              <span class="material-symbols-outlined text-base">login</span>
              <span>Masuk sebagai Admin</span>
            </a>
          </div>
        </div>
      `;
      setTimeout(() => {
        window.location.href = '/#/login';
      }, 2000);
      return;
    }

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(e => console.log('SW registration:', e));
      });
    }

    // Auto-sync data pengguna dari Supabase di background
    adminDataService.fetchUsersFromSupabase().then(() => {
      if (this.currentTab === 'users') {
        this.refreshCurrentView(false);
      }
    }).catch(e => console.warn('Supabase users auto-sync:', e));

    // Auto-sync data API Key dari Supabase di background
    adminDataService.fetchApiKeysFromSupabase().then(() => {
      if (this.currentTab === 'apikeys' || this.currentTab === 'dashboard') {
        this.refreshCurrentView(false);
      }
    }).catch(e => console.warn('Supabase api_keys auto-sync:', e));

    this._renderLayout();
    this._mountView(this.currentTab);

    // Listen to URL hash changes
    window.addEventListener('hashchange', () => {
      const newTab = this._getInitialTab();
      if (newTab !== this.currentTab) {
        this.navigate(newTab, false);
      }
    });

    // Listen to localStorage cross-tab updates (debounced to avoid screen flash)
    let storageSyncTimer = null;
    window.addEventListener('storage', e => {
      if (e.key && e.key.startsWith('panenkunci:')) {
        clearTimeout(storageSyncTimer);
        storageSyncTimer = setTimeout(() => {
          this.refreshCurrentView(false, false);
        }, 250);
      }
    });

    console.log('🚀 Panen Kunci Admin Panel Hub initialized successfully!');
  }

  _renderLayout() {
    this.appRoot.innerHTML = `
      <!-- Ambient Background Glows -->
      <div class="admin-ambient-glow"></div>

      <div class="relative z-10 flex flex-col min-h-screen w-full max-w-full">
        <!-- Unified Sticky Header: Responsif terhadap Tema Siang / Malam -->
        <div class="sticky top-0 z-30 admin-sticky-header shadow-2xl safe-area-pt w-full max-w-full">
          <!-- Top Navbar Mount (Header Referensi AI Dashboard) -->
          <div id="admin-navbar-mount" class="w-full max-w-full">
            ${this.navbar.render(this.currentTab, this._getViewTitle(this.currentTab))}
          </div>
        </div>

        <!-- Dynamic Main Content View Area: min-w-0 prevents flex horizontal expansion -->
        <main class="flex-1 w-full max-w-7xl mx-auto min-w-0 p-3 sm:p-6 md:p-8" id="admin-view-mount">
          <!-- View content will be injected here -->
        </main>
      </div>
    `;

    this._bindLayoutEvents();
  }

  _renderSubNav() {
    return ''; // Filter tabs di dekat headbar dihilangkan sesuai permintaan user
  }

  _bindLayoutEvents() {
    const navbarMount = document.getElementById('admin-navbar-mount');
    if (navbarMount) {
      this.navbar.bindEvents(navbarMount);
    }
  }

  _getViewTitle(tab) {
    switch (tab) {
      case 'dashboard':
        return 'Admin Dashboard';
      case 'apikeys':
        return 'Gudang API Key';
      case 'withdrawals':
        return 'Persetujuan Pencairan Dana (Payouts)';
      case 'users':
        return 'Kelola Pengguna & KYC';
      case 'settings':
        return 'Pengaturan Tarif & Sistem';
      default:
        return 'Control Center';
    }
  }

  navigate(tab, updateHash = true) {
    if (this.currentViewInstance && typeof this.currentViewInstance.destroy === 'function') {
      this.currentViewInstance.destroy();
    }

    this.currentTab = tab;

    if (updateHash) {
      window.location.hash = tab;
    }

    // Re-render navbar
    const navbarMount = document.getElementById('admin-navbar-mount');
    if (navbarMount) {
      navbarMount.innerHTML = this.navbar.render(tab, this._getViewTitle(tab));
      this.navbar.bindEvents(navbarMount);
    }

    this._bindLayoutEvents();
    this._mountView(tab);

    // Scroll to top on view change
    const viewMount = document.getElementById('admin-view-mount');
    if (viewMount) viewMount.scrollTop = 0;
  }

  _mountView(tab, withAnimation = true) {
    const viewMount = document.getElementById('admin-view-mount');
    if (!viewMount) return;

    const viewInstance = this.views[tab] || this.views.dashboard;
    this.currentViewInstance = viewInstance;

    let html = viewInstance.render();
    if (!withAnimation) {
      html = html.replace(/\bview-fade-enter\b/g, '');
    }
    viewMount.innerHTML = html;

    if (typeof viewInstance.bindEvents === 'function') {
      viewInstance.bindEvents(viewMount, () => {
        this.refreshCurrentView(false, false);
      });
    }
  }

  refreshCurrentView(showToast = true, withAnimation = false) {
    // Re-render active view without rebinding navbar layout to prevent duplicate listeners
    this._mountView(this.currentTab, withAnimation);

    if (showToast) {
      toast.success('Data panel operasional telah diperbarui!', 'Tersinkronisasi');
    }
  }

  _handleSeedDemo() {
    adminDataService.seedDemoData();
    toast.success('Data demo realistis berhasil disuntikkan ke sistem!', 'Data Seeded');
    this.refreshCurrentView(false);
  }

  _handleLogout() {
    localStorage.removeItem('panenkunci:admin_logged_in');
    localStorage.removeItem('panenkunci:auth_role');
    toast.info('Sesi administrator telah berakhir.', 'Logout Berhasil');
    setTimeout(() => {
      window.location.href = '/#/login';
    }, 400);
  }
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AdminApp();
  app.init();
});
