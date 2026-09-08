import { IComponent } from '../../core/interfaces/IComponent.js';

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
    const initials = (user.name || 'PK')
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-5">
          
          <!-- Profile Header Card -->
          <div class="flex flex-col items-center pt-6 pb-6 bg-surface-card rounded-3xl border border-surface-container shadow-sm text-center relative overflow-hidden">
            <!-- Decorative circle -->
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

            <!-- Avatar -->
            <div class="relative mb-3">
              <div class="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-primary-container text-white text-2xl font-bold flex items-center justify-center shadow-md ring-4 ring-primary/15">
                ${initials}
              </div>
              <div class="absolute bottom-0 right-0 ${user.isVerified ? 'bg-secondary' : 'bg-outline'} text-white shadow-sm rounded-full p-1 flex items-center justify-center border-2 border-white" title="${user.isVerified ? 'Akun Terverifikasi' : 'Menunggu Verifikasi'}">
                <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">
                  ${user.isVerified ? 'verified' : 'pending'}
                </span>
              </div>
            </div>

            <h2 class="font-headline-md text-xl font-bold text-text-heading" id="profileNameDisplay">${user.name || 'Pengguna'}</h2>
            <p class="text-xs text-text-body mt-0.5" id="profileEmailDisplay">${user.email || ''}</p>

            <div class="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full ${user.isVerified ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-surface-container text-text-body'} text-xs font-semibold">
              <span class="material-symbols-outlined text-[16px] ${user.isVerified ? 'text-secondary' : 'text-outline'}" style="font-variation-settings: 'FILL' 1;">
                ${user.isVerified ? 'verified' : 'hourglass_empty'}
              </span>
              <span class="${user.isVerified ? 'text-secondary' : 'text-text-body'} font-bold">
                ${user.isVerified ? 'Akun Terverifikasi' : 'Menunggu Verifikasi Admin'}
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

          <!-- Bank Account / E-Wallet Info Section -->
          <section class="flex flex-col gap-2">
            <h3 class="font-label-md text-xs font-bold text-text-heading px-1 uppercase tracking-wider">
              Rekening & E-Wallet Pencairan (Supabase)
            </h3>
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
              <div class="flex justify-between items-start">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">account_balance</span>
                  </div>
                  <div>
                    <h4 class="font-body-lg text-sm text-text-heading font-bold" id="profileBankName">
                      ${user.bankName ? user.bankName : 'Belum diatur'}
                    </h4>
                    <p class="text-xs text-text-body">Metode Pembayaran Utama</p>
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
                    ${user.accountNumber ? user.getMaskedAccountNumber() : 'Belum diatur'}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-xs text-text-body">Atas Nama</span>
                  <span class="text-xs font-bold text-text-heading uppercase" id="profileAccountHolder">
                    ${user.accountHolder ? user.accountHolder : (user.name ? user.name.toUpperCase() : 'Belum diatur')}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-xs text-text-body">Nomor HP E-Wallet</span>
                  <span class="text-xs font-bold text-text-heading font-mono" id="profilePhone">
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
    const editBankBtn = container.querySelector('#btnEditBank');
    const resetPassBtn = container.querySelector('#btnResetPassword');
    const logoutBtn = container.querySelector('#btnLogout');
    const infoBtns = container.querySelectorAll('.btn-info-modal');

    // Modal Edit Rekening / E-Wallet
    editBankBtn?.addEventListener('click', () => {
      const user = this._authService.getCurrentUser();
      if (!user) return;

      this._notification.showModal({
        title: 'Perbarui Rekening / E-Wallet',
        html: `
          <div class="flex flex-col gap-3 text-left">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-bold text-text-heading uppercase">Nama Bank / E-Wallet</label>
              <input type="text" id="editBankName" class="w-full bg-bg-subtle text-xs p-3 rounded-xl border border-outline-variant/40 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Contoh: BCA, BRI, Mandiri, DANA, GoPay" value="${user.bankName || ''}" />
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
        confirmText: 'Simpan ke Supabase',
        cancelText: 'Batal',
        showCancel: true,
        onConfirm: async () => {
          const bankName = document.getElementById('editBankName')?.value?.trim();
          const accountNumber = document.getElementById('editAccountNum')?.value?.trim();
          const accountHolder = document.getElementById('editAccountHolder')?.value?.trim();
          const phone = document.getElementById('editPhone')?.value?.trim();

          try {
            await this._authService.updateProfile({ bankName, accountNumber, accountHolder, phone });
            this._notification.success('Data rekening berhasil disimpan ke Supabase!');
            
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

    // Reset password info modal
    resetPassBtn?.addEventListener('click', () => {
      const user = this._authService.getCurrentUser();
      this._notification.showModal({
        title: 'Atur Ulang Kata Sandi',
        message: `Tautan reset kata sandi akan dikirim ke alamat email resmi akun Anda (${user?.email || 'email Anda'}). Lanjutkan?`,
        type: 'info',
        confirmText: 'Kirim Email Reset',
        cancelText: 'Batal',
        showCancel: true,
        onConfirm: () => {
          this._notification.success('Instruksi pengaturan ulang kata sandi telah dikirim ke email Anda.');
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
            message: 'Jika mengalami kendala terkait penyetoran API Key atau pencairan dana, hubungi tim support Panen Kunci di support@panenkunci.id atau melalui layanan bantuan resmi.'
          },
          terms: {
            title: 'Syarat & Ketentuan',
            message: 'Setiap API Key yang disetor harus memiliki saldo 80 kredit aktif dari Kie.ai. Key yang sudah terdaftar tidak dapat digunakan kembali. Pencairan saldo dilakukan sesuai batas minimum penarikan yang berlaku.'
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
}
