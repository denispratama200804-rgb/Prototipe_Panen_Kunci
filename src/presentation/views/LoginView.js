import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * LoginView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman autentikasi masuk untuk pengguna Panen Kunci.
 */
export class LoginView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._authService = container.resolve('AuthService');
    this._notification = container.resolve('NotificationService');
  }

  render() {
    return `
      <div class="flex flex-col w-full min-h-screen bg-surface items-center justify-center py-12 px-margin-mobile relative overflow-hidden">
        <!-- Decorative Glow -->
        <div class="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <!-- Login Card -->
        <div class="w-full max-w-[400px] bg-surface-card rounded-3xl shadow-xl border border-surface-container p-6 relative z-10">
          <!-- Logo & Heading -->
          <div class="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="Panen Kunci Logo" class="w-14 h-14 object-contain mb-3 rounded-xl shadow-sm" onerror="this.src='https://lh3.googleusercontent.com/aida-public/AB6AXuB2Fwib7SUIUPPKcJBes6nFpQh4N_Ad3DG0amKUTqIZpaG7vjX0iYURjJ1oU7kON_ukR314JOoeh8TGScVTliV1qM42iypBlZp3F54000'"/>
            <h1 class="font-headline-md text-2xl font-bold text-text-heading text-center">Selamat Datang Kembali</h1>
            <p class="font-body-md text-xs text-text-body mt-1 text-center">Silakan masuk ke akun Panen Kunci Anda</p>
          </div>

          <!-- Form -->
          <form id="loginForm" class="flex flex-col gap-4 w-full">
            <!-- Email / Username -->
            <div class="flex flex-col gap-1.5">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="loginEmail">
                Email atau Username
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">person</span>
                <input
                  id="loginEmail"
                  type="text"
                  placeholder="budi.santoso@example.com"
                  value="budi.santoso@example.com"
                  required
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-4 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline/50"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between items-center">
                <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="loginPassword">
                  Kata Sandi
                </label>
                <button type="button" id="btnForgotPassword" class="text-xs font-semibold text-primary hover:underline">
                  Lupa Kata Sandi?
                </button>
              </div>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">lock</span>
                <input
                  id="loginPassword"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value="Password123!"
                  required
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-11 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline/50"
                />
                <button type="button" id="toggleLoginPassword" class="absolute right-3 text-outline hover:text-text-heading p-1 transition-colors" aria-label="Lihat kata sandi">
                  <span class="material-symbols-outlined text-[20px]" id="iconLoginPassword">visibility_off</span>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              id="btnLoginSubmit"
              type="submit"
              class="w-full bg-primary text-on-primary font-label-md font-bold text-sm rounded-2xl py-3.5 mt-2 shadow-lg shadow-primary/25 hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Masuk Sekarang</span>
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>

          <!-- Divider -->
          <div class="flex items-center gap-3 my-5 w-full">
            <div class="h-[1px] flex-1 bg-outline-variant/30"></div>
            <span class="text-[11px] text-outline uppercase tracking-wider font-semibold">Atau</span>
            <div class="h-[1px] flex-1 bg-outline-variant/30"></div>
          </div>

          <!-- Social Logins -->
          <div class="flex flex-col gap-2.5 w-full">
            <button type="button" id="btnGoogleLogin" class="w-full bg-surface-container-low border border-surface-container text-text-heading font-label-md text-xs font-semibold rounded-2xl py-3 flex items-center justify-center gap-2.5 hover:bg-surface-container transition-all active:scale-[0.98]">
              <svg class="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path></svg>
              <span>Lanjutkan dengan Google</span>
            </button>
          </div>

          <!-- Footer -->
          <div class="mt-6 text-center">
            <p class="font-body-md text-xs text-text-body">
              Belum punya akun?
              <a href="#/register" class="font-semibold text-primary hover:underline ml-1">Daftar Sekarang</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  mount(container) {
    const form = container.querySelector('#loginForm');
    const emailInput = container.querySelector('#loginEmail');
    const passInput = container.querySelector('#loginPassword');
    const togglePassBtn = container.querySelector('#toggleLoginPassword');
    const passIcon = container.querySelector('#iconLoginPassword');
    const submitBtn = container.querySelector('#btnLoginSubmit');
    const forgotBtn = container.querySelector('#btnForgotPassword');
    const googleBtn = container.querySelector('#btnGoogleLogin');

    // Toggle password
    togglePassBtn?.addEventListener('click', () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        passIcon.textContent = 'visibility';
        passIcon.classList.add('text-primary');
      } else {
        passInput.type = 'password';
        passIcon.textContent = 'visibility_off';
        passIcon.classList.remove('text-primary');
      }
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passInput.value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Memverifikasi...</span>';

      const res = await this._authService.login(email, password);

      if (res.success) {
        this._notification.showModal({
          title: 'Login Berhasil!',
          message: 'Selamat datang kembali di Panen Kunci. Menyiapkan dashboard Anda...',
          type: 'success',
          confirmText: 'Buka Dashboard',
          onConfirm: () => {
            window.location.hash = '/dashboard';
          }
        });
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Masuk Sekarang</span><span class="material-symbols-outlined text-[20px]">arrow_forward</span>';
        this._notification.error(res.message || 'Login gagal.');
      }
    });

    // Social login
    googleBtn?.addEventListener('click', () => {
      this._notification.info('Mengarahkan ke Google OAuth...');
      setTimeout(async () => {
        await this._authService.login('budi.santoso@gmail.com', 'google_auth');
        window.location.hash = '/dashboard';
      }, 900);
    });

    // Lupa password modal
    forgotBtn?.addEventListener('click', () => {
      this._notification.showModal({
        title: 'Reset Kata Sandi',
        message: 'Masukkan alamat email Anda untuk menerima link reset kata sandi:',
        html: `
          <input type="email" id="resetEmail" class="w-full bg-bg-subtle text-sm p-3 rounded-xl border border-outline-variant/50 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="email@example.com" value="${emailInput.value}" />
        `,
        type: 'info',
        confirmText: 'Kirim Link Reset',
        showCancel: true,
        onConfirm: () => {
          this._notification.success('Link reset kata sandi telah dikirim ke email Anda.');
        }
      });
    });
  }
}
