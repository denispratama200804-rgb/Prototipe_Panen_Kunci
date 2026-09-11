import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * TarikSaldoView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman penarikan saldo ke e-wallet (DANA, GoPay, OVO) atau transfer bank dengan popup konfirmasi.
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
  }

  render() {
    const balance = this._walletService.getBalance();
    const minWithdrawal = this._walletService.minWithdrawal;
    const user = this._authService.getCurrentUser();
    const defaultPhone = user?.phone || '';
    const defaultBankAcc = user?.accountNumber || '';

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
                ${uniqueQuick.map(amt => `
                  <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="${amt}">
                    ${formatChip(amt)}
                  </button>
                `).join('')}
              </div>
              <p class="text-[11px] text-outline" id="minWithdrawalNotice">Batas minimal penarikan adalah Rp ${minWithdrawal.toLocaleString('id-ID')}.</p>
            </div>

            <!-- Method Selection Grid -->
            <div class="flex flex-col gap-2">
              <label class="font-label-md text-xs font-bold text-text-heading px-1">
                Pilih Metode Pencairan
              </label>

              <div class="grid grid-cols-2 gap-2.5">
                <!-- DANA -->
                <label class="relative cursor-pointer group">
                  <input type="radio" name="withdrawal_method" value="dana" checked class="peer sr-only"/>
                  <div class="bg-surface-card p-3.5 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-1.5 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">DANA</span>
                    <span class="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 method-fee-badge" data-method="dana">
                      Biaya: Rp ${feeDana.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[14px] font-bold">check</span>
                  </div>
                </label>

                <!-- GoPay -->
                <label class="relative cursor-pointer group">
                  <input type="radio" name="withdrawal_method" value="gopay" class="peer sr-only"/>
                  <div class="bg-surface-card p-3.5 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-1.5 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-9 h-9 rounded-full bg-[#00AED6]/10 flex items-center justify-center text-[#00AED6]">
                      <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">GoPay</span>
                    <span class="text-[10px] font-semibold text-[#00AED6] px-2 py-0.5 rounded-full bg-[#00AED6]/10 method-fee-badge" data-method="gopay">
                      Biaya: Rp ${feeGopay.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[14px] font-bold">check</span>
                  </div>
                </label>

                <!-- OVO -->
                <label class="relative cursor-pointer group">
                  <input type="radio" name="withdrawal_method" value="ovo" class="peer sr-only"/>
                  <div class="bg-surface-card p-3.5 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-1.5 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-9 h-9 rounded-full bg-[#4C2A86]/10 flex items-center justify-center text-[#4C2A86]">
                      <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">OVO</span>
                    <span class="text-[10px] font-semibold text-[#8b5cf6] px-2 py-0.5 rounded-full bg-[#4C2A86]/10 method-fee-badge" data-method="ovo">
                      Biaya: Rp ${feeOvo.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[14px] font-bold">check</span>
                  </div>
                </label>

                <!-- Bank Transfer -->
                <label class="relative cursor-pointer group">
                  <input type="radio" name="withdrawal_method" value="bank" class="peer sr-only"/>
                  <div class="bg-surface-card p-3.5 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-1.5 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[22px]">account_balance</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">Bank Transfer</span>
                    <span class="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 method-fee-badge" data-method="bank">
                      Biaya: Rp ${feeBank.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[14px] font-bold">check</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Recipient Identifier Section -->
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-2">
              <label class="font-label-md text-xs font-bold text-text-heading" for="accountIdentifier">
                Nomor Handphone E-Wallet / Rekening Bank
              </label>

              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">phone_iphone</span>
                <input
                  id="accountIdentifier"
                  type="text"
                  placeholder="0812xxxxxxxx / Nomor Rekening"
                  value="${defaultPhone}"
                  required
                  class="w-full bg-surface-container-low rounded-2xl py-3.5 pl-11 pr-12 text-sm text-text-heading font-mono border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <button
                  type="button"
                  id="btnPasteAccount"
                  class="absolute right-2.5 p-2 text-outline hover:text-primary transition-colors"
                  title="Paste"
                >
                  <span class="material-symbols-outlined text-[20px]">content_paste</span>
                </button>
              </div>

              <p class="text-[11px] text-outline mt-0.5">Pastikan nomor aktif dan terdaftar sesuai akun e-wallet Anda.</p>
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
                  <span class="font-bold font-mono text-amber-500" id="summaryFee">Rp ${feeDana.toLocaleString('id-ID')}</span>
                </div>
                <div class="w-full h-px bg-surface-container my-0.5"></div>
                <div class="flex justify-between items-center text-sm font-extrabold text-text-heading">
                  <span>Total Diterima</span>
                  <span class="text-secondary font-mono text-base font-bold" id="summaryTotalReceive">Rp ${(Math.max(0, minWithdrawal - feeDana)).toLocaleString('id-ID')}</span>
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
              class="w-full bg-secondary text-white font-label-md font-bold text-sm rounded-full py-4 shadow-lg shadow-secondary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Lanjutkan Penarikan</span>
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
    const pasteBtn = container.querySelector('#btnPasteAccount');
    const quickAmountBtns = container.querySelectorAll('.btn-quick-amount');
    const methodRadios = container.querySelectorAll('input[name="withdrawal_method"]');

    // Helper untuk update live summary breakdown biaya
    const updateBreakdown = () => {
      const amount = Number(amountInput?.value) || 0;
      const selectedRadio = container.querySelector('input[name="withdrawal_method"]:checked');
      const method = selectedRadio ? selectedRadio.value : 'dana';
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
      amountInput.value = balance;
      updateBreakdown();
    });

    // Quick chips
    quickAmountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        amountInput.value = btn.getAttribute('data-amount');
        updateBreakdown();
      });
    });

    // Auto-update account placeholder & fee breakdown based on method
    methodRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const user = this._authService.getCurrentUser();
        if (e.target.value === 'bank') {
          accountInput.value = user?.accountNumber || '';
          accountInput.placeholder = 'Masukkan Nomor Rekening Bank';
        } else {
          accountInput.value = user?.phone || '';
          accountInput.placeholder = 'Nomor Handphone E-Wallet (0812xxxx)';
        }
        updateBreakdown();
      });
    });

    // Paste account
    pasteBtn?.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) accountInput.value = text;
        }
      } catch (err) {}
    });

    // Form submit -> Tampilkan Pop-Up Konfirmasi Penarikan (konfirmasi_penarikan_pop_up)
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const amount = Number(amountInput.value);
      const selectedRadio = container.querySelector('input[name="withdrawal_method"]:checked');
      const method = selectedRadio ? selectedRadio.value : 'dana';
      const account = accountInput.value.trim();

      const currentBalance = this._walletService.getBalance();
      const minWithdrawal = this._walletService.minWithdrawal;

      const strategy = this._strategyFactory.get(method);
      const methodLabel = strategy.getLabel();
      const fee = this._walletService.getFeeForMethod(method, amount);
      const totalReceive = Math.max(0, amount - fee);

      if (!account) {
        this._notification.error(method === 'bank'
          ? 'Harap masukkan nomor rekening bank tujuan pencairan.'
          : 'Harap masukkan nomor handphone / akun e-wallet tujuan pencairan.');
        accountInput?.focus();
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
                <span class="material-symbols-outlined text-[20px]">${method === 'bank' ? 'account_balance' : 'account_balance_wallet'}</span>
              </div>
              <div class="flex flex-col min-w-0 text-left">
                <span class="text-[10px] text-outline uppercase tracking-wider font-semibold">Tujuan Pencairan</span>
                <span class="text-xs font-bold text-text-heading truncate font-mono">${methodLabel} - ${account}</span>
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

          const user = this._authService.getCurrentUser();
          const res = await this._walletService.withdraw({
            amount,
            method,
            accountIdentifier: account,
            userId: user ? user.id : 'usr_guest'
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
        quickContainer.innerHTML = uniqueQuick.map(amt => `
          <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="${amt}">
            ${formatChip(amt)}
          </button>
        `).join('');

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
      ['dana', 'gopay', 'ovo', 'bank'].forEach(m => {
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
  }
}
