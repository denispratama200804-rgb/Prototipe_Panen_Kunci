/**
 * Sidebar Component
 * Navigasi samping modern bertema dark cyber glassmorphic
 */
export class Sidebar {
  constructor(activeTab = 'dashboard', onNavigate = () => {}, onSeed = () => {}) {
    this.activeTab = activeTab;
    this.onNavigate = onNavigate;
    this.onSeed = onSeed;
  }

  render(stats = {}) {
    const pendingCount = stats.pendingCount || 0;
    const totalKeys = stats.totalKeys || 0;
    const totalUsers = stats.totalUsers || 4;

    const navItems = [
      {
        id: 'dashboard',
        label: 'Dashboard & Analitik',
        icon: 'space_dashboard',
        badge: null
      },
      {
        id: 'apikeys',
        label: 'Gudang API Key',
        icon: 'vpn_key',
        badge: totalKeys > 0 ? totalKeys : null,
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
      },
      {
        id: 'withdrawals',
        label: 'Persetujuan Penarikan',
        icon: 'payments',
        badge: pendingCount > 0 ? `${pendingCount} Pending` : null,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
      },
      {
        id: 'users',
        label: 'Kelola Pengguna',
        icon: 'group',
        badge: totalUsers > 0 ? totalUsers : null,
        badgeColor: 'bg-slate-700/40 text-slate-300 border-slate-600/30'
      },
      {
        id: 'settings',
        label: 'Pengaturan Tarif',
        icon: 'tune',
        badge: null
      }
    ];

    return `
      <aside class="w-72 bg-[#091124]/90 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col flex-shrink-0 h-screen sticky top-0 z-40 select-none">
        <!-- Brand Header -->
        <div class="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div class="w-full h-full bg-[#091124] rounded-[14px] flex items-center justify-center">
              <span class="material-symbols-outlined text-indigo-400 text-2xl font-light">key</span>
            </div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">Panen Kunci</h1>
              <span class="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">PRO</span>
            </div>
            <p class="text-xs text-slate-400">Admin Control Center</p>
          </div>
        </div>

        <!-- System Status Bar -->
        <div class="px-6 py-3 bg-slate-900/40 border-b border-slate-800/50 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping"></span>
            <span class="text-[11px] font-medium text-emerald-400">Live Storage Sync</span>
          </div>
          <span class="text-[10px] text-slate-400 font-mono">v1.2.0</span>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div class="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Utama
          </div>
          ${navItems.map(item => {
            const isActive = this.activeTab === item.id;
            return `
              <button
                type="button"
                data-nav="${item.id}"
                class="w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-blue-600/10 text-white border border-indigo-500/30 shadow-lg shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }"
              >
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }">
                    ${item.icon}
                  </span>
                  <span class="${isActive ? 'font-semibold tracking-tight' : ''}">${item.label}</span>
                </div>
                ${
                  item.badge
                    ? `<span class="text-[11px] px-2 py-0.5 rounded-full font-semibold border ${item.badgeColor}">${item.badge}</span>`
                    : ''
                }
              </button>
            `;
          }).join('')}
        </nav>

        <!-- Bottom Quick Actions & Client Link -->
        <div class="p-4 border-t border-slate-800/80 space-y-2 bg-[#060c1c]/50">
          <a
            href="/"
            target="_blank"
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors group"
          >
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-sm text-emerald-400 group-hover:translate-x-0.5 transition-transform">open_in_new</span>
              <span>Buka App User</span>
            </div>
            <span class="text-[10px] text-slate-400">Preview</span>
          </a>

          <button
            type="button"
            id="btn-seed-data-sidebar"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600/30 border border-indigo-500/20 transition-all"
          >
            <span class="material-symbols-outlined text-sm">database</span>
            <span>Isi / Reset Demo Data</span>
          </button>

          <button
            type="button"
            id="btn-logout-admin"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 transition-all"
          >
            <span class="material-symbols-outlined text-sm">logout</span>
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>
    `;
  }

  bindEvents(container) {
    container.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav');
        this.activeTab = target;
        this.onNavigate(target);
      });
    });

    const seedBtn = container.querySelector('#btn-seed-data-sidebar');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        this.onSeed();
      });
    }

    const logoutBtn = container.querySelector('#btn-logout-admin');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('panenkunci:admin_logged_in');
        window.location.href = '/#/login';
      });
    }
  }
}
