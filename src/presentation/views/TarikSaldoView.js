import { IComponent } from '../../core/interfaces/IComponent.js';
import { AppEvents } from '../../core/events/EventBus.js';
import { renderPaymentMethodIcon } from '../utils/PaymentMethodHelper.js';

/**
 * TarikSaldoView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman penarikan saldo ke e-wallet (DANA, GoPay, OVO, ShopeePay) atau transfer bank.
 * 
 * Aturan Bisnis:
 * 1. Jika saldo tersedia < nominal minimal penarikan admin, halaman otomatis terkunci dan tidak dapat melakukan penarikan.
 * 2. Metode pencairan dan nomor rekening/e-wallet disesuaikan otomatis dengan data profil dan metode lain terkunci.
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
    this._handleBalanceUpdate = null;
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
    const isLocked = balance < minWithdrawal;
    const remainingBalance = Math.max(0, minWithdrawal - balance);
    const progressPercent = minWithdrawal > 0 ? Math.min(100, Math.max(0, Math.round((balance / minWithdrawal) * 100))) : 0;

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
    const userReferredBy = (user?.referredBy || '').trim().toUpperCase();
    const refPercent = this._walletService.referralCutPercent;
    const initialReferralCut = (userReferredBy && refPercent > 0) ? Math.round(minWithdrawal * (refPercent / 100)) : 0;
    const currentReceive = Math.max(0, minWithdrawal - currentFee - initialReferralCut);

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
            <a href="#/riwayat?tab=penarikan" class="bg-surface-container-low text-primary px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 hover:bg-surface-container transition-colors" title="Lihat riwayat penarikan dana">
              <span class="material-symbols-outlined text-[16px]">history</span>
              <span>Riwayat</span>
            </a>
          </div>

          <!-- KARTU PERINGATAN KETIKA SALDO DI BAWAH BATAS MINIMAL ADMIN (TERKUNCI) -->
          ${
            isLocked
              ? `
            <div class="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-5 flex flex-col gap-3 shadow-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-rose-500 font-bold text-sm">
                  <span class="material-symbols-outlined text-[22px]">lock</span>
                  <span>Penarikan Saldo Terkunci</span>
                </div>
                <span class="text-[10px] font-bold text-rose-500 bg-rose-500/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Min. Rp ${minWithdrawal.toLocaleString('id-ID')}
                </span>
              </div>

              <p class="text-xs text-text-body leading-relaxed">
                Saldo Anda saat ini <strong class="text-rose-500 font-bold font-mono">Rp ${balance.toLocaleString('id-ID')}</strong>, belum memenuhi batas minimal penarikan yang ditetapkan admin sebesar <strong class="text-text-heading font-bold font-mono">Rp ${minWithdrawal.toLocaleString('id-ID')}</strong>.
              </p>

              <!-- Progress Bar Pengumpulan Saldo -->
              <div class="flex flex-col gap-1.5 mt-0.5">
                <div class="flex justify-between text-[11px] font-semibold">
                  <span class="text-text-body">Progres Pengumpulan Saldo</span>
                  <span class="text-rose-500 font-mono font-bold">${progressPercent}%</span>
                </div>
                <div class="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div class="h-full bg-rose-500 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                </div>
                <div class="flex justify-between items-center text-[10px] text-text-body mt-0.5">
                  <span>Rp ${balance.toLocaleString('id-ID')}</span>
                  <span class="text-rose-500 font-bold">Kurang Rp ${remainingBalance.toLocaleString('id-ID')} lagi</span>
                </div>
              </div>

              <div class="pt-1.5 flex items-center gap-2">
                <a
                  href="#/dashboard"
                  class="w-full bg-primary text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center shadow hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>Setor API Key & Tambah Saldo</span>
                </a>
              </div>
            </div>
          `
              : ''
          }

          <!-- Peringatan jika belum mengatur rekening/e-wallet di profil -->
          ${
            !resolved.isConfigured || !resolved.registeredAccount
              ? `
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 flex flex-col gap-3">
              <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <span class="material-symbols-outlined text-[22px]">error</span>
                <span>Rekening / E-Wallet Belum Diatur</span>
              </div>
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
          <form id="withdrawalForm" class="flex flex-col gap-4 ${isLocked ? 'pointer-events-none-disabled' : ''}">
            
            <!-- Amount Input Section -->
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-3 relative ${isLocked ? 'border-rose-500/20' : ''}">
              <div class="flex items-center justify-between">
                <label class="font-label-md text-xs font-bold text-text-heading" for="withdrawAmount">
                  Nominal Penarikan
                </label>
                ${
                  isLocked
                    ? `
                  <span class="text-[10px] font-bold text-rose-500 px-2 py-0.5 rounded-full bg-rose-500/10 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]">lock</span>
                    <span>Terkunci</span>
                  </span>
                `
                    : ''
                }
              </div>

              <div class="relative flex items-center">
                <span class="absolute left-4 text-lg font-bold ${isLocked ? 'text-outline' : 'text-text-heading'}">Rp</span>
                <input
                  id="withdrawAmount"
                  type="number"
                  readonly
                  inputmode="none"
                  placeholder="${minWithdrawal.toLocaleString('id-ID')}"
                  min="${minWithdrawal}"
                  step="1000"
                  value="${isLocked ? '' : minWithdrawal}"
                  ${isLocked ? 'disabled' : ''}
                  class="w-full rounded-2xl py-3.5 pl-12 pr-28 text-lg font-bold border font-mono transition-all cursor-default select-none ${
                    isLocked
                      ? 'bg-surface-container-low/50 text-outline border-surface-container cursor-not-allowed'
                      : 'bg-surface-container-low text-text-heading border-surface-container focus:outline-none'
                  }"
                />
                <button
                  type="button"
                  id="btnWithdrawAll"
                  ${isLocked ? 'disabled' : ''}
                  class="absolute right-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isLocked
                      ? 'bg-surface-container text-outline/50 cursor-not-allowed pointer-events-none'
                      : 'bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95'
                  }"
                >
                  Tarik Semua
                </button>
              </div>

              <!-- Quick Denomination Chips -->
              <div class="grid grid-cols-4 gap-2 mt-1" id="quickAmountsContainer">
                ${uniqueQuick
                  .map(
                    amt => {
                      const isDefaultSelected = !isLocked && amt === minWithdrawal;
                      return `
                  <button
                    type="button"
                    class="btn-quick-amount py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      isLocked
                        ? 'bg-surface-container-low/40 border-surface-container/60 text-outline/40 cursor-not-allowed pointer-events-none'
                        : isDefaultSelected
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-low border-surface-container text-text-heading hover:bg-primary-fixed'
                    }"
                    data-amount="${amt}"
                    ${isLocked ? 'disabled' : ''}
                  >
                    ${formatChip(amt)}
                  </button>
                `;
                    }
                  )
                  .join('')}
              </div>
              <p class="text-[11px] ${isLocked ? 'text-rose-500 font-medium' : 'text-outline'}" id="minWithdrawalNotice">
                ${
                  isLocked
                    ? `Penarikan terkunci: Saldo minimal penarikan adalah Rp ${minWithdrawal.toLocaleString('id-ID')}.`
                    : `Pilih nominal penarikan di atas atau tekan Tarik Semua (Batas minimal Rp ${minWithdrawal.toLocaleString('id-ID')}).`
                }
              </p>
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
                        <div class="relative ring-2 ring-primary border-2 border-primary bg-primary/5 rounded-2xl p-3.5 shadow-sm flex flex-col items-center justify-center gap-2 transition-all">
                          <input type="radio" name="withdrawal_method" value="${m.id}" checked class="sr-only"/>
                          <div class="w-10 h-10 rounded-2xl overflow-hidden shadow-xs flex items-center justify-center">
                            ${renderPaymentMethodIcon(m.label, 'w-10 h-10')}
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
                        <div class="relative bg-surface-container-low/50 rounded-2xl p-3.5 border border-surface-container/60 shadow-none flex flex-col items-center justify-center gap-2 opacity-40 pointer-events-none cursor-not-allowed filter grayscale-[40%] select-none" title="Metode ini terkunci. Rekening profil Anda terdaftar menggunakan ${resolved.label}.">
                          <input type="radio" name="withdrawal_method" value="${m.id}" disabled class="sr-only"/>
                          <div class="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center">
                            ${renderPaymentMethodIcon(m.label, 'w-10 h-10')}
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
                <div class="absolute left-3 w-6 h-6 shrink-0 rounded-lg overflow-hidden shadow-2xs pointer-events-none flex items-center justify-center">
                  ${renderPaymentMethodIcon(resolved.label, 'w-6 h-6')}
                </div>
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
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-3" id="breakdownCard">
              <h3 class="text-xs font-bold uppercase tracking-wider text-text-heading flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-primary">receipt_long</span>
                <span>Rincian Biaya Penarikan</span>
              </h3>
              <div class="flex flex-col gap-2 text-xs">
                <div class="flex justify-between items-center text-text-body">
                  <span>Nominal Penarikan</span>
                  <span class="font-bold font-mono text-text-heading" id="summaryAmount">Rp ${(isLocked ? 0 : minWithdrawal).toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between items-center text-text-body">
                  <span>Biaya Admin</span>
                  <span class="font-bold font-mono text-amber-500" id="summaryFee">Rp ${currentFee.toLocaleString('id-ID')}</span>
                </div>
                <!-- Potongan Kode Referral -->
                <div class="flex justify-between items-center text-text-body" id="summaryReferralRow">
                  <div class="flex items-center gap-1.5">
                    <span>Potongan Kode Referral</span>
                    <span class="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold ${userReferredBy ? '' : 'hidden'}" id="summaryReferralBadge">
                      ${userReferredBy ? `${userReferredBy} (${refPercent}%)` : ''}
                    </span>
                    <span class="text-[10px] text-outline italic ${userReferredBy ? 'hidden' : ''}" id="summaryReferralUnlinkedBadge">
                      (Belum ditautkan)
                    </span>
                  </div>
                  <span class="font-bold font-mono ${userReferredBy ? 'text-primary' : 'text-outline'}" id="summaryReferralCut">
                    ${userReferredBy ? `-Rp ${initialReferralCut.toLocaleString('id-ID')}` : 'Rp 0'}
                  </span>
                </div>
                <div class="w-full h-px bg-surface-container my-0.5"></div>
                <div class="flex justify-between items-center text-sm font-extrabold text-text-heading">
                  <span>Total Diterima</span>
                  <span class="${isLocked ? 'text-rose-500 font-sans text-xs' : 'text-secondary font-mono text-base'} font-bold flex items-center gap-1" id="summaryTotalReceive">
                    ${
                      isLocked
                        ? `<span class="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">cancel</span>
                            Tidak Valid
                           </span>`
                        : `Rp ${currentReceive.toLocaleString('id-ID')}`
                    }
                  </span>
                </div>
                <div class="flex justify-between items-center text-[11px] text-text-body pt-1 border-t border-surface-container/50">
                  <span class="text-outline">Total Potong Saldo</span>
                  <span class="font-bold ${isLocked ? 'text-rose-500' : 'text-primary'} font-mono" id="summaryTotalDeduction">Rp ${(isLocked ? 0 : minWithdrawal).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <!-- Status Keterikatan Kode Referral -->
              ${userReferredBy ? `
                <div class="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl p-2.5 px-3.5 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-[18px]">verified</span>
                    <p class="text-[11px] text-text-body">
                      Akun terikat ke kode: <strong class="text-primary font-mono font-bold">${userReferredBy}</strong> (Potongan ${refPercent}%)
                    </p>
                  </div>
                  <span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Aktif</span>
                </div>
              ` : `
                <div class="flex items-center justify-between bg-surface-container-low border border-surface-container rounded-2xl p-2.5 px-3.5 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-outline text-[18px]">link</span>
                    <p class="text-[11px] text-text-body">
                      Belum menautkan kode referral pengundang?
                    </p>
                  </div>
                  <a href="#/profil" class="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5">
                    <span>Tautkan di Profil</span>
                    <span class="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </a>
                </div>
              `}
              <div id="breakdownAlertContainer" class="${isLocked ? '' : 'hidden'}">
                ${
                  isLocked
                    ? `
                  <div class="text-[11px] text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-start gap-1.5 font-medium">
                    <span class="material-symbols-outlined text-[16px] shrink-0 text-rose-500 mt-0.5">error</span>
                    <span>Saldo belum mencapai batas minimal penarikan Rp ${minWithdrawal.toLocaleString('id-ID')}. Total diterima tidak valid karena saldo tidak mencukupi.</span>
                  </div>
                `
                    : ''
                }
              </div>
            </div>

            <!-- Submit Button (Dinamis: Terkunci jika saldo < minWithdrawal atau profil belum diatur) -->
            <button
              type="submit"
              id="btnSubmitWithdrawal"
              ${isLocked || !resolved.isConfigured || !resolved.registeredAccount ? 'disabled' : ''}
              class="w-full font-label-md font-bold text-sm rounded-full py-4 shadow-lg transition-all flex items-center justify-center gap-2 mt-2 ${
                isLocked
                  ? 'bg-surface-container-high/60 text-outline border border-surface-container cursor-not-allowed pointer-events-none select-none shadow-none opacity-70'
                  : (!resolved.isConfigured || !resolved.registeredAccount
                      ? 'bg-secondary/50 text-white cursor-not-allowed opacity-50'
                      : 'bg-secondary text-white shadow-secondary/25 hover:opacity-95 active:scale-[0.98]')
              }"
            >
              ${
                isLocked
                  ? `
                <span class="material-symbols-outlined text-[20px] text-rose-500">lock</span>
                <span>Penarikan Terkunci (Kurang Rp ${remainingBalance.toLocaleString('id-ID')})</span>
              `
                  : (!resolved.isConfigured || !resolved.registeredAccount
                      ? `<span>Lengkapi Rekening di Profil Terlebih Dahulu</span>`
                      : `
                <span>Lanjutkan Penarikan</span>
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              `)
              }
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

    // Auto-check jika pengguna memiliki referred_by di auth user_metadata yang belum tersinkron ke session lokal
    const initialUser = this._authService.getCurrentUser();
    if (initialUser && !initialUser.referredBy) {
      import('../../infrastructure/supabase/supabaseClient.js').then(async ({ supabase, isSupabaseConfigured }) => {
        if (isSupabaseConfigured && isSupabaseConfigured()) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            const metaRef = authData?.user?.user_metadata?.referred_by || authData?.user?.user_metadata?.referredBy;
            if (metaRef) {
              const cleanRef = String(metaRef).trim().toUpperCase();
              initialUser.referredBy = cleanRef;
              await this._authService.updateProfile({ referredBy: cleanRef });
              updateBreakdown();
            }
          } catch (_) {}
        }
      }).catch(() => {});
    }

    // Helper untuk update live summary breakdown biaya
    const updateBreakdown = () => {
      const amount = Number(amountInput?.value) || 0;
      const currentBalance = this._walletService.getBalance();
      const minWithdrawal = this._walletService.minWithdrawal;
      const resolved = getCurrentResolved();
      const method = resolved.method;
      const currentUser = this._authService.getCurrentUser();
      const userReferredBy = (currentUser?.referredBy || '').trim().toUpperCase();
      const refPercent = this._walletService.referralCutPercent;
      const fee = this._walletService.getFeeForMethod(method, amount);
      const referralCut = (userReferredBy && refPercent > 0) ? Math.round(amount * (refPercent / 100)) : 0;
      const totalReceive = Math.max(0, amount - fee - referralCut);

      const summaryAmount = container.querySelector('#summaryAmount');
      const summaryFee = container.querySelector('#summaryFee');
      const summaryReferralRow = container.querySelector('#summaryReferralRow');
      const summaryReferralCut = container.querySelector('#summaryReferralCut');
      const summaryReferralBadge = container.querySelector('#summaryReferralBadge');
      const summaryReferralUnlinkedBadge = container.querySelector('#summaryReferralUnlinkedBadge');
      const summaryTotal = container.querySelector('#summaryTotalDeduction');
      const summaryNet = container.querySelector('#summaryTotalReceive');
      const breakdownAlertContainer = container.querySelector('#breakdownAlertContainer');
      const submitBtn = container.querySelector('#btnSubmitWithdrawal');

      if (summaryAmount) summaryAmount.textContent = `Rp ${amount.toLocaleString('id-ID')}`;
      if (summaryFee) summaryFee.textContent = `Rp ${fee.toLocaleString('id-ID')}`;

      if (userReferredBy && refPercent > 0) {
        if (summaryReferralBadge) {
          summaryReferralBadge.textContent = `${userReferredBy} (${refPercent}%)`;
          summaryReferralBadge.classList.remove('hidden');
        }
        if (summaryReferralUnlinkedBadge) {
          summaryReferralUnlinkedBadge.classList.add('hidden');
        }
        if (summaryReferralCut) {
          summaryReferralCut.textContent = `-Rp ${referralCut.toLocaleString('id-ID')}`;
          summaryReferralCut.className = 'font-bold font-mono text-primary';
        }
      } else {
        if (summaryReferralBadge) {
          summaryReferralBadge.classList.add('hidden');
        }
        if (summaryReferralUnlinkedBadge) {
          summaryReferralUnlinkedBadge.classList.remove('hidden');
        }
        if (summaryReferralCut) {
          summaryReferralCut.textContent = 'Rp 0';
          summaryReferralCut.className = 'font-bold font-mono text-outline';
        }
      }

      // Validasi kesesuaian saldo dengan nominal yang ingin ditarik
      const isExcessive = amount > currentBalance;
      const isBelowMin = amount < minWithdrawal;
      const isLocked = currentBalance < minWithdrawal;
      const isInvalid = isExcessive || isBelowMin || isLocked || amount <= 0;

      if (isInvalid) {
        // Tampilkan status "Tidak Valid" pada Total Diterima
        if (summaryNet) {
          summaryNet.className = 'font-bold flex items-center gap-1';
          summaryNet.innerHTML = `
            <span class="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">cancel</span>
              Tidak Valid
            </span>
          `;
        }

        if (summaryTotal) {
          summaryTotal.className = 'font-bold text-rose-500 font-mono flex items-center gap-1';
          summaryTotal.innerHTML = `<span class="line-through opacity-70">Rp ${amount.toLocaleString('id-ID')}</span> <span class="text-[10px] font-sans font-semibold">(Saldo Kurang)</span>`;
        }

        if (breakdownAlertContainer) {
          breakdownAlertContainer.classList.remove('hidden');
          const reasonMsg = isLocked
            ? `Saldo Anda (Rp ${currentBalance.toLocaleString('id-ID')}) belum mencapai batas minimal penarikan Rp ${minWithdrawal.toLocaleString('id-ID')}. Total diterima tidak valid.`
            : (isExcessive
              ? `Saldo Anda (Rp ${currentBalance.toLocaleString('id-ID')}) tidak mencukupi untuk menarik Rp ${amount.toLocaleString('id-ID')}. Total diterima tidak valid karena saldo yang ingin ditarik tidak sesuai dengan saldo yang Anda miliki.`
              : `Nominal penarikan (Rp ${amount.toLocaleString('id-ID')}) belum memenuhi batas minimal penarikan Rp ${minWithdrawal.toLocaleString('id-ID')}.`);

          breakdownAlertContainer.innerHTML = `
            <div class="text-[11px] text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 flex items-start gap-1.5 font-medium">
              <span class="material-symbols-outlined text-[16px] shrink-0 text-rose-500 mt-0.5">error</span>
              <span>${reasonMsg}</span>
            </div>
          `;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.className = 'w-full font-label-md font-bold text-sm rounded-full py-4 shadow-none transition-all flex items-center justify-center gap-2 mt-2 bg-surface-container-high/60 text-outline border border-surface-container cursor-not-allowed pointer-events-none select-none opacity-70';
          const btnLabel = isLocked
            ? `Penarikan Terkunci (Kurang Rp ${(minWithdrawal - currentBalance).toLocaleString('id-ID')})`
            : (isExcessive
              ? `Saldo Tidak Sesuai (Kurang Rp ${(amount - currentBalance).toLocaleString('id-ID')})`
              : 'Nominal Tidak Memenuhi Syarat');
          submitBtn.innerHTML = `
            <span class="material-symbols-outlined text-[18px] text-rose-500">block</span>
            <span>${btnLabel}</span>
          `;
        }
      } else {
        // Saldo valid dan sesuai
        if (summaryNet) {
          summaryNet.className = 'text-secondary font-mono text-base font-bold flex items-center gap-1';
          summaryNet.textContent = `Rp ${totalReceive.toLocaleString('id-ID')}`;
        }

        if (summaryTotal) {
          summaryTotal.className = 'font-bold text-primary font-mono';
          summaryTotal.textContent = `Rp ${amount.toLocaleString('id-ID')}`;
        }

        if (breakdownAlertContainer) {
          breakdownAlertContainer.classList.add('hidden');
          breakdownAlertContainer.innerHTML = '';
        }

        if (submitBtn) {
          if (!resolved.isConfigured || !resolved.registeredAccount) {
            submitBtn.disabled = true;
            submitBtn.className = 'w-full font-label-md font-bold text-sm rounded-full py-4 shadow-lg transition-all flex items-center justify-center gap-2 mt-2 bg-secondary/50 text-white cursor-not-allowed opacity-50';
            submitBtn.innerHTML = '<span>Lengkapi Rekening di Profil Terlebih Dahulu</span>';
          } else {
            submitBtn.disabled = false;
            submitBtn.className = 'w-full font-label-md font-bold text-sm rounded-full py-4 shadow-lg transition-all flex items-center justify-center gap-2 mt-2 bg-secondary text-white shadow-secondary/25 hover:opacity-95 active:scale-[0.98]';
            submitBtn.innerHTML = `
              <span>Lanjutkan Penarikan</span>
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            `;
          }
        }
      }
    };

    // Panggil updateBreakdown saat inisialisasi untuk sinkronisasi tampilan awal
    updateBreakdown();

    // Kunci pengetikan manual agar user hanya memilih melalui tombol chip atau Tarik Semua
    amountInput?.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') {
        e.preventDefault();
      }
    });
    amountInput?.addEventListener('paste', (e) => {
      e.preventDefault();
    });

    // Helper untuk update styling chip aktif
    const highlightChip = (amount) => {
      quickAmountBtns.forEach(b => {
        const chipAmount = Number(b.getAttribute('data-amount'));
        if (chipAmount === Number(amount)) {
          b.classList.remove('bg-surface-container-low', 'border-surface-container', 'text-text-heading');
          b.classList.add('bg-primary', 'text-white', 'border-primary', 'shadow-xs');
        } else {
          b.classList.remove('bg-primary', 'text-white', 'border-primary', 'shadow-xs');
          b.classList.add('bg-surface-container-low', 'border-surface-container', 'text-text-heading');
        }
      });
    };

    // Listen amount input change
    amountInput?.addEventListener('input', updateBreakdown);

    // Tarik Semua
    withdrawAllBtn?.addEventListener('click', () => {
      const balance = this._walletService.getBalance();
      const minWithdrawal = this._walletService.minWithdrawal;
      if (balance < minWithdrawal) {
        this._notification.warning(`Saldo Anda (Rp ${balance.toLocaleString('id-ID')}) belum mencapai batas minimal penarikan Rp ${minWithdrawal.toLocaleString('id-ID')}.`);
        return;
      }
      if (amountInput) {
        amountInput.value = balance;
        highlightChip(balance);
        updateBreakdown();
      }
    });

    // Quick chips
    quickAmountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const balance = this._walletService.getBalance();
        const minWithdrawal = this._walletService.minWithdrawal;
        if (balance < minWithdrawal) {
          this._notification.warning(`Penarikan terkunci. Batas minimal penarikan adalah Rp ${minWithdrawal.toLocaleString('id-ID')}.`);
          return;
        }
        if (amountInput) {
          const chosen = btn.getAttribute('data-amount');
          amountInput.value = chosen;
          highlightChip(chosen);
          updateBreakdown();
        }
      });
    });

    // Form submit -> Tampilkan Pop-Up Konfirmasi Penarikan (konfirmasi_penarikan_pop_up)
    form?.addEventListener('submit', (e) => {
      e.preventDefault();

      const currentBalance = this._walletService.getBalance();
      const minWithdrawal = this._walletService.minWithdrawal;

      // VALIDASI UTAMA: Saldo di bawah batas minimal penarikan admin
      if (currentBalance < minWithdrawal) {
        const remaining = minWithdrawal - currentBalance;
        this._notification.error(
          `Penarikan terkunci! Saldo Anda (Rp ${currentBalance.toLocaleString('id-ID')}) belum mencapai batas minimal Rp ${minWithdrawal.toLocaleString('id-ID')} (kurang Rp ${remaining.toLocaleString('id-ID')}).`
        );
        return;
      }

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

      const methodLabel = resolved.label;
      const userReferredBy = (user?.referredBy || '').trim().toUpperCase();
      const refPercent = this._walletService.referralCutPercent;
      const fee = this._walletService.getFeeForMethod(method, amount);
      const referralCut = (userReferredBy && refPercent > 0) ? Math.round(amount * (refPercent / 100)) : 0;
      const totalReceive = Math.max(0, amount - fee - referralCut);

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
              ${(userReferredBy && refPercent > 0) ? `
                <div class="flex justify-between items-center text-xs">
                  <span class="text-text-body font-medium">Potongan Kode Referral (${userReferredBy} - ${refPercent}%)</span>
                  <span class="font-semibold text-primary font-mono">-Rp ${referralCut.toLocaleString('id-ID')}</span>
                </div>
              ` : ''}
              <div class="h-[1px] w-full bg-outline-variant/30 my-1"></div>
              <div class="flex justify-between items-center bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                <span class="text-xs text-primary font-bold">Total Diterima</span>
                <span class="font-headline-md text-base font-extrabold text-primary font-mono">Rp ${totalReceive.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div class="bg-surface-container rounded-2xl p-3 flex items-center gap-3 border border-surface-container-high">
              <div class="w-10 h-10 rounded-2xl overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                ${renderPaymentMethodIcon(resolved.label, 'w-10 h-10')}
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
            userId: currentUser ? currentUser.id : 'usr_guest',
            userName: currentUser ? currentUser.name : (resolved.accountHolder || 'Pengguna'),
            userEmail: currentUser ? currentUser.email : '',
            userPhone: currentUser ? currentUser.phone : account,
            accountHolder: resolved.accountHolder || (currentUser ? currentUser.name : ''),
            referredBy: userReferredBy,
            referralDeduction: referralCut
          });

          // Tutup popup konfirmasi
          close();

          if (res.success) {
            this._notification.showModal({
              title: 'Permintaan Penarikan Berhasil Diajukan!',
              message: '<strong class="text-amber-500 font-bold">Menunggu persetujuan admin</strong>',
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
                  ${userReferredBy ? `
                    <div class="flex justify-between items-center">
                      <span class="text-text-body">Potongan Referral (${userReferredBy})</span>
                      <strong class="font-mono text-primary font-bold">-Rp ${referralCut.toLocaleString('id-ID')}</strong>
                    </div>
                  ` : ''}
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

    // Reaktif re-render saat saldo bertambah/berkurang (misal deposit diverifikasi admin)
    const handleBalanceUpdate = () => {
      const viewRoot = document.getElementById('app-view-root');
      if (viewRoot && window.location.hash.includes('/tarik-saldo')) {
        viewRoot.innerHTML = this.render();
        this.mount(viewRoot);
      }
    };
    this._handleBalanceUpdate = handleBalanceUpdate;
    if (this._eventBus) {
      this._eventBus.on(AppEvents.BALANCE_UPDATED, handleBalanceUpdate);
    }

    // Real-time synchronization saat admin mengubah batas minimal / biaya di tab lain
    const handleConfigSync = () => {
      const currentMin = this._walletService.minWithdrawal;
      const currentBalance = this._walletService.getBalance();
      const isLockedNow = currentBalance < currentMin;

      // Jika status lock berubah atau config berubah, re-render tampilan agar lock state sinkron
      const viewRoot = document.getElementById('app-view-root');
      if (viewRoot && window.location.hash.includes('/tarik-saldo')) {
        viewRoot.innerHTML = this.render();
        this.mount(viewRoot);
        return;
      }

      if (amountInput && !isLockedNow) {
        amountInput.min = currentMin;
        if (Number(amountInput.value) < currentMin) {
          amountInput.value = currentMin;
        }
      }

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
    if (this._handleBalanceUpdate && this._eventBus) {
      this._eventBus.off(AppEvents.BALANCE_UPDATED, this._handleBalanceUpdate);
      this._handleBalanceUpdate = null;
    }
  }
}
