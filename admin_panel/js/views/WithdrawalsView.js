/**
 * WithdrawalsView
 * Manajemen Persetujuan Pencairan Dana (Payouts):
 * Filter status pending/success/failed, approval transfer, penolakan dengan refund otomatis,
 * dan struk bukti transfer digital.
 */
export class WithdrawalsView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
    this.currentStatus = 'all'; // Default tampilkan semua permohonan
    this.searchQuery = '';
    this.activeReceiptTx = null;
    this.expandedTxIds = new Set();
  }

  destroy() {
    this.activeReceiptTx = null;
    const portal = document.getElementById('admin-modal-portal');
    if (portal) {
      portal.innerHTML = '';
    }
    document.body.style.overflow = '';
  }

  _getModalPortal() {
    let portal = document.getElementById('admin-modal-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'admin-modal-portal';
      document.body.appendChild(portal);
    }
    return portal;
  }

  render() {
    const allWds = this.dataService.getTransactions({ type: 'withdrawal' });
    const pendingCount = allWds.filter(t => t.status === 'pending').length;
    const successCount = allWds.filter(t => t.status === 'success').length;
    const failedCount = allWds.filter(t => t.status === 'failed').length;

    const filtered = this.dataService.getTransactions({
      type: 'withdrawal',
      status: this.currentStatus,
      search: this.searchQuery
    });

    const pendingTotalNominal = allWds
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const formatCompactRupiah = (val) => {
      if (!val || val <= 0) return 'Rp 0';
      if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1).replace('.0', '')}jt`;
      if (val >= 1000) return `Rp ${Math.round(val / 1000)}rb`;
      return `Rp ${val}`;
    };
    const pendingTotalFormatted = formatCompactRupiah(pendingTotalNominal);

    return `
      <div class="space-y-4 sm:space-y-6 view-fade-enter">
        <!-- Top Metrics (Compact & Responsif Mobile) -->
        <div class="grid grid-cols-3 gap-2 sm:gap-4">
          <!-- Pending Card -->
          <div
            class="admin-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 border border-amber-500/30 bg-amber-500/5 transition-all"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 mb-0.5 sm:mb-1">
                <span class="text-[9px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider truncate">
                  <span class="inline sm:hidden">Pending</span>
                  <span class="hidden sm:inline">Antrean Pending</span>
                </span>
                ${pendingCount > 0 ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>' : ''}
              </div>
              <div class="text-sm sm:text-2xl font-extrabold text-white font-mono leading-tight truncate">
                ${pendingCount} <span class="text-[10px] sm:text-xs font-normal text-slate-400">Permintaan</span>
              </div>
              <div class="text-[9px] sm:text-xs text-slate-400 truncate mt-0.5 sm:mt-1">
                <span class="sm:hidden text-amber-300 font-semibold">${pendingTotalFormatted}</span>
                <span class="hidden sm:inline">Total: <strong class="text-amber-300">Rp ${pendingTotalNominal.toLocaleString('id-ID')}</strong></span>
              </div>
            </div>
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 self-end sm:self-center">
              <span class="material-symbols-outlined text-base sm:text-2xl ${pendingCount > 0 ? 'animate-bounce' : ''}">hourglass_empty</span>
            </div>
          </div>

          <!-- Ditransfer Card -->
          <div
            class="admin-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 border border-emerald-500/30 bg-emerald-500/5 transition-all"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 mb-0.5 sm:mb-1">
                <span class="text-[9px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider truncate">
                  <span class="inline sm:hidden">Ditransfer</span>
                  <span class="hidden sm:inline">Telah Ditransfer</span>
                </span>
              </div>
              <div class="text-sm sm:text-2xl font-extrabold text-emerald-400 font-mono leading-tight truncate">
                ${successCount} <span class="text-[10px] sm:text-xs font-normal text-slate-400">Selesai</span>
              </div>
              <div class="text-[9px] sm:text-xs text-slate-400 truncate mt-0.5 sm:mt-1">
                <span class="sm:hidden">Sukses</span>
                <span class="hidden sm:inline">Pencairan sukses diproses</span>
              </div>
            </div>
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 self-end sm:self-center">
              <span class="material-symbols-outlined text-base sm:text-2xl">task_alt</span>
            </div>
          </div>

          <!-- Ditolak Card -->
          <div
            class="admin-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 border border-rose-500/30 bg-rose-500/5 transition-all"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 mb-0.5 sm:mb-1">
                <span class="text-[9px] sm:text-xs font-semibold text-rose-400 uppercase tracking-wider truncate">
                  <span class="inline sm:hidden">Ditolak</span>
                  <span class="hidden sm:inline">Ditolak (Refunded)</span>
                </span>
              </div>
              <div class="text-sm sm:text-2xl font-extrabold text-rose-400 font-mono leading-tight truncate">
                ${failedCount} <span class="text-[10px] sm:text-xs font-normal text-slate-400">Transaksi</span>
              </div>
              <div class="text-[9px] sm:text-xs text-slate-400 truncate mt-0.5 sm:mt-1">
                <span class="sm:hidden">Refunded</span>
                <span class="hidden sm:inline">Saldo dikembalikan ke user</span>
              </div>
            </div>
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 self-end sm:self-center">
              <span class="material-symbols-outlined text-base sm:text-2xl">undo</span>
            </div>
          </div>
        </div>

        <!-- Filter Tabs & Search -->
        <div class="admin-card rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full max-w-full min-w-0">
          <!-- Search -->
          <div class="relative w-full sm:w-72 shrink-0">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              id="wd-search-input"
              placeholder="Cari ID, No Rekening, atau User..."
              value="${this.searchQuery}"
              class="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <!-- Status Tabs (Flex Wrap Tanpa Scrollbar) -->
          <div class="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              data-wd-status="all"
              class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap text-center ${
                this.currentStatus === 'all'
                  ? 'bg-indigo-600 text-white shadow font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }"
            >
              Semua (${allWds.length})
            </button>
            <button
              type="button"
              data-wd-status="pending"
              class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap text-center ${
                this.currentStatus === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }"
            >
              Pending (${pendingCount})
            </button>
            <button
              type="button"
              data-wd-status="success"
              class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap text-center ${
                this.currentStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }"
            >
              Berhasil (${successCount})
            </button>
            <button
              type="button"
              data-wd-status="failed"
              class="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap text-center ${
                this.currentStatus === 'failed'
                  ? 'bg-rose-600 text-white shadow font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }"
            >
              Ditolak (${failedCount})
            </button>
          </div>
        </div>

        <!-- Daftar Permohonan Penarikan Dana (Harmonious & Synchronized Theme) -->
        <div class="admin-card rounded-2xl overflow-hidden w-full max-w-full min-w-0 border border-admin shadow-xl">
          <div class="admin-card-header px-4 py-3 text-xs flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-amber-500">payments</span>
              <span class="font-bold text-admin-heading text-sm">Daftar Permohonan Penarikan Dana</span>
            </div>
            <span class="text-[11px] text-admin-muted font-mono admin-sub-card px-2.5 py-0.5 rounded-full border border-admin">
              ${filtered.length} permohonan
            </span>
          </div>

          <div class="p-3 sm:p-4 space-y-2.5">
            ${
              filtered.length === 0
                ? `
              <div class="text-center py-12 text-admin-muted">
                <span class="material-symbols-outlined text-4xl mb-2 text-slate-500 block">inbox</span>
                Tidak ada permohonan penarikan pada status ini.
              </div>
            `
                : filtered
                    .map(tx => {
                      const amount = Number(tx.amount || 0);
                      const fee = Number(tx.fee || 0);
                      const netPayout = tx.netPayout !== undefined ? Number(tx.netPayout) : Math.max(0, amount - fee);

                      let methodIcon = 'account_balance';
                      let methodColor = 'text-blue-400';
                      const mUpper = (tx.method || '').toUpperCase();
                      if (mUpper.includes('DANA')) {
                        methodIcon = 'wallet';
                        methodColor = 'text-cyan-400';
                      } else if (mUpper.includes('GOPAY')) {
                        methodIcon = 'bolt';
                        methodColor = 'text-emerald-400';
                      } else if (mUpper.includes('OVO')) {
                        methodIcon = 'account_balance_wallet';
                        methodColor = 'text-purple-400';
                      }

                      const isPending = tx.status === 'pending';
                      const isSuccess = tx.status === 'success';
                      const isExpanded = this.expandedTxIds.has(tx.id);

                      // Inisial avatar huruf (seperti lingkaran 'A' hijau di Foto 2)
                      const cleanUser = (tx.userId || 'User').replace(/^usr_/, '');
                      const userInitial = cleanUser.charAt(0).toUpperCase() || 'U';

                      const dateFormatted = new Date(tx.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) + ' WIB';

                      return `
              <div class="admin-item-card rounded-2xl overflow-hidden transition-all duration-200 ${
                isPending
                  ? 'border-l-4 border-l-amber-500'
                  : isSuccess
                  ? 'border-l-4 border-l-emerald-500'
                  : 'border-l-4 border-l-rose-500'
              }">
                <!-- Card Header: Avatar + Title & Waktu & Tag + Status + Chevron -->
                <div 
                  class="flex items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-4 cursor-pointer select-none hover:bg-slate-500/5 transition-colors"
                  data-action="toggle-details"
                  data-id="${tx.id}"
                >
                  <!-- Kiri: Avatar & Teks Informasi -->
                  <div class="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <!-- Avatar Lingkaran Sesuai Status -->
                    <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                      isSuccess
                        ? 'avatar-verified bg-emerald-900/60 text-emerald-400 border border-emerald-500/40'
                        : isPending
                        ? 'avatar-unverified bg-amber-900/50 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-900/50 text-rose-300 border border-rose-500/40'
                    }">
                      <span>${userInitial}</span>
                    </div>

                    <!-- Teks: #ID & User, Waktu, dan Badge Pill -->
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="font-mono font-bold text-admin-heading text-xs sm:text-sm tracking-wide">#${tx.id}</span>
                        <span class="font-semibold text-admin-body text-xs sm:text-sm truncate max-w-[130px] sm:max-w-none">${tx.userId || 'usr_budi_01'}</span>
                      </div>
                      <div class="text-[11px] text-admin-muted font-mono mt-0.5">
                        ${dateFormatted}
                      </div>
                      <div class="mt-1">
                        <!-- Pill Tag Saldo & Metode -->
                        <span class="pill-saldo inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono border ${
                          isSuccess
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : isPending
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        }">
                          <span class="material-symbols-outlined text-xs ${methodColor}">${methodIcon}</span>
                          <span>Rp ${netPayout.toLocaleString('id-ID')} (${tx.method || 'Transfer'})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Kanan: Status Pill Badge & Tanda Panah Chevron -->
                  <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <!-- Status Badge -->
                    ${
                      isSuccess
                        ? `<span class="badge-verified inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border border-emerald-500/40 bg-emerald-950/60 text-emerald-400 tracking-wider">
                            <span class="material-symbols-outlined text-xs sm:text-sm">check_circle</span>
                            <span>SUCCESS</span>
                          </span>`
                        : isPending
                        ? `<span class="badge-unverified inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border border-amber-500/40 bg-amber-950/60 text-amber-400 tracking-wider">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                            <span>PENDING</span>
                          </span>`
                        : `<span class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border border-rose-500/40 bg-rose-950/60 text-rose-400 tracking-wider">
                            <span class="material-symbols-outlined text-xs sm:text-sm">cancel</span>
                            <span>DITOLAK</span>
                          </span>`
                    }

                    <!-- Tanda Panah Chevron untuk Lihat Detail -->
                    <button
                      type="button"
                      class="w-8 h-8 rounded-lg flex items-center justify-center text-admin-muted hover:text-admin-heading hover:bg-slate-500/10 transition-colors cursor-pointer"
                      title="Lihat detail permohonan"
                    >
                      <span
                        class="material-symbols-outlined text-xl sm:text-2xl transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-500' : ''}"
                        data-chevron="${tx.id}"
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                </div>

                <!-- Bagian Detail yang Terbuka saat Tanda Panah / Baris Diklik -->
                <div id="details-${tx.id}" class="${isExpanded ? '' : 'hidden'} px-3 pb-3 sm:px-4 sm:pb-4 border-t border-admin pt-3 space-y-3 view-fade-enter">
                  <div class="admin-sub-card grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl text-xs">
                    <!-- Rekening / E-Wallet Penerima -->
                    <div>
                      <span class="text-admin-muted block text-[10px] uppercase font-semibold">Tujuan Rekening / E-Wallet:</span>
                      <div class="flex items-center gap-2 mt-1.5">
                        <span class="material-symbols-outlined text-base ${methodColor}">${methodIcon}</span>
                        <div>
                          <div class="font-bold text-admin-heading">${tx.title || 'Penarikan Saldo'}</div>
                          <div class="font-mono text-admin-body font-semibold text-xs">${tx.recipient || '-'}</div>
                        </div>
                      </div>
                    </div>

                    <!-- Rincian Finansial -->
                    <div>
                      <span class="text-admin-muted block text-[10px] uppercase font-semibold">Rincian Finansial:</span>
                      <div class="mt-1.5 space-y-1">
                        <div class="flex justify-between text-admin-body">
                          <span>Nominal Pengajuan:</span>
                          <span class="font-mono font-bold text-admin-heading">Rp ${amount.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="flex justify-between text-admin-muted">
                          <span>Biaya Admin:</span>
                          <span class="font-mono text-rose-500 font-semibold">-Rp ${fee.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="flex justify-between text-emerald-500 font-bold border-t border-admin pt-1">
                          <span>Transfer Bersih:</span>
                          <span class="font-mono text-sm font-extrabold text-emerald-500 dark:text-emerald-400">Rp ${netPayout.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>

                    ${
                      tx.status === 'failed' && (tx.notes || tx.errorMessage)
                        ? `
                      <div class="sm:col-span-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                        <span class="font-bold">Alasan Penolakan:</span> ${tx.notes || tx.errorMessage}
                      </div>
                    `
                        : ''
                    }

                    ${
                      tx.processedAt
                        ? `
                      <div class="sm:col-span-2 text-[11px] text-admin-muted flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-xs text-emerald-400">task_alt</span>
                        <span>Diproses pada: ${new Date(tx.processedAt).toLocaleString('id-ID')}</span>
                      </div>
                    `
                        : ''
                    }
                  </div>

                  <!-- Tindakan Admin -->
                  <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div class="text-[11px] text-admin-muted">
                      <span>Status: </span>
                      <strong class="text-admin-heading">${isPending ? 'Menunggu Validasi Admin' : isSuccess ? 'Telah Ditransfer ke User' : 'Ditolak (Saldo di-refund)'}</strong>
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                      ${
                        isPending
                          ? `
                        <button
                          type="button"
                          data-action="approve-wd"
                          data-id="${tx.id}"
                          class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-sm">upload</span>
                          <span>Proses Cair</span>
                        </button>
                        <button
                          type="button"
                          data-action="reject-wd"
                          data-id="${tx.id}"
                          class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-sm">cancel</span>
                          <span>Tolak</span>
                        </button>
                      `
                          : ''
                      }
                      <button
                        type="button"
                        data-action="view-receipt"
                        data-id="${tx.id}"
                        class="admin-btn-secondary px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <span class="material-symbols-outlined text-sm text-indigo-400">receipt_long</span>
                        <span>Lihat Bukti Digital</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
                    })
                    .join('')
            }
          </div>
        </div>

        <!-- Digital Receipt Modal Mount Point -->
        <div id="wd-receipt-modal-container"></div>
      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    // Accordion Toggle: Klik baris / tanda panah untuk melihat detail transaksi
    container.querySelectorAll('[data-action="toggle-details"]').forEach(headerEl => {
      headerEl.addEventListener('click', (e) => {
        // Jangan toggle jika user mengklik tombol aksi di dalam detail (Proses Cair, Tolak, Lihat Bukti)
        if (
          e.target.closest('[data-action="approve-wd"]') ||
          e.target.closest('[data-action="reject-wd"]') ||
          e.target.closest('[data-action="view-receipt"]')
        ) {
          return;
        }

        const id = headerEl.getAttribute('data-id');
        const detailsEl = container.querySelector(`#details-${id}`);
        const chevronEl = container.querySelector(`[data-chevron="${id}"]`);

        if (detailsEl) {
          const isCurrentlyHidden = detailsEl.classList.contains('hidden');
          if (isCurrentlyHidden) {
            detailsEl.classList.remove('hidden');
            if (chevronEl) chevronEl.classList.add('rotate-180', 'text-indigo-400');
            this.expandedTxIds.add(id);
          } else {
            detailsEl.classList.add('hidden');
            if (chevronEl) chevronEl.classList.remove('rotate-180', 'text-indigo-400');
            this.expandedTxIds.delete(id);
          }
        }
      });
    });

    // Search dengan debounce & Enter key
    const searchInput = container.querySelector('#wd-search-input');
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value;
        clearTimeout(debounceTimer);
        if (!e.target.value) {
          refreshCallback();
        } else {
          debounceTimer = setTimeout(() => {
            refreshCallback();
          }, 200);
        }
      });

      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          clearTimeout(debounceTimer);
          this.searchQuery = searchInput.value;
          refreshCallback();
        }
      });
    }

    // Status Filter Tabs
    container.querySelectorAll('[data-wd-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentStatus = btn.getAttribute('data-wd-status');
        refreshCallback();
      });
    });

    // Approve (Buka Modal Validasi & Upload Bukti Foto)
    container.querySelectorAll('[data-action="approve-wd"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const tx = this.dataService.getTransactions().find(t => t.id === id);
        if (tx) {
          this._openApproveModal(container, tx, refreshCallback);
        }
      });
    });

    // Reject (Refund)
    container.querySelectorAll('[data-action="reject-wd"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const reason = prompt(
          `Masukkan alasan penolakan penarikan #${id}:\n(Saldo user akan otomatis di-refund kembali ke akunnya)`,
          'Nomor e-wallet tidak aktif atau belum terdaftar KYC'
        );

        if (reason !== null && reason.trim()) {
          const res = this.dataService.rejectWithdrawal(id, reason.trim());
          if (res.success) {
            this.toast.warning(
              `Penarikan #${id} ditolak. Saldo Rp ${res.refundAmount.toLocaleString('id-ID')} telah dikembalikan (refund) ke akun user!`,
              'Penarikan Ditolak & Di-refund'
            );
            refreshCallback();
          } else {
            this.toast.error(res.message);
          }
        }
      });
    });

    // View Digital Receipt
    container.querySelectorAll('[data-action="view-receipt"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const tx = this.dataService.getTransactions().find(t => t.id === id);
        if (tx) {
          this._openReceiptModal(container, tx);
        }
      });
    });
  }

  /**
   * Modal Validasi Rekening Penerima & Unggah Bukti Foto Transfer
   * Sebelum admin menyetujui transaksi penarikan
   */
  _openApproveModal(container, tx, refreshCallback) {
    const modalMount = this._getModalPortal();
    if (!modalMount) return;

    // Kunci scroll background body saat modal aktif
    document.body.style.overflow = 'hidden';

    const user = this.dataService.getUserByTransaction(tx) || {};
    const amount = Number(tx.amount || 0);
    const fee = Number(tx.fee || 0);
    const netPayout = tx.netPayout !== undefined ? Number(tx.netPayout) : Math.max(0, amount - fee);

    let currentProofImage = tx.proofImage || '';

    modalMount.innerHTML = `
      <div id="approve-modal-overlay" class="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <div class="admin-card rounded-3xl max-w-lg w-full flex flex-col relative border border-slate-700 shadow-2xl overflow-hidden my-auto" style="max-height: calc(100vh - 2rem); max-height: calc(100dvh - 2rem);">
          
          <!-- Sticky Header -->
          <div class="p-3.5 sm:p-4 px-5 sm:px-6 border-b border-slate-800/90 bg-slate-900/95 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-xl sm:text-2xl">verified_user</span>
              </div>
              <div>
                <h3 class="text-sm sm:text-base font-bold text-white font-['Plus_Jakarta_Sans']">Validasi & Kirim Bukti Transfer</h3>
                <p class="text-[11px] text-slate-400">Persetujuan Penarikan #${tx.id}</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-approve-modal"
              class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Tutup (Esc)"
            >
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <!-- Scrollable Body with min-h-0 to avoid vertical blowout -->
          <div class="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-3 flex-1 min-h-0 text-xs">
            
            <!-- Section 1: Data Rekening Penerima -->
            <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Rincian Penerima</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${user.isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}">
                  ${user.isVerified ? 'KYC Terverifikasi' : 'Belum KYC'}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span class="text-slate-500 block text-[10px]">Nama Pengguna:</span>
                  <span class="font-bold text-white text-xs">${user.name || 'Budi Santoso'}</span>
                  <span class="text-slate-500 text-[10px] block font-mono">(${tx.userId || 'usr_budi_01'})</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[10px]">Channel / Bank:</span>
                  <span class="font-bold text-emerald-400 uppercase text-xs">${tx.method || user.bankName || 'DANA'}</span>
                </div>
              </div>

              <div class="pt-1 border-t border-slate-800/80">
                <span class="text-slate-500 block text-[10px]">Nomor Rekening / E-Wallet Tujuan:</span>
                <div class="flex items-center justify-between bg-slate-950/80 p-2 px-3 rounded-xl border border-slate-800 mt-1">
                  <span class="font-mono text-sm font-bold text-amber-400 tracking-wider" id="text-acc-number">${tx.recipient || user.accountNumber || '081234567890'}</span>
                  <button
                    type="button"
                    id="btn-copy-account"
                    class="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Salin Nomor Rekening"
                  >
                    <span class="material-symbols-outlined text-sm">content_copy</span>
                    <span id="copy-btn-label">Salin</span>
                  </button>
                </div>
              </div>

              <div>
                <span class="text-slate-500 block text-[10px]">Atas Nama Rekening:</span>
                <span class="font-semibold text-white uppercase text-xs">${user.accountHolder || user.name || 'BUDI SANTOSO'}</span>
              </div>
            </div>

            <!-- Section 2: Ringkasan Finansial -->
            <div class="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <div>
                <span class="text-[10px] text-slate-400 block">Nominal</span>
                <span class="font-mono text-xs font-bold text-slate-200">Rp ${amount.toLocaleString('id-ID')}</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block">Biaya Admin</span>
                <span class="font-mono text-xs text-rose-400 font-semibold">-Rp ${fee.toLocaleString('id-ID')}</span>
              </div>
              <div class="border-l border-slate-800 pl-2">
                <span class="text-[10px] text-emerald-400 font-bold block">Transfer Bersih</span>
                <span class="font-mono text-xs sm:text-sm font-extrabold text-emerald-400">Rp ${netPayout.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <!-- Section 3: Form Unggah Bukti Foto Transfer -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-indigo-400">image</span>
                  <span>Unggah Bukti Foto Transfer (Untuk User)</span>
                </label>
                <button
                  type="button"
                  id="btn-use-sample-proof"
                  class="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-0.5 font-medium"
                  title="Gunakan contoh bukti struk resmi secara instan untuk pengujian demo"
                >
                  <span class="material-symbols-outlined text-[13px]">bolt</span>
                  <span>Pakai Contoh Bukti (Demo)</span>
                </button>
              </div>

              <!-- Upload Dropzone -->
              <input type="file" id="wd-proof-file-input" accept="image/*" class="hidden" />
              
              <div
                id="wd-proof-dropzone"
                class="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-2.5 sm:p-3 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all group"
              >
                <div class="flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <div class="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-lg">add_photo_alternate</span>
                  </div>
                  <p class="text-xs text-slate-300 font-medium">Klik untuk memilih foto bukti transfer</p>
                  <p class="text-[10px] text-slate-500">Mendukung format PNG, JPG, WebP (Maks. 5MB)</p>
                </div>
              </div>

              <!-- Image Preview Box -->
              <div id="wd-proof-preview-wrapper" class="hidden space-y-2">
                <div class="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950/80 group">
                  <img id="wd-proof-preview-img" src="" alt="Bukti Transfer" class="w-full h-28 sm:h-32 object-contain bg-slate-950 p-1" />
                  <div class="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      id="btn-remove-proof-img"
                      class="p-1 rounded-xl bg-slate-900/80 text-rose-400 hover:bg-rose-500 hover:text-white border border-slate-700 transition-all shadow-md"
                      title="Hapus foto"
                    >
                      <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <div class="absolute bottom-0 inset-x-0 p-1 px-2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-center justify-between text-[11px] text-slate-300">
                    <span class="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
                      <span class="material-symbols-outlined text-xs">check_circle</span>
                      <span>Bukti Foto Siap Dikirim</span>
                    </span>
                    <button type="button" id="btn-reupload-proof" class="text-indigo-400 hover:underline text-[10px]">Ganti</button>
                  </div>
                </div>
              </div>

              <!-- Optional Admin Note -->
              <div>
                <input
                  type="text"
                  id="wd-proof-notes-input"
                  placeholder="Catatan transfer ke user (opsional, misal: No. Ref m-Banking)"
                  value="Transfer sukses via ${tx.method ? tx.method.toUpperCase() : 'Gateway'} resmi Panen Kunci"
                  class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <!-- Sticky Footer Actions -->
          <div class="p-3 sm:p-3.5 px-5 sm:px-6 bg-slate-900/95 border-t border-slate-800/90 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              id="btn-cancel-approve"
              class="py-2 sm:py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-confirm-approve"
              class="py-2 sm:py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
            >
              <span class="material-symbols-outlined text-base font-bold">send</span>
              <span>Setujui & Kirim Bukti ke User</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const handleKeydown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeydown);

    const close = () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
      modalMount.innerHTML = '';
    };

    // Close buttons & Backdrop click
    modalMount.querySelector('#btn-close-approve-modal').addEventListener('click', close);
    modalMount.querySelector('#btn-cancel-approve').addEventListener('click', close);
    const overlay = modalMount.querySelector('#approve-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    // Copy account number
    const copyBtn = modalMount.querySelector('#btn-copy-account');
    const copyLabel = modalMount.querySelector('#copy-btn-label');
    const accNumberText = modalMount.querySelector('#text-acc-number').textContent.trim();
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(accNumberText).then(() => {
          copyLabel.textContent = 'Tersalin!';
          this.toast.info(`Nomor ${accNumberText} berhasil disalin ke clipboard!`, 'Tersalin');
          setTimeout(() => {
            if (copyLabel) copyLabel.textContent = 'Salin';
          }, 2000);
        }).catch(() => {
          this.toast.info(`Nomor rekening: ${accNumberText}`);
        });
      });
    }

    // Elements for image handling
    const fileInput = modalMount.querySelector('#wd-proof-file-input');
    const dropzone = modalMount.querySelector('#wd-proof-dropzone');
    const previewWrapper = modalMount.querySelector('#wd-proof-preview-wrapper');
    const previewImg = modalMount.querySelector('#wd-proof-preview-img');
    const removeImgBtn = modalMount.querySelector('#btn-remove-proof-img');
    const reuploadBtn = modalMount.querySelector('#btn-reupload-proof');
    const sampleProofBtn = modalMount.querySelector('#btn-use-sample-proof');

    const updatePreview = (dataUrl) => {
      currentProofImage = dataUrl;
      if (dataUrl) {
        previewImg.src = dataUrl;
        previewWrapper.classList.remove('hidden');
        dropzone.classList.add('hidden');
      } else {
        previewImg.src = '';
        previewWrapper.classList.add('hidden');
        dropzone.classList.remove('hidden');
      }
    };

    dropzone.addEventListener('click', () => fileInput.click());
    if (reuploadBtn) reuploadBtn.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          this.toast.error('File yang diunggah harus berupa gambar (JPG, PNG, WebP).', 'Format Tidak Didukung');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          updatePreview(event.target.result);
          this.toast.success('Foto bukti transfer berhasil dimuat!', 'Bukti Terpasang');
        };
        reader.readAsDataURL(file);
      }
    });

    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-indigo-400', 'bg-indigo-500/10');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-indigo-400', 'bg-indigo-500/10');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-indigo-400', 'bg-indigo-500/10');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          updatePreview(event.target.result);
          this.toast.success('Foto bukti transfer berhasil dimuat via Drag & Drop!', 'Bukti Terpasang');
        };
        reader.readAsDataURL(file);
      }
    });

    // Remove preview
    removeImgBtn.addEventListener('click', () => {
      fileInput.value = '';
      updatePreview('');
    });

    // Generate Realistic Sample Receipt image (Demo)
    sampleProofBtn.addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 780;
      const ctx = canvas.getContext('2d');

      // Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 600, 780);
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 600, 780);

      // Top Header bar
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, 600, 100);

      // Header Icon Badge
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(300, 100, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', 300, 112);

      // Title
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('TRANSFER BERHASIL', 300, 180);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText('Panen Kunci Payout Gateway • Struk Resmi', 300, 205);

      // Amount Display
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 38px Arial, sans-serif';
      ctx.fillText(`Rp ${netPayout.toLocaleString('id-ID')}`, 300, 265);

      // Divider
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 295);
      ctx.lineTo(550, 295);
      ctx.stroke();

      // Transaction Details Table
      const rows = [
        ['No. Referensi:', tx.id],
        ['Waktu Transaksi:', new Date().toLocaleString('id-ID')],
        ['Penerima:', `${user.name || 'Budi Santoso'}`],
        ['Rekening Tujuan:', `${tx.recipient || user.accountNumber || '081234567890'}`],
        ['Metode Transfer:', (tx.method || 'DANA').toUpperCase()],
        ['Nominal Diminta:', `Rp ${amount.toLocaleString('id-ID')}`],
        ['Biaya Transaksi:', `Rp ${fee.toLocaleString('id-ID')}`],
        ['Status:', 'DITRANSFER / SUKSES']
      ];

      ctx.textAlign = 'left';
      let y = 335;
      rows.forEach(([label, val]) => {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText(label, 60, y);

        ctx.fillStyle = label === 'Status:' ? '#10B981' : '#FFFFFF';
        ctx.font = label === 'Status:' ? 'bold 14px Arial, sans-serif' : 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val, 540, y);
        ctx.textAlign = 'left';

        y += 38;
      });

      // Bottom Watermark
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(40, 680, 520, 60);
      ctx.fillStyle = '#64748B';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Bukti transfer ini sah dan diproses secara otomatis oleh Admin Panen Kunci.', 300, 715);

      const generatedDataUrl = canvas.toDataURL('image/png');
      updatePreview(generatedDataUrl);
      this.toast.success('Contoh bukti struk transfer resmi berhasil dibuat!', 'Sampel Terpasang');
    });

    // Confirm and approve
    const confirmBtn = modalMount.querySelector('#btn-confirm-approve');
    confirmBtn.addEventListener('click', () => {
      const notes = modalMount.querySelector('#wd-proof-notes-input').value.trim();

      // Jika belum unggah foto, beri konfirmasi atau otomatis gunakan struk digital
      let finalProof = currentProofImage;
      if (!finalProof) {
        sampleProofBtn.click();
        finalProof = currentProofImage;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `
        <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
        <span>Memproses...</span>
      `;

      setTimeout(() => {
        const res = this.dataService.approveWithdrawal(tx.id, {
          proofImage: finalProof,
          notes
        });

        if (res.success) {
          this.toast.success(`Penarikan #${tx.id} berhasil disetujui & bukti transfer telah dikirim ke pengguna!`, 'Pencairan Sukses');
          close();
          refreshCallback();
        } else {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = `
            <span class="material-symbols-outlined text-base font-bold">send</span>
            <span>Setujui & Kirim Bukti ke User</span>
          `;
          this.toast.error(res.message);
        }
      }, 400);
    });
  }

  _openReceiptModal(container, tx) {
    const modalMount = this._getModalPortal();
    if (!modalMount) return;

    // Kunci scroll background body saat modal aktif
    document.body.style.overflow = 'hidden';

    const amount = Number(tx.amount || 0);
    const fee = Number(tx.fee || 0);
    const netPayout = tx.netPayout !== undefined ? Number(tx.netPayout) : Math.max(0, amount - fee);

    modalMount.innerHTML = `
      <div id="receipt-modal-overlay" class="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div class="admin-card rounded-3xl max-w-md w-full flex flex-col relative border border-slate-700 shadow-2xl overflow-hidden my-auto" style="max-height: calc(100vh - 2rem); max-height: calc(100dvh - 2rem);">
          
          <!-- Fixed Header -->
          <div class="p-3.5 sm:p-4 px-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-xl">verified</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">Bukti Pengiriman Dana</h3>
                <p class="text-[10px] text-slate-400">Struk Resmi Panen Kunci Payout</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-receipt-modal"
              class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Tutup (Esc)"
            >
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <!-- Scrollable Body with min-h-0 -->
          <div class="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-3.5 flex-1 min-h-0">
            <!-- Transaction Summary Box -->
            <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 font-mono text-xs">
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400 font-sans">No. Referensi:</span>
                <span class="text-indigo-400 font-bold">${tx.id}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400 font-sans">Penerima / User:</span>
                <span class="text-white font-sans">${tx.userId || 'usr_budi_01'}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400 font-sans">Rekening / E-Wallet:</span>
                <span class="text-white">${tx.recipient || '-'}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400 font-sans">Metode:</span>
                <span class="text-emerald-400 uppercase font-sans">${tx.method || 'TRANSFER'}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400 font-sans">Waktu Request:</span>
                <span class="text-slate-300">${new Date(tx.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400 font-sans">Nominal Dicairkan:</span>
                <span class="text-white font-bold">Rp ${amount.toLocaleString('id-ID')}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400 font-sans">Biaya Admin:</span>
                <span class="text-slate-400">Rp ${fee.toLocaleString('id-ID')}</span>
              </div>
              <div class="flex justify-between pt-1 text-xs font-bold">
                <span class="text-slate-200 font-sans">Total Transfer Bersih:</span>
                <span class="text-emerald-400 font-bold">Rp ${netPayout.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <!-- Attach Proof Image Preview if available -->
            ${
              tx.proofImage
                ? `
              <div class="space-y-1.5">
                <span class="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm text-emerald-400">image</span>
                  <span>Foto Bukti Transfer:</span>
                </span>
                <div class="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950/80">
                  <img src="${tx.proofImage}" alt="Bukti Transfer" class="w-full h-36 object-contain p-1" />
                </div>
              </div>
            `
                : ''
            }

            <!-- Status Stamp -->
            <div class="p-2 rounded-xl ${
              tx.status === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : tx.status === 'pending'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            } text-center font-bold text-xs uppercase tracking-wider">
              STATUS: ${tx.status === 'success' ? 'DITRANSFER / SELESAI' : tx.status === 'pending' ? 'MENUNGGU TRANSFER' : 'DITOLAK / DANA REFUND'}
            </div>
          </div>

          <!-- Fixed Footer Buttons -->
          <div class="p-3 sm:p-3.5 px-5 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              id="btn-print-receipt"
              class="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <span class="material-symbols-outlined text-base">print</span>
              <span>Cetak / Simpan Struk</span>
            </button>
            <button
              type="button"
              id="btn-close-receipt-bottom"
              class="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    `;

    const handleKeydown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeydown);

    const close = () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
      modalMount.innerHTML = '';
    };

    modalMount.querySelector('#btn-close-receipt-modal').addEventListener('click', close);
    modalMount.querySelector('#btn-close-receipt-bottom').addEventListener('click', close);
    const overlay = modalMount.querySelector('#receipt-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
    }

    modalMount.querySelector('#btn-print-receipt').addEventListener('click', () => {
      window.print();
    });
  }
}
