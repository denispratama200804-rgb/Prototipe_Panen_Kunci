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
    this.expandedUserIds = new Set();
  }

  destroy() {}

  render() {
    const users = this.dataService.getUsers({ search: this.searchQuery });
    const verifiedCount = users.filter(u => u.isVerified).length;
    const totalBalance = users.reduce((sum, u) => sum + Number(u.balance || 0), 0);

    const formatCompactRupiah = (val) => {
      if (!val || val <= 0) return 'Rp 0';
      if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1).replace('.0', '')}jt`;
      if (val >= 1000) return `Rp ${Math.round(val / 1000)}rb`;
      return `Rp ${val}`;
    };

    return `
      <div class="space-y-4 sm:space-y-6 view-fade-enter">
        <!-- Top Stats Banner (Compact & Responsif Mobile) -->
        <div class="grid grid-cols-3 gap-2 sm:gap-4">
          <!-- Total Akun Card -->
          <div class="admin-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 border border-indigo-500/30 bg-indigo-500/5 transition-all">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 mb-0.5 sm:mb-1">
                <span class="text-[9px] sm:text-xs font-semibold text-indigo-400 uppercase tracking-wider truncate">
                  <span class="inline sm:hidden">Akun</span>
                  <span class="hidden sm:inline">Total Akun Terdaftar</span>
                </span>
              </div>
              <div class="text-sm sm:text-2xl font-extrabold text-white font-mono leading-tight truncate">
                ${users.length} <span class="text-[10px] sm:text-xs font-normal text-slate-400">User</span>
              </div>
              <div class="text-[9px] sm:text-xs text-slate-400 truncate mt-0.5 sm:mt-1 hidden sm:block">
                Semua member terdaftar
              </div>
            </div>
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 self-end sm:self-center">
              <span class="material-symbols-outlined text-base sm:text-2xl">group</span>
            </div>
          </div>

          <!-- Terverifikasi KYC Card -->
          <div class="admin-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 border border-emerald-500/30 bg-emerald-500/5 transition-all">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 mb-0.5 sm:mb-1">
                <span class="text-[9px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider truncate">
                  <span class="inline sm:hidden">KYC</span>
                  <span class="hidden sm:inline">Terverifikasi (KYC)</span>
                </span>
              </div>
              <div class="text-sm sm:text-2xl font-extrabold text-emerald-400 font-mono leading-tight truncate">
                ${verifiedCount} <span class="text-[10px] sm:text-xs font-normal text-slate-400">User</span>
              </div>
              <div class="text-[9px] sm:text-xs text-slate-400 truncate mt-0.5 sm:mt-1 hidden sm:block">
                Identitas tervalidasi
              </div>
            </div>
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 self-end sm:self-center">
              <span class="material-symbols-outlined text-base sm:text-2xl">verified_user</span>
            </div>
          </div>

          <!-- Total Saldo Member Card -->
          <div class="admin-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 border border-amber-500/30 bg-amber-500/5 transition-all">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 mb-0.5 sm:mb-1">
                <span class="text-[9px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider truncate">
                  <span class="inline sm:hidden">Saldo</span>
                  <span class="hidden sm:inline">Total Saldo Member</span>
                </span>
              </div>
              <div class="text-sm sm:text-2xl font-extrabold text-amber-300 font-mono leading-tight truncate">
                <span class="sm:hidden">${formatCompactRupiah(totalBalance)}</span>
                <span class="hidden sm:inline">Rp ${totalBalance.toLocaleString('id-ID')}</span>
              </div>
              <div class="text-[9px] sm:text-xs text-slate-400 truncate mt-0.5 sm:mt-1 hidden sm:block">
                Saldo aktif beredar
              </div>
            </div>
            <div class="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 self-end sm:self-center">
              <span class="material-symbols-outlined text-base sm:text-2xl">account_balance_wallet</span>
            </div>
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="admin-card rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
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

        <!-- Daftar Pengguna & KYC (Harmonious & Synchronized Theme) -->
        <div class="admin-card rounded-2xl overflow-hidden w-full max-w-full min-w-0 border border-admin shadow-xl">
          <div class="admin-card-header px-4 py-3 text-xs flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-indigo-500">group</span>
              <span class="font-bold text-admin-heading text-sm">Daftar Pengguna & KYC</span>
            </div>
            <span class="text-[11px] text-admin-muted font-mono admin-sub-card px-2.5 py-0.5 rounded-full border border-admin">
              ${users.length} pengguna
            </span>
          </div>

          <div class="p-3 sm:p-4 space-y-2.5">
            ${
              users.length === 0
                ? `
              <div class="text-center py-12 text-admin-muted">
                <span class="material-symbols-outlined text-4xl mb-2 text-slate-500 block">inbox</span>
                ${this.isSyncing ? '<span class="inline-flex items-center gap-2"><span class="material-symbols-outlined animate-spin text-lg">progress_activity</span><span>Mengambil data pengguna dari Supabase...</span></span>' : 'Tidak ada data pengguna yang ditemukan.'}
              </div>
            `
                : users
                    .map(u => {
                      const isRoleAdmin = u.role === 'admin' || (u.email && u.email.startsWith('admin@'));
                      const isExpanded = this.expandedUserIds.has(u.id);
                      const initial = (u.name || 'User').slice(0, 2).toUpperCase();
                      const balance = Number(u.balance || 0);
                      const totalWD = Number(u.totalWithdrawn || 0);

                      return `
              <div class="admin-item-card rounded-2xl overflow-hidden transition-all duration-200 ${
                u.isVerified
                  ? 'border-l-4 border-l-emerald-500'
                  : 'border-l-4 border-l-amber-500'
              }">
                <!-- Card Header: Avatar + Nama & Kontak & Tag + Status + Chevron -->
                <div 
                  class="flex items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-4 cursor-pointer select-none hover:bg-slate-500/5 transition-colors"
                  data-action="toggle-user-details"
                  data-id="${u.id}"
                >
                  <!-- Kiri: Avatar & Info Pengguna -->
                  <div class="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <!-- Avatar Lingkaran -->
                    <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-inner overflow-hidden border ${
                      u.isVerified
                        ? 'avatar-verified bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                        : 'avatar-unverified bg-indigo-900/60 text-indigo-300 border-indigo-500/40'
                    }">
                      ${
                        u.avatar
                          ? `<img src="${u.avatar}" alt="${u.name}" class="w-full h-full object-cover" />`
                          : `<span>${initial}</span>`
                      }
                    </div>

                    <!-- Teks: Nama, Email, dan Pill Saldo -->
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="font-bold text-admin-heading text-xs sm:text-sm tracking-wide truncate max-w-[150px] sm:max-w-none">${u.name || 'Pengguna'}</span>
                        ${
                          isRoleAdmin
                            ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-400 border border-purple-500/40 font-bold">Admin</span>`
                            : ''
                        }
                        <span class="font-mono text-[10px] text-admin-muted hidden sm:inline" title="${u.id}">
                          (${u.id.length > 16 ? u.id.slice(0, 8) + '...' + u.id.slice(-4) : u.id})
                        </span>
                      </div>
                      <div class="text-[11px] text-admin-muted truncate mt-0.5 max-w-[200px] sm:max-w-none">
                        ${u.email || '-'}${u.phone ? ` • ${u.phone}` : ''}
                      </div>
                      <div class="mt-1">
                        <!-- Pill Tag Saldo & Kunci -->
                        <span class="pill-saldo inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                          <span class="material-symbols-outlined text-xs text-amber-400">payments</span>
                          <span>Rp ${balance.toLocaleString('id-ID')}</span>
                          <span class="opacity-60">•</span>
                          <span class="text-emerald-400">${u.totalKeys || 0} Kunci</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Kanan: Status KYC Badge & Tanda Panah Chevron -->
                  <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <!-- Status KYC Pill Badge -->
                    ${
                      u.isVerified
                        ? `<span class="badge-verified inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border border-emerald-500/40 bg-emerald-950/60 text-emerald-400 tracking-wider">
                            <span class="material-symbols-outlined text-xs sm:text-sm">verified</span>
                            <span class="hidden sm:inline">TERVERIFIKASI</span>
                            <span class="sm:hidden">KYC</span>
                          </span>`
                        : `<span class="badge-unverified inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border border-amber-500/40 bg-amber-950/60 text-amber-400 tracking-wider">
                            <span class="material-symbols-outlined text-xs sm:text-sm">hourglass_empty</span>
                            <span>BELUM KYC</span>
                          </span>`
                    }

                    <!-- Tanda Panah Chevron untuk Lihat Detail -->
                    <button
                      type="button"
                      class="w-8 h-8 rounded-lg flex items-center justify-center text-admin-muted hover:text-admin-heading hover:bg-slate-500/10 transition-colors cursor-pointer"
                      title="Lihat rincian pengguna"
                    >
                      <span
                        class="material-symbols-outlined text-xl sm:text-2xl transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}"
                        data-user-chevron="${u.id}"
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                </div>

                <!-- Bagian Detail yang Terbuka saat Tanda Panah / Baris Diklik -->
                <div id="user-details-${u.id}" class="${isExpanded ? '' : 'hidden'} px-3 pb-3 sm:px-4 sm:pb-4 border-t border-admin pt-3 space-y-3 view-fade-enter">
                  <div class="admin-sub-card grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl text-xs">
                    <!-- Data Kontak & ID -->
                    <div>
                      <span class="text-admin-muted block text-[10px] uppercase font-semibold">Identitas & Kontak:</span>
                      <div class="mt-1.5 space-y-1">
                        <div class="flex items-center gap-1.5 text-admin-body">
                          <span class="material-symbols-outlined text-xs text-indigo-400">mail</span>
                          <span class="truncate">${u.email || '-'}</span>
                        </div>
                        <div class="flex items-center gap-1.5 text-admin-body">
                          <span class="material-symbols-outlined text-xs text-emerald-400">call</span>
                          <span>${u.phone || '-'}</span>
                        </div>
                        <div class="flex items-center gap-1.5 text-admin-muted font-mono text-[10px]">
                          <span class="material-symbols-outlined text-xs text-slate-400">fingerprint</span>
                          <span class="truncate">${u.id}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Rekening Pencairan -->
                    <div>
                      <span class="text-admin-muted block text-[10px] uppercase font-semibold">Rekening / E-Wallet Pencairan:</span>
                      <div class="mt-1.5 space-y-1">
                        <div class="font-bold text-admin-heading flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-sm text-cyan-400">account_balance</span>
                          <span>${u.bankName || 'Belum diatur'}</span>
                        </div>
                        <div class="font-mono text-admin-body">${u.accountNumber || '-'}</div>
                        <div class="text-[11px] text-admin-muted">a.n. ${u.accountHolder || u.name || '-'}</div>
                      </div>
                    </div>

                    <!-- Statistik Setoran & Finansial -->
                    <div class="sm:col-span-2 pt-2.5 border-t border-admin grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div class="admin-mini-card p-2 rounded-lg">
                        <span class="text-[10px] text-admin-muted block">Total Kunci</span>
                        <span class="font-mono text-xs font-bold text-admin-heading">${u.totalKeys || 0} Kunci</span>
                      </div>
                      <div class="admin-mini-card p-2 rounded-lg">
                        <span class="text-[10px] text-admin-muted block">Kunci Valid</span>
                        <span class="font-mono text-xs font-bold text-emerald-500 dark:text-emerald-400">${u.validKeys || 0} Valid</span>
                      </div>
                      <div class="admin-mini-card p-2 rounded-lg">
                        <span class="text-[10px] text-admin-muted block">Saldo Dompet</span>
                        <span class="font-mono text-xs font-extrabold text-indigo-500 dark:text-indigo-300">Rp ${balance.toLocaleString('id-ID')}</span>
                      </div>
                      <div class="admin-mini-card p-2 rounded-lg">
                        <span class="text-[10px] text-admin-muted block">Total Ditarik (WD)</span>
                        <span class="font-mono text-xs font-bold text-amber-500 dark:text-amber-400">Rp ${totalWD.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Tindakan Admin -->
                  <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div class="text-[11px] text-admin-muted">
                      <span>Status Akun: </span>
                      <strong class="text-admin-heading">${u.isVerified ? 'Terverifikasi (KYC Lengkap)' : 'Belum Memenuhi Verifikasi'}</strong>
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                      <!-- Toggle KYC Button -->
                      <button
                        type="button"
                        data-action="toggle-kyc"
                        data-id="${u.id}"
                        data-status="${u.isVerified}"
                        title="Klik untuk ubah status verifikasi di Supabase"
                        class="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          u.isVerified
                            ? 'bg-amber-600 hover:bg-amber-500'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                        }"
                      >
                        <span class="material-symbols-outlined text-sm">${u.isVerified ? 'cancel' : 'check_circle'}</span>
                        <span>${u.isVerified ? 'Batal Verifikasi' : 'Verifikasi KYC'}</span>
                      </button>

                      <!-- Adjust Balance Button -->
                      <button
                        type="button"
                        data-action="adjust-balance"
                        data-id="${u.id}"
                        data-name="${u.name}"
                        data-balance="${u.balance || 0}"
                        title="Atur Saldo Promo/Bonus"
                        class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
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
                        class="admin-btn-secondary px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <span class="material-symbols-outlined text-sm text-indigo-400">visibility</span>
                        <span>Lihat Riwayat</span>
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

        <!-- User Detail Modal Mount -->
        <div id="user-detail-modal-container"></div>
      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    // Accordion Toggle: Klik baris / tanda panah untuk melihat detail user
    container.querySelectorAll('[data-action="toggle-user-details"]').forEach(headerEl => {
      headerEl.addEventListener('click', (e) => {
        // Jangan toggle jika user mengklik tombol aksi di dalam detail (Ubah KYC, Atur Saldo, dsb)
        if (
          e.target.closest('[data-action="toggle-kyc"]') ||
          e.target.closest('[data-action="adjust-balance"]') ||
          e.target.closest('[data-action="view-user-details"]')
        ) {
          return;
        }

        const id = headerEl.getAttribute('data-id');
        const detailsEl = container.querySelector(`#user-details-${id}`);
        const chevronEl = container.querySelector(`[data-user-chevron="${id}"]`);

        if (detailsEl) {
          const isCurrentlyHidden = detailsEl.classList.contains('hidden');
          if (isCurrentlyHidden) {
            detailsEl.classList.remove('hidden');
            if (chevronEl) chevronEl.classList.add('rotate-180', 'text-indigo-400');
            this.expandedUserIds.add(id);
          } else {
            detailsEl.classList.add('hidden');
            if (chevronEl) chevronEl.classList.remove('rotate-180', 'text-indigo-400');
            this.expandedUserIds.delete(id);
          }
        }
      });
    });

    // Sinkronkan data pengguna secara otomatis saat pertama kali dibuka
    if (!this.hasSynced) {
      this.hasSynced = true;
      this.dataService.fetchUsersFromSupabase().then(() => {
        refreshCallback();
      });
    }

    // Search dengan debounce & Enter key agar responsif dan tidak lag saat mengetik
    const searchInput = container.querySelector('#users-search-input');
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
