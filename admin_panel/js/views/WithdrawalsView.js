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
    this.currentStatus = 'pending'; // Default fokus ke pending antrean
    this.searchQuery = '';
    this.activeReceiptTx = null;
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

    return `
      <div class="space-y-6 view-fade-enter">
        <!-- Top Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="admin-card rounded-2xl p-5 border-amber-500/20 flex items-center justify-between">
            <div>
              <div class="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Antrean Pending</div>
              <div class="text-2xl font-extrabold text-white font-mono">${pendingCount} Permintaan</div>
              <div class="text-xs text-slate-400 mt-1">Total: <strong class="text-amber-300">Rp ${pendingTotalNominal.toLocaleString('id-ID')}</strong></div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl ${pendingCount > 0 ? 'animate-bounce' : ''}">hourglass_empty</span>
            </div>
          </div>

          <div class="admin-card rounded-2xl p-5 border-emerald-500/20 flex items-center justify-between">
            <div>
              <div class="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Telah Ditransfer</div>
              <div class="text-2xl font-extrabold text-emerald-400 font-mono">${successCount} Selesai</div>
              <div class="text-xs text-slate-400 mt-1">Pencairan sukses diproses</div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">task_alt</span>
            </div>
          </div>

          <div class="admin-card rounded-2xl p-5 border-rose-500/20 flex items-center justify-between">
            <div>
              <div class="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Ditolak (Refunded)</div>
              <div class="text-2xl font-extrabold text-rose-400 font-mono">${failedCount} Transaksi</div>
              <div class="text-xs text-slate-400 mt-1">Saldo dikembalikan ke user</div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">undo</span>
            </div>
          </div>
        </div>

        <!-- Filter Tabs & Search -->
        <div class="admin-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <!-- Search -->
          <div class="relative w-full sm:w-72">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              id="wd-search-input"
              placeholder="Cari ID, No Rekening, atau User..."
              value="${this.searchQuery}"
              class="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <!-- Status Tabs -->
          <div class="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto custom-scrollbar">
            <button
              type="button"
              data-wd-status="pending"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                this.currentStatus === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }"
            >
              Pending (${pendingCount})
            </button>
            <button
              type="button"
              data-wd-status="all"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                this.currentStatus === 'all'
                  ? 'bg-indigo-600 text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }"
            >
              Semua (${allWds.length})
            </button>
            <button
              type="button"
              data-wd-status="success"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                this.currentStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }"
            >
              Berhasil (${successCount})
            </button>
            <button
              type="button"
              data-wd-status="failed"
              class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                this.currentStatus === 'failed'
                  ? 'bg-rose-600 text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }"
            >
              Ditolak (${failedCount})
            </button>
          </div>
        </div>

        <!-- Withdrawals Table -->
        <div class="admin-card rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left admin-table">
              <thead>
                <tr>
                  <th>ID Penarikan</th>
                  <th>Pengguna / User ID</th>
                  <th>Channel / Rekening Tujuan</th>
                  <th>Nominal Penarikan</th>
                  <th>Biaya Admin</th>
                  <th>Transfer Bersih</th>
                  <th>Status</th>
                  <th class="text-right">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody>
                ${
                  filtered.length === 0
                    ? `
                  <tr>
                    <td colspan="8" class="text-center py-12 text-slate-400">
                      <span class="material-symbols-outlined text-4xl mb-2 text-slate-600 block">inbox</span>
                      Tidak ada permohonan penarikan pada status ini.
                    </td>
                  </tr>
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

                          return `
                    <tr data-tx-id="${tx.id}">
                      <td>
                        <div class="font-mono text-xs font-bold text-white">${tx.id}</div>
                        <div class="text-[11px] text-slate-400">${new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      </td>
                      <td>
                        <div class="font-medium text-slate-200">${tx.userId || 'usr_budi_01'}</div>
                        <div class="text-[10px] text-slate-400">Terverifikasi</div>
                      </td>
                      <td>
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-base ${methodColor}">${methodIcon}</span>
                          <div>
                            <div class="font-semibold text-xs text-white">${tx.title || 'Penarikan Saldo'}</div>
                            <div class="font-mono text-xs text-slate-300">${tx.recipient || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="font-mono text-xs font-bold text-slate-200">Rp ${amount.toLocaleString('id-ID')}</div>
                      </td>
                      <td>
                        <div class="font-mono text-xs text-slate-400">Rp ${fee.toLocaleString('id-ID')}</div>
                      </td>
                      <td>
                        <div class="font-mono text-xs font-extrabold text-emerald-400">Rp ${netPayout.toLocaleString('id-ID')}</div>
                      </td>
                      <td>
                        ${
                          isPending
                            ? `<span class="text-xs px-2.5 py-1 rounded-full font-bold border bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse">Menunggu Transfer</span>`
                            : isSuccess
                            ? `<span class="text-xs px-2.5 py-1 rounded-full font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Berhasil Ditransfer</span>`
                            : `<span class="text-xs px-2.5 py-1 rounded-full font-semibold border bg-rose-500/10 text-rose-400 border-rose-500/30">Ditolak / Refund</span>`
                        }
                        ${
                          tx.rejectionReason
                            ? `<div class="text-[10px] text-rose-300 mt-1 max-w-[150px] truncate" title="${tx.rejectionReason}">${tx.rejectionReason}</div>`
                            : ''
                        }
                      </td>
                      <td class="text-right">
                        <div class="flex items-center justify-end gap-2">
                          ${
                            isPending
                              ? `
                            <button
                              type="button"
                              data-action="approve-wd"
                              data-id="${tx.id}"
                              title="Setujui dan kirim dana sekarang"
                              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/20"
                            >
                              <span class="material-symbols-outlined text-sm font-bold">check</span>
                              <span>Setujui</span>
                            </button>

                            <button
                              type="button"
                              data-action="reject-wd"
                              data-id="${tx.id}"
                              title="Tolak dan kembalikan saldo ke dompet user"
                              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1"
                            >
                              <span class="material-symbols-outlined text-sm">close</span>
                              <span>Tolak</span>
                            </button>
                          `
                              : ''
                          }

                          <button
                            type="button"
                            data-action="view-receipt"
                            data-id="${tx.id}"
                            title="Lihat Bukti Transfer Digital"
                            class="p-1.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all"
                          >
                            <span class="material-symbols-outlined text-base">receipt_long</span>
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

        <!-- Digital Receipt Modal Mount Point -->
        <div id="wd-receipt-modal-container"></div>
      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    // Search
    const searchInput = container.querySelector('#wd-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value;
        refreshCallback();
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
