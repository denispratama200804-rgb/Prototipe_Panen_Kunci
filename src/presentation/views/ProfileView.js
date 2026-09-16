import { IComponent } from '../../core/interfaces/IComponent.js';
import { getPaymentMethodMetadata } from '../utils/PaymentMethodHelper.js';
import { User } from '../../domain/models/User.js';

/**
 * ProfileView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman profil pengguna yang terhubung langsung dengan data autentikasi dan database Supabase.
 */
export class ProfileView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._authService = container.resolve('AuthService');
    this._notification = container.resolve('NotificationService');
    this._walletService = container.resolve('WalletService');
    this._apiKeyService = container.resolve('ApiKeyService');
  }

  render() {
    const user = this._authService.getCurrentUser();

    // Jika belum login, tampilkan layar masuk akun yang ramah
    if (!user) {
      return `
        <div class="flex flex-col w-full min-h-screen bg-background items-center justify-center p-6 text-center">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-3xl">account_circle</span>
          </div>
          <h2 class="font-headline-md text-xl font-bold text-text-heading">Belum Masuk Akun</h2>
          <p class="text-xs text-text-body max-w-xs mt-1 mb-6">
            Silakan masuk dengan akun Panen Kunci Anda untuk melihat dan mengelola profil akun.
          </p>
          <a href="#/login" class="bg-primary text-white font-label-md text-sm font-bold px-6 py-3 rounded-2xl shadow-md hover:bg-primary-container transition-all">
            Masuk Sekarang
          </a>
        </div>
      `;
    }

    const lifetime = this._walletService.getLifetimeEarnings();
    const totalKeys = this._apiKeyService.getAllKeys().length;
    const nicknameStatus = typeof user.canChangeNickname === 'function'
      ? user.canChangeNickname()
      : { allowed: true, daysLeft: 0, nextDate: null };
    const initials = (user.name || 'PK')
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const referralCode = user.referralCode || User.generateReferralCode(user.id || user.email || user.name);

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          <!-- Hidden file input separated outside to prevent double event bubbling / double picker dialog -->
          <input type="file" id="avatarFileInput" accept="image/*" class="hidden" />

          <!-- Profile Header Card -->
          <div class="flex flex-col items-center pt-6 pb-6 bg-surface-card rounded-3xl border border-surface-container shadow-sm text-center relative overflow-hidden">
            <!-- Decorative circle -->
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

            <!-- Avatar -->
            <div class="relative mb-2 group cursor-pointer" id="avatarContainer" title="Klik untuk mengganti foto profil">
              <div class="w-24 h-24 rounded-full overflow-hidden shadow-md ring-4 ring-primary/15 group-hover:ring-primary/40 bg-surface-container relative flex items-center justify-center transition-all">
                ${user.avatar ? `
                  <img
                    id="profileAvatarImg"
                    src="${user.avatar}"
                    alt="${user.name || 'User'}"
                    class="w-full h-full object-cover"
                    onerror="this.style.display='none'; document.getElementById('profileAvatarPlaceholder')?.classList.remove('hidden');"
                  />
                  <div id="profileAvatarPlaceholder" class="w-full h-full flex items-center justify-center bg-surface-container text-outline hidden">
                    <span class="material-symbols-outlined text-4xl">person</span>
                  </div>
                ` : `
                  <img
                    id="profileAvatarImg"
                    src=""
                    alt="${user.name || 'User'}"
                    class="w-full h-full object-cover hidden"
                  />
                  <div id="profileAvatarPlaceholder" class="w-full h-full flex items-center justify-center bg-surface-container text-outline">
                    <span class="material-symbols-outlined text-4xl">person</span>
                  </div>
                `}

                <!-- Loading Overlay Spinner -->
                <div id="avatarLoadingOverlay" class="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white hidden z-20 transition-opacity">
                  <span class="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                  <span class="text-[8px] font-bold mt-1 tracking-wider uppercase">Menyimpan...</span>
                </div>
              </div>

              <!-- Status badge verifikasi -->
              <div class="absolute top-0 right-0 ${user.isVerified ? 'bg-secondary' : 'bg-warning-amber'} text-white shadow-sm rounded-full p-1 flex items-center justify-center border-2 border-white z-10" title="${user.isVerified ? 'Akun Terverifikasi' : 'Belum Terverifikasi'}">
                <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">
                  ${user.isVerified ? 'verified' : 'hourglass_empty'}
                </span>
              </div>

              <!-- Tombol Ganti Foto / Upload Avatar -->
              <button
                type="button"
                id="btnTriggerAvatar"
                class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white shadow-md flex items-center justify-center cursor-pointer hover:bg-primary-container active:scale-95 transition-all border-2 border-white z-10"
                title="Unggah Foto Profil (1 Kali Klik)"
              >
                <span class="material-symbols-outlined text-[16px]">photo_camera</span>
              </button>
            </div>

            <!-- Tombol Hapus Foto (jika user memiliki avatar yang aktif) -->
            <button
              type="button"
              id="btnRemoveAvatar"
              class="text-[11px] font-semibold text-error-ruby/80 hover:text-error-ruby hover:underline mb-1 inline-flex items-center gap-1 transition-colors ${user.avatar ? '' : 'hidden'}"
              title="Hapus foto profil"
            >
              <span class="material-symbols-outlined text-[13px]">delete</span>
              <span>Hapus Foto</span>
            </button>

            <!-- Nickname & Tombol Edit -->
            <div class="flex items-center justify-center gap-1.5 mt-1">
              <h2 class="font-headline-md text-xl font-bold text-text-heading" id="profileNameDisplay">${user.name || 'Pengguna'}</h2>
              <button
                type="button"
                id="btnEditNickname"
                class="w-7 h-7 rounded-full text-text-body hover:text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-primary/20"
                title="${nicknameStatus.allowed ? 'Ubah Nickname (1 Bulan Sekali)' : `Nickname dapat diganti ${nicknameStatus.daysLeft} hari lagi`}"
                aria-label="Ubah Nickname"
              >
                <span class="material-symbols-outlined text-[17px]">edit</span>
              </button>
            </div>

            <!-- Status batasan ganti nickname (sebulan sekali) -->
            ${!nicknameStatus.allowed ? `
              <div class="mt-0.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-[10px] font-medium text-text-body/80 border border-surface-container" title="Batas ganti nickname 1 bulan sekali">
                <span class="material-symbols-outlined text-[12px] text-amber-500">schedule</span>
                <span>Ganti nickname lagi dalam <strong>${nicknameStatus.daysLeft} hari</strong></span>
              </div>
            ` : ''}

            <p class="text-xs text-text-body mt-0.5" id="profileEmailDisplay">${user.email || ''}</p>

            <!-- Role Badge: Hanya ditampilkan jika login sebagai Administrator -->
            ${user.isAdmin() ? `
              <div class="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 border border-purple-500/30">
                  <span class="material-symbols-outlined text-[15px]">shield_person</span>
                  <span>ADMINISTRATOR</span>
                </span>
                <a href="/admin_panel/index.html" class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all">
                  <span class="material-symbols-outlined text-[15px]">dashboard_customize</span>
                  <span>Panel Admin</span>
                </a>
              </div>
            ` : ''}

            <div class="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full ${user.isVerified ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'} text-xs font-semibold">
              <span class="material-symbols-outlined text-[16px] ${user.isVerified ? 'text-secondary' : 'text-amber-500'}" style="font-variation-settings: 'FILL' 1;">
                ${user.isVerified ? 'verified' : 'hourglass_empty'}
              </span>
              <span class="${user.isVerified ? 'text-secondary' : 'text-amber-600 font-bold'}">
                ${user.isVerified ? 'Akun Terverifikasi' : 'Belum Terverifikasi'}
              </span>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-2 gap-3 w-full px-6 mt-5 pt-4 border-t border-surface-container">
              <div class="flex flex-col items-center">
                <span class="text-xs text-text-body">Total Kunci Disetor</span>
                <span class="text-base font-extrabold text-text-heading mt-0.5">${totalKeys} Key</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="text-xs text-text-body">Total Pendapatan</span>
                <span class="text-base font-extrabold text-secondary mt-0.5">Rp ${lifetime.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <!-- Referral Code Section -->
          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between px-1">
              <h3 class="font-headline-md text-xs font-bold text-text-heading uppercase tracking-wider flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-primary">loyalty</span>
                <span>Kode Referral Saya</span>
              </h3>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                <span>Aktif &amp; Unik</span>
              </span>
            </div>

            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4 relative overflow-hidden">
              <!-- Decorative background glow -->
              <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

              <!-- Referral Code Box -->
              <div class="bg-gradient-to-br from-primary/10 via-surface-container-low to-secondary/5 rounded-2xl p-4 border border-primary/20 flex flex-col gap-3 shadow-xs">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-text-body">Kode Rujukan Akun Anda</span>
                  <span class="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-extrabold uppercase tracking-wide">Permanen</span>
                </div>

                <!-- Code Display Box (Ticket Style) -->
                <div class="bg-surface-card/90 backdrop-blur-xs rounded-xl border border-primary/25 px-4 py-3 flex items-center justify-between shadow-xs cursor-pointer hover:border-primary/50 transition-colors" id="boxReferralCodeContainer" title="Klik untuk menyalin kode">
                  <div class="flex items-center gap-2.5 overflow-hidden">
                    <span class="material-symbols-outlined text-primary text-[22px] shrink-0">vpn_key</span>
                    <span class="font-mono text-2xl font-black tracking-widest text-primary selection:bg-primary/20 whitespace-nowrap" id="profileReferralCodeDisplay">${referralCode}</span>
                  </div>
                  <button
                    type="button"
                    id="btnQuickCopyCode"
                    class="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors cursor-pointer shrink-0"
                    title="Klik untuk salin kode"
                    aria-label="Salin Kode"
                  >
                    <span class="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
                </div>

                <!-- Action Buttons: 2 Equal Columns -->
                <div class="grid grid-cols-2 gap-2 w-full pt-0.5">
                  <button
                    type="button"
                    id="btnCopyReferralCode"
                    class="w-full py-2.5 px-3 rounded-xl bg-primary text-white font-label-md text-xs font-bold shadow-sm hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Salin Kode Referral"
                  >
                    <span class="material-symbols-outlined text-[16px]" id="iconCopyReferralCode">content_copy</span>
                    <span id="textCopyReferralCode">Salin Kode</span>
                  </button>

                  <button
                    type="button"
                    id="btnShareReferralLink"
                    class="w-full py-2.5 px-3 rounded-xl bg-surface-card hover:bg-surface-container text-text-heading border border-surface-container font-label-md text-xs font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Bagikan Link Referral"
                  >
                    <span class="material-symbols-outlined text-[16px] text-primary">share</span>
                    <span>Bagikan</span>
                  </button>
                </div>
              </div>

              <!-- Benefit Highlights -->
              <div class="bg-surface-container-low rounded-2xl p-3.5 border border-surface-container/60 flex items-start gap-3">
                <div class="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <span class="material-symbols-outlined text-[18px]">featured_seasonal_and_gifts</span>
                </div>
                <div class="flex flex-col text-[11px] leading-relaxed text-text-body">
                  <span class="font-bold text-text-heading text-xs">Keuntungan Program Referral:</span>
                  <span class="mt-0.5">Ajak teman bergabung dengan kode rujukan Anda. Dapatkan komisi saldo pasif dari setiap setoran API key rekan Anda yang berhasil disetujui!</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Bank Account / E-Wallet Info Section -->
          <section class="flex flex-col gap-2">
            <h3 class="font-headline-md text-xs font-bold text-text-heading px-1 uppercase tracking-wider">
              Rekening & E-Wallet Pencairan
            </h3>
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                    <img src="${(getPaymentMethodMetadata(user.bankName).type === 'ewallet') ? '/images/icon-ewallet.png' : '/images/icon-bank.png'}" alt="${user.bankName || 'Payment'}" class="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 class="font-headline-md text-sm text-text-heading font-bold" id="profileBankName">
                      ${user.bankName ? user.bankName : 'Belum diatur'}
                    </h4>
                    <p class="text-xs text-text-body">Metode Pembayaran Utama</p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btnEditBank"
                  class="font-body-md text-xs font-bold text-primary flex items-center gap-1 hover:bg-primary/10 rounded-xl px-2.5 py-1.5 transition-colors"
                >
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                  <span>Ubah</span>
                </button>
              </div>

              <div class="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-2.5 border border-surface-container">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-text-body">Nomor Rekening</span>
                  <span class="text-xs font-semibold text-text-heading" id="profileAccountNum">
                    ${user.accountNumber ? user.getMaskedAccountNumber() : 'Belum diatur'}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-text-body">Atas Nama</span>
                  <span class="text-xs font-semibold text-text-heading" id="profileAccountHolder">
                    ${user.accountHolder ? user.accountHolder : (user.name || 'Belum diatur')}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-text-body">Nomor HP E-Wallet</span>
                  <span class="text-xs font-semibold text-text-heading" id="profilePhone">
                    ${user.phone ? user.phone : 'Belum diatur'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- Security Section -->
          <section class="flex flex-col gap-2">
            <h3 class="font-label-md text-xs font-bold text-text-heading px-1 uppercase tracking-wider">
              Keamanan Akun
            </h3>
            <div class="bg-surface-card rounded-3xl shadow-sm border border-surface-container overflow-hidden">
              <button
                type="button"
                id="btnResetPassword"
                class="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">lock_reset</span>
                  </div>
                  <span class="text-xs font-bold text-text-heading">Atur Ulang Kata Sandi</span>
                </div>
                <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
              </button>
            </div>
          </section>


          <!-- Support & Help Section -->
          <section class="flex flex-col gap-2">
            <h3 class="font-label-md text-xs font-bold text-text-heading px-1 uppercase tracking-wider">
              Bantuan & Ketentuan
            </h3>
            <div class="bg-surface-card rounded-3xl shadow-sm border border-surface-container overflow-hidden flex flex-col divide-y divide-surface-container">
              <!-- Live Chat & Hubungi Admin Button -->
              <button
                type="button"
                id="btnLiveChatAdmin"
                class="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group cursor-pointer"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span class="material-symbols-outlined text-[20px]">support_agent</span>
                  </div>
                  <span class="text-xs font-bold text-text-heading group-hover:text-primary transition-colors">Hubungi Admin & Live Chat</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                    <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    <span>Online</span>
                  </span>
                  <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                </div>
              </button>

              <button
                type="button"
                class="btn-info-modal w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group"
                data-type="help"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-text-heading">
                    <span class="material-symbols-outlined text-[20px]">help_outline</span>
                  </div>
                  <span class="text-xs font-bold text-text-heading">Pusat Bantuan & FAQ</span>
                </div>
                <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
              </button>

              <button
                type="button"
                class="btn-info-modal w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group"
                data-type="terms"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-text-heading">
                    <span class="material-symbols-outlined text-[20px]">description</span>
                  </div>
                  <span class="text-xs font-bold text-text-heading">Syarat & Ketentuan Layanan</span>
                </div>
                <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
              </button>

              <button
                type="button"
                class="btn-info-modal w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group"
                data-type="privacy"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-text-heading">
                    <span class="material-symbols-outlined text-[20px]">policy</span>
                  </div>
                  <span class="text-xs font-bold text-text-heading">Kebijakan Privasi</span>
                </div>
                <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
              </button>
            </div>
          </section>

          <!-- Logout Button -->
          <div class="pt-2">
            <button
              type="button"
              id="btnLogout"
              class="w-full bg-surface-card border border-error-ruby/30 text-error-ruby rounded-2xl py-3.5 px-4 flex items-center justify-center gap-2 hover:bg-error-ruby/10 active:scale-[0.98] transition-all font-label-md text-xs font-bold shadow-sm"
            >
              <span class="material-symbols-outlined text-[18px]">logout</span>
              <span>Keluar dari Akun</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  mount(container) {
    // Avatar upload / update & sync
    const avatarInput = container.querySelector('#avatarFileInput');
    const avatarContainer = container.querySelector('#avatarContainer');
    const btnTriggerAvatar = container.querySelector('#btnTriggerAvatar');
    const avatarOverlay = container.querySelector('#avatarLoadingOverlay');
    const removeAvatarBtn = container.querySelector('#btnRemoveAvatar');

    // Trigger file picker saat klik avatar besar atau tombol kamera (1 kali aksi langsung)
    avatarContainer?.addEventListener('click', () => {
      avatarInput?.click();
    });

    btnTriggerAvatar?.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarInput?.click();
    });

    avatarInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        this._notification.error('Silakan pilih file gambar yang valid (JPG, PNG, WebP).');
        return;
      }

      // Tampilkan visual loading overlay interaktif pada foto profil
      if (avatarOverlay) {
        avatarOverlay.classList.remove('hidden');
      }

      try {
        // Kompres otomatis gambar via Canvas ke resolusi optimal 400x400
        const base64Image = await this._resizeImage(file, 400, 400, 0.85);

        // Update preview langsung di halaman
        const avatarImg = container.querySelector('#profileAvatarImg');
        const placeholder = container.querySelector('#profileAvatarPlaceholder');
        if (avatarImg) {
          avatarImg.src = base64Image;
          avatarImg.style.display = 'block';
          avatarImg.classList.remove('hidden');
        }
        if (placeholder) {
          placeholder.classList.add('hidden');
        }
        if (removeAvatarBtn) {
          removeAvatarBtn.classList.remove('hidden');
        }

        await this._authService.updateProfile({ avatar: base64Image });
        this._notification.success('Foto profil berhasil diunggah dan disimpan!');
      } catch (err) {
        console.error('Upload avatar error:', err);
        this._notification.error('Gagal memperbarui foto profil: ' + (err.message || 'Terjadi kesalahan'));
      } finally {
        if (avatarOverlay) {
          avatarOverlay.classList.add('hidden');
        }
        avatarInput.value = '';
      }
    });

    // Handler Hapus Foto Profil
    removeAvatarBtn?.addEventListener('click', async () => {
      try {
        await this._authService.updateProfile({ avatar: '' });
        const avatarImg = container.querySelector('#profileAvatarImg');
        const placeholder = container.querySelector('#profileAvatarPlaceholder');
        if (avatarImg) {
          avatarImg.src = '';
          avatarImg.classList.add('hidden');
        }
        if (placeholder) {
          placeholder.classList.remove('hidden');
        }
        removeAvatarBtn.classList.add('hidden');
        this._notification.success('Foto profil berhasil dihapus.');
      } catch (err) {
        this._notification.error('Gagal menghapus foto profil: ' + err.message);
      }
    });

    // Handler Referral Code (Salin Kode dan Bagikan)
    const btnCopyReferralCode = container.querySelector('#btnCopyReferralCode');
    const iconCopyReferralCode = container.querySelector('#iconCopyReferralCode');
    const textCopyReferralCode = container.querySelector('#textCopyReferralCode');
    const btnShareReferralLink = container.querySelector('#btnShareReferralLink');
    const profileReferralCodeDisplay = container.querySelector('#profileReferralCodeDisplay');

    const copyTextToClipboard = async (text, successMessage) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        this._notification.success(successMessage);
        return true;
      } catch (err) {
        console.error('Copy to clipboard failed:', err);
        this._notification.error('Gagal menyalin: ' + (err.message || 'Izin clipboard ditolak'));
        return false;
      }
    };

    const btnQuickCopyCode = container.querySelector('#btnQuickCopyCode');
    const boxReferralCodeContainer = container.querySelector('#boxReferralCodeContainer');

    const handleCopyCodeAction = async () => {
      const code = (profileReferralCodeDisplay?.textContent || '').trim();
      if (!code) return;

      const ok = await copyTextToClipboard(code, `Kode referral ${code} berhasil disalin!`);
      if (ok && iconCopyReferralCode && textCopyReferralCode) {
        const originalIcon = iconCopyReferralCode.textContent;
        const originalText = textCopyReferralCode.textContent;
        iconCopyReferralCode.textContent = 'check';
        textCopyReferralCode.textContent = 'Tersalin!';
        btnCopyReferralCode?.classList.add('bg-secondary');
        btnCopyReferralCode?.classList.remove('bg-primary');

        setTimeout(() => {
          iconCopyReferralCode.textContent = originalIcon;
          textCopyReferralCode.textContent = originalText;
          btnCopyReferralCode?.classList.remove('bg-secondary');
          btnCopyReferralCode?.classList.add('bg-primary');
        }, 2000);
      }
    };

    btnCopyReferralCode?.addEventListener('click', handleCopyCodeAction);
    btnQuickCopyCode?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleCopyCodeAction();
    });
    boxReferralCodeContainer?.addEventListener('click', handleCopyCodeAction);

    btnShareReferralLink?.addEventListener('click', async () => {
      const code = (profileReferralCodeDisplay?.textContent || '').trim();
      const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://panenkunci.com';
      const shareUrl = `${origin}/#/register?ref=${code}`;
      const shareTitle = 'Daftar Panen Kunci - Raih Saldo dari API Key';
      const shareText = `Halo! Yuk gabung di Panen Kunci dan hasilkan uang dari API Key Anda! Gunakan kode referral saya: ${code}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            await copyTextToClipboard(code, `Kode referral ${code} berhasil disalin!`);
          }
        }
      } else {
        await copyTextToClipboard(code, `Kode referral ${code} berhasil disalin! Bagikan kode ini ke rekan Anda.`);
      }
    });

    const editNicknameBtn = container.querySelector('#btnEditNickname');
    const editBankBtn = container.querySelector('#btnEditBank');
    const resetPassBtn = container.querySelector('#btnResetPassword');
    const logoutBtn = container.querySelector('#btnLogout');
    const infoBtns = container.querySelectorAll('.btn-info-modal');
    const liveChatBtn = container.querySelector('#btnLiveChatAdmin');

    // Handler Ganti Nickname Pengguna (Aturan: 1 Bulan Sekali)
    editNicknameBtn?.addEventListener('click', () => {
      const user = this._authService.getCurrentUser();
      if (!user) return;

      const check = typeof user.canChangeNickname === 'function'
        ? user.canChangeNickname()
        : { allowed: true, daysLeft: 0, nextDate: null };

      // Jika belum melewati masa cooldown 30 hari
      if (!check.allowed) {
        const formattedDate = check.nextDate ? check.nextDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) : '';

        this._notification.showModal({
          title: 'Batas Ganti Nickname',
          html: `
            <div class="flex flex-col items-center text-center p-2">
              <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 border border-amber-500/20">
                <span class="material-symbols-outlined text-3xl">schedule</span>
              </div>
              <p class="text-sm font-bold text-text-heading">Belum Dapat Mengganti Nickname</p>
              <p class="text-xs text-text-body mt-2 leading-relaxed">
                Untuk menjaga ketertiban data dan keamanan transaksi, pengguna hanya dapat mengganti nickname <strong>1 kali dalam sebulan (30 hari)</strong>.
              </p>
              <div class="w-full bg-surface-container rounded-2xl p-3.5 mt-3 border border-surface-container-high text-left flex flex-col gap-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-text-body">Sisa Waktu Tunggu:</span>
                  <span class="font-bold text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">${check.daysLeft} Hari Lagi</span>
                </div>
                ${formattedDate ? `
                <div class="flex justify-between items-center text-xs">
                  <span class="text-text-body">Dapat Diganti Pada:</span>
                  <span class="font-bold text-text-heading font-mono">${formattedDate}</span>
                </div>
                ` : ''}
              </div>
            </div>
          `,
          confirmText: 'Saya Mengerti',
          showCancel: false,
          type: 'warning'
        });
        return;
      }

      // Tampilkan Modal Form Ganti Nickname jika eligible
      this._notification.showModal({
        title: 'Ganti Nickname Akun',
        html: `
          <div class="flex flex-col gap-3 text-left">
            <p class="text-xs text-text-body">
              Masukkan nickname baru Anda. Nickname ini akan disinkronkan secara realtime ke database dan panel admin.
            </p>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nickname Baru</label>
              <input
                type="text"
                id="inputNewNickname"
                class="w-full bg-bg-subtle text-sm p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none font-semibold text-text-heading"
                placeholder="Masukkan nickname (3-30 karakter)"
                value="${user.name || ''}"
                maxlength="30"
                minlength="3"
                autocomplete="off"
              />
              <span class="text-[10px] text-text-body/70 mt-0.5">Minimal 3 karakter, maksimal 30 karakter.</span>
            </div>
            <div class="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2.5">
              <span class="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">warning</span>
              <p class="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
                <strong>Ketentuan Penting:</strong> Anda hanya dapat mengganti nickname <strong>1 kali setiap sebulan (30 hari)</strong>. Pastikan ejaan nickname Anda sudah sesuai sebelum menyimpan.
              </p>
            </div>
          </div>
        `,
        type: 'info',
        confirmText: 'Simpan Nickname',
        cancelText: 'Batal',
        showCancel: true,
        autoClose: false,
        onConfirm: async ({ close, confirmBtn }) => {
          const input = document.getElementById('inputNewNickname');
          const newNick = (input?.value || '').trim();

          if (!newNick) {
            this._notification.error('Nickname tidak boleh kosong.');
            return;
          }
          if (newNick.length < 3) {
            this._notification.error('Nickname minimal 3 karakter.');
            return;
          }
          if (newNick.length > 30) {
            this._notification.error('Nickname maksimal 30 karakter.');
            return;
          }
          if (newNick.toLowerCase() === (user.name || '').toLowerCase()) {
            this._notification.error('Nickname baru tidak boleh sama dengan nickname saat ini.');
            return;
          }

          const origContent = confirmBtn.innerHTML;
          confirmBtn.disabled = true;
          confirmBtn.classList.add('opacity-75', 'cursor-not-allowed');
          confirmBtn.innerHTML = `
            <span class="material-symbols-outlined text-sm animate-spin inline-block mr-1">progress_activity</span>
            <span>Menyimpan...</span>
          `;

          try {
            await this._authService.updateNickname(newNick);
            this._notification.success(`Nickname berhasil diganti menjadi "${newNick}"!`);
            close();

            // Re-render konten tampilan profil saat ini
            const viewRoot = document.getElementById('app-view-root');
            if (viewRoot) {
              viewRoot.innerHTML = this.render();
              this.mount(viewRoot);
            }
          } catch (err) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            confirmBtn.innerHTML = origContent;
            this._notification.error(err.message || 'Gagal memperbarui nickname.');
          }
        }
      });
    });

    // Modal Edit Rekening / E-Wallet
    editBankBtn?.addEventListener('click', () => {
      const user = this._authService.getCurrentUser();
      if (!user) return;

      const currentBank = (user.bankName || '').trim();
      const bankCategories = [
        {
          group: 'E-Wallet',
          items: ['DANA', 'GoPay', 'OVO', 'ShopeePay']
        },
        {
          group: 'Bank Transfer',
          items: ['BCA', 'BRI', 'Mandiri', 'SeaBank']
        }
      ];

      const isCurrent = (item) => {
        if (!currentBank) return false;
        const c = currentBank.toLowerCase();
        const i = item.toLowerCase();
        return c === i || c.includes(i) || i.includes(c);
      };

      const optionsHtml = bankCategories.map(g => `
        <optgroup label="${g.group}" class="font-bold text-text-heading">
          ${g.items.map(item => `
            <option value="${item}" ${isCurrent(item) ? 'selected' : ''}>${item}</option>
          `).join('')}
        </optgroup>
      `).join('');

      this._notification.showModal({
        title: 'Perbarui Rekening / E-Wallet',
        html: `
          <div class="flex flex-col gap-3 text-left">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nama Bank / E-Wallet</label>
              <select id="editBankName" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer">
                <option value="" disabled ${!currentBank ? 'selected' : ''}>-- Pilih Bank atau E-Wallet --</option>
                ${optionsHtml}
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nomor Rekening</label>
              <input type="text" id="editAccountNum" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Masukkan nomor rekening Anda" value="${user.accountNumber || ''}" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nama Pemilik Rekening</label>
              <input type="text" id="editAccountHolder" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Nama sesuai buku tabungan / e-wallet" value="${user.accountHolder || user.name || ''}" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nomor HP E-Wallet / Telepon</label>
              <input type="tel" id="editPhone" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Contoh: 081234567890" value="${user.phone || ''}" />
            </div>
          </div>
        `,
        type: 'info',
        confirmText: 'Simpan',
        cancelText: 'Batal',
        showCancel: true,
        onConfirm: async () => {
          const bankName = document.getElementById('editBankName')?.value?.trim();
          const accountNumber = document.getElementById('editAccountNum')?.value?.trim();
          const accountHolder = document.getElementById('editAccountHolder')?.value?.trim();
          const phone = document.getElementById('editPhone')?.value?.trim();

          try {
            await this._authService.updateProfile({ bankName, accountNumber, accountHolder, phone });
            this._notification.success('Data rekening berhasil disimpan!');

            // Re-render konten tampilan profil saat ini
            const viewRoot = document.getElementById('app-view-root');
            if (viewRoot) {
              viewRoot.innerHTML = this.render();
              this.mount(viewRoot);
            }
          } catch (err) {
            this._notification.error('Gagal memperbarui profil: ' + err.message);
          }
        }
      });
    });

    // Auto-open modal edit rekening jika diarahkan dari petunjuk verifikasi dashboard
    if (sessionStorage.getItem('panenkunci:auto_open_bank') === 'true') {
      sessionStorage.removeItem('panenkunci:auto_open_bank');
      setTimeout(() => {
        editBankBtn?.click();
      }, 350);
    }

    // Reset password info modal
    resetPassBtn?.addEventListener('click', () => {
      const user = this._authService.getCurrentUser();
      if (!user || !user.email) {
        this._notification.error('Data email akun Anda tidak ditemukan.');
        return;
      }

      this._notification.showModal({
        title: 'Atur Ulang Kata Sandi',
        message: `Tautan pemulihan kata sandi akan dikirim ke alamat email resmi akun Anda (<strong>${user.email}</strong>). Lanjutkan pengiriman?`,
        type: 'info',
        confirmText: 'Kirim Email Reset',
        cancelText: 'Batal',
        showCancel: true,
        autoClose: false,
        onConfirm: async ({ close, confirmBtn }) => {
          const origContent = confirmBtn.innerHTML;
          confirmBtn.disabled = true;
          confirmBtn.classList.add('opacity-75', 'cursor-not-allowed');
          confirmBtn.innerHTML = `
            <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Mengirim...</span>
          `;

          try {
            const res = await this._authService.sendPasswordResetEmail(user.email);

            if (res.success) {
              close();
              if (res.isDirectLink && res.actionLink) {
                this._notification.showModal({
                  title: 'Tautan Reset Instan Siap!',
                  message: 'Batas kuota email bawaan Supabase (3 email/jam) sedang aktif di proyek Anda. Anda dapat langsung menggunakan tautan pemulihan instan di bawah ini:',
                  html: `
                    <div class="flex flex-col gap-3 mt-2 text-left">
                      <div class="p-3 bg-bg-subtle rounded-xl border border-outline-variant/40 text-[11px] font-mono break-all text-text-body select-all max-h-24 overflow-y-auto">
                        ${res.actionLink}
                      </div>
                      <div class="flex gap-2 mt-1">
                        <button type="button" id="btnCopyResetProfile" class="flex-1 py-2.5 px-3 bg-surface-container hover:bg-surface-container-high text-xs font-bold rounded-xl text-text-heading flex items-center justify-center gap-1.5 transition-colors">
                          <span class="material-symbols-outlined text-[16px]">content_copy</span>
                          <span>Salin Tautan</span>
                        </button>
                        <a href="${res.actionLink}" class="flex-1 py-2.5 px-3 bg-primary text-on-primary hover:bg-primary-container text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 text-center transition-colors">
                          <span class="material-symbols-outlined text-[16px]">open_in_new</span>
                          <span>Buka Sekarang</span>
                        </a>
                      </div>
                    </div>
                  `,
                  type: 'info',
                  confirmText: 'Tutup'
                });
                setTimeout(() => {
                  document.getElementById('btnCopyResetProfile')?.addEventListener('click', () => {
                    navigator.clipboard.writeText(res.actionLink);
                    this._notification.success('Tautan reset kata sandi berhasil disalin!');
                  });
                }, 100);
              } else {
                this._notification.showModal({
                  title: 'Tautan Terkirim!',
                  message: res.message,
                  type: 'success',
                  confirmText: 'Mengerti'
                });
              }
            } else {
              confirmBtn.disabled = false;
              confirmBtn.classList.remove('opacity-75', 'cursor-not-allowed');
              confirmBtn.innerHTML = origContent;
              this._notification.error(res.message || 'Gagal mengirim email reset kata sandi.');
              return false;
            }
          } catch (err) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            confirmBtn.innerHTML = origContent;
            this._notification.error('Terjadi kesalahan: ' + err.message);
            return false;
          }
        }
      });
    });

    // Help & FAQ modal
    infoBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const contents = {
          help: {
            title: 'Pusat Bantuan & FAQ',
            message: 'Jika mengalami kendala terkait penyetoran API Key atau pencairan dana, hubungi tim support Panen Kunci di panenkuncii@gmail.com atau melalui layanan live chat kepada admin.'
          },
          terms: {
            title: 'Syarat & Ketentuan',
            message: 'Setiap API Key yang disetor harus memiliki saldo 80 kredit aktif. Key yang sudah terdaftar tidak dapat digunakan kembali. Pencairan saldo dilakukan sesuai batas minimum penarikan yang berlaku.'
          },
          privacy: {
            title: 'Kebijakan Privasi',
            message: 'Panen Kunci menjaga kerahasiaan data pengguna dengan enkripsi standar industri. Kami tidak pernah membagikan data pribadi atau kredensial akun Anda kepada pihak ketiga.'
          }
        };

        const item = contents[type] || contents.help;
        this._notification.showModal({
          title: item.title,
          message: item.message,
          type: 'info',
          confirmText: 'Tutup'
        });
      });
    });

    // Live Chat & Hubungi Admin: Buka langsung layar chat dengan Admin (Foto 2)
    liveChatBtn?.addEventListener('click', () => {
      window.location.hash = '/chat';
    });

    // Logout handler
    logoutBtn?.addEventListener('click', () => {
      this._notification.showModal({
        title: 'Konfirmasi Keluar',
        message: 'Apakah Anda yakin ingin keluar dari akun Panen Kunci?',
        type: 'confirm',
        confirmText: 'Ya, Keluar',
        cancelText: 'Batal',
        showCancel: true,
        onConfirm: async () => {
          await this._authService.logout();
          this._notification.info('Anda telah berhasil keluar dari akun.');
          window.location.hash = '/login';
        }
      });
    });
  }

  /**
   * Mengompres dan mengubah ukuran file gambar via HTML5 Canvas
   * @param {File} file
   * @param {number} maxWidth
   * @param {number} maxHeight
   * @param {number} quality
   * @returns {Promise<string>}
   */
  _resizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Format file gambar tidak dapat diproses.'));
        img.src = readerEvent.target.result;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.readAsDataURL(file);
    });
  }
}
