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

          <!-- Add User Simulation -->
          <button
            type="button"
            id="btn-add-mock-user"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all self-end sm:self-auto"
          >
            <span class="material-symbols-outlined text-base">person_add</span>
            <span>Tambah User Simulasi</span>
          </button>
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
                      Tidak ada data pengguna yang ditemukan.
                    </td>
                  </tr>
                `
                    : users
                        .map(u => {
                          const isMainUser = u.id === 'usr_budi_01';

                          return `
                    <tr data-user-id="${u.id}">
                      <td>
                        <div class="flex items-center gap-3">
                          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                            ${u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div class="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>${u.name}</span>
                              ${isMainUser ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">App Active</span>` : ''}
                            </div>
                            <div class="font-mono text-[10px] text-slate-400">${u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="text-xs text-slate-300">${u.email}</div>
                        <div class="text-[11px] text-slate-400">${u.phone || '-'}</div>
                      </td>
                      <td>
                        <div class="text-xs font-semibold text-slate-200">${u.bankName || 'BCA'}</div>
                        <div class="font-mono text-[11px] text-slate-400">${u.accountNumber || '-'} (${u.accountHolder || u.name})</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          data-action="toggle-kyc"
                          data-id="${u.id}"
                          data-status="${u.isVerified}"
                          title="Klik untuk ubah status verifikasi"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
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
                            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1"
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
                            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
    // Search
    const searchInput = container.querySelector('#users-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value;
        refreshCallback();
      });
    }

    // Toggle KYC Verification
    container.querySelectorAll('[data-action="toggle-kyc"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-status') === 'true';
        this.dataService.updateUser(id, { isVerified: !current });
        this.toast.info(`Status verifikasi user #${id} berhasil diubah menjadi: ${!current ? 'Terverifikasi' : 'Belum KYC'}`, 'KYC Diperbarui');
        refreshCallback();
      });
    });

    // Adjust Balance
    container.querySelectorAll('[data-action="adjust-balance"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const currentBal = Number(btn.getAttribute('data-balance') || 0);

        const input = prompt(
          `Atur Saldo Baru untuk ${name} (ID: ${id}):\nSaldo saat ini: Rp ${currentBal.toLocaleString('id-ID')}\n(Masukkan nominal angka saldo baru)`,
          currentBal
        );

        if (input !== null && !isNaN(Number(input))) {
          const newBal = Number(input);
          this.dataService.updateUser(id, { balance: newBal });
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

    // Add Mock User
    const addBtn = container.querySelector('#btn-add-mock-user');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const name = prompt('Nama Lengkap Pengguna Baru:', 'Rendra Wijaya');
        if (name && name.trim()) {
          const id = 'usr_' + Math.random().toString(36).substring(2, 7);
          const email = `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
          const allUsers = this.dataService._get('all_users', []);
          allUsers.push({
            id,
            name: name.trim(),
            email,
            phone: '08' + Math.floor(1000000000 + Math.random() * 9000000000),
            bankName: 'DANA E-Wallet',
            accountNumber: '08' + Math.floor(1000000000 + Math.random() * 9000000000),
            accountHolder: name.trim().toUpperCase(),
            isVerified: true,
            createdAt: new Date().toISOString()
          });
          this.dataService._set('all_users', allUsers);
          this.toast.success(`Pengguna ${name} (${id}) berhasil didaftarkan!`, 'User Ditambahkan');
          refreshCallback();
        }
      });
    }
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
