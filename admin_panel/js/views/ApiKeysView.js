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
  }

  destroy() {
    this.revealedKeys.clear();
  }

  render() {
    const keys = this.dataService.getApiKeys({
      status: this.currentFilter,
      search: this.searchQuery
    });

    const allKeys = this.dataService.getApiKeys();
    const validCount = allKeys.filter(k => k.status === 'valid').length;
    const pendingCount = allKeys.filter(k => k.status === 'pending').length;
    const invalidCount = allKeys.filter(k => k.status === 'invalid').length;
    const usedCount = allKeys.filter(k => k.status === 'used').length;
    const totalCredits = allKeys
      .filter(k => k.status === 'valid')
      .reduce((sum, k) => sum + (Number(k.credits) || 80), 0);

    return `
      <div class="space-y-6 view-fade-enter">
        <!-- Top Stats Banner -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="admin-card rounded-2xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-xl">dataset</span>
            </div>
            <div>
              <div class="text-xs text-slate-400">Total Kunci</div>
              <div class="text-xl font-bold text-white font-mono">${allKeys.length}</div>
            </div>
          </div>

          <div class="admin-card rounded-2xl p-4 flex items-center gap-3 border ${pendingCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800/80'}">
            <div class="w-10 h-10 rounded-xl ${pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-amber-500/10 text-amber-400'} flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-xl">hourglass_top</span>
            </div>
            <div>
              <div class="text-xs text-slate-400">Kunci Pasif</div>
              <div class="text-xl font-bold text-amber-400 font-mono">${pendingCount}</div>
            </div>
          </div>

          <div class="admin-card rounded-2xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-xl">verified</span>
            </div>
            <div>
              <div class="text-xs text-slate-400">Kunci Aktif</div>
              <div class="text-xl font-bold text-emerald-400 font-mono">${validCount}</div>
            </div>
          </div>
        </div>

        <!-- Controls & Export Bar -->
        <div class="admin-card rounded-2xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <!-- Left: Filter Buttons & Search -->
          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <!-- Search Bar -->
            <div class="relative w-full sm:w-64">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                id="keys-search-input"
                placeholder="Cari kunci atau User ID..."
                value="${this.searchQuery}"
                class="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <!-- Filter Pills -->
            <div class="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
              <button
                type="button"
                data-filter="all"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  this.currentFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }"
              >
                Semua (${allKeys.length})
              </button>
              <button
                type="button"
                data-filter="pending"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  this.currentFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : pendingCount > 0
                    ? 'text-amber-400 font-semibold hover:text-white'
                    : 'text-slate-400 hover:text-white'
                }"
              >
                Perlu Verifikasi (${pendingCount})
              </button>
              <button
                type="button"
                data-filter="valid"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  this.currentFilter === 'valid' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }"
              >
                Valid (${validCount})
              </button>
              <button
                type="button"
                data-filter="used"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  this.currentFilter === 'used' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }"
              >
                Digunakan (${usedCount})
              </button>
              <button
                type="button"
                data-filter="invalid"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  this.currentFilter === 'invalid' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }"
              >
                Invalid (${invalidCount})
              </button>
            </div>
          </div>

          <!-- Right: Batch Export Buttons -->
          <div class="flex items-center gap-2 w-full lg:w-auto justify-end">
            <span class="text-xs text-slate-400 hidden sm:inline mr-1">Ekspor Kunci:</span>

            <!-- Export TXT (1 per baris untuk AI bot) -->
            <button
              type="button"
              id="btn-export-txt"
              title="Unduh format .txt (1 kunci per baris untuk bot AI)"
              class="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all shadow"
            >
              <span class="material-symbols-outlined text-base">download</span>
              <span>TXT (Valid)</span>
            </button>

            <!-- Export CSV -->
            <button
              type="button"
              id="btn-export-csv"
              title="Unduh format .csv untuk Excel / Spreadsheet"
              class="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition-all"
            >
              <span class="material-symbols-outlined text-base">table_view</span>
              <span>CSV</span>
            </button>

            <!-- Export JSON -->
            <button
              type="button"
              id="btn-export-json"
              title="Unduh metadata lengkap .json"
              class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <span class="material-symbols-outlined text-base">data_object</span>
              <span>JSON</span>
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div class="admin-card rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left admin-table">
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
                      <span class="material-symbols-outlined text-4xl mb-2 text-slate-600 block">vpn_key_off</span>
                      Tidak ada data API Key yang cocok dengan filter.
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
                        <div class="font-mono text-xs text-indigo-300 font-medium">${k.userId || 'usr_budi_01'}</div>
                        <div class="text-[10px] text-slate-500">${k.id}</div>
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
                              class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-all shadow-sm"
                            >
                              <span class="material-symbols-outlined text-xs">check_circle</span>
                              <span>Setujui</span>
                            </button>
                            <button
                              type="button"
                              data-action="reject-key"
                              data-id="${k.id}"
                              title="Tolak API Key & Batalkan Saldo Pasif"
                              class="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-all"
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
                              class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all"
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
                              class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all"
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
                            class="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
    // Search
    const searchInput = container.querySelector('#keys-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value;
        refreshCallback();
      });
    }

    // Filter Buttons
    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.getAttribute('data-filter');
        refreshCallback();
      });
    });

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
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const st = btn.getAttribute('data-status');
        this.dataService.updateApiKeyStatus(id, st);
        this.toast.info(`Status API Key #${id} diubah menjadi "${st}"`, 'Status Diperbarui');
        refreshCallback();
      });
    });

    // Delete Key
    container.querySelectorAll('[data-action="delete-key"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Yakin ingin menghapus API Key #${id}?`)) {
          this.dataService.deleteApiKey(id);
          this.toast.warning(`API Key #${id} telah dihapus dari database.`, 'Dihapus');
          refreshCallback();
        }
      });
    });

    // Approve Key (Verifikasi & Cairkan ke Saldo Aktif)
    container.querySelectorAll('[data-action="approve-key"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const res = this.dataService.approveApiKey(id);
        if (res.success) {
          this.toast.success(`API Key #${id} berhasil disetujui! Saldo Rp ${res.rewardAmount.toLocaleString('id-ID')} telah dicairkan ke Saldo Aktif.`, 'Key Terverifikasi');
          refreshCallback();
        } else {
          this.toast.error(res.message || 'Gagal memverifikasi API Key', 'Gagal');
        }
      });
    });

    // Reject Key (Tolak & Batalkan Saldo Pasif)
    container.querySelectorAll('[data-action="reject-key"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const reason = prompt('Masukkan alasan penolakan API Key:', 'Kunci tidak aktif / kuota tidak valid');
        if (reason !== null) {
          const res = this.dataService.rejectApiKey(id, reason.trim() || 'Ditolak oleh Admin');
          if (res.success) {
            this.toast.warning(`API Key #${id} ditolak dan Saldo Pasif telah dibatalkan.`, 'Key Ditolak');
            refreshCallback();
          } else {
            this.toast.error(res.message || 'Gagal menolak API Key', 'Gagal');
          }
        }
      });
    });

    // Export Buttons
    const btnTxt = container.querySelector('#btn-export-txt');
    if (btnTxt) {
      btnTxt.addEventListener('click', () => {
        const res = this.dataService.exportApiKeys('txt', 'valid');
        this.toast.success(`Berhasil mengunduh ${res.total} kunci valid dalam format TXT!`, 'Ekspor Selesai');
      });
    }

    const btnCsv = container.querySelector('#btn-export-csv');
    if (btnCsv) {
      btnCsv.addEventListener('click', () => {
        const res = this.dataService.exportApiKeys('csv', this.currentFilter);
        this.toast.success(`File ${res.filename} (${res.total} baris) berhasil diunduh!`, 'Ekspor CSV');
      });
    }

    const btnJson = container.querySelector('#btn-export-json');
    if (btnJson) {
      btnJson.addEventListener('click', () => {
        const res = this.dataService.exportApiKeys('json', this.currentFilter);
        this.toast.success(`File ${res.filename} berhasil diunduh!`, 'Ekspor JSON');
      });
    }
  }
}
