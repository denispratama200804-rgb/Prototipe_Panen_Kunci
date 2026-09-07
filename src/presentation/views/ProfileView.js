import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * ProfileView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman profil pengguna, manajemen rekening bank/e-wallet, keamanan, dan pengaturan akun.
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
    const user = this._authService.getCurrentUser() || {
      name: 'Budi Santoso',
      email: 'budi.santoso@example.com',
      phone: '081234567890',
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '5410987654',
      accountHolder: 'BUDI SANTOSO',
      isVerified: true
    };

    const lifetime = this._walletService.getLifetimeEarnings();
    const totalKeys = this._apiKeyService.getAllKeys().length;

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          <!-- Profile Header Card -->
          <div class="flex flex-col items-center pt-6 pb-6 bg-surface-card rounded-3xl border border-surface-container shadow-sm text-center relative overflow-hidden">
            <!-- Decorative circle -->
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

            <!-- Avatar -->
            <div class="relative mb-3">
              <img
                src="/avatar.png"
                alt="${user.name}"
                class="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-primary/15"
                onerror="this.src='https://lh3.googleusercontent.com/aida-public/AB6AXuCJ06NwJvkMq5wnCKysow5prhzpnH7g6zRgYA4RYuyUgHK6g6xTot1wP7xXFVyjpvOcWMlIE07keEdOWlft-yWU3CY4OVQMVo94yYOErwizdVXrl3EnYkqJACecBLnDr-S_NAdc1h3mhBXs7Yf_5t7uzJSd4NfiLJMj78zcHOSK_2Kq3hpEg-uS5V6DqYBCxlY-gzwH25PqPD9gGdd_JtpdkqIo28boAKfZVg2uxTR-oSCUsDPPZ9GT'"
              />
              <div class="absolute bottom-0 right-0 bg-secondary text-white shadow-sm rounded-full p-1 flex items-center justify-center border-2 border-white" title="Akun Terverifikasi">
                <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">verified</span>
              </div>
            </div>

            <h2 class="font-headline-md text-xl font-bold text-text-heading">${user.name}</h2>
            <p class="text-xs text-text-body mt-0.5">${user.email}</p>

            <div class="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-secondary-container/50 text-on-secondary-container text-xs font-semibold">
              <span class="material-symbols-outlined text-[16px] text-secondary" style="font-variation-settings: 'FILL' 1;">shield</span>
              <span class="text-secondary font-bold">Akun Terverifikasi</span>
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

          <!-- Bank Account / E-Wallet Info Section -->
          <section class="flex flex-col gap-2">
            <h3 class="font-label-md text-xs font-bold text-text-heading px-1 uppercase tracking-wider">
              Rekening & E-Wallet Pencairan
            </h3>
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
              <div class="flex justify-between items-start">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">account_balance</span>
                  </div>
                  <div>
                    <h4 class="font-body-lg text-sm text-text-heading font-bold" id="profileBankName">${user.bankName || 'Bank Central Asia (BCA)'}</h4>
                    <p class="text-xs text-text-body">Rekening Utama</p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btnEditBank"
                  class="font-label-md text-xs font-bold text-primary flex items-center gap-1 hover:bg-primary-fixed rounded-xl px-2.5 py-1.5 transition-colors"
                >
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                  <span>Ubah</span>
                </button>
              </div>

              <div class="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-2 border border-surface-container">
                <div class="flex justify-between">
                  <span class="text-xs text-text-body">Nomor Rekening</span>
                  <span class="font-mono text-xs font-bold text-text-heading tracking-wider" id="profileAccountNum">
                    ${user.accountNumber ? `**** **** ${user.accountNumber.slice(-4)}` : '**** **** 5678'}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-xs text-text-body">Atas Nama</span>
                  <span class="text-xs font-bold text-text-heading uppercase" id="profileAccountHolder">
                    ${user.accountHolder || user.name.toUpperCase()}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-xs text-text-body">Nomor Handphone E-Wallet</span>
                  <span class="text-xs font-bold text-text-heading font-mono" id="profilePhone">
                    ${user.phone || '081234567890'}
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
                  <span class="text-xs font-bold text-text-heading">Ganti Kata Sandi</span>
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
              <button
                type="button"
                class="btn-info-modal w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group"
                data-type="help"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">help_center</span>
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
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">description</span>
                  </div>
                  <span class="text-xs font-bold text-text-heading">Syarat & Ketentuan</span>
                </div>
                <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
              </button>

              <button
                type="button"
                class="btn-info-modal w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group"
                data-type="privacy"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">privacy_tip</span>
                  </div>
                  <span class="text-xs font-bold text-text-heading">Kebijakan Privasi</span>
                </div>
                <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
              </button>
            </div>
          </section>

          <!-- Logout Button -->
          <div class="mt-1">
            <button
              type="button"
              id="btnLogout"
              class="w-full flex items-center justify-center gap-2 py-4 bg-error-container text-on-error-container rounded-2xl font-label-md text-sm font-bold hover:bg-error hover:text-white transition-all shadow-sm active:scale-[0.98]"
            >
              <span class="material-symbols-outlined text-[20px]">logout</span>
              <span>Keluar dari Akun</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  mount(container) {
    const editBankBtn = container.querySelector('#btnEditBank');
    const resetPassBtn = container.querySelector('#btnResetPassword');
    const logoutBtn = container.querySelector('#btnLogout');
    const infoBtns = container.querySelectorAll('.btn-info-modal');

    // Edit Bank / E-Wallet Info Modal
    editBankBtn?.addEventListener('click', () => {
      const user = this._authService.getCurrentUser();
      this._notification.showModal({
        title: 'Perbarui Rekening / E-Wallet',
        html: `
          <div class="flex flex-col gap-3 text-left">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nama Bank / E-Wallet</label>
              <input type="text" id="editBankName" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" value="${user?.bankName || 'Bank Central Asia (BCA)'}" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nomor Rekening</label>
              <input type="text" id="editAccountNum" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" value="${user?.accountNumber || '5410987654'}" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nomor HP E-Wallet</label>
              <input type="text" id="editPhone" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" value="${user?.phone || '081234567890'}" />
            </div>
          </div>
        `,
        type: 'info',
        confirmText: 'Simpan Perubahan',
        cancelText: 'Batal',
        showCancel: true,
        onConfirm: () => {
          const bankName = document.getElementById('editBankName')?.value.trim();
          const accountNumber = document.getElementById('editAccountNum')?.value.trim();
          const phone = document.getElementById('editPhone')?.value.trim();

          this._authService.updateProfile({ bankName, accountNumber, phone });
          this._notification.success('Data rekening dan e-wallet berhasil diperbarui!');
          window.location.hash = '/profil';
        }
      });
    });

    // Reset Password Modal
    resetPassBtn?.addEventListener('click', () => {
      this._notification.showModal({
        title: 'Ganti Kata Sandi',
        html: `
          <div class="flex flex-col gap-3 text-left">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Kata Sandi Lama</label>
              <input type="password" id="oldPassword" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="••••••••" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Kata Sandi Baru</label>
              <input type="password" id="newPassword" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Minimal 8 karakter" />
            </div>
          </div>
        `,
        type: 'info',
        confirmText: 'Simpan Kata Sandi Baru',
        cancelText: 'Batal',
        showCancel: true,
        onConfirm: () => {
          this._notification.success('Kata sandi berhasil diperbarui!');
        }
      });
    });

    // Info modals
    infoBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const contents = {
          help: {
            title: 'Pusat Bantuan & FAQ',
            message: 'Jika mengalami kendala terkait penyetoran API Key atau pencairan dana, hubungi tim support Panen Kunci di support@panenkunci.id atau melalui layanan chat bantuan 24/7.'
          },
          terms: {
            title: 'Syarat & Ketentuan',
            message: 'Setiap API Key yang disetor harus memiliki saldo 80 kredit aktif dari Kie.ai. Key yang sudah terdaftar tidak dapat digunakan kembali. Pencairan saldo dilakukan sesuai limit minimum Rp 50.000.'
          },
          privacy: {
            title: 'Kebijakan Privasi',
            message: 'Panen Kunci menjaga kerahasiaan data pengguna dengan enkripsi AES-256 standar industri keuangan. Kami tidak pernah membagikan data pribadi atau kredensial akun Anda kepada pihak ketiga.'
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

    // Logout Confirmation
    logoutBtn?.addEventListener('click', () => {
      this._notification.showModal({
        title: 'Konfirmasi Keluar',
        message: 'Apakah Anda yakin ingin keluar dari akun Panen Kunci?',
        type: 'confirm',
        confirmText: 'Ya, Keluar',
        cancelText: 'Tetap di Sini',
        showCancel: true,
        onConfirm: () => {
          this._authService.logout();
          this._notification.info('Anda telah berhasil keluar.');
          window.location.hash = '/login';
        }
      });
    });
  }
}
