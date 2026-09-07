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
                          const netPayout = amount; // Saldo yang masuk ke rekening pengguna

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

    // Approve
    container.querySelectorAll('[data-action="approve-wd"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const res = this.dataService.approveWithdrawal(id);
        if (res.success) {
          this.toast.success(`Penarikan #${id} telah disetujui & status diubah menjadi Selesai!`, 'Pencairan Berhasil');
          refreshCallback();
        } else {
          this.toast.error(res.message);
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

  _openReceiptModal(container, tx) {
    const modalMount = container.querySelector('#wd-receipt-modal-container');
    if (!modalMount) return;

    const amount = Number(tx.amount || 0);
    const fee = Number(tx.fee || 0);

    modalMount.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div class="admin-card rounded-3xl max-w-md w-full p-6 relative border border-slate-700 shadow-2xl space-y-6">
          <!-- Close Button -->
          <button
            type="button"
            id="btn-close-receipt-modal"
            class="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>

          <!-- Header -->
          <div class="text-center pt-2">
            <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <span class="material-symbols-outlined text-3xl">verified</span>
            </div>
            <h3 class="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Bukti Pengiriman Dana</h3>
            <p class="text-xs text-slate-400">Struk Resmi Panen Kunci Payout Gateway</p>
          </div>

          <!-- Transaction Summary Box -->
          <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono text-xs">
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
            <div class="flex justify-between pt-1 text-sm font-bold">
              <span class="text-slate-200 font-sans">Total Transfer Bersih:</span>
              <span class="text-emerald-400 font-bold">Rp ${amount.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <!-- Status Stamp -->
          <div class="p-3 rounded-xl ${
            tx.status === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : tx.status === 'pending'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          } text-center font-bold text-xs uppercase tracking-wider">
            STATUS: ${tx.status === 'success' ? 'DITRANSFER / SELESAI' : tx.status === 'pending' ? 'MENUNGGU TRANSFER' : 'DITOLAK / DANA REFUND'}
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              id="btn-print-receipt"
              class="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
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

    const close = () => {
      modalMount.innerHTML = '';
    };

    modalMount.querySelector('#btn-close-receipt-modal').addEventListener('click', close);
    modalMount.querySelector('#btn-close-receipt-bottom').addEventListener('click', close);
    modalMount.querySelector('#btn-print-receipt').addEventListener('click', () => {
      window.print();
    });
  }
}
