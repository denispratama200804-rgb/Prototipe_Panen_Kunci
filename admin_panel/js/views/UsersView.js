/**
 * UsersView
 * Manajemen Pengguna & KYC Panen Kunci:
 * Melihat daftar user, status verifikasi akun, total saldo, penyesuaian saldo promo/bonus,
 * dan riwayat transaksi per user.
 */
export class UsersView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
    this.searchQuery = '';
    this.isSyncing = false;
    this.hasSynced = false;
  }

  destroy() {}

  render() {
    const users = this.dataService.getUsers({ search: this.searchQuery });

    return `
      <div class="space-y-6 view-fade-enter">
        <!-- Top Stats Banner -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="admin-card rounded-2xl p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">group</span>
            </div>
            <div>
              <div class="text-xs text-slate-400">Total Akun Terdaftar</div>
              <div class="text-2xl font-bold text-white font-mono">${users.length} User</div>
            </div>
          </div>

          <div class="admin-card rounded-2xl p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <div class="text-xs text-slate-400">Terverifikasi (KYC)</div>
              <div class="text-2xl font-bold text-emerald-400 font-mono">${users.filter(u => u.isVerified).length} User</div>
            </div>
          </div>

          <div class="admin-card rounded-2xl p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div>
              <div class="text-xs text-slate-400">Total Saldo Member</div>
              <div class="text-2xl font-bold text-amber-300 font-mono">
                Rp ${users.reduce((sum, u) => sum + Number(u.balance || 0), 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="admin-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <!-- Search -->
          <div class="relative w-full sm:w-80">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              id="users-search-input"
              placeholder="Cari nama, email, nomor HP..."
              value="${this.searchQuery}"
              class="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <!-- Tombol Sinkronisasi Database Supabase -->
          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              id="btn-sync-supabase-users"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              title="Tarik & Sinkronkan Data Akun Asli dari Database Supabase"
            >
              <span class="material-symbols-outlined text-base ${this.isSyncing ? 'animate-spin' : ''}">sync</span>
              <span>${this.isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Supabase'}</span>
            </button>
          </div>
        </div>

        <!-- Users Table -->
        <div class="admin-card rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left admin-table">
              <thead>
                <tr>
                  <th>Pengguna / ID</th>
                  <th>Kontak</th>
                  <th>Rekening / E-Wallet</th>
                  <th>Status KYC</th>
                  <th>Setoran Kunci</th>
                  <th>Saldo Dompet</th>
                  <th class="text-right">Aksi Kelola</th>
                </tr>
              </thead>
              <tbody>
                ${
                  users.length === 0
                    ? `
                  <tr>
                    <td colspan="7" class="text-center py-12 text-slate-400">
                      ${this.isSyncing ? '<span class="inline-flex items-center gap-2"><span class="material-symbols-outlined animate-spin text-lg">progress_activity</span><span>Mengambil data pengguna dari Supabase...</span></span>' : 'Tidak ada data pengguna yang ditemukan di database.'}
                    </td>
                  </tr>
                `
                    : users
                        .map(u => {
                          const isRoleAdmin = u.role === 'admin' || (u.email && u.email.startsWith('admin@'));

                          return `
                    <tr data-user-id="${u.id}">
                      <td>
                        <div class="flex items-center gap-3">
                          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs overflow-hidden flex-shrink-0">
                            ${u.avatar ? `
                              <img src="${u.avatar}" alt="${u.name}" class="w-full h-full object-cover" />
                            ` : `
                              ${(u.name || 'U').slice(0, 2).toUpperCase()}
                            `}
                          </div>
                          <div>
                            <div class="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>${u.name || 'Pengguna'}</span>
                              ${isRoleAdmin ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold">Admin</span>` : ''}
                            </div>
                            <div class="font-mono text-[10px] text-slate-400" title="${u.id}">
                              ${u.id.length > 18 ? u.id.slice(0, 8) + '...' + u.id.slice(-4) : u.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="text-xs text-slate-300">${u.email || '-'}</div>
                        <div class="text-[11px] text-slate-400">${u.phone || '-'}</div>
                      </td>
                      <td>
                        <div class="text-xs font-semibold text-slate-200">${u.bankName || '-'}</div>
                        <div class="font-mono text-[11px] text-slate-400">${u.accountNumber || '-'} (${u.accountHolder || u.name || '-'})</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          data-action="toggle-kyc"
                          data-id="${u.id}"
                          data-status="${u.isVerified}"
                          title="Klik untuk ubah status verifikasi di Supabase"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            u.isVerified
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                          }"
                        >
                          <span class="material-symbols-outlined text-sm">${u.isVerified ? 'check_circle' : 'pending'}</span>
                          <span>${u.isVerified ? 'Terverifikasi' : 'Belum KYC'}</span>
                        </button>
                      </td>
                      <td>
                        <div class="font-mono text-xs font-bold text-white">${u.totalKeys} Kunci</div>
                        <div class="text-[10px] text-emerald-400">${u.validKeys} valid</div>
                      </td>
                      <td>
                        <div class="font-mono text-xs font-extrabold text-indigo-300">Rp ${Number(u.balance || 0).toLocaleString('id-ID')}</div>
                        <div class="text-[10px] text-slate-400">Total WD: Rp ${Number(u.totalWithdrawn || 0).toLocaleString('id-ID')}</div>
                      </td>
                      <td class="text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <!-- Adjust Balance Button -->
                          <button
                            type="button"
                            data-action="adjust-balance"
                            data-id="${u.id}"
                            data-name="${u.name}"
                            data-balance="${u.balance || 0}"
                            title="Atur Saldo Promo/Bonus"
                            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span class="material-symbols-outlined text-sm">currency_exchange</span>
                            <span>Atur Saldo</span>
                          </button>

                          <!-- View Details Button -->
                          <button
                            type="button"
                            data-action="view-user-details"
                            data-id="${u.id}"
                            title="Lihat Riwayat & Kunci Pengguna Ini"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <span class="material-symbols-outlined text-base">visibility</span>
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

        <!-- User Detail Modal Mount -->
        <div id="user-detail-modal-container"></div>
      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    // Sinkronkan data pengguna secara otomatis saat pertama kali dibuka
    if (!this.hasSynced) {
      this.hasSynced = true;
      this.dataService.fetchUsersFromSupabase().then(() => {
        refreshCallback();
      });
    }

    // Search
    const searchInput = container.querySelector('#users-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value;
        refreshCallback();
      });
    }

    // Tombol Sinkronkan Supabase
    const syncBtn = container.querySelector('#btn-sync-supabase-users');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        this.isSyncing = true;
        refreshCallback();
        const users = await this.dataService.fetchUsersFromSupabase();
        this.isSyncing = false;
        this.toast.success(`Berhasil menyinkronkan ${users.length} pengguna dari database Supabase!`, 'Supabase Terhubung');
        refreshCallback();
      });
    }

    // Toggle KYC Verification (disinkronkan langsung ke Supabase)
    container.querySelectorAll('[data-action="toggle-kyc"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-status') === 'true';
        btn.disabled = true;
        await this.dataService.updateUser(id, { isVerified: !current });
        this.toast.info(`Status verifikasi user berhasil diubah menjadi: ${!current ? 'Terverifikasi' : 'Belum KYC'}`, 'KYC Diperbarui');
        refreshCallback();
      });
    });

    // Adjust Balance
    container.querySelectorAll('[data-action="adjust-balance"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const currentBal = Number(btn.getAttribute('data-balance') || 0);

        const input = prompt(
          `Atur Saldo Baru untuk ${name}:\nSaldo saat ini: Rp ${currentBal.toLocaleString('id-ID')}\n(Masukkan nominal angka saldo baru)`,
          currentBal
        );

        if (input !== null && !isNaN(Number(input))) {
          const newBal = Number(input);
          await this.dataService.updateUser(id, { balance: newBal });
          this.toast.success(`Saldo ${name} berhasil disesuaikan menjadi Rp ${newBal.toLocaleString('id-ID')}`, 'Saldo Diperbarui');
          refreshCallback();
        }
      });
    });

    // View User Details
    container.querySelectorAll('[data-action="view-user-details"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const user = this.dataService.getUsers().find(u => u.id === id);
        if (user) {
          this._openUserModal(container, user);
        }
      });
    });
  }

  _openUserModal(container, user) {
    const modalMount = container.querySelector('#user-detail-modal-container');
    if (!modalMount) return;

    const userKeys = this.dataService.getApiKeys().filter(k => k.userId === user.id);
    const userTx = this.dataService.getTransactions().filter(t => t.userId === user.id);

    modalMount.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div class="admin-card rounded-3xl max-w-2xl w-full p-6 relative border border-slate-700 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <!-- Close Button -->
          <button
            type="button"
            id="btn-close-user-modal"
            class="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>

          <!-- User Header -->
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/30">
              ${user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">${user.name}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  user.isVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }">
                  ${user.isVerified ? 'KYC Terverifikasi' : 'Belum KYC'}
                </span>
              </div>
              <p class="text-xs text-slate-400">${user.email} • ${user.phone} • ID: <span class="font-mono text-indigo-300">${user.id}</span></p>
            </div>
          </div>

          <!-- Quick Stats Grid -->
          <div class="grid grid-cols-3 gap-3">
            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="text-[11px] text-slate-400">Saldo Dompet</div>
              <div class="text-base font-bold text-indigo-400 font-mono">Rp ${Number(user.balance || 0).toLocaleString('id-ID')}</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="text-[11px] text-slate-400">Total API Key</div>
              <div class="text-base font-bold text-emerald-400 font-mono">${userKeys.length} Kunci</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="text-[11px] text-slate-400">Total Penarikan</div>
              <div class="text-base font-bold text-amber-400 font-mono">Rp ${Number(user.totalWithdrawn || 0).toLocaleString('id-ID')}</div>
            </div>
          </div>

          <!-- Rekening Detail -->
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
            <div class="text-[11px] font-semibold text-slate-400 uppercase">Rekening Pencairan Terdaftar:</div>
            <div class="text-white font-medium">${user.bankName || 'BCA'} - ${user.accountNumber || '-'} (a.n. ${user.accountHolder || user.name})</div>
          </div>

          <!-- Section: Kunci Terdaftar -->
          <div>
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">API Key Disetor (${userKeys.length})</h4>
            <div class="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              ${
                userKeys.length === 0
                  ? '<div class="text-xs text-slate-500 italic py-2">Belum ada API key yang disetor.</div>'
                  : userKeys
                      .map(
                        k => `
                  <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                    <span class="font-mono text-slate-300">${k.keyString.slice(0, 16)}••••</span>
                    <span class="text-[11px] px-2 py-0.5 rounded ${
                      k.status === 'valid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }">${k.status}</span>
                  </div>
                `
                      )
                      .join('')
              }
            </div>
          </div>

          <!-- Section: Riwayat Transaksi -->
          <div>
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Riwayat Mutasi (${userTx.length})</h4>
            <div class="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              ${
                userTx.length === 0
                  ? '<div class="text-xs text-slate-500 italic py-2">Belum ada transaksi.</div>'
                  : userTx
                      .map(
                        t => `
                  <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                    <div>
                      <div class="font-medium text-white">${t.title}</div>
                      <div class="text-[10px] text-slate-500">${new Date(t.createdAt).toLocaleDateString('id-ID')}</div>
                    </div>
                    <span class="font-mono font-bold ${t.type === 'deposit' ? 'text-emerald-400' : 'text-slate-200'}">
                      ${t.type === 'deposit' ? '+' : '-'}Rp ${Number(t.amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                `
                      )
                      .join('')
              }
            </div>
          </div>
        </div>
      </div>
    `;

    modalMount.querySelector('#btn-close-user-modal').addEventListener('click', () => {
      modalMount.innerHTML = '';
    });
  }
}
