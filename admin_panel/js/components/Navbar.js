/**
 * Navbar Component
 * Top bar modern dengan jam server, sinkronisasi storage, dan profil admin
 */
export class Navbar {
  constructor({ onRefresh = () => {}, onSearch = () => {} }) {
    this.onRefresh = onRefresh;
    this.onSearch = onSearch;
  }

  render(title = 'Gudang API Key') {
    return `
      <header class="h-20 bg-[#091124]/70 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-30 px-8 flex items-center justify-between">
        <!-- Left: Page Title & Breadcrumbs -->
        <div>
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Portal</span>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span class="text-indigo-400 font-medium">Operasional</span>
          </div>
          <h2 class="text-xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']" id="navbar-view-title">${title}</h2>
        </div>

        <!-- Right: Actions & Admin Profile -->
        <div class="flex items-center gap-4">
          <!-- Live Storage Status Pill -->
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Database: <strong class="text-white font-mono">Local-Synchronized</strong></span>
          </div>

          <!-- Refresh Data Button -->
          <button
            type="button"
            id="navbar-refresh-btn"
            title="Refresh & Muat Ulang Data"
            class="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center justify-center group"
          >
            <span class="material-symbols-outlined text-lg group-hover:rotate-180 transition-transform duration-500">sync</span>
          </button>


        </div>
      </header>
    `;
  }

  bindEvents(container) {
    const refreshBtn = container.querySelector('#navbar-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.onRefresh();
      });
    }
  }
}
