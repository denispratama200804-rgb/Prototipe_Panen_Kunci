/**
 * RewardCatalogModal
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan modal interaktif katalog penukaran saldo aktif menjadi hadiah digital:
 * Google Family Invitation Link, YouTube Premium, Voucher API Key, dsb.
 */

export const REWARD_ITEMS = [
  {
    id: 'google_family_2tb',
    title: 'Google Family One 2TB',
    subtitle: 'Link Undangan Google Family Resmi',
    category: 'family',
    cost: 15000,
    badge: 'Paling Populer',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    iconType: 'google',
    description: 'Akses penyimpanan cloud bersama 2TB (Google Drive, Gmail & Google Photos Original) plus benefit Google One & Gemini Advanced.',
    inputLabel: 'Alamat Email Gmail Penerima',
    inputPlaceholder: 'contoh: namaanda@gmail.com',
    inputType: 'email'
  },
  {
    id: 'youtube_premium_family',
    title: 'YouTube Premium Family Slot',
    subtitle: 'Undangan Grup YouTube Family (1 Bulan)',
    category: 'entertainment',
    cost: 12000,
    badge: 'Bebas Iklan',
    badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    iconType: 'youtube',
    description: 'Nonton video YouTube sepenuhnya bebas gangguan iklan, download offline, dan YouTube Music background playback di akun Google Anda.',
    inputLabel: 'Alamat Email Google Penerima',
    inputPlaceholder: 'contoh: namaanda@gmail.com',
    inputType: 'email'
  },
  {
    id: 'api_credit_voucher_5',
    title: 'Kie.ai & OpenAI API Credit ($5)',
    subtitle: 'Voucher Saldo API Key Developer',
    category: 'developer',
    cost: 20000,
    badge: 'Developer',
    badgeClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    iconType: 'code',
    description: 'Kode voucher saldo kredit API Key senilai $5 untuk melanjutkan pembuatan dan running bot panen, skrip, dan otomasi AI Anda.',
    inputLabel: 'Email / Catatan Pengiriman Akun',
    inputPlaceholder: 'contoh: dev@domain.com atau ID Akun',
    inputType: 'text'
  },
  {
    id: 'spotify_family_slot',
    title: 'Spotify Premium Family Plan',
    subtitle: 'Slot Member Family (1 Bulan)',
    category: 'entertainment',
    cost: 10000,
    badge: 'Hemat',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    iconType: 'music',
    description: 'Streaming puluhan juta lagu dan podcast kualitas audio lossless tanpa jeda iklan langsung di akun Spotify pribadi Anda.',
    inputLabel: 'Email Akun Spotify Anda',
    inputPlaceholder: 'contoh: user@spotify.com',
    inputType: 'email'
  },
  {
    id: 'canva_pro_team',
    title: 'Canva Pro Team Invite',
    subtitle: 'Akses Fitur Desain Premium',
    category: 'design',
    cost: 8000,
    badge: 'Desain',
    badgeClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    iconType: 'palette',
    description: 'Akses penuh ke jutaan template premium Canva Pro, penghapus background instan, dan brand kit tanpa watermark.',
    inputLabel: 'Alamat Email Akun Canva',
    inputPlaceholder: 'contoh: desainer@gmail.com',
    inputType: 'email'
  }
];

export class RewardCatalogModal {
  /**
   * Menampilkan modal katalog penukaran hadiah
   * @param {Object} options
   * @param {Object} options.user
   * @param {import('../../infrastructure/services/WalletService.js').WalletService} options.walletService
   * @param {import('../../infrastructure/services/NotificationService.js').NotificationService} options.notificationService
   * @param {string} [options.preselectedId] ID item yang ingin langsung dipilih
   * @param {Function} [options.onSuccess] Callback saat penukaran berhasil
   */
  static show(options = {}) {
    const {
      user = null,
      walletService,
      notificationService,
      preselectedId = null,
      onSuccess = null
    } = options;

    if (!walletService) return;

    // Bersihkan modal lama jika ada
    const existing = document.getElementById('panenkunci-reward-modal-root');
    if (existing) existing.remove();

    let currentBalance = walletService.getBalance();
    let selectedReward = REWARD_ITEMS.find(r => r.id === preselectedId) || REWARD_ITEMS[0];
    let isProcessing = false;

    const modalWrapper = document.createElement('div');
    modalWrapper.id = 'panenkunci-reward-modal-root';
    modalWrapper.className = 'fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 transition-all duration-300 opacity-0 overflow-y-auto';

    const renderIconHtml = (type) => {
      switch (type) {
        case 'google':
          return `
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          `;
        case 'youtube':
          return `<span class="material-symbols-outlined text-[20px] text-rose-500">smart_display</span>`;
        case 'code':
          return `<span class="material-symbols-outlined text-[20px] text-indigo-500">terminal</span>`;
        case 'music':
          return `<span class="material-symbols-outlined text-[20px] text-emerald-500">headphones</span>`;
        case 'palette':
          return `<span class="material-symbols-outlined text-[20px] text-cyan-500">draw</span>`;
        default:
          return `<span class="material-symbols-outlined text-[20px] text-amber-500">card_giftcard</span>`;
      }
    };

    modalWrapper.innerHTML = `
      <!-- Backdrop -->
      <div class="reward-backdrop fixed inset-0 bg-on-surface/60 backdrop-blur-sm transition-opacity duration-300"></div>

      <!-- Card Container -->
      <div class="reward-card relative bg-surface-card w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 transform scale-95 transition-transform duration-300 z-10 border border-surface-container max-h-[92vh] overflow-y-auto">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-surface-container">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
              <span class="material-symbols-outlined text-[22px]">redeem</span>
            </div>
            <div>
              <h3 class="font-headline-md text-base font-bold text-text-heading leading-tight flex items-center gap-1.5">
                <span>Katalog Penukaran Hadiah</span>
              </h3>
              <p class="text-xs text-text-body">Tukarkan saldo aktif Anda langsung tanpa minimal penarikan</p>
            </div>
          </div>
          <button type="button" class="reward-close-btn text-outline hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors" aria-label="Tutup">
            <span class="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <!-- Saldo Aktif Summary Box -->
        <div class="bg-gradient-to-r from-amber-500/10 via-surface-container-low to-primary/10 border border-amber-500/25 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] text-text-body uppercase font-bold tracking-wider">Saldo Aktif Tersedia</span>
              <span class="font-mono text-sm sm:text-base font-black text-text-heading" id="modalActiveBalance">
                Rp ${currentBalance.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            <span>Bebas Fee Admin</span>
          </span>
        </div>

        <!-- Main Form / Catalog Area -->
        <div id="rewardCatalogMainView" class="flex flex-col gap-4">
          <!-- Selection Title -->
          <div class="flex flex-col gap-1">
            <span class="text-xs font-bold text-text-heading">1. Pilih Produk / Hadiah Digital:</span>
            <p class="text-[11px] text-text-body">Pilih paket yang ingin ditukar dengan memotong saldo aktif Anda.</p>
          </div>

          <!-- Product Radio Cards -->
          <div class="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1" id="rewardItemsList">
            ${REWARD_ITEMS.map((item) => {
              const isSelected = item.id === selectedReward.id;
              const isAffordable = currentBalance >= item.cost;
              return `
                <div
                  data-reward-id="${item.id}"
                  class="reward-item-card cursor-pointer rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container border-surface-container'
                  }"
                >
                  <div class="flex items-start gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-surface-card border border-surface-container shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                      ${renderIconHtml(item.iconType)}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="font-bold text-xs text-text-heading truncate">${item.title}</span>
                        ${item.badge ? `<span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${item.badgeClass}">${item.badge}</span>` : ''}
                      </div>
                      <span class="text-[11px] text-text-body leading-snug line-clamp-2 mt-0.5">${item.description}</span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end shrink-0 pl-1">
                    <span class="font-mono text-xs font-black ${isAffordable ? 'text-primary' : 'text-rose-500'}">
                      Rp ${item.cost.toLocaleString('id-ID')}
                    </span>
                    <span class="text-[10px] ${isAffordable ? 'text-secondary font-semibold' : 'text-rose-500 font-medium'} mt-0.5">
                      ${isAffordable ? 'Saldo Cukup' : 'Saldo Kurang'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Selected Item Detail & Target Account Input -->
          <div class="bg-surface-container-low rounded-2xl p-4 border border-surface-container flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-bold text-text-heading">2. Masukkan Informasi Akun Penerima:</span>
              <p class="text-[11px] text-text-body" id="rewardInputHelper">
                Link undangan atau voucher akan dikaitkan langsung ke akun ini.
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-text-body" id="rewardInputLabel">
                ${selectedReward.inputLabel}
              </label>
              <div class="flex items-center bg-surface-card rounded-xl border border-surface-container focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all p-1 shadow-xs">
                <div class="pl-2.5 pr-1 text-outline flex items-center pointer-events-none">
                  <span class="material-symbols-outlined text-[17px] text-primary">mail</span>
                </div>
                <input
                  type="${selectedReward.inputType || 'text'}"
                  id="inputTargetAccount"
                  value="${(user && user.email) ? user.email : ''}"
                  placeholder="${selectedReward.inputPlaceholder}"
                  class="flex-1 text-xs font-semibold py-2 bg-transparent text-text-heading placeholder:text-outline/50 focus:outline-none min-w-0"
                />
              </div>
            </div>

            <!-- Calculation Box -->
            <div class="pt-2 border-t border-dashed border-surface-container flex flex-col gap-1.5 text-xs">
              <div class="flex items-center justify-between text-text-body">
                <span>Biaya Penukaran Saldo</span>
                <span class="font-mono font-bold text-text-heading" id="calcRewardCost">
                  Rp ${selectedReward.cost.toLocaleString('id-ID')}
                </span>
              </div>
              <div class="flex items-center justify-between text-text-body">
                <span>Sisa Saldo Setelah Penukaran</span>
                <span class="font-mono font-bold" id="calcRemainingBalance">
                  ${(() => {
                    const rem = currentBalance - selectedReward.cost;
                    return rem >= 0
                      ? `<span class="text-secondary">Rp ${rem.toLocaleString('id-ID')}</span>`
                      : `<span class="text-rose-500">Kurang Rp ${Math.abs(rem).toLocaleString('id-ID')}</span>`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex flex-col gap-2 pt-1">
            <button
              type="button"
              id="btnConfirmRedeem"
              class="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              ${currentBalance < selectedReward.cost ? 'disabled' : ''}
            >
              <span class="material-symbols-outlined text-[18px]">verified</span>
              <span id="btnRedeemText">
                ${currentBalance >= selectedReward.cost ? `Tukarkan Saldo (Rp ${selectedReward.cost.toLocaleString('id-ID')})` : 'Saldo Aktif Tidak Mencukupi'}
              </span>
            </button>
            <p class="text-[10px] text-center text-text-body">
              Penukaran hadiah bersifat final dan saldo aktif Anda akan dipotong otomatis.
            </p>
          </div>
        </div>

        <!-- Success Result View (Hidden Initially) -->
        <div id="rewardSuccessView" class="hidden flex flex-col items-center text-center gap-4 py-2">
          <div class="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30 shadow-inner mt-2">
            <span class="material-symbols-outlined text-[36px]">check_circle</span>
          </div>

          <div class="flex flex-col items-center gap-1">
            <span class="text-xs font-bold text-secondary uppercase tracking-widest">Penukaran Berhasil</span>
            <h4 class="font-headline-md text-base font-bold text-text-heading" id="successRewardTitle">
              Google Family One 2TB
            </h4>
            <p class="text-xs text-text-body max-w-xs mt-1" id="successRewardMsg">
              Selamat! Saldo aktif Anda berhasil ditukarkan. Gunakan link atau kode di bawah untuk mengaktifkan hadiah Anda:
            </p>
          </div>

          <!-- Code / Link Box -->
          <div class="w-full bg-surface-container-low rounded-2xl p-4 border border-surface-container flex flex-col gap-2.5">
            <span class="text-[10px] font-bold text-text-body uppercase tracking-wider text-left">
              Link Undangan / Kode Klaim Resmi:
            </span>
            <div class="flex items-center gap-2 bg-surface-card p-2 rounded-xl border border-surface-container">
              <input
                type="text"
                id="inputSuccessLink"
                readonly
                class="flex-1 font-mono text-xs font-bold bg-transparent text-primary focus:outline-none truncate"
              />
              <button
                type="button"
                id="btnCopyInviteLink"
                class="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center gap-1 hover:bg-primary-hover active:scale-[0.98] transition-all shrink-0 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[14px]">content_copy</span>
                <span id="btnCopyText">Salin</span>
              </button>
            </div>
            <p class="text-[11px] text-text-body text-left leading-relaxed">
              Buka link di atas di browser Anda dan terima undangan keluarga Google menggunakan akun Gmail yang didaftarkan.
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="w-full flex flex-col sm:flex-row items-center gap-2 pt-2">
            <a
              id="btnOpenInviteUrl"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm text-decoration-none"
            >
              <span>Buka Link Undangan</span>
              <span class="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
            <button
              type="button"
              id="btnCloseSuccessModal"
              class="w-full py-3 px-4 rounded-xl font-bold text-xs bg-surface-container text-text-heading hover:bg-surface-container-high active:scale-[0.98] transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modalWrapper);

    // Elements
    const card = modalWrapper.querySelector('.reward-card');
    const closeBtn = modalWrapper.querySelector('.reward-close-btn');
    const backdrop = modalWrapper.querySelector('.reward-backdrop');
    const rewardItemsList = modalWrapper.querySelector('#rewardItemsList');
    const inputTargetAccount = modalWrapper.querySelector('#inputTargetAccount');
    const rewardInputLabel = modalWrapper.querySelector('#rewardInputLabel');
    const rewardInputHelper = modalWrapper.querySelector('#rewardInputHelper');
    const calcRewardCost = modalWrapper.querySelector('#calcRewardCost');
    const calcRemainingBalance = modalWrapper.querySelector('#calcRemainingBalance');
    const btnConfirmRedeem = modalWrapper.querySelector('#btnConfirmRedeem');
    const btnRedeemText = modalWrapper.querySelector('#btnRedeemText');

    // Success elements
    const mainView = modalWrapper.querySelector('#rewardCatalogMainView');
    const successView = modalWrapper.querySelector('#rewardSuccessView');
    const successRewardTitle = modalWrapper.querySelector('#successRewardTitle');
    const successRewardMsg = modalWrapper.querySelector('#successRewardMsg');
    const inputSuccessLink = modalWrapper.querySelector('#inputSuccessLink');
    const btnCopyInviteLink = modalWrapper.querySelector('#btnCopyInviteLink');
    const btnCopyText = modalWrapper.querySelector('#btnCopyText');
    const btnOpenInviteUrl = modalWrapper.querySelector('#btnOpenInviteUrl');
    const btnCloseSuccessModal = modalWrapper.querySelector('#btnCloseSuccessModal');

    // Animasi Buka
    requestAnimationFrame(() => {
      modalWrapper.classList.remove('opacity-0');
      modalWrapper.classList.add('opacity-100');
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
    });

    const closeModal = () => {
      modalWrapper.classList.remove('opacity-100');
      modalWrapper.classList.add('opacity-0');
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
      setTimeout(() => {
        modalWrapper.remove();
      }, 250);
    };

    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    btnCloseSuccessModal?.addEventListener('click', () => {
      closeModal();
      if (typeof onSuccess === 'function') onSuccess();
    });

    // Update calculation & UI for selected reward
    const updateSelectedUI = () => {
      rewardInputLabel.textContent = selectedReward.inputLabel;
      inputTargetAccount.placeholder = selectedReward.inputPlaceholder;
      calcRewardCost.textContent = `Rp ${selectedReward.cost.toLocaleString('id-ID')}`;

      const rem = currentBalance - selectedReward.cost;
      if (rem >= 0) {
        calcRemainingBalance.innerHTML = `<span class="text-secondary">Rp ${rem.toLocaleString('id-ID')}</span>`;
        btnConfirmRedeem.disabled = false;
        btnRedeemText.textContent = `Tukarkan Saldo (Rp ${selectedReward.cost.toLocaleString('id-ID')})`;
      } else {
        calcRemainingBalance.innerHTML = `<span class="text-rose-500">Kurang Rp ${Math.abs(rem).toLocaleString('id-ID')}</span>`;
        btnConfirmRedeem.disabled = true;
        btnRedeemText.textContent = `Saldo Kurang Rp ${Math.abs(rem).toLocaleString('id-ID')}`;
      }

      // Update card visual highlight
      const cards = rewardItemsList.querySelectorAll('.reward-item-card');
      cards.forEach(c => {
        const id = c.getAttribute('data-reward-id');
        if (id === selectedReward.id) {
          c.className = 'reward-item-card cursor-pointer rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 bg-primary/10 border-primary ring-2 ring-primary/20 shadow-sm';
        } else {
          c.className = 'reward-item-card cursor-pointer rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 bg-surface-container-low hover:bg-surface-container border-surface-container';
        }
      });
    };

    // Item selection handler
    rewardItemsList?.addEventListener('click', (e) => {
      const cardEl = e.target.closest('.reward-item-card');
      if (!cardEl) return;
      const id = cardEl.getAttribute('data-reward-id');
      const item = REWARD_ITEMS.find(r => r.id === id);
      if (item) {
        selectedReward = item;
        updateSelectedUI();
      }
    });

    // Handle Confirm Redeem Click
    btnConfirmRedeem?.addEventListener('click', async () => {
      if (isProcessing) return;

      const targetAccount = (inputTargetAccount?.value || '').trim();
      if (!targetAccount) {
        if (notificationService) {
          notificationService.error(`Harap isi ${selectedReward.inputLabel} untuk pengiriman.`);
        }
        inputTargetAccount?.focus();
        return;
      }

      if (selectedReward.inputType === 'email' && !targetAccount.includes('@')) {
        if (notificationService) {
          notificationService.error('Harap masukkan format alamat email yang valid.');
        }
        inputTargetAccount?.focus();
        return;
      }

      isProcessing = true;
      btnConfirmRedeem.disabled = true;
      btnConfirmRedeem.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Memproses Penukaran...</span>';

      try {
        const res = await walletService.redeemReward({
          rewardId: selectedReward.id,
          rewardTitle: selectedReward.title,
          cost: selectedReward.cost,
          targetAccount,
          userId: user ? user.id : 'usr_current',
          userName: user ? user.name : 'Pengguna',
          userEmail: user ? user.email : targetAccount
        });

        if (res.success) {
          currentBalance = walletService.getBalance();
          const balanceEl = modalWrapper.querySelector('#modalActiveBalance');
          if (balanceEl) {
            balanceEl.textContent = `Rp ${currentBalance.toLocaleString('id-ID')}`;
          }

          if (notificationService) {
            notificationService.success(res.message);
          }

          // Tampilkan view sukses
          mainView.classList.add('hidden');
          successView.classList.remove('hidden');

          successRewardTitle.textContent = selectedReward.title;
          successRewardMsg.textContent = `Hadiah telah berhasil ditukarkan untuk akun "${targetAccount}". Simpan link atau kode undangan berikut:`;
          inputSuccessLink.value = res.inviteLink || res.inviteCode || 'KODE-CLAIM-AKTIF';
          if (btnOpenInviteUrl && res.inviteLink) {
            btnOpenInviteUrl.href = res.inviteLink;
          }

          // Copy button handler
          btnCopyInviteLink?.addEventListener('click', async () => {
            try {
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(inputSuccessLink.value);
                btnCopyText.textContent = 'Disalin!';
                setTimeout(() => {
                  btnCopyText.textContent = 'Salin';
                }, 2000);
              }
            } catch (_) {}
          });

        } else {
          isProcessing = false;
          btnConfirmRedeem.disabled = false;
          btnConfirmRedeem.innerHTML = `
            <span class="material-symbols-outlined text-[18px]">verified</span>
            <span>Tukarkan Saldo (Rp ${selectedReward.cost.toLocaleString('id-ID')})</span>
          `;
          if (notificationService) {
            notificationService.error(res.message || 'Gagal menukarkan saldo.');
          }
        }
      } catch (err) {
        isProcessing = false;
        btnConfirmRedeem.disabled = false;
        btnConfirmRedeem.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">verified</span>
          <span>Tukarkan Saldo (Rp ${selectedReward.cost.toLocaleString('id-ID')})</span>
        `;
        if (notificationService) {
          notificationService.error(err.message || 'Terjadi kesalahan sistem saat penukaran.');
        }
      }
    });
  }
}
