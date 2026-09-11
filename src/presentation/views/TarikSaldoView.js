import { IComponent } from '../../core/interfaces/IComponent.js';
import { AppEvents } from '../../core/events/EventBus.js';

/**
 * TarikSaldoView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman penarikan saldo ke e-wallet (DANA, GoPay, OVO, ShopeePay) atau transfer bank.
 * Metode pencairan dan nomor rekening/e-wallet dikunci otomatis sesuai dengan yang terdaftar di Profil Pengguna.
 */
export class TarikSaldoView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._walletService = container.resolve('WalletService');
    this._notification = container.resolve('NotificationService');
    this._authService = container.resolve('AuthService');
    this._strategyFactory = container.resolve('WithdrawalStrategyFactory');
    this._eventBus = container.resolve('EventBus');
    this._handleConfigSync = null;
    this._handleUserUpdate = null;
  }

  /**
   * Mengidentifikasi metode pencairan dan nomor rekening/e-wallet dari data profil pengguna
   * @param {import('../../domain/models/User.js').User|null} user
   * @returns {Object}
   * @private
   */
  _resolveUserPaymentMethod(user) {
    const rawBank = (user?.bankName || '').trim();
    const rawBankLower = rawBank.toLowerCase();
    const isConfigured = Boolean(rawBank && rawBank !== 'Belum diatur' && rawBank !== '-');

    let method = 'dana';
    let label = 'DANA';
    let isBank = false;
    let registeredAccount = user?.phone || user?.accountNumber || '';

    if (rawBankLower.includes('dana')) {
      method = 'dana';
      label = 'DANA';
      registeredAccount = user?.phone || user?.accountNumber || '';
    } else if (rawBankLower.includes('gopay')) {
      method = 'gopay';
      label = 'GoPay';
      registeredAccount = user?.phone || user?.accountNumber || '';
    } else if (rawBankLower.includes('ovo')) {
      method = 'ovo';
      label = 'OVO';
      registeredAccount = user?.phone || user?.accountNumber || '';
    } else if (rawBankLower.includes('shopee') || rawBankLower.includes('spay')) {
      method = 'shopeepay';
      label = 'ShopeePay';
      registeredAccount = user?.phone || user?.accountNumber || '';
    } else if (isConfigured) {
      method = 'bank';
      label = `Bank Transfer (${rawBank})`;
      isBank = true;
      registeredAccount = user?.accountNumber || user?.phone || '';
    }

    return {
      method,
      label,
      rawBank,
      isConfigured,
      isBank,
      registeredAccount,
      accountHolder: user?.accountHolder || user?.name || ''
    };
  }

  render() {
    const balance = this._walletService.getBalance();
    const minWithdrawal = this._walletService.minWithdrawal;
    const user = this._authService.getCurrentUser();
    const resolved = this._resolveUserPaymentMethod(user);

    // Nominal cepat (quick chips) dinamis proporsional mengikuti batas minimum admin
    const quickAmounts = [
      minWithdrawal,
      minWithdrawal * 2,
      minWithdrawal * 4,
      minWithdrawal * 10
    ];
    const uniqueQuick = [...new Set(quickAmounts)].sort((a, b) => a - b).slice(0, 4);
    const formatChip = (val) => {
      if (val >= 1000000) return `${Number((val / 1000000).toFixed(1))} jt`;
      return `${Math.round(val / 1000)} rb`;
    };

    const getFee = (m) => this._walletService.getFeeForMethod(m);
    const feeDana = getFee('dana');
    const feeGopay = getFee('gopay');
    const feeOvo = getFee('ovo');
    const feeBank = getFee('bank');
    const feeShopeePay = getFee('shopeepay');

    // Tentukan daftar kartu metode yang ditampilkan
    const methodsList = [
      {
        id: 'dana',
        label: 'DANA',
        icon: 'account_balance_wallet',
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        fee: feeDana
      },
      {
        id: 'gopay',
        label: 'GoPay',
        icon: 'account_balance_wallet',
        iconColor: 'text-[#00AED6]',
        iconBg: 'bg-[#00AED6]/10',
        fee: feeGopay
      },
      {
        id: resolved.method === 'shopeepay' ? 'shopeepay' : 'ovo',
        label: resolved.method === 'shopeepay' ? 'ShopeePay' : 'OVO',
        icon: 'account_balance_wallet',
        iconColor: resolved.method === 'shopeepay' ? 'text-[#EE4D2D]' : 'text-[#8b5cf6]',
        iconBg: resolved.method === 'shopeepay' ? 'bg-[#EE4D2D]/10' : 'bg-[#4C2A86]/10',
        fee: resolved.method === 'shopeepay' ? feeShopeePay : feeOvo
      },
      {
        id: 'bank',
        label: resolved.isBank ? `Bank (${resolved.rawBank})` : 'Bank Transfer',
        icon: 'account_balance',
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        fee: feeBank
      }
    ];

    const currentFee = getFee(resolved.method);
    const currentReceive = Math.max(0, minWithdrawal - currentFee);

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          <!-- Available Balance Card -->
          <div class="bg-surface-card rounded-3xl p-5 flex items-center justify-between shadow-sm border border-surface-container relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed opacity-30 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex flex-col">
              <span class="text-xs text-text-body font-medium uppercase tracking-wider">Saldo Tersedia</span>
              <span class="text-2xl sm:text-3xl font-extrabold text-text-heading mt-0.5" id="displayBalance">
                Rp ${balance.toLocaleString('id-ID')}
              </span>
            </div>
            <a href="#/riwayat" class="bg-surface-container-low text-primary px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 hover:bg-surface-container transition-colors">
              <span class="material-symbols-outlined text-[16px]">history</span>
              <span>Riwayat</span>
            </a>
          </div>

          <!-- Peringatan jika belum mengatur rekening/e-wallet di profil -->
          ${
            !resolved.isConfigured || !resolved.registeredAccount
              ? `
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 flex flex-col gap-3">
              <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <span class="material-symbols-outlined text-[22px]">error</span>
                <span>Rekening / E-Wallet Belum Diatur</span>
              </div>
              <p class="text-xs text-text-body leading-relaxed">
                Anda belum melengkapi rekening bank atau e-wallet utama di profil Anda. Sesuai ketentuan keamanan, penarikan saldo hanya dapat diproses ke rekening/e-wallet yang telah Anda simpan di menu profil.
              </p>
              <a
                href="#/profil"
                class="bg-amber-500 text-slate-950 font-bold text-xs py-3 px-4 rounded-2xl text-center shadow hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5"
              >
                <span class="material-symbols-outlined text-[18px]">manage_accounts</span>
                <span>Lengkapi Rekening di Profil Sekarang</span>
              </a>
            </div>
          `
              : ''
          }

          <!-- Withdrawal Form -->
          <form id="withdrawalForm" class="flex flex-col gap-4">
            
            <!-- Amount Input Section -->
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-3">
              <label class="font-label-md text-xs font-bold text-text-heading" for="withdrawAmount">
                Nominal Penarikan
              </label>

              <div class="relative flex items-center">
                <span class="absolute left-4 text-lg font-bold text-text-heading">Rp</span>
                <input
                  id="withdrawAmount"
                  type="number"
                  placeholder="${minWithdrawal.toLocaleString('id-ID')}"
                  min="${minWithdrawal}"
                  step="1000"
                  value="${minWithdrawal}"
                  class="w-full bg-surface-container-low rounded-2xl py-3.5 pl-12 pr-28 text-lg font-bold text-text-heading border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-mono"
                />
                <button
                  type="button"
                  id="btnWithdrawAll"
                  class="absolute right-2.5 bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95"
                >
                  Tarik Semua
                </button>
              </div>

              <!-- Quick Denomination Chips -->
              <div class="grid grid-cols-4 gap-2 mt-1" id="quickAmountsContainer">
                ${uniqueQuick
                  .map(
                    amt => `
                  <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="${amt}">
                    ${formatChip(amt)}
                  </button>
                `
                  )
                  .join('')}
              </div>
              <p class="text-[11px] text-outline" id="minWithdrawalNotice">Batas minimal penarikan adalah Rp ${minWithdrawal.toLocaleString('id-ID')}.</p>
            </div>

            <!-- Method Selection Grid (Disesuaikan otomatis sesuai profil, metode lain terkunci) -->
            <div class="flex flex-col gap-2.5">
              <div class="flex items-center justify-between px-1">
                <label class="font-label-md text-xs font-bold text-text-heading">
                  Pilih Metode Pencairan
                </label>
                <span class="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[12px]">lock</span>
                  <span>Terkunci Sesuai Profil</span>
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                ${methodsList
                  .map(m => {
                    const isSelected = m.id === resolved.method;
                    if (isSelected) {
                      return `
                        <!-- Active & Selected Method (Sesuai Profil) -->
                        <div class="relative ring-2 ring-primary border-2 border-primary bg-primary/5 rounded-2xl p-3.5 shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all">
                          <input type="radio" name="withdrawal_method" value="${m.id}" checked class="sr-only"/>
                          <div class="w-9 h-9 rounded-full ${m.iconBg} flex items-center justify-center ${m.iconColor}">
                            <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">${m.icon}</span>
                          </div>
                          <span class="font-label-md text-xs font-bold text-text-heading text-center truncate max-w-full">${m.label}</span>
                          <span class="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 method-fee-badge" data-method="${m.id}">
                            Biaya: Rp ${m.fee.toLocaleString('id-ID')}
                          </span>
                          <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shadow-xs">
                            <span class="material-symbols-outlined text-[13px] font-bold">check</span>
                          </div>
                          <div class="absolute -top-2 left-3 bg-primary text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                            Sesuai Profil
                          </div>
                        </div>
                      `;
                    } else {
                      return `
                        <!-- Locked & Disabled Method (Tidak Bisa Dipilih) -->
                        <div class="relative bg-surface-container-low/50 rounded-2xl p-3.5 border border-surface-container/60 shadow-none flex flex-col items-center justify-center gap-1.5 opacity-40 pointer-events-none cursor-not-allowed filter grayscale-[30%] select-none" title="Metode ini terkunci. Rekening profil Anda terdaftar menggunakan ${resolved.label}.">
                          <input type="radio" name="withdrawal_method" value="${m.id}" disabled class="sr-only"/>
                          <div class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-outline">
                            <span class="material-symbols-outlined text-[22px]">${m.icon}</span>
                          </div>
                          <span class="font-label-md text-xs font-semibold text-text-heading text-center truncate max-w-full">${m.label}</span>
                          <span class="text-[10px] text-outline px-2 py-0.5 rounded-full bg-surface-container method-fee-badge" data-method="${m.id}">
                            Biaya: Rp ${m.fee.toLocaleString('id-ID')}
                          </span>
                          <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-surface-container text-outline rounded-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-[13px]">lock</span>
                          </div>
                        </div>
                      `;
                    }
                  })
                  .join('')}
              </div>

              <!-- Notice info penguncian metode sesuai profil -->
              <div class="flex items-center justify-between bg-surface-card rounded-2xl px-4 py-2.5 border border-surface-container shadow-xs mt-0.5">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[15px]">lock</span>
                  </div>
                  <p class="text-[11px] text-text-body truncate">
                    Metode terkunci ke <strong class="text-text-heading font-bold">${resolved.label}</strong>
                  </p>
                </div>
                <a href="#/profil" class="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 shrink-0 ml-2">
                  <span>Ubah di Profil</span>
                  <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
            </div>

            <!-- Recipient Identifier Section (Terkunci Otomatis dari Profil) -->
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <label class="font-label-md text-xs font-bold text-text-heading" for="accountIdentifier">
                  ${resolved.isBank ? `Nomor Rekening Bank (${resolved.rawBank || 'Bank'})` : `Nomor Handphone E-Wallet (${resolved.label})`}
                </label>
                <span class="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[12px]">verified</span>
                  <span>Terkunci</span>
                </span>
              </div>

              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                  ${resolved.isBank ? 'account_balance' : 'phone_iphone'}
                </span>
                <input
                  id="accountIdentifier"
                  type="text"
                  placeholder="${resolved.isBank ? 'Nomor Rekening Bank' : '0812xxxxxxxx'}"
                  value="${resolved.registeredAccount}"
                  readonly
                  required
                  class="w-full bg-surface-container-low/70 rounded-2xl py-3.5 pl-11 pr-24 text-sm text-text-heading font-mono border border-surface-container cursor-not-allowed font-semibold select-none focus:outline-none"
                />
                <a
                  href="#/profil"
                  class="absolute right-2.5 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-0.5"
                  title="Ubah rekening atau e-wallet di profil Anda"
                >
                  <span class="material-symbols-outlined text-[14px]">edit</span>
                  <span>Ubah</span>
                </a>
              </div>

              <div class="flex items-center justify-between text-[11px] text-outline mt-0.5">
                <span>Atas Nama: <strong class="text-text-heading">${resolved.accountHolder || user?.name || '-'}</strong></span>
                <span class="text-primary font-medium">${resolved.label}</span>
              </div>
            </div>

            <!-- Live Transaction Breakdown Section -->
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-text-heading flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-primary">receipt_long</span>
                <span>Rincian Biaya Penarikan</span>
              </h3>
              <div class="flex flex-col gap-2 text-xs">
                <div class="flex justify-between items-center text-text-body">
                  <span>Nominal Penarikan</span>
                  <span class="font-bold font-mono text-text-heading" id="summaryAmount">Rp ${minWithdrawal.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between items-center text-text-body">
                  <span>Biaya Admin</span>
                  <span class="font-bold font-mono text-amber-500" id="summaryFee">Rp ${currentFee.toLocaleString('id-ID')}</span>
                </div>
                <div class="w-full h-px bg-surface-container my-0.5"></div>
                <div class="flex justify-between items-center text-sm font-extrabold text-text-heading">
                  <span>Total Diterima</span>
                  <span class="text-secondary font-mono text-base font-bold" id="summaryTotalReceive">Rp ${currentReceive.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between items-center text-[11px] text-text-body pt-1 border-t border-surface-container/50">
                  <span class="text-outline">Total Potong Saldo</span>
                  <span class="font-bold text-primary font-mono" id="summaryTotalDeduction">Rp ${minWithdrawal.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              id="btnSubmitWithdrawal"
              ${!resolved.isConfigured || !resolved.registeredAccount ? 'disabled' : ''}
              class="w-full bg-secondary text-white font-label-md font-bold text-sm rounded-full py-4 shadow-lg shadow-secondary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>${!resolved.isConfigured || !resolved.registeredAccount ? 'Lengkapi Rekening di Profil Terlebih Dahulu' : 'Lanjutkan Penarikan'}</span>
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>

        </div>
      </div>
    `;
  }

  mount(container) {
    const form = container.querySelector('#withdrawalForm');
    const amountInput = container.querySelector('#withdrawAmount');
    const accountInput = container.querySelector('#accountIdentifier');
    const withdrawAllBtn = container.querySelector('#btnWithdrawAll');
    const quickAmountBtns = container.querySelectorAll('.btn-quick-amount');

    // Helper untuk mendeteksi profil pengguna terkini
    const getCurrentResolved = () => {
      const u = this._authService.getCurrentUser();
      return this._resolveUserPaymentMethod(u);
    };

    // Helper untuk update live summary breakdown biaya
    const updateBreakdown = () => {
      const amount = Number(amountInput?.value) || 0;
      const resolved = getCurrentResolved();
      const method = resolved.method;
      const fee = this._walletService.getFeeForMethod(method, amount);
      const totalReceive = Math.max(0, amount - fee);

      const summaryAmount = container.querySelector('#summaryAmount');
      const summaryFee = container.querySelector('#summaryFee');
      const summaryTotal = container.querySelector('#summaryTotalDeduction');
      const summaryNet = container.querySelector('#summaryTotalReceive');

      if (summaryAmount) summaryAmount.textContent = `Rp ${amount.toLocaleString('id-ID')}`;
      if (summaryFee) summaryFee.textContent = `Rp ${fee.toLocaleString('id-ID')}`;
      if (summaryNet) summaryNet.textContent = `Rp ${totalReceive.toLocaleString('id-ID')}`;
      if (summaryTotal) summaryTotal.textContent = `Rp ${amount.toLocaleString('id-ID')}`;
    };

    // Listen amount input change
    amountInput?.addEventListener('input', updateBreakdown);

    // Tarik Semua
    withdrawAllBtn?.addEventListener('click', () => {
      const balance = this._walletService.getBalance();
      if (amountInput) {
        amountInput.value = balance;
        updateBreakdown();
      }
    });

    // Quick chips
    quickAmountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (amountInput) {
          amountInput.value = btn.getAttribute('data-amount');
          updateBreakdown();
        }
      });
    });

    // Form submit -> Tampilkan Pop-Up Konfirmasi Penarikan (konfirmasi_penarikan_pop_up)
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const user = this._authService.getCurrentUser();
      const resolved = this._resolveUserPaymentMethod(user);

      if (!resolved.isConfigured || !resolved.registeredAccount) {
        this._notification.error('Harap lengkapi rekening atau nomor e-wallet di profil Anda terlebih dahulu.');
        window.location.hash = '/profil';
        return;
      }

      const amount = Number(amountInput?.value);
      const method = resolved.method;
      const account = resolved.registeredAccount;

      const currentBalance = this._walletService.getBalance();
      const minWithdrawal = this._walletService.minWithdrawal;

      const methodLabel = resolved.label;
      const fee = this._walletService.getFeeForMethod(method, amount);
      const totalReceive = Math.max(0, amount - fee);

      if (!account) {
        this._notification.error('Nomor rekening atau e-wallet di profil belum terdaftar. Silakan lengkapi di profil.');
        window.location.hash = '/profil';
        return;
      }
      if (amount <= 0 || isNaN(amount)) {
        this._notification.error('Nominal penarikan harus valid dan lebih dari Rp 0.');
        amountInput?.focus();
        return;
      }
      if (amount < minWithdrawal) {
        this._notification.error(`Nominal penarikan minimal adalah Rp ${minWithdrawal.toLocaleString('id-ID')}. Saldo Anda: Rp ${currentBalance.toLocaleString('id-ID')}.`);
        amountInput?.focus();
        return;
      }
      if (amount > currentBalance) {
        this._notification.error(`Saldo tidak mencukupi (Saldo Anda: Rp ${currentBalance.toLocaleString('id-ID')}, penarikan diminta: Rp ${amount.toLocaleString('id-ID')}).`);
        amountInput?.focus();
        return;
      }

      // Render Modal Konfirmasi Penarikan Sesuai Mockup Desain (konfirmasi_penarikan_pop_up)
      this._notification.showModal({
        title: 'Konfirmasi Penarikan',
        message: 'Periksa kembali rincian penarikan saldo Anda sebelum memproses:',
        html: `
          <div class="flex flex-col gap-2.5 text-left w-full my-1">
            <div class="bg-surface-container-low rounded-2xl p-3.5 space-y-2 border border-surface-container">
              <div class="flex justify-between items-center text-xs">
                <span class="text-text-body font-medium">Nominal</span>
                <span class="font-bold text-text-heading font-mono text-sm">Rp ${amount.toLocaleString('id-ID')}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-text-body font-medium">Biaya Admin</span>
                <span class="font-semibold text-error font-mono">${fee > 0 ? '-Rp ' + fee.toLocaleString('id-ID') : 'Gratis'}</span>
              </div>
              <div class="h-[1px] w-full bg-outline-variant/30 my-1"></div>
              <div class="flex justify-between items-center bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                <span class="text-xs text-primary font-bold">Total Diterima</span>
                <span class="font-headline-md text-base font-extrabold text-primary font-mono">Rp ${totalReceive.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div class="bg-surface-container rounded-2xl p-3 flex items-center gap-3 border border-surface-container-high">
              <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">${resolved.isBank ? 'account_balance' : 'account_balance_wallet'}</span>
              </div>
              <div class="flex flex-col min-w-0 text-left">
                <span class="text-[10px] text-outline uppercase tracking-wider font-semibold">Tujuan Pencairan (Sesuai Profil)</span>
                <span class="text-xs font-bold text-text-heading truncate font-mono">${methodLabel} - ${account}</span>
                <span class="text-[10px] text-text-body mt-0.5">a.n. ${resolved.accountHolder || user?.name || '-'}</span>
              </div>
            </div>

            <div class="bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl flex items-center gap-2 text-left">
              <span class="material-symbols-outlined text-[18px] shrink-0">info</span>
              <span class="text-[11px] leading-tight">Pastikan data di atas sudah benar sebelum melanjutkan.</span>
            </div>
          </div>
        `,
        type: 'confirm',
        confirmText: 'Tarik Sekarang',
        cancelText: 'Batal',
        showCancel: true,
        autoClose: false,
        onConfirm: async ({ close, confirmBtn }) => {
          if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `
              <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              <span>Memproses...</span>
            `;
          }

          const currentUser = this._authService.getCurrentUser();
          const res = await this._walletService.withdraw({
            amount,
            method,
            accountIdentifier: account,
            userId: currentUser ? currentUser.id : 'usr_guest'
          });

          // Tutup popup konfirmasi
          close();

          if (res.success) {
            this._notification.showModal({
              title: 'Permintaan Penarikan Berhasil Diajukan!',
              message: `Permintaan penarikan dana sebesar <strong class="text-primary font-bold">Rp ${amount.toLocaleString('id-ID')}</strong> ke <strong class="text-text-heading">${methodLabel} (${account})</strong> telah berhasil terkirim ke Admin Panel dan sedang <strong class="text-amber-500 font-bold">menunggu persetujuan admin</strong>.`,
              html: `
                <div class="bg-surface-container-low rounded-2xl p-3.5 flex flex-col gap-2 text-xs border border-surface-container mt-2 text-left">
                  <div class="flex justify-between items-center">
                    <span class="text-text-body">ID Transaksi</span>
                    <strong class="font-mono text-primary font-bold">#${res.transaction?.id || '-'}</strong>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-text-body">Nominal Penarikan</span>
                    <strong class="font-mono font-bold">Rp ${amount.toLocaleString('id-ID')}</strong>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-text-body">Biaya Admin</span>
                    <strong class="font-mono ${fee > 0 ? 'text-amber-500' : 'text-slate-500'}">Rp ${fee.toLocaleString('id-ID')}</strong>
                  </div>
                  <div class="h-[1px] bg-outline-variant/30 my-0.5"></div>
                  <div class="flex justify-between items-center text-sm font-extrabold">
                    <span class="text-text-heading">Total Dana Masuk</span>
                    <strong class="text-secondary font-mono text-base">Rp ${totalReceive.toLocaleString('id-ID')}</strong>
                  </div>
                </div>
              `,
              type: 'info',
              confirmText: 'Lihat Status di Riwayat',
              onConfirm: () => {
                window.location.hash = '/riwayat';
              }
            });
            return false;
          } else {
            this._notification.error(res.message || 'Gagal memproses penarikan.');
            return false;
          }
        }
      });
    });

    // Reaktif re-render saat data profil pengguna diperbarui (misal user ubah rekening di profil)
    const handleUserUpdate = () => {
      const viewRoot = document.getElementById('app-view-root');
      if (viewRoot && window.location.hash.includes('/tarik-saldo')) {
        viewRoot.innerHTML = this.render();
        this.mount(viewRoot);
      }
    };
    this._handleUserUpdate = handleUserUpdate;
    if (this._eventBus) {
      this._eventBus.on(AppEvents.USER_UPDATED, handleUserUpdate);
    }

    // Real-time synchronization saat admin mengubah batas minimal / biaya di tab lain
    const handleConfigSync = () => {
      const currentMin = this._walletService.minWithdrawal;
      if (amountInput) {
        amountInput.min = currentMin;
        if (Number(amountInput.value) < currentMin) {
          amountInput.value = currentMin;
        }
      }
      const notice = container.querySelector('#minWithdrawalNotice');
      if (notice) {
        notice.textContent = `Batas minimal penarikan adalah Rp ${currentMin.toLocaleString('id-ID')}.`;
      }

      // Update quick chips nominal penarikan
      const quickContainer = container.querySelector('#quickAmountsContainer');
      if (quickContainer) {
        const quickAmounts = [currentMin, currentMin * 2, currentMin * 4, currentMin * 10];
        const uniqueQuick = [...new Set(quickAmounts)].sort((a, b) => a - b).slice(0, 4);
        const formatChip = (val) => {
          if (val >= 1000000) return `${Number((val / 1000000).toFixed(1))} jt`;
          return `${Math.round(val / 1000)} rb`;
        };
        quickContainer.innerHTML = uniqueQuick
          .map(
            amt => `
          <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="${amt}">
            ${formatChip(amt)}
          </button>
        `
          )
          .join('');

        quickContainer.querySelectorAll('.btn-quick-amount').forEach(btn => {
          btn.addEventListener('click', () => {
            const amt = Number(btn.getAttribute('data-amount'));
            if (amt && amountInput) {
              amountInput.value = amt;
              updateBreakdown();
            }
          });
        });
      }

      // Update badge biaya admin di setiap kartu metode
      ['dana', 'gopay', 'ovo', 'shopeepay', 'bank'].forEach(m => {
        const badge = container.querySelector(`.method-fee-badge[data-method="${m}"]`);
        if (badge) {
          const mFee = this._walletService.getFeeForMethod(m);
          badge.textContent = `Biaya: Rp ${mFee.toLocaleString('id-ID')}`;
        }
      });

      updateBreakdown();
    };

    this._handleConfigSync = handleConfigSync;
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.includes('admin_config')) handleConfigSync();
    });
    window.addEventListener('panenkunci:config_updated', handleConfigSync);
  }

  destroy() {
    if (this._handleConfigSync) {
      window.removeEventListener('panenkunci:config_updated', this._handleConfigSync);
      this._handleConfigSync = null;
    }
    if (this._handleUserUpdate && this._eventBus) {
      this._eventBus.off(AppEvents.USER_UPDATED, this._handleUserUpdate);
      this._handleUserUpdate = null;
    }
  }
}
