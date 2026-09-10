import { setupTableScroll } from '../utils/TableScroller.js';

/**
 * ApiKeysView
 * Gudang API Key: Manajemen seluruh API Key Kie.ai yang disetor pengguna,
 * filter status, reveal/masking, salin instan, dan ekspor (.txt, .csv, .json).
 */
export class ApiKeysView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.revealedKeys = new Set();
    this.hasSynced = false;
    this.isSyncing = false;
  }

  destroy() {
    this.revealedKeys.clear();
  }

  getFilteredKeys() {
    let keys = this.dataService.getApiKeys();

    // Filter Kunci Pasif ('pending') vs Kunci Aktif ('valid') vs Semua ('all')
    if (this.currentFilter === 'valid') {
      keys = keys.filter(k => k.status === 'valid');
    } else if (this.currentFilter === 'pending') {
      keys = keys.filter(k => k.status === 'pending');
    }

    // Search Query (API Key String, User ID, ID Kunci, Email, Nama Pengguna)
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase().trim();
      keys = keys.filter(k =>
        (k.keyString && k.keyString.toLowerCase().includes(q)) ||
        (k.userId && k.userId.toLowerCase().includes(q)) ||
        (k.userName && k.userName.toLowerCase().includes(q)) ||
        (k.id && k.id.toLowerCase().includes(q)) ||
        (k.userEmail && k.userEmail.toLowerCase().includes(q))
      );
    }

    return keys;
  }

  render() {
    const keys = this.getFilteredKeys();
    const allKeys = this.dataService.getApiKeys();
    const validCount = allKeys.filter(k => k.status === 'valid').length;
    const pendingCount = allKeys.filter(k => k.status === 'pending').length;

    return `
      <div class="space-y-5 view-fade-enter">
        <!-- Top Stats Banner: Kartu Interaktif untuk Filter Cepat Kunci Pasif / Kunci Aktif -->
        <div class="grid grid-cols-3 gap-2 sm:gap-4">
          <!-- Total Kunci (Semua) -->
          <button
            type="button"
            data-filter="all"
            title="Klik untuk melihat semua kunci"
            class="admin-card text-left rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 ${
              this.currentFilter === 'all'
                ? 'ring-2 ring-indigo-500 bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                : 'border-slate-800/80 hover:border-slate-700'
            }"
          >
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-lg sm:text-xl">dataset</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] sm:text-xs text-slate-400 font-medium">Total Kunci</span>
                ${this.currentFilter === 'all' ? '<span class="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">Aktif</span>' : ''}
              </div>
              <div class="text-base sm:text-xl font-bold text-white font-mono">${allKeys.length}</div>
            </div>
          </button>

          <!-- Kunci Pasif (Pending) -->
          <button
            type="button"
            data-filter="pending"
            title="Klik untuk memfilter Kunci Pasif (menunggu verifikasi)"
            class="admin-card text-left rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 ${
              this.currentFilter === 'pending'
                ? 'ring-2 ring-amber-500 bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/20'
                : pendingCount > 0
                ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
                : 'border-slate-800/80 hover:border-slate-700'
            }"
          >
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${
              pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-amber-500/10 text-amber-400'
            } flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-lg sm:text-xl">hourglass_top</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] sm:text-xs text-amber-300/90 font-medium">Kunci Pasif</span>
                ${this.currentFilter === 'pending' ? '<span class="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-bold uppercase">Aktif</span>' : ''}
              </div>
              <div class="text-base sm:text-xl font-bold text-amber-400 font-mono flex items-center gap-1.5">
                <span>${pendingCount}</span>
                ${pendingCount > 0 ? '<span class="hidden md:inline-flex text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-sans font-medium border border-amber-500/30">Review</span>' : ''}
              </div>
            </div>
          </button>

          <!-- Kunci Aktif (Valid) -->
          <button
            type="button"
            data-filter="valid"
            title="Klik untuk memfilter Kunci Aktif (terverifikasi)"
            class="admin-card text-left rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 ${
              this.currentFilter === 'valid'
                ? 'ring-2 ring-emerald-500 bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-500/20'
                : 'border-slate-800/80 hover:border-slate-700'
            }"
          >
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-lg sm:text-xl">verified</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] sm:text-xs text-emerald-300/90 font-medium">Kunci Aktif</span>
                ${this.currentFilter === 'valid' ? '<span class="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-bold uppercase">Aktif</span>' : ''}
              </div>
              <div class="text-base sm:text-xl font-bold text-emerald-400 font-mono">${validCount}</div>
            </div>
          </button>
        </div>

        <!-- Controls Bar: Filter Pasif & Aktif + Search + Export -->
        <div class="admin-card rounded-2xl p-3.5 sm:p-5 space-y-4 w-full max-w-full min-w-0 border border-slate-800/90 shadow-xl bg-[#0b1329]">
          <!-- Baris 1: Filter Buttons (Standalone Buttons - Tanpa Scrollbar) & Pencarian -->
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            
            <!-- Tombol Filter Pemisah Kunci Pasif & Kunci Aktif (Bebas Scrollbar) -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Button: Semua Kunci -->
              <button
                type="button"
                data-filter="all"
                title="Tampilkan semua data API Key"
                class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer shadow-sm active:scale-95 ${
                  this.currentFilter === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 font-bold ring-2 ring-indigo-400/30'
                    : 'bg-[#0a1226] hover:bg-slate-800/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }"
              >
                <span class="material-symbols-outlined text-base sm:text-lg">apps</span>
                <span>Semua</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  this.currentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                }">${allKeys.length}</span>
              </button>

              <!-- Button: Kunci Aktif -->
              <button
                type="button"
                data-filter="valid"
                title="Tampilkan hanya kunci aktif yang sudah diverifikasi"
                class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer shadow-sm active:scale-95 ${
                  this.currentFilter === 'valid'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 font-bold ring-2 ring-emerald-400/30'
                    : 'bg-[#0a1226] hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                }"
              >
                <span class="material-symbols-outlined text-base sm:text-lg">verified</span>
                <span>Kunci Aktif</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  this.currentFilter === 'valid' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }">${validCount}</span>
              </button>

              <!-- Button: Kunci Pasif -->
              <button
                type="button"
                data-filter="pending"
                title="Tampilkan hanya kunci pasif yang menunggu verifikasi admin"
                class="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer shadow-sm active:scale-95 ${
                  this.currentFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 font-bold ring-2 ring-amber-300/40'
                    : 'bg-[#0a1226] hover:bg-amber-950/30 text-amber-400 border-amber-500/30 hover:border-amber-500/60'
                }"
              >
                <span class="material-symbols-outlined text-base sm:text-lg">hourglass_top</span>
                <span>Kunci Pasif</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  this.currentFilter === 'pending'
                    ? 'bg-slate-950/30 text-slate-950'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                } inline-flex items-center gap-1">
                  ${pendingCount > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>' : ''}
                  ${pendingCount}
                </span>
              </button>
            </div>

            <!-- Search Bar -->
            <div class="flex items-center gap-2 flex-1 max-w-full lg:max-w-md min-w-0">
              <div class="relative flex-1 min-w-0">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  id="keys-search-input"
                  placeholder="Cari kunci, User ID, ID Kunci..."
                  value="${this.searchQuery}"
                  class="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-[#070c18] border border-slate-800/90 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button
                type="button"
                id="btn-search-trigger"
                class="px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all shrink-0 cursor-pointer"
              >
                <span class="material-symbols-outlined text-base">search</span>
                <span>Cari</span>
              </button>
            </div>
          </div>

          <!-- Baris 2: Indikator Filter Aktif & Batch Export -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-800/70 gap-2.5">
            <!-- Active Filter Badge & Info -->
            <div class="flex items-center gap-2 text-xs flex-wrap">
              <span class="text-slate-400">Status Ditampilkan:</span>
              ${
                this.currentFilter === 'pending'
                  ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold text-[11px]">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Kunci Pasif (${keys.length} data)
                    </span>`
                  : this.currentFilter === 'valid'
                  ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                      <span class="material-symbols-outlined text-xs">verified</span>
                      Kunci Aktif (${keys.length} data)
                    </span>`
                  : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold text-[11px]">
                      Semua Kunci (${keys.length} data)
                    </span>`
              }
              ${
                this.currentFilter !== 'all' || this.searchQuery
                  ? `<button
                      type="button"
                      data-filter="all"
                      id="btn-reset-key-filter"
                      class="text-[11px] text-slate-400 hover:text-indigo-400 underline underline-offset-2 flex items-center gap-0.5 cursor-pointer ml-1"
                    >
                      <span class="material-symbols-outlined text-xs">restart_alt</span>
                      <span>Reset filter</span>
                    </button>`
                  : ''
              }
            </div>

            <!-- Right: Status Database & Tombol Sinkronkan Supabase -->
            <div class="flex items-center gap-2.5">
              <button
                type="button"
                id="btn-sync-supabase-keys"
                title="Sinkronkan data API Key langsung dari database Supabase"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  this.isSyncing ? 'opacity-70 cursor-not-allowed' : ''
                }"
                ${this.isSyncing ? 'disabled' : ''}
              >
                <span class="material-symbols-outlined text-sm ${this.isSyncing ? 'animate-spin text-emerald-400' : ''}">sync</span>
                <span>${this.isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Supabase'}</span>
              </button>
              <div class="text-[11px] text-slate-500 font-mono hidden sm:block">
                Total: ${allKeys.length} Kunci
              </div>
            </div>
          </div>
        </div>

        <!-- Table Container -->
        <div class="admin-card rounded-2xl overflow-hidden w-full max-w-full min-w-0 border border-slate-800/80 shadow-xl">
          <div class="px-4 py-3 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center ${
                this.currentFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-400'
                  : this.currentFilter === 'valid'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }">
                <span class="material-symbols-outlined text-base">
                  ${
                    this.currentFilter === 'pending'
                      ? 'hourglass_top'
                      : this.currentFilter === 'valid'
                      ? 'verified'
                      : 'dataset'
                  }
                </span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-white text-xs sm:text-sm">
                    ${
                      this.currentFilter === 'pending'
                        ? 'Daftar Kunci Pasif (Perlu Verifikasi)'
                        : this.currentFilter === 'valid'
                        ? 'Daftar Kunci Aktif (Terverifikasi)'
                        : 'Daftar Semua API Key'
                    }
                  </span>
                  <span class="text-[11px] text-slate-400 font-mono whitespace-nowrap">(${keys.length} baris)</span>
                </div>
              </div>
            </div>

            <!-- Quick Scroll Controls -->
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] text-slate-400 hidden sm:inline mr-1">Geser kolom:</span>
              <button
                type="button"
                id="btn-keys-scroll-left"
                title="Geser tabel ke kiri"
                class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span class="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button
                type="button"
                id="btn-keys-scroll-right"
                title="Geser tabel ke kanan"
                class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span class="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto custom-scrollbar w-full max-w-full min-w-0 pb-2 cursor-grab" id="keys-table-scroll">
            <table class="w-full text-left admin-table select-none" style="min-width: 820px;">
              <thead>
                <tr>
                  <th>API Key String</th>
                  <th>Pemilik / User</th>
                  <th>Status</th>
                  <th>Kredit Kie.ai</th>
                  <th>Reward Terbayar</th>
                  <th>Waktu Setor</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${
                  keys.length === 0
                    ? `
                  <tr>
                    <td colspan="7" class="text-center py-12 text-slate-400">
                      <span class="material-symbols-outlined text-4xl mb-2 ${
                        this.currentFilter === 'pending'
                          ? 'text-amber-500/60'
                          : this.currentFilter === 'valid'
                          ? 'text-emerald-500/60'
                          : 'text-slate-600'
                      } block">
                        ${
                          this.currentFilter === 'pending'
                            ? 'hourglass_empty'
                            : this.currentFilter === 'valid'
                            ? 'vpn_key_off'
                            : 'search_off'
                        }
                      </span>
                      <p class="font-medium text-slate-300 mb-1">
                        ${
                          this.currentFilter === 'pending'
                            ? 'Tidak ada Kunci Pasif yang menunggu verifikasi.'
                            : this.currentFilter === 'valid'
                            ? 'Tidak ada Kunci Aktif yang ditemukan.'
                            : 'Tidak ada data API Key yang cocok dengan pencarian.'
                        }
                      </p>
                      <p class="text-xs text-slate-500 mb-3">
                        ${
                          this.currentFilter === 'pending'
                            ? 'Semua setoran kunci sudah diverifikasi atau belum ada setoran baru dari pengguna.'
                            : 'Coba ubah filter atau kata kunci pencarian Anda.'
                        }
                      </p>
                      ${
                        this.currentFilter !== 'all' || this.searchQuery
                          ? `<button
                              type="button"
                              data-filter="all"
                              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all cursor-pointer"
                            >
                              <span class="material-symbols-outlined text-sm">refresh</span>
                              <span>Tampilkan Semua Kunci</span>
                            </button>`
                          : ''
                      }
                    </td>
                  </tr>
                `
                    : keys
                        .map(k => {
                          const isRevealed = this.revealedKeys.has(k.id);
                          const displayKey = isRevealed
                            ? k.keyString
                            : k.keyString
                            ? `${k.keyString.slice(0, 8)}••••••••••••${k.keyString.slice(-4)}`
                            : '-';

                          let statusBadge = '';
                          if (k.status === 'valid') {
                            statusBadge = '<span class="text-xs px-2.5 py-1 rounded-full font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Valid</span>';
                          } else if (k.status === 'pending') {
                            statusBadge = '<span class="text-xs px-2.5 py-1 rounded-full font-semibold border bg-amber-500/15 text-amber-300 border-amber-500/40 inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>Perlu Verifikasi</span>';
                          } else if (k.status === 'used') {
                            statusBadge = '<span class="text-xs px-2.5 py-1 rounded-full font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/30">Digunakan</span>';
                          } else {
                            statusBadge = '<span class="text-xs px-2.5 py-1 rounded-full font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/30">Invalid</span>';
                          }

                          return `
                    <tr data-key-id="${k.id}">
                      <td>
                        <div class="flex items-center gap-2">
                          <span class="font-mono text-xs font-semibold text-slate-200 select-all tracking-wider">${displayKey}</span>
                          <button
                            type="button"
                            data-action="toggle-reveal"
                            data-id="${k.id}"
                            title="${isRevealed ? 'Sembunyikan Kunci' : 'Tampilkan Kunci Lengkap'}"
                            class="p-1 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                          >
                            <span class="material-symbols-outlined text-sm">${isRevealed ? 'visibility_off' : 'visibility'}</span>
                          </button>
                          <button
                            type="button"
                            data-action="copy-key"
                            data-keystring="${k.keyString}"
                            title="Salin ke Clipboard"
                            class="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            <span class="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                        ${
                          k.errorMessage
                            ? `<div class="text-[11px] text-rose-400/90 mt-1 flex items-center gap-1">
                                <span class="material-symbols-outlined text-xs">info</span>
                                <span>${k.errorMessage}</span>
                              </div>`
                            : ''
                        }
                      </td>
                      <td>
                        <div class="font-bold text-xs text-white">${k.userName || 'Pengguna'}</div>
                        <div class="font-mono text-[11px] text-indigo-300 font-medium truncate max-w-[180px]" title="${k.userEmail || k.userId || ''}">${k.userEmail || k.userId || '-'}</div>
                        <div class="text-[10px] text-slate-500 font-mono">ID: ${k.id}</div>
                      </td>
                      <td>
                        ${statusBadge}
                      </td>
                      <td>
                        <div class="font-mono text-xs font-bold text-slate-200">${k.credits !== undefined ? k.credits : 80} cr</div>
                      </td>
                      <td>
                        <div class="font-mono text-xs font-semibold text-emerald-400">Rp ${(k.rewardAmount || 3000).toLocaleString('id-ID')}</div>
                      </td>
                      <td>
                        <div class="text-xs text-slate-300">${new Date(k.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div class="text-[11px] text-slate-500">${new Date(k.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td class="text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          ${
                            k.status === 'pending'
                              ? `
                            <button
                              type="button"
                              data-action="approve-key"
                              data-id="${k.id}"
                              title="Setujui API Key & Cairkan ke Saldo Aktif"
                              class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                            >
                              <span class="material-symbols-outlined text-xs">check_circle</span>
                              <span>Setujui</span>
                            </button>
                            <button
                              type="button"
                              data-action="reject-key"
                              data-id="${k.id}"
                              title="Tolak API Key & Batalkan Saldo Pasif"
                              class="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <span class="material-symbols-outlined text-xs">cancel</span>
                              <span>Tolak</span>
                            </button>
                          `
                              : k.status === 'valid'
                              ? `
                            <button
                              type="button"
                              data-action="set-status"
                              data-id="${k.id}"
                              data-status="used"
                              title="Tandai Sudah Digunakan / Dijual"
                              class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-300 border border-blue-500/30 transition-all cursor-pointer"
                            >
                              Tandai Used
                            </button>
                          `
                              : k.status === 'used'
                              ? `
                            <button
                              type="button"
                              data-action="set-status"
                              data-id="${k.id}"
                              data-status="valid"
                              title="Kembalikan ke Valid"
                              class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                            >
                              Reset Valid
                            </button>
                          `
                              : ''
                          }
                          <button
                            type="button"
                            data-action="delete-key"
                            data-id="${k.id}"
                            title="Hapus Kunci dari Database"
                            class="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-colors cursor-pointer"
                          >
                            <span class="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                        })
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    // Sinkronkan data API Key otomatis saat pertama kali dibuka
    if (!this.hasSynced) {
      this.hasSynced = true;
      this.dataService.fetchApiKeysFromSupabase().then(() => {
        refreshCallback();
      });
    }

    // Tombol Sinkronkan Supabase
    const syncBtn = container.querySelector('#btn-sync-supabase-keys');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        this.isSyncing = true;
        refreshCallback();
        const keys = await this.dataService.fetchApiKeysFromSupabase();
        this.isSyncing = false;
        this.toast.success(`Berhasil menyinkronkan ${keys.length} API Key dari database Supabase!`, 'Supabase Terhubung');
        refreshCallback();
      });
    }

    // Filter Kunci Pasif / Kunci Aktif / Semua Kunci
    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = btn.getAttribute('data-filter');
        if (this.currentFilter !== filter) {
          this.currentFilter = filter;
          refreshCallback();
        }
      });
    });

    // Reset Filter Button
    const resetBtn = container.querySelector('#btn-reset-key-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentFilter = 'all';
        this.searchQuery = '';
        refreshCallback();
      });
    }

    // Quick Table Horizontal Scroll & Drag Navigation
    setupTableScroll(container, 'keys-table-scroll', 'btn-keys-scroll-left', 'btn-keys-scroll-right');

    // Search Input & Search Trigger Button
    const searchInput = container.querySelector('#keys-search-input');
    const searchBtn = container.querySelector('#btn-search-trigger');

    if (searchInput) {
      // Enter key triggers search
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.searchQuery = searchInput.value;
          refreshCallback();
        }
      });
      // If user clears the input, automatically refresh
      searchInput.addEventListener('input', e => {
        if (e.target.value === '' && this.searchQuery !== '') {
          this.searchQuery = '';
          refreshCallback();
        }
      });
    }

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        this.searchQuery = searchInput.value;
        refreshCallback();
      });
    }

    // Copy to Clipboard
    container.querySelectorAll('[data-action="copy-key"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.getAttribute('data-keystring');
        try {
          await navigator.clipboard.writeText(key);
          this.toast.success(`API Key ${key.slice(0, 10)}... berhasil disalin ke clipboard!`, 'Tersalin');
        } catch (err) {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = key;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          this.toast.success(`API Key berhasil disalin!`, 'Tersalin');
        }
      });
    });

    // Toggle Reveal
    container.querySelectorAll('[data-action="toggle-reveal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (this.revealedKeys.has(id)) {
          this.revealedKeys.delete(id);
        } else {
          this.revealedKeys.add(id);
        }
        refreshCallback();
      });
    });

    // Set Status (e.g. used)
    container.querySelectorAll('[data-action="set-status"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const st = btn.getAttribute('data-status');
        btn.disabled = true;
        await this.dataService.updateApiKeyStatus(id, st);
        this.toast.info(`Status API Key diubah menjadi "${st}"`, 'Status Diperbarui');
        refreshCallback();
      });
    });

    // Delete Key
    container.querySelectorAll('[data-action="delete-key"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Yakin ingin menghapus API Key ini dari database?`)) {
          btn.disabled = true;
          await this.dataService.deleteApiKey(id);
          this.toast.warning(`API Key telah dihapus dari database.`, 'Dihapus');
          refreshCallback();
        }
      });
    });

    // Approve Key (Verifikasi & Cairkan ke Saldo Aktif)
    container.querySelectorAll('[data-action="approve-key"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-xs animate-spin">progress_activity</span><span>Memproses...</span>';
        const res = await this.dataService.approveApiKey(id);
        if (res.success) {
          this.toast.success(`API Key berhasil disetujui! Saldo Rp ${res.rewardAmount.toLocaleString('id-ID')} telah dicairkan ke Saldo Aktif.`, 'Key Terverifikasi');
          refreshCallback();
        } else {
          this.toast.error(res.message || 'Gagal memverifikasi API Key', 'Gagal');
          refreshCallback();
        }
      });
    });

    // Reject Key (Tolak & Batalkan Saldo Pasif)
    container.querySelectorAll('[data-action="reject-key"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const reason = prompt('Masukkan alasan penolakan API Key:', 'Kunci tidak aktif / kuota tidak valid');
        if (reason !== null) {
          btn.disabled = true;
          btn.innerHTML = '<span class="material-symbols-outlined text-xs animate-spin">progress_activity</span><span>Memproses...</span>';
          const res = await this.dataService.rejectApiKey(id, reason.trim() || 'Ditolak oleh Admin');
          if (res.success) {
            this.toast.warning(`API Key ditolak dan Saldo Pasif telah dibatalkan.`, 'Key Ditolak');
            refreshCallback();
          } else {
            this.toast.error(res.message || 'Gagal menolak API Key', 'Gagal');
            refreshCallback();
          }
        }
      });
    });
  }
}
