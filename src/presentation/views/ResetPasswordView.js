import { IComponent } from '../../core/interfaces/IComponent.js';
import { supabase, isSupabaseConfigured } from '../../infrastructure/supabase/supabaseClient.js';

/**
 * ResetPasswordView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman untuk mengatur kata sandi baru setelah pengguna membuka tautan pemulihan dari email.
 */
export class ResetPasswordView extends IComponent {
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

        <!-- Reset Password Card -->
        <div class="w-full max-w-[400px] bg-surface-card rounded-3xl shadow-xl border border-surface-container p-6 relative z-10">
          <!-- Logo & Heading -->
          <div class="flex flex-col items-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
              <span class="material-symbols-outlined text-[32px]">lock_reset</span>
            </div>
            <h1 class="font-headline-md text-2xl font-bold text-text-heading text-center">Kata Sandi Baru</h1>
            <p class="font-body-md text-xs text-text-body mt-1 text-center">
              Masukkan kata sandi baru untuk mengamankan akun Panen Kunci Anda.
            </p>
          </div>

          <!-- Session Warning Notice (hidden by default) -->
          <div id="sessionNotice" class="hidden mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs flex items-start gap-2.5 leading-relaxed">
            <span class="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">info</span>
            <span>Pastikan Anda membuka halaman ini melalui tautan resmi yang dikirimkan ke email Anda.</span>
          </div>

          <!-- Form -->
          <form id="resetPasswordForm" class="flex flex-col gap-4 w-full">
            <!-- New Password -->
            <div class="flex flex-col gap-1.5">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="newPassword">
                Kata Sandi Baru
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">lock</span>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  required
                  autocomplete="new-password"
                  minlength="6"
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-11 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline/50"
                />
                <button
                  type="button"
                  id="toggleNewPassword"
                  class="absolute right-3.5 text-outline hover:text-text-heading transition-colors"
                  aria-label="Tampilkan kata sandi"
                >
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
            </div>

            <!-- Confirm New Password -->
            <div class="flex flex-col gap-1.5">
              <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="confirmPassword">
                Konfirmasi Kata Sandi Baru
              </label>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">lock_clock</span>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi kata sandi baru"
                  required
                  autocomplete="new-password"
                  minlength="6"
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-11 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline/50"
                />
                <button
                  type="button"
                  id="toggleConfirmPassword"
                  class="absolute right-3.5 text-outline hover:text-text-heading transition-colors"
                  aria-label="Tampilkan konfirmasi kata sandi"
                >
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
            </div>

            <!-- Password Requirements Hint -->
            <div class="flex items-center gap-1.5 text-xs text-text-body/80 mt-1">
              <span class="material-symbols-outlined text-[16px] text-primary">check_circle</span>
              <span>Gunakan minimal 6 karakter kombinasi huruf & angka.</span>
            </div>

            <!-- Submit Button -->
            <button
              id="submitResetBtn"
              type="submit"
              class="w-full mt-2 py-3.5 rounded-full bg-primary text-on-primary font-label-md font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-container transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Simpan Kata Sandi Baru</span>
              <span class="material-symbols-outlined text-[20px]">check</span>
            </button>
          </form>

          <!-- Back to Login Link -->
          <div class="mt-6 text-center">
            <a href="#/login" class="font-body-md text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Kembali ke Halaman Masuk</span>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  mount(container) {
    const form = container.querySelector('#resetPasswordForm');
    const newPasswordInput = container.querySelector('#newPassword');
    const confirmPasswordInput = container.querySelector('#confirmPassword');
    const toggleNewPassBtn = container.querySelector('#toggleNewPassword');
    const toggleConfirmPassBtn = container.querySelector('#toggleConfirmPassword');
    const submitBtn = container.querySelector('#submitResetBtn');
    const sessionNotice = container.querySelector('#sessionNotice');

    // Periksa status sesi aktif pemulihan
    if (isSupabaseConfigured()) {
      setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session && !this._authService.isAuthenticated()) {
            sessionNotice?.classList.remove('hidden');
          } else {
            sessionNotice?.classList.add('hidden');
          }
        }).catch(() => {});
      }, 500);
    }

    // Toggle lihat kata sandi
    const setupToggle = (btn, input) => {
      if (!btn || !input) return;
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = isPassword ? 'visibility_off' : 'visibility';
        }
      });
    };

    setupToggle(toggleNewPassBtn, newPasswordInput);
    setupToggle(toggleConfirmPassBtn, confirmPasswordInput);

    // Form submit handler
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newPass = newPasswordInput?.value?.trim() || '';
      const confirmPass = confirmPasswordInput?.value?.trim() || '';

      if (!newPass || newPass.length < 6) {
        this._notification.error('Kata sandi minimal 6 karakter.');
        newPasswordInput?.focus();
        return;
      }

      if (newPass !== confirmPass) {
        this._notification.error('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.');
        confirmPasswordInput?.focus();
        return;
      }

      // Loading state
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
      submitBtn.innerHTML = `
        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span>Menyimpan Kata Sandi...</span>
      `;

      try {
        const res = await this._authService.updateUserPassword(newPass);

        if (res.success) {
          this._notification.success(res.message || 'Kata sandi berhasil diperbarui! Silakan masuk kembali.');
          setTimeout(() => {
            window.location.hash = '/login';
          }, 1200);
        } else {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
          submitBtn.innerHTML = `
            <span>Simpan Kata Sandi Baru</span>
            <span class="material-symbols-outlined text-[20px]">check</span>
          `;
          this._notification.error(res.message || 'Gagal memperbarui kata sandi.');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        submitBtn.innerHTML = `
          <span>Simpan Kata Sandi Baru</span>
          <span class="material-symbols-outlined text-[20px]">check</span>
        `;
        this._notification.error('Terjadi kesalahan: ' + err.message);
      }
    });
  }
}
