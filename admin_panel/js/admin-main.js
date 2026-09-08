/**
 * Admin Panel Bootstrap & Router Engine
 * Panen Kunci Executive Control Center
 */
import { adminDataService } from './services/AdminDataService.js';
import { toast } from './services/ToastService.js';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';

import { ApiKeysView } from './views/ApiKeysView.js';
import { WithdrawalsView } from './views/WithdrawalsView.js';
import { UsersView } from './views/UsersView.js';
import { SettingsView } from './views/SettingsView.js';

class AdminApp {
  constructor() {
    this.appRoot = document.getElementById('admin-app');
    this.currentTab = this._getInitialTab();
    this.currentViewInstance = null;

    this.sidebar = new Sidebar(
      this.currentTab,
      tab => this.navigate(tab),
      () => this._handleSeedDemo()
    );

    this.navbar = new Navbar({
      onRefresh: () => this.refreshCurrentView(true),
      onSearch: q => console.log('Global search:', q)
    });

    this.views = {
      apikeys: new ApiKeysView(adminDataService, toast),
      withdrawals: new WithdrawalsView(adminDataService, toast),
      users: new UsersView(adminDataService, toast),
      settings: new SettingsView(adminDataService, toast)
    };
  }

  _getInitialTab() {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['apikeys', 'withdrawals', 'users', 'settings'];
    return validTabs.includes(hash) ? hash : 'apikeys';
  }

  init() {
    if (!this.appRoot) {
      console.error('#admin-app container not found.');
      return;
    }

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

    this._renderLayout();
    this._mountView(this.currentTab);

    // Listen to URL hash changes
    window.addEventListener('hashchange', () => {
      const newTab = this._getInitialTab();
      if (newTab !== this.currentTab) {
        this.navigate(newTab, false);
      }
    });

    // Listen to localStorage cross-tab updates (e.g. user deposited a key in another tab)
    window.addEventListener('storage', e => {
      if (e.key && e.key.startsWith('panenkunci:')) {
        toast.info('Data transaksi baru terdeteksi dari aplikasi pengguna.', 'Sinkronisasi Otomatis');
        this.refreshCurrentView(false);
      }
    });

    console.log('🚀 Panen Kunci Admin Panel initialized successfully!');
  }

  _renderLayout() {
    const stats = adminDataService.getStats();

    this.appRoot.innerHTML = `
      <!-- Ambient Background Glows -->
      <div class="admin-ambient-glow"></div>

      <div class="relative z-10 flex min-h-screen w-full">
        <!-- Sidebar Container -->
        <div id="admin-sidebar-mount">
          ${this.sidebar.render(stats)}
        </div>

        <!-- Main Content Area -->
        <div class="flex-1 flex flex-col min-w-0 bg-[#060b18]/60">
          <!-- Top Navbar Mount -->
          <div id="admin-navbar-mount">
            ${this.navbar.render(this._getViewTitle(this.currentTab))}
          </div>

          <!-- Dynamic View Container -->
          <main class="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar" id="admin-view-mount">
            <!-- View content will be injected here -->
          </main>
        </div>
      </div>
    `;

    this._bindLayoutEvents();
  }

  _bindLayoutEvents() {
    const sidebarMount = document.getElementById('admin-sidebar-mount');
    if (sidebarMount) {
      this.sidebar.bindEvents(sidebarMount);
    }

    const navbarMount = document.getElementById('admin-navbar-mount');
    if (navbarMount) {
      this.navbar.bindEvents(navbarMount);
    }
  }

  _getViewTitle(tab) {
    switch (tab) {
      case 'apikeys':
        return 'Gudang API Key';
      case 'withdrawals':
        return 'Persetujuan Pencairan Dana (Payouts)';
      case 'users':
        return 'Kelola Pengguna & KYC';
      case 'settings':
        return 'Pengaturan Tarif & Sistem';
      default:
        return 'Control Panel';
    }
  }

  navigate(tab, updateHash = true) {
    if (this.currentViewInstance && typeof this.currentViewInstance.destroy === 'function') {
      this.currentViewInstance.destroy();
    }

    this.currentTab = tab;
    this.sidebar.activeTab = tab;

    if (updateHash) {
      window.location.hash = tab;
    }

    // Update Title in Navbar
    const titleEl = document.getElementById('navbar-view-title');
    if (titleEl) {
      titleEl.textContent = this._getViewTitle(tab);
    }

    // Update Sidebar Navigation state
    const sidebarMount = document.getElementById('admin-sidebar-mount');
    if (sidebarMount) {
      const stats = adminDataService.getStats();
      sidebarMount.innerHTML = this.sidebar.render(stats);
      this.sidebar.bindEvents(sidebarMount);
    }

    this._mountView(tab);
  }

  _mountView(tab) {
    const viewMount = document.getElementById('admin-view-mount');
    if (!viewMount) return;

    const viewInstance = this.views[tab];
    this.currentViewInstance = viewInstance;

    viewMount.innerHTML = viewInstance.render();

    if (typeof viewInstance.bindEvents === 'function') {
      viewInstance.bindEvents(viewMount, () => {
        this.refreshCurrentView(false);
      });
    }
  }

  refreshCurrentView(showToast = true) {
    // Re-render sidebar stats
    const sidebarMount = document.getElementById('admin-sidebar-mount');
    if (sidebarMount) {
      const stats = adminDataService.getStats();
      sidebarMount.innerHTML = this.sidebar.render(stats);
      this.sidebar.bindEvents(sidebarMount);
    }

    // Re-render active view
    this._mountView(this.currentTab);

    if (showToast) {
      toast.success('Data panel operasional telah diperbarui!', 'Tersinkronisasi');
    }
  }

  _handleSeedDemo() {
    adminDataService.seedDemoData();
    toast.success('Data demo realistis berhasil disuntikkan ke sistem!', 'Data Seeded');
    this.refreshCurrentView(false);
  }
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AdminApp();
  app.init();
});
