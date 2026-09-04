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
    const user = this._authService.getCurrentUser();
    const defaultPhone = user?.phone || '081234567890';
    const defaultBankAcc = user?.accountNumber || '5410987654';

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
                  placeholder="0"
                  min="15000"
                  step="5000"
                  value="${Math.min(balance, 50000)}"
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
              <div class="grid grid-cols-4 gap-2 mt-1">
                <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="20000">
                  20 rb
                </button>
                <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="50000">
                  50 rb
                </button>
                <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="100000">
                  100 rb
                </button>
                <button type="button" class="btn-quick-amount py-1.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-text-heading hover:bg-primary-fixed transition-colors" data-amount="250000">
                  250 rb
                </button>
              </div>
              <p class="text-[11px] text-outline">Batas minimal penarikan adalah Rp 15.000.</p>
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
                  <div class="bg-surface-card p-4 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-2 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">DANA</span>
                  </div>
                  <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[14px] font-bold">check</span>
                  </div>
                </label>

                <!-- GoPay -->
                <label class="relative cursor-pointer group">
                  <input type="radio" name="withdrawal_method" value="gopay" class="peer sr-only"/>
                  <div class="bg-surface-card p-4 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-2 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-10 h-10 rounded-full bg-[#00AED6]/10 flex items-center justify-center text-[#00AED6]">
                      <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">GoPay</span>
                  </div>
                  <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[14px] font-bold">check</span>
                  </div>
                </label>

                <!-- OVO -->
                <label class="relative cursor-pointer group">
                  <input type="radio" name="withdrawal_method" value="ovo" class="peer sr-only"/>
                  <div class="bg-surface-card p-4 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-2 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-10 h-10 rounded-full bg-[#4C2A86]/10 flex items-center justify-center text-[#4C2A86]">
                      <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">OVO</span>
                  </div>
                  <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-[14px] font-bold">check</span>
                  </div>
                </label>

                <!-- Bank Transfer -->
                <label class="relative cursor-pointer group">
                  <input type="radio" name="withdrawal_method" value="bank" class="peer sr-only"/>
                  <div class="bg-surface-card p-4 rounded-2xl border border-surface-container shadow-sm flex flex-col items-center justify-center gap-2 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20 peer-checked:bg-primary-fixed/20 transition-all hover:bg-surface-container-low">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[24px]">account_balance</span>
                    </div>
                    <span class="font-label-md text-xs font-bold text-text-heading">Bank Transfer</span>
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

    // Tarik Semua
    withdrawAllBtn?.addEventListener('click', () => {
      amountInput.value = this._walletService.getBalance();
    });

    // Quick chips
    quickAmountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        amountInput.value = btn.getAttribute('data-amount');
      });
    });

    // Auto-update account placeholder based on method
    methodRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const user = this._authService.getCurrentUser();
        if (e.target.value === 'bank') {
          accountInput.value = user?.accountNumber || '5410987654';
          accountInput.placeholder = 'Nomor Rekening Bank BCA';
        } else {
          accountInput.value = user?.phone || '081234567890';
          accountInput.placeholder = 'Nomor Handphone E-Wallet (0812xxxx)';
        }
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

      if (amount <= 0 || isNaN(amount)) {
        this._notification.error('Nominal penarikan harus valid.');
        return;
      }
      if (amount < 15000) {
        this._notification.error('Batas minimal penarikan adalah Rp 15.000.');
        return;
      }
      if (amount > currentBalance) {
        this._notification.error(`Saldo tidak mencukupi (Saldo Anda: Rp ${currentBalance.toLocaleString('id-ID')}).`);
        return;
      }

      const strategy = this._strategyFactory.get(method);
      const methodLabel = strategy.getLabel();
      const fee = strategy.calculateFee(amount);
      const totalReceive = amount - fee;

      // Render Modal Konfirmasi Penarikan Sesuai Mockup Desain (konfirmasi_penarikan_pop_up)
      this._notification.showModal({
        title: 'Konfirmasi Penarikan',
        message: 'Periksa kembali rincian penarikan saldo Anda sebelum memproses:',
        html: `
          <div class="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-2.5 text-xs text-text-heading border border-surface-container">
            <div class="flex justify-between">
              <span class="text-text-body">Metode Pencairan</span>
              <strong class="text-primary font-bold">${methodLabel}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-text-body">Nomor Tujuan</span>
              <strong class="font-mono font-bold">${account}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-text-body">Nominal Penarikan</span>
              <strong class="font-bold">Rp ${amount.toLocaleString('id-ID')}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-text-body">Biaya Admin (Promo)</span>
              <strong class="text-secondary font-bold">Rp 0 (GRATIS)</strong>
            </div>
            <div class="h-[1px] bg-outline-variant/30 my-1"></div>
            <div class="flex justify-between text-sm font-extrabold">
              <span class="text-text-heading">Total Diterima</span>
              <strong class="text-secondary">Rp ${totalReceive.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        `,
        type: 'confirm',
        confirmText: 'Proses Pencairan Sekarang',
        cancelText: 'Periksa Kembali',
        showCancel: true,
        onConfirm: async () => {
          const user = this._authService.getCurrentUser();
          const res = await this._walletService.withdraw({
            amount,
            method,
            accountIdentifier: account,
            userId: user ? user.id : 'usr_guest'
          });

          if (res.success) {
            this._notification.showModal({
              title: 'Penarikan Berhasil Diproses!',
              message: `Dana sebesar <strong class="text-secondary font-bold">Rp ${amount.toLocaleString('id-ID')}</strong> sedang dikirim ke ${methodLabel} (${account}). Perkiraan dana masuk: 1-5 menit.`,
              type: 'success',
              confirmText: 'Lihat Riwayat Transaksi',
              onConfirm: () => {
                window.location.hash = '/riwayat';
              }
            });
          } else {
            this._notification.error(res.message || 'Gagal memproses penarikan.');
          }
        }
      });
    });
  }
}
