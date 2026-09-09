/**
 * Navbar Component
 * Header navigasi atas modern sesuai referensi foto AI Dashboard
 * Fitur: Logo gradasi, Badge Admin, Tombol Sync, Tombol Emerald Install Admin App, Buka App User, dan Dropdown Admin User
 */
export class Navbar {
  constructor({ onRefresh = () => {}, onNavigate = () => {}, onSeed = () => {}, onLogout = () => {} }) {
    this.onRefresh = onRefresh;
    this.onNavigate = onNavigate;
    this.onSeed = onSeed;
    this.onLogout = onLogout;
    this.deferredPrompt = null;

    // Listen for PWA Install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('btn-install-pwa');
      if (installBtn) {
        installBtn.classList.remove('opacity-70');
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
    });
  }

  render(currentTab = 'dashboard', title = '') {
    const isDashboard = currentTab === 'dashboard';

    return `
      <header class="h-14 sm:h-16 bg-[#060b18] px-3 sm:px-8 flex items-center justify-between">
        <!-- Left: Back Button (Sub-views) + Brand Logo + Title -->
        <div class="flex items-center gap-2 sm:gap-3">
          ${!isDashboard ? `
            <a
              href="#dashboard"
              data-nav="dashboard"
              class="w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Kembali ke Dashboard Utama"
            >
              <span class="material-symbols-outlined text-base">arrow_back</span>
            </a>
          ` : ''}

          <a
            href="#dashboard"
            data-nav="dashboard"
            class="flex items-center gap-2 sm:gap-3 group text-decoration-none"
            title="Kembali ke Dashboard Utama"
          >
            <!-- Colorful Gradient Logo Squircle -->
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
              <div class="w-full h-full bg-[#080d1e] rounded-[10px] flex items-center justify-center">
                <span class="material-symbols-outlined text-indigo-300 text-xl font-light">key</span>
              </div>
            </div>

            <!-- Brand Text -->
            <div class="flex items-center gap-2">
              <span class="font-bold text-base sm:text-lg text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                Panen Kunci
              </span>
            </div>
          </a>

          ${!isDashboard && title ? `
            <div class="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs text-slate-400">
              <a href="#dashboard" data-nav="dashboard" class="hover:text-white transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">home</span>
                <span>Dashboard</span>
              </a>
              <span class="material-symbols-outlined text-[10px] text-slate-600">chevron_right</span>
              <span class="text-indigo-300 font-medium">${title}</span>
            </div>
          ` : ''}
        </div>

        <!-- Right: Actions (Sync & Admin User Dropdown) -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Sync Data Button -->
          <button
            type="button"
            id="navbar-refresh-btn"
            title="Sinkronkan data realtime"
            class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-xs text-amber-300 hover:text-amber-200 transition-all flex items-center gap-1.5 cursor-pointer group"
          >
            <span class="material-symbols-outlined text-base group-hover:rotate-180 transition-transform duration-500">sync</span>
            <span class="hidden sm:inline font-medium">Sync</span>
          </button>

          <!-- Admin User Profile Dropdown (Purple Circle + Admin User + Chevron) -->
          <div class="relative" id="admin-user-menu-container">
            <button
              type="button"
              id="btn-admin-user-dropdown"
              class="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2.5 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer"
            >
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 shadow-md shadow-purple-600/30 flex items-center justify-center text-white font-bold text-xs">
                <span class="material-symbols-outlined text-base">person</span>
              </div>
              <span class="hidden sm:inline text-xs font-semibold text-slate-200">Admin User</span>
              <span class="material-symbols-outlined text-sm text-slate-400">expand_more</span>
            </button>

            <!-- Dropdown Menu -->
            <div
              id="admin-user-dropdown-menu"
              class="hidden absolute right-0 mt-2 w-56 bg-[#0c1427] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 py-2 z-50 backdrop-blur-2xl"
            >
              <div class="px-4 py-2.5 border-b border-slate-800">
                <div class="text-xs font-bold text-white">Administrator</div>
                <div class="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Super Admin Sesi Aktif</span>
                </div>
              </div>

              <!-- Quick Navigation Inside Dropdown -->
              <div class="py-1">
                <button
                  type="button"
                  data-dropdown-nav="dashboard"
                  class="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5"
                >
                  <span class="material-symbols-outlined text-sm text-indigo-400">grid_view</span>
                  <span>Dashboard Utama</span>
                </button>
                <button
                  type="button"
                  data-dropdown-nav="apikeys"
                  class="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5"
                >
                  <span class="material-symbols-outlined text-sm text-blue-400">vpn_key</span>
                  <span>Gudang API Key</span>
                </button>
                <button
                  type="button"
                  data-dropdown-nav="withdrawals"
                  class="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5"
                >
                  <span class="material-symbols-outlined text-sm text-amber-400">payments</span>
                  <span>Persetujuan Penarikan</span>
                </button>
                <button
                  type="button"
                  data-dropdown-nav="users"
                  class="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5"
                >
                  <span class="material-symbols-outlined text-sm text-purple-400">group</span>
                  <span>Kelola Pengguna</span>
                </button>
                <button
                  type="button"
                  data-dropdown-nav="settings"
                  class="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2.5"
                >
                  <span class="material-symbols-outlined text-sm text-emerald-400">tune</span>
                  <span>Pengaturan Tarif</span>
                </button>
              </div>

              <div class="border-t border-slate-800 my-1"></div>

              <div class="py-1">
                <a
                  href="/"
                  target="_blank"
                  class="w-full text-left px-4 py-2 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 flex items-center gap-2.5 text-decoration-none"
                >
                  <span class="material-symbols-outlined text-sm">open_in_new</span>
                  <span>Buka App User</span>
                </a>

                <button
                  type="button"
                  id="dropdown-btn-seed-data"
                  class="w-full text-left px-4 py-2 text-xs text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 flex items-center gap-2.5 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">database</span>
                  <span>Isi / Reset Data Demo</span>
                </button>

                <button
                  type="button"
                  id="dropdown-btn-logout"
                  class="w-full text-left px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">logout</span>
                  <span>Keluar Admin</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  bindEvents(container) {
    // Refresh / Sync
    const refreshBtn = container.querySelector('#navbar-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.classList.add('animate-spin');
          setTimeout(() => icon.classList.remove('animate-spin'), 600);
        }
        this.onRefresh();
      });
    }

    // Direct Nav Links
    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const nav = el.getAttribute('data-nav');
        this.onNavigate(nav);
      });
    });

    // Dropdown Toggle
    const dropdownBtn = container.querySelector('#btn-admin-user-dropdown');
    const dropdownMenu = container.querySelector('#admin-user-dropdown-menu');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
      });

      const handleOutsideClick = (e) => {
        if (!container.contains(e.target)) {
          dropdownMenu.classList.add('hidden');
        }
      };
      document.addEventListener('click', handleOutsideClick);
    }

    // Dropdown Nav Items
    container.querySelectorAll('[data-dropdown-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-dropdown-nav');
        dropdownMenu?.classList.add('hidden');
        this.onNavigate(target);
      });
    });

    // Seed Demo in Dropdown
    const seedBtn = container.querySelector('#dropdown-btn-seed-data');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        dropdownMenu?.classList.add('hidden');
        this.onSeed();
      });
    }

    // Logout in Dropdown
    const logoutBtn = container.querySelector('#dropdown-btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        dropdownMenu?.classList.add('hidden');
        this.onLogout();
      });
    }
  }
}
