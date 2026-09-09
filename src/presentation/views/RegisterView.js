import { IComponent } from '../../core/interfaces/IComponent.js';
import { googleClientId } from '../../infrastructure/supabase/supabaseClient.js';

/**
 * RegisterView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman pendaftaran akun baru langsung tersimpan ke Supabase (Auth + Tabel public.users).
 */
export class RegisterView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._authService = container.resolve('AuthService');
    this._authValidator = container.resolve('AuthValidator');
    this._notification = container.resolve('NotificationService');
  }

  render() {
    return `
      <div class="flex flex-col w-full min-h-screen bg-surface items-center justify-center py-12 px-margin-mobile relative overflow-hidden">
        <!-- Ambient Glow -->
        <div class="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>

        <!-- Register Card -->
        <div class="w-full max-w-[420px] bg-surface-card rounded-3xl shadow-xl border border-surface-container p-6 relative z-10">
          <!-- Heading -->
          <div class="flex flex-col items-center mb-6">
            <img src="/Logo_PK.jpg" alt="Panen Kunci Logo" class="w-14 h-14 object-contain mb-3 rounded-xl shadow-sm" onerror="this.src='/logo.png'"/>
            <h1 class="font-headline-md text-2xl font-bold text-text-heading text-center">Buat Akun Baru</h1>
            <p class="font-body-md text-xs text-text-body mt-1 text-center">Mulai konversi API Key Anda menjadi uang tunai</p>
          </div>

          <!-- Form -->
          <form id="registerForm" class="flex flex-col gap-3.5 w-full">
            <!-- Full Name -->
            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="regName">
                Nama Lengkap
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">badge</span>
                <input
                  id="regName"
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  required
                  autocomplete="name"
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-4 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
            </div>

            <!-- Email -->
            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="regEmail">
                Alamat Email
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">mail</span>
                <input
                  id="regEmail"
                  type="email"
                  placeholder="nama@email.com"
                  required
                  autocomplete="email"
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-4 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="regPassword">
                Kata Sandi
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">lock</span>
                <input
                  id="regPassword"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  required
                  autocomplete="new-password"
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-11 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button type="button" id="toggleRegPassword" class="absolute right-3 text-outline hover:text-text-heading p-1 transition-colors" aria-label="Lihat kata sandi">
                  <span class="material-symbols-outlined text-[20px]" id="iconRegPassword">visibility_off</span>
                </button>
              </div>

              <!-- Password Strength Meter -->
              <div class="flex items-center gap-1.5 mt-1.5 px-0.5">
                <div class="flex-1 h-1.5 rounded-full bg-surface-container transition-all" id="str1"></div>
                <div class="flex-1 h-1.5 rounded-full bg-surface-container transition-all" id="str2"></div>
                <div class="flex-1 h-1.5 rounded-full bg-surface-container transition-all" id="str3"></div>
                <span class="text-[11px] font-semibold text-outline ml-1 min-w-[50px] text-right" id="strLabel">Lemah</span>
              </div>
            </div>

            <!-- Confirm Password -->
            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="regConfirmPassword">
                Konfirmasi Kata Sandi
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">lock_reset</span>
                <input
                  id="regConfirmPassword"
                  type="password"
                  placeholder="Ulangi kata sandi Anda"
                  required
                  autocomplete="new-password"
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-4 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
            </div>

            <!-- Submit Button -->
            <button
              id="btnRegSubmit"
              type="submit"
              class="w-full bg-primary text-on-primary font-label-md font-bold text-sm rounded-2xl py-3.5 mt-3 shadow-lg shadow-primary/25 hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Daftar Sekarang</span>
              <span class="material-symbols-outlined text-[20px]">how_to_reg</span>
            </button>
          </form>

          <!-- Divider -->
          <div class="relative flex items-center my-5">
            <div class="flex-grow border-t border-surface-container"></div>
            <span class="flex-shrink mx-3 text-outline text-xs font-medium">atau</span>
            <div class="flex-grow border-t border-surface-container"></div>
          </div>

          <!-- Google Register Button Container -->
          <div class="relative w-full">
            <button
              type="button"
              id="btnGoogleRegister"
              class="w-full bg-surface-card hover:bg-bg-subtle active:scale-[0.98] text-text-heading font-label-md font-semibold text-sm rounded-2xl py-3.5 px-4 border border-outline-variant/40 shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <svg class="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.97 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span id="txtGoogleRegister">Daftar dengan Google</span>
            </button>
            <div id="gsiRegisterOverlay" class="absolute inset-0 opacity-0 overflow-hidden cursor-pointer pointer-events-auto flex items-center justify-center"></div>
          </div>

          <!-- Footer -->
          <div class="mt-6 text-center">
            <p class="font-body-md text-xs text-text-body">
              Sudah memiliki akun?
              <a href="#/login" class="font-semibold text-primary hover:underline ml-1">Masuk di sini</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  mount(container) {
    const form = container.querySelector('#registerForm');
    const nameInput = container.querySelector('#regName');
    const emailInput = container.querySelector('#regEmail');
    const passInput = container.querySelector('#regPassword');
    const confirmInput = container.querySelector('#regConfirmPassword');
    const togglePassBtn = container.querySelector('#toggleRegPassword');
    const passIcon = container.querySelector('#iconRegPassword');
    const submitBtn = container.querySelector('#btnRegSubmit');

    const s1 = container.querySelector('#str1');
    const s2 = container.querySelector('#str2');
    const s3 = container.querySelector('#str3');
    const strLabel = container.querySelector('#strLabel');

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

    // Password strength check
    passInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      const strength = this._authValidator.checkPasswordStrength(val);

      s1.className = 'flex-1 h-1.5 rounded-full bg-surface-container transition-all';
      s2.className = 'flex-1 h-1.5 rounded-full bg-surface-container transition-all';
      s3.className = 'flex-1 h-1.5 rounded-full bg-surface-container transition-all';
      strLabel.textContent = strength.label;

      if (!val) {
        strLabel.textContent = 'Lemah';
        strLabel.className = 'text-[11px] font-semibold text-outline ml-1 min-w-[50px] text-right';
        return;
      }

      if (strength.score >= 1) {
        s1.className = 'flex-1 h-1.5 rounded-full bg-error-ruby transition-all';
        strLabel.className = 'text-[11px] font-semibold text-error-ruby ml-1 min-w-[50px] text-right';
      }
      if (strength.score >= 2) {
        s1.className = 'flex-1 h-1.5 rounded-full bg-warning-amber transition-all';
        s2.className = 'flex-1 h-1.5 rounded-full bg-warning-amber transition-all';
        strLabel.className = 'text-[11px] font-semibold text-warning-amber ml-1 min-w-[50px] text-right';
      }
      if (strength.score >= 3) {
        s1.className = 'flex-1 h-1.5 rounded-full bg-secondary transition-all';
        s2.className = 'flex-1 h-1.5 rounded-full bg-secondary transition-all';
        s3.className = 'flex-1 h-1.5 rounded-full bg-secondary transition-all';
        strLabel.className = 'text-[11px] font-semibold text-secondary ml-1 min-w-[50px] text-right';
      }
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passInput.value;
      const confirmPassword = confirmInput.value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Proses</span>';

      const res = await this._authService.register({ name, email, password, confirmPassword });

      if (res.success) {
        this._notification.showModal({
          title: 'Pendaftaran Berhasil!',
          message: res.message || 'Pendaftaran Anda telah berhasil! Silahkan setor Key API dan hasilkan uang sebanyak banyak nya!',
          type: 'success',
          confirmText: res.requireEmailConfirmation ? 'Ke Halaman Login' : 'Buka Dashboard',
          onConfirm: () => {
            window.location.hash = res.requireEmailConfirmation ? '/login' : '/dashboard';
          }
        });
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Daftar Sekarang</span><span class="material-symbols-outlined text-[20px]">how_to_reg</span>';
        this._notification.error(res.errors ? res.errors[0] : 'Pendaftaran gagal.');
      }
    });

    // Register via Google (Google Identity Services GIS + Fallback OAuth)
    const googleBtn = container.querySelector('#btnGoogleRegister');
    const googleTxt = container.querySelector('#txtGoogleRegister');
    const gsiOverlay = container.querySelector('#gsiRegisterOverlay');

    const handleGoogleIdToken = async (credential) => {
      googleBtn.disabled = true;
      googleBtn.classList.add('opacity-75', 'cursor-not-allowed');
      if (googleTxt) googleTxt.textContent = 'Memverifikasi akun Google...';

      const res = await this._authService.loginWithGoogleIdToken(credential);
      if (res.success) {
        this._notification.success('Pendaftaran / Login Google berhasil! Selamat datang.');
        window.location.hash = '/dashboard';
      } else {
        googleBtn.disabled = false;
        googleBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (googleTxt) googleTxt.textContent = 'Daftar dengan Google';
        this._notification.error(res.message || 'Gagal mendaftar dengan Google.');
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
            text: 'signup_with',
            shape: 'pill'
          });
          const iframe = gsiOverlay.querySelector('iframe');
          if (iframe) {
            iframe.style.width = '100%';
            iframe.style.height = '100%';
          }
        }
      } catch (err) {
        console.warn('[GSI Register] Setup notice:', err);
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

    // Fallback click handler
    googleBtn?.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.classList.add('opacity-75', 'cursor-not-allowed');
      if (googleTxt) googleTxt.textContent = 'Menghubungkan ke Google...';

      const res = await this._authService.loginWithGoogle();
      if (!res.success) {
        googleBtn.disabled = false;
        googleBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (googleTxt) googleTxt.textContent = 'Daftar dengan Google';
        this._notification.error(res.message || 'Gagal memulai autentikasi Google.');
      }
    });
  }
}
