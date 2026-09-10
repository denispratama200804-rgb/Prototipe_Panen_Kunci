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
            <div class="relative mb-2 group">
              <div class="w-24 h-24 rounded-full overflow-hidden shadow-md ring-4 ring-primary/15 bg-surface-container relative flex items-center justify-center">
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
              </div>

              <!-- Status badge verifikasi -->
              <div class="absolute top-0 right-0 ${user.isVerified ? 'bg-secondary' : 'bg-outline'} text-white shadow-sm rounded-full p-1 flex items-center justify-center border-2 border-white" title="${user.isVerified ? 'Akun Terverifikasi' : 'Menunggu Verifikasi'}">
                <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">
                  ${user.isVerified ? 'verified' : 'pending'}
                </span>
              </div>

              <!-- Tombol Ganti Foto / Upload Avatar -->
              <label
                for="avatarFileInput"
                class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white shadow-md flex items-center justify-center cursor-pointer hover:bg-primary-container active:scale-95 transition-all border-2 border-white z-10"
                title="Unggah Foto Profil"
              >
                <span class="material-symbols-outlined text-[16px]">photo_camera</span>
                <input type="file" id="avatarFileInput" accept="image/*" class="hidden" />
              </label>
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

            <h2 class="font-headline-md text-xl font-bold text-text-heading" id="profileNameDisplay">${user.name || 'Pengguna'}</h2>
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

            <div class="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full ${user.isVerified ? 'bg-secondary-container/50 text-on-secondary-container' : 'bg-surface-container text-text-body'} text-xs font-semibold">
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
            <h3 class="font-headline-md text-xs font-bold text-text-heading px-1 uppercase tracking-wider">
              Rekening & E-Wallet Pencairan
            </h3>
            <div class="bg-surface-card rounded-3xl p-5 shadow-sm border border-surface-container flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">account_balance</span>
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

          <!-- Preferences Section (Theme Malam / Siang) -->
          <section class="flex flex-col gap-2">
            <h3 class="font-label-md text-xs font-bold text-text-heading px-1 uppercase tracking-wider">
              Preferensi Tampilan
            </h3>
            <div class="bg-surface-card rounded-3xl shadow-sm border border-surface-container overflow-hidden">
              <button
                type="button"
                id="btnToggleThemeProfile"
                class="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left group cursor-pointer"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-[20px]">
                      ${document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark') ? 'dark_mode' : 'light_mode'}
                    </span>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-text-heading block">Tema Aplikasi</span>
                    <span class="text-[11px] text-text-body">
                      ${document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark') ? 'Tema Malam (Gelap)' : 'Tema Siang (Terang)'}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container text-primary">
                    ${document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark') ? 'Malam' : 'Siang'}
                  </span>
                  <span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                </div>
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
    // Avatar upload / update & sync
    const avatarInput = container.querySelector('#avatarFileInput');
    const removeAvatarBtn = container.querySelector('#btnRemoveAvatar');

    avatarInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        this._notification.error('Silakan pilih file gambar yang valid (JPG, PNG, WebP).');
        return;
      }

      const cameraLabel = container.querySelector('label[for="avatarFileInput"]');
      const originalLabel = cameraLabel ? cameraLabel.innerHTML : '';
      if (cameraLabel) {
        cameraLabel.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>';
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
        this._notification.success('Foto profil berhasil diunggah dan diperbarui!');
      } catch (err) {
        console.error('Upload avatar error:', err);
        this._notification.error('Gagal memperbarui foto profil: ' + (err.message || 'Terjadi kesalahan'));
      } finally {
        if (cameraLabel) {
          cameraLabel.innerHTML = originalLabel;
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

    const editBankBtn = container.querySelector('#btnEditBank');
    const resetPassBtn = container.querySelector('#btnResetPassword');
    const logoutBtn = container.querySelector('#btnLogout');
    const infoBtns = container.querySelectorAll('.btn-info-modal');
    const toggleThemeBtn = container.querySelector('#btnToggleThemeProfile');

    // Handler Ganti Tema dari Profil
    toggleThemeBtn?.addEventListener('click', () => {
      const currentlyDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
      const nextTheme = currentlyDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      try {
        localStorage.setItem('panenkunci:theme', nextTheme);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('panenkunci:theme-changed', { detail: { theme: nextTheme } }));

      // Update tampilan tombol seketika
      const themeDesc = toggleThemeBtn.querySelector('span.text-\\[11px\\]');
      const themeBadge = toggleThemeBtn.querySelector('span.rounded-full');
      const themeIcon = toggleThemeBtn.querySelector('.material-symbols-outlined');
      if (themeDesc) themeDesc.textContent = nextTheme === 'dark' ? 'Tema Malam (Gelap)' : 'Tema Siang (Terang)';
      if (themeBadge) themeBadge.textContent = nextTheme === 'dark' ? 'Malam' : 'Siang';
      if (themeIcon) themeIcon.textContent = nextTheme === 'dark' ? 'dark_mode' : 'light_mode';
    });

    // Modal Edit Rekening / E-Wallet
    editBankBtn?.addEventListener('click', () => {
      const user = this._authService.getCurrentUser();
      if (!user) return;

      const currentBank = (user.bankName || '').trim();
      const bankCategories = [
        {
          group: 'E-Wallet',
          items: ['DANA', 'GoPay', 'ShopeePay']
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
