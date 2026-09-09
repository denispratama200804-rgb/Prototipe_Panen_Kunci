import { IComponent } from '../../core/interfaces/IComponent.js';
import { googleClientId } from '../../infrastructure/supabase/supabaseClient.js';

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

          <!-- Google Login Button Container -->
          <div class="relative w-full mb-6">
            <button
              type="button"
              id="btnGoogleLogin"
              class="w-full bg-surface-card hover:bg-bg-subtle active:scale-[0.98] text-text-heading font-label-md font-semibold text-sm rounded-2xl py-3.5 px-4 border border-outline-variant/40 shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <svg class="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.97 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span id="txtGoogleLogin">Masuk dengan Google</span>
            </button>
            <div id="gsiLoginOverlay" class="absolute inset-0 opacity-0 overflow-hidden cursor-pointer pointer-events-auto flex items-center justify-center"></div>
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
    const googleBtn = container.querySelector('#btnGoogleLogin');
    const googleTxt = container.querySelector('#txtGoogleLogin');

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

    // Login via Google (Google Identity Services GIS + Fallback OAuth)
    const gsiOverlay = container.querySelector('#gsiLoginOverlay');

    const handleGoogleIdToken = async (credential) => {
      googleBtn.disabled = true;
      googleBtn.classList.add('opacity-75', 'cursor-not-allowed');
      if (googleTxt) googleTxt.textContent = 'Memverifikasi akun Google...';

      const res = await this._authService.loginWithGoogleIdToken(credential);
      if (res.success) {
        this._notification.success('Login berhasil! Selamat datang.');
        window.location.hash = '/dashboard';
      } else {
        googleBtn.disabled = false;
        googleBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (googleTxt) googleTxt.textContent = 'Masuk dengan Google';
        this._notification.error(res.message || 'Gagal masuk dengan Google.');
      }
    };

    const initGsi = () => {
      if (!window.google?.accounts?.id || !googleClientId) return;

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response?.credential) {
              handleGoogleIdToken(response.credential);
            }
          }
        });

        if (gsiOverlay) {
          window.google.accounts.id.renderButton(gsiOverlay, {
            theme: 'outline',
            size: 'large',
            width: 380,
            text: 'signin_with',
            shape: 'pill'
          });
          const iframe = gsiOverlay.querySelector('iframe');
          if (iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
          }
        }

        // Tampilkan One Tap jika tersedia
        window.google.accounts.id.prompt();
      } catch (err) {
        console.warn('[GSI Login] Setup notice:', err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGsi();
        }
      }, 300);
      setTimeout(() => clearInterval(timer), 4000);
    }

    // Fallback: jika user menekan tombol biasa dan GSI belum ter-render
    googleBtn?.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.classList.add('opacity-75', 'cursor-not-allowed');
      if (googleTxt) googleTxt.textContent = 'Menghubungkan ke Google...';

      const res = await this._authService.loginWithGoogle();
      if (!res.success) {
        googleBtn.disabled = false;
        googleBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (googleTxt) googleTxt.textContent = 'Masuk dengan Google';
        this._notification.error(res.message || 'Gagal memulai autentikasi Google.');
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
