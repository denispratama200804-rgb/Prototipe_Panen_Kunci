/**
 * Admin Panel Bootstrap & Router Engine
 * Panen Kunci Executive Control Center
 * Arsitektur: Modern App Hub Dashboard + Responsive Desktop & Mobile Web
 */
// ONE-TIME CACHE WIPE (Deployed to Vercel)
if (!localStorage.getItem('panenkunci_wiped_v3')) {
  console.log('🧹 Menjalankan pembersihan cache menyeluruh (V3)...');
  const prefix = 'panenkunci:';
  const keysToRemove = [];
  for(let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && (k.includes('wallet_balance') || k.includes('wallet_passive_balance') || k.includes('lifetime_earnings') || k.includes('transactions') || k.includes('api_keys'))){
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  
  localStorage.removeItem(prefix + 'wallet_balance');
  localStorage.removeItem(prefix + 'wallet_passive_balance');
  localStorage.removeItem(prefix + 'lifetime_earnings');

  const usersRaw = localStorage.getItem(prefix + 'all_users');
  if (usersRaw) {
    try {
      let users = JSON.parse(usersRaw);
      if (Array.isArray(users)) {
        users = users.map(u => {
          delete u.manualBalance;
          delete u.customBalance;
          delete u.balance;
          return u;
        });
        localStorage.setItem(prefix + 'all_users', JSON.stringify(users));
      }
    } catch(e) {}
  }
  localStorage.setItem('panenkunci_wiped_v3', 'true');
  console.log('✅ Pembersihan selesai.');
}

import { adminDataService } from './services/AdminDataService.js';
import { toast } from './services/ToastService.js';
import { Navbar } from './components/Navbar.js';
import { themeService } from './services/ThemeService.js';

import { HubDashboardView } from './views/HubDashboardView.js';
import { ApiKeysView } from './views/ApiKeysView.js';
import { WithdrawalsView } from './views/WithdrawalsView.js';
import { UsersView } from './views/UsersView.js';
import { SettingsView } from './views/SettingsView.js';
import { LiveChatAdminView } from './views/LiveChatAdminView.js';
import { chatService } from '../../src/infrastructure/services/ChatService.js';

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
      settings: new SettingsView(adminDataService, toast),
      chat: new LiveChatAdminView(adminDataService, toast)
    };
  }

  _getInitialTab() {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'chat', 'apikeys', 'withdrawals', 'users', 'settings'];
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

    // Auto-sync data permohonan penarikan dana dari Supabase di background
    adminDataService.fetchTransactionsFromSupabase().then(() => {
      if (this.currentTab === 'withdrawals' || this.currentTab === 'dashboard') {
        this.refreshCurrentView(false);
      }
    }).catch(e => console.warn('Supabase transactions auto-sync:', e));

    // Real-time listener: saat ada permohonan penarikan dana baru masuk
    adminDataService.on('withdrawal_received', (data) => {
      toast.info(
        `Permohonan penarikan dana sebesar Rp ${Number(data.amount || 0).toLocaleString('id-ID')} baru saja masuk!`,
        'Permohonan Payout Baru'
      );
      if (this.currentTab === 'withdrawals' || this.currentTab === 'dashboard') {
        this.refreshCurrentView(false, false);
      }
      // Re-render navbar mount to update counters
      const navbarMount = document.getElementById('admin-navbar-mount');
      if (navbarMount) {
        navbarMount.innerHTML = this.navbar.render(this.currentTab, this._getViewTitle(this.currentTab));
        this.navbar.bindEvents(navbarMount);
      }
    });

    adminDataService.on('transactions_updated', () => {
      if (this.currentTab === 'withdrawals' || this.currentTab === 'dashboard') {
        this.refreshCurrentView(false, false);
      }
    });

    // Real-time listener: saat ada pesan chat baru dari user
    chatService.on('message_received', (msg) => {
      const navbarMount = document.getElementById('admin-navbar-mount');
      if (navbarMount) {
        navbarMount.innerHTML = this.navbar.render(this.currentTab, this._getViewTitle(this.currentTab));
        this.navbar.bindEvents(navbarMount);
      }
      if (this.currentTab === 'dashboard') {
        this.refreshCurrentView(false, false);
      }
    });

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
        <main class="flex-1 w-full max-w-7xl mx-auto min-w-0 ${this.currentTab === 'chat' ? 'px-2 sm:px-4 py-2' : 'p-3 sm:p-6 md:p-8'}" id="admin-view-mount">
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
      case 'chat':
        return 'Live Chat & Bantuan Pengguna';
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

    // Fetch update data terbaru saat membuka tab withdrawals atau dashboard
    if (tab === 'withdrawals' || tab === 'dashboard') {
      adminDataService.fetchTransactionsFromSupabase().then(() => {
        if (this.currentTab === tab) {
          this.refreshCurrentView(false, false);
        }
      }).catch(() => {});
    }
  }

  _mountView(tab, withAnimation = true) {
    const viewMount = document.getElementById('admin-view-mount');
    if (!viewMount) return;

    // Sesuaikan padding container agar tampilan live chat pas dengan viewport layar tanpa terpotong
    if (tab === 'chat') {
      viewMount.className = 'flex-1 w-full max-w-7xl mx-auto min-w-0 px-2 sm:px-4 py-2';
    } else {
      viewMount.className = 'flex-1 w-full max-w-7xl mx-auto min-w-0 p-3 sm:p-6 md:p-8';
    }

    // Simpan status elemen yang sedang fokus (focus & posisi kursor) agar tidak hilang saat re-render
    const activeEl = document.activeElement;
    let activeSelector = null;
    if (activeEl && activeEl !== document.body && viewMount.contains(activeEl)) {
      if (activeEl.id) {
        activeSelector = '#' + activeEl.id;
      } else if (activeEl.name) {
        activeSelector = `${activeEl.tagName.toLowerCase()}[name="${activeEl.name}"]`;
      }
    }
    const isTextInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    const selStart = isTextInput ? activeEl.selectionStart : null;
    const selEnd = isTextInput ? activeEl.selectionEnd : null;

    const viewInstance = this.views[tab] || this.views.dashboard;
    this.currentViewInstance = viewInstance;

    let html = '';
    try {
      html = viewInstance.render();
      if (!withAnimation) {
        html = html.replace(/\bview-fade-enter\b/g, '');
      }
      viewMount.innerHTML = html;

      if (typeof viewInstance.bindEvents === 'function') {
        viewInstance.bindEvents(viewMount, () => {
          this.refreshCurrentView(false, false);
        });
      }
    } catch (err) {
      console.error(`[AdminApp] Gagal memuat tampilan "${tab}":`, err);
      viewMount.innerHTML = `
        <div class="p-8 text-center text-slate-300">
          <div class="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-3xl">error</span>
          </div>
          <h3 class="text-base font-bold text-white mb-1">Gagal Memuat Tampilan</h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto mb-4">${err?.message || 'Terjadi kesalahan sistem'}</p>
          <button onclick="window.location.reload()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
            Muat Ulang Halaman
          </button>
        </div>
      `;
    }

    // Kembalikan fokus dan posisi kursor pengguna jika sebelumnya sedang mengetik
    if (activeSelector) {
      const restoredEl = viewMount.querySelector(activeSelector);
      if (restoredEl && typeof restoredEl.focus === 'function') {
        restoredEl.focus();
        if (isTextInput && selStart !== null && selEnd !== null) {
          try {
            restoredEl.setSelectionRange(selStart, selEnd);
          } catch (e) {
            // Abaikan tipe input yang tidak mendukung selection range
          }
        }
      }
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
