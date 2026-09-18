import { themeService } from '../services/ThemeService.js';
import { chatService } from '../../../src/infrastructure/services/ChatService.js';

/**
 * Navbar Component
 * Header navigasi atas modern sesuai referensi foto AI Dashboard
 * Fitur: Logo gradasi, Badge Admin, Tombol Sync, Tombol Tema (Malam/Siang), Buka App User, dan Dropdown Admin User
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
    const isDark = themeService.isDark();
    const unreadChatCount = chatService.getUnreadCountForAdmin();

    return `
      <header class="h-14 sm:h-16 admin-navbar px-3 sm:px-8 flex items-center justify-between border-b border-transparent">
        <!-- Left: Back Button (Sub-views) + Brand Logo + Title -->
        <div class="flex items-center gap-2 sm:gap-3">
          ${!isDashboard ? `
            <a
              href="#dashboard"
              data-nav="dashboard"
              class="admin-nav-btn w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
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
            <!-- Official Panen Kunci Logo (Tanpa Garis Ungu) -->
            <img
              src="/Logo_PK.jpg"
              alt="Panen Kunci Logo"
              class="h-8 sm:h-9 w-auto object-contain rounded-lg shrink-0 group-hover:scale-105 transition-transform"
              onerror="this.src='/logo.png'"
            />

            <!-- Brand Text -->
            <div class="flex items-center gap-2">
              <span class="font-bold text-base sm:text-lg admin-brand-text font-['Plus_Jakarta_Sans'] tracking-tight">
                Panen Kunci
              </span>
            </div>
          </a>

          ${!isDashboard && title ? `
            <div class="hidden md:flex items-center gap-2 pl-3 border-l border-slate-700/60 text-xs text-slate-400">
              <a href="#dashboard" data-nav="dashboard" class="hover:text-white transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">home</span>
                <span>Dashboard</span>
              </a>
              <span class="material-symbols-outlined text-[10px] text-slate-500">chevron_right</span>
              <span class="text-indigo-400 font-medium">${title}</span>
            </div>
          ` : ''}
        </div>

        <!-- Right: Actions (Live Chat, Sync & Theme Toggle & Admin User Dropdown) -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Live Chat Button (Pesan Masuk Pengguna) -->
          <a
            href="#chat"
            data-nav="chat"
            title="Live Chat Bantuan Pengguna"
            class="admin-nav-btn relative px-2.5 sm:px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer group ${currentTab === 'chat' ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40' : ''}"
          >
            <span class="material-symbols-outlined text-base text-emerald-400 group-hover:scale-110 transition-transform">forum</span>
            <span class="hidden sm:inline font-medium">Live Chat</span>
            ${unreadChatCount > 0 ? `
              <span class="min-w-[17px] h-[17px] px-1 bg-rose-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-sm animate-pulse">
                ${unreadChatCount}
              </span>
            ` : ''}
          </a>

          <!-- Sync Data Button -->
          <button
            type="button"
            id="navbar-refresh-btn"
            title="Sinkronkan data realtime"
            class="admin-nav-btn px-2.5 sm:px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer group"
          >
            <span class="material-symbols-outlined text-base text-amber-500 group-hover:rotate-180 transition-transform duration-500">sync</span>
            <span class="hidden sm:inline font-medium">Sync</span>
          </button>

          <!-- Theme Toggle Button (Malam / Siang) -->
          <button
            type="button"
            id="navbar-theme-toggle-btn"
            title="${isDark ? 'Ganti ke Tema Siang' : 'Ganti ke Tema Malam'}"
            aria-label="Ganti Tema Tampilan"
            class="admin-nav-btn px-2.5 sm:px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer group"
          >
            <span class="material-symbols-outlined text-base transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 ${isDark ? 'text-indigo-400' : 'text-amber-500'}" id="navbar-theme-icon">
              ${isDark ? 'dark_mode' : 'light_mode'}
            </span>
            <span class="hidden sm:inline font-medium" id="navbar-theme-label">
              ${isDark ? 'Malam' : 'Siang'}
            </span>
          </button>

          <!-- Logout Button (Langsung di Navbar) -->
          <button
            type="button"
            id="navbar-logout-btn"
            title="Keluar dari sesi Administrator"
            class="admin-nav-btn px-2.5 sm:px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors group"
          >
            <span class="material-symbols-outlined text-base text-rose-400 group-hover:scale-110 transition-transform">logout</span>
            <span class="hidden sm:inline font-medium">Keluar</span>
          </button>
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

    // Logout Button
    const logoutBtn = container.querySelector('#navbar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.onLogout();
      });
    }

    // ── Theme Toggle Event Handlers (Idempotent: prevents duplicate execution) ──
    const handleToggleTheme = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const newTheme = themeService.toggleTheme();
      this._updateThemeUI(container, newTheme);
    };

    const navbarThemeBtn = container.querySelector('#navbar-theme-toggle-btn');
    if (navbarThemeBtn) {
      navbarThemeBtn.onclick = handleToggleTheme;
    }

    // Pastikan hanya satu pendengar aktif (hindari memory leak / duplicate calls)
    if (this._themeUnsubscribe) {
      this._themeUnsubscribe();
    }
    this._themeUnsubscribe = themeService.onThemeChange((theme) => {
      this._updateThemeUI(container, theme);
    });
  }

  _updateThemeUI(container, theme) {
    const isDark = theme === 'dark';
    const icon = container.querySelector('#navbar-theme-icon');
    const label = container.querySelector('#navbar-theme-label');
    const themeBtn = container.querySelector('#navbar-theme-toggle-btn');

    if (icon) {
      icon.textContent = isDark ? 'dark_mode' : 'light_mode';
      icon.className = `material-symbols-outlined text-base transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 ${isDark ? 'text-indigo-400' : 'text-amber-500'}`;
    }
    if (label) {
      label.textContent = isDark ? 'Malam' : 'Siang';
    }
    if (themeBtn) {
      themeBtn.setAttribute('title', isDark ? 'Ganti ke Tema Siang' : 'Ganti ke Tema Malam');
    }
  }
}
