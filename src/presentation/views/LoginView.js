import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * LoginView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman autentikasi masuk langsung menggunakan akun asli di Supabase.
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
            <img src="/Logo_PK.jpg" alt="Panen Kunci Logo" class="w-14 h-14 object-contain mb-3 rounded-xl shadow-sm" onerror="this.src='/logo.png'"/>
            <h1 class="font-headline-md text-2xl font-bold text-text-heading text-center">Selamat Datang</h1>
            <p class="font-body-md text-xs text-text-body mt-1 text-center">Masuk dengan akun Panen Kunci Anda</p>
          </div>

          <!-- Form -->
          <form id="loginForm" class="flex flex-col gap-4 w-full">
            <!-- Email -->
            <div class="flex flex-col gap-1.5">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="loginEmail">
                Alamat Email
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">mail</span>
                <input
                  id="loginEmail"
                  type="email"
                  placeholder="nama@email.com"
                  required
                  autocomplete="email"
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
                  placeholder="Masukkan kata sandi Anda"
                  required
                  autocomplete="current-password"
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
          <div class="relative flex items-center my-6">
            <div class="flex-grow border-t border-surface-container"></div>
            <span class="flex-shrink mx-3 text-outline text-xs font-medium">atau</span>
            <div class="flex-grow border-t border-surface-container"></div>
          </div>

          <!-- Register Link -->
          <div class="text-center">
            <p class="font-body-md text-xs text-text-body">
              Belum memiliki akun?
              <a href="#/register" class="font-semibold text-primary hover:underline ml-1">Daftar sekarang</a>
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

    // Toggle password visibility
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

    // Form submit login ke Supabase
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passInput.value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Memverifikasi akun...</span>';

      const res = await this._authService.login(email, password);

      if (res.success) {
        if (res.role === 'admin') {
          this._notification.success(res.message || 'Login berhasil sebagai Administrator!');
          setTimeout(() => {
            window.location.href = res.redirectTo || '/admin_panel/index.html';
          }, 300);
        } else {
          this._notification.success(res.message || 'Login berhasil! Selamat datang.');
          window.location.hash = '/dashboard';
        }
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Masuk Sekarang</span><span class="material-symbols-outlined text-[20px]">arrow_forward</span>';
        this._notification.error(res.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
      }
    });

    // Lupa password modal
    forgotBtn?.addEventListener('click', () => {
      this._notification.showModal({
        title: 'Reset Kata Sandi',
        message: 'Masukkan email akun Supabase Anda untuk menerima tautan reset kata sandi:',
        html: `
          <input type="email" id="resetEmail" class="w-full bg-bg-subtle text-sm p-3 rounded-xl border border-outline-variant/50 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="nama@email.com" value="${emailInput.value}" />
        `,
        type: 'info',
        confirmText: 'Kirim Link Reset',
        showCancel: true,
        onConfirm: async () => {
          const resetEmail = document.getElementById('resetEmail')?.value?.trim();
          if (!resetEmail) {
            this._notification.error('Alamat email wajib diisi.');
            return;
          }
          this._notification.info('Permintaan reset kata sandi telah diproses.');
        }
      });
    });
  }
}
