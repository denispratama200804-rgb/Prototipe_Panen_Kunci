import { IComponent } from '../../core/interfaces/IComponent.js';
import { supabase, isSupabaseConfigured } from '../../infrastructure/supabase/supabaseClient.js';

/**
 * ResetPasswordView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman pemulihan dan pembuatan kata sandi baru.
 * Mendukung verifikasi token_hash langsung (anti bot scanner) dan input kode pemulihan (OTP) 8-digit.
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
    this._parsedParams = this._parseUrlParams();
  }

  /**
   * Ekstrak parameter dari hash URL dan search query
   * @private
   */
  _parseUrlParams() {
    if (typeof window === 'undefined') {
      return {
        tokenHash: '',
        type: '',
        email: '',
        code: '',
        error: '',
        errorDesc: ''
      };
    }

    const rawHash = window.location?.hash || '';
    const rawSearch = window.location?.search || '';
    
    // Gabungkan query string dari hash maupun search
    let queryString = '';
    if (rawHash.includes('?')) {
      queryString = rawHash.split('?')[1] || '';
    } else if (rawSearch) {
      queryString = rawSearch.replace(/^\?/, '');
    }

    // Tangani parameter yang dipisahkan fragment ganda (#...#error=...)
    if (rawHash.includes('#')) {
      const parts = rawHash.split('#');
      for (const part of parts) {
        if (part.includes('=')) {
          queryString += (queryString ? '&' : '') + part;
        }
      }
    }

    const params = new URLSearchParams(queryString);
    return {
      tokenHash: params.get('token_hash') || '',
      type: params.get('type') || '',
      email: params.get('email') || '',
      code: params.get('code') || params.get('token') || '',
      error: params.get('error') || params.get('error_code') || '',
      errorDesc: params.get('error_description') || ''
    };
  }

  render() {
    const { tokenHash, email, error } = this._parsedParams;
    const isOtpExpired = error === 'otp_expired' || error.includes('expired') || error.includes('access_denied');
    const hasDirectToken = Boolean(tokenHash);
    const needOtpInput = !hasDirectToken || isOtpExpired;

    return `
      <div class="flex flex-col w-full min-h-screen bg-surface items-center justify-center py-12 px-margin-mobile relative overflow-hidden">
        <!-- Decorative Background Glow -->
        <div class="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -left-12 w-72 h-72 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <!-- Reset Password Card -->
        <div class="w-full max-w-[420px] bg-surface-card rounded-3xl shadow-xl border border-surface-container p-6 sm:p-7 relative z-10 transition-all">
          <!-- Logo & Heading -->
          <div class="flex flex-col items-center mb-5 text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
              <span class="material-symbols-outlined text-[32px]">lock_reset</span>
            </div>
            <h1 class="font-headline-md text-2xl font-bold text-text-heading">Kata Sandi Baru</h1>
            <p class="font-body-md text-xs text-text-body mt-1">
              Buat kata sandi baru yang kuat untuk mengamankan akun Panen Kunci Anda.
            </p>
          </div>

          <!-- Status Banner: Token Valid -->
          ${hasDirectToken && !isOtpExpired ? `
            <div class="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs flex items-center gap-2.5">
              <span class="material-symbols-outlined text-emerald-600 text-[20px] shrink-0">verified_user</span>
              <span class="leading-tight">Tautan pemulihan terverifikasi ${email ? `untuk <strong class="text-emerald-950">${decodeURIComponent(email)}</strong>` : ''}. Silakan tetapkan kata sandi baru.</span>
            </div>
          ` : ''}

          <!-- Status Banner: Token Expired or Link Used -->
          ${isOtpExpired ? `
            <div class="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs flex flex-col gap-2">
              <div class="flex items-center gap-2 font-semibold text-amber-950">
                <span class="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                <span>Tautan Email Telah Digunakan / Kedaluwarsa</span>
              </div>
              <p class="text-[11px] leading-relaxed text-amber-900/90">
                Sistem keamanan email mungkin telah memeriksa tautan Anda. Silakan masukkan <strong>Kode Pemulihan 8-Digit (OTP)</strong> dari email Anda di bawah ini, atau minta pengiriman ulang tautan baru.
              </p>
            </div>
          ` : ''}

          <!-- Form -->
          <form id="resetPasswordForm" class="flex flex-col gap-4 w-full">
            <!-- Email Input (jika belum ada token langsung atau terjadi token expired) -->
            ${needOtpInput ? `
              <div class="flex flex-col gap-1.5" id="emailFieldGroup">
                <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="resetEmailInput">
                  Alamat Email Akun
                </label>
                <div class="relative flex items-center">
                  <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">mail</span>
                  <input
                    id="resetEmailInput"
                    type="email"
                    placeholder="nama@email.com"
                    value="${email ? decodeURIComponent(email) : ''}"
                    required
                    autocomplete="email"
                    class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-4 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline/50"
                  />
                </div>
              </div>

              <!-- OTP Code Input -->
              <div class="flex flex-col gap-1.5" id="otpFieldGroup">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="resetOtpInput">
                    Kode Pemulihan (OTP)
                  </label>
                  <span class="text-[11px] text-primary font-medium">8-Digit di Email</span>
                </div>
                <div class="relative flex items-center">
                  <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">pin</span>
                  <input
                    id="resetOtpInput"
                    type="text"
                    inputmode="numeric"
                    placeholder="Contoh: 12345678"
                    maxlength="10"
                    required
                    class="w-full bg-bg-subtle text-text-heading font-mono text-sm tracking-wider font-semibold rounded-xl py-3 pl-11 pr-4 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline/50 placeholder:font-sans placeholder:tracking-normal"
                  />
                </div>
              </div>
            ` : ''}

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
            <div class="flex items-center gap-1.5 text-xs text-text-body/80 mt-0.5">
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

          <!-- Alternative Actions -->
          <div class="mt-6 pt-5 border-t border-surface-container flex flex-col items-center gap-3 text-center">
            <button
              type="button"
              id="btnResendLink"
              class="font-body-md text-xs font-medium text-primary hover:underline inline-flex items-center gap-1.5 transition-colors"
            >
              <span class="material-symbols-outlined text-[16px]">forward_to_inbox</span>
              <span>Kirim Ulang Email Pemulihan</span>
            </button>

            <a href="#/login" class="font-body-md text-xs font-semibold text-text-body hover:text-primary transition-colors inline-flex items-center gap-1">
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
    const emailInput = container.querySelector('#resetEmailInput');
    const otpInput = container.querySelector('#resetOtpInput');
    const newPasswordInput = container.querySelector('#newPassword');
    const confirmPasswordInput = container.querySelector('#confirmPassword');
    const toggleNewPassBtn = container.querySelector('#toggleNewPassword');
    const toggleConfirmPassBtn = container.querySelector('#toggleConfirmPassword');
    const submitBtn = container.querySelector('#submitResetBtn');
    const btnResendLink = container.querySelector('#btnResendLink');

    const tokenHash = this._parsedParams.tokenHash;

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

    // Kirim Ulang Email Pemulihan Handler
    btnResendLink?.addEventListener('click', async () => {
      const defaultEmail = emailInput?.value?.trim() || (this._parsedParams.email ? decodeURIComponent(this._parsedParams.email) : '');
      const email = prompt('Masukkan alamat email akun Panen Kunci Anda:', defaultEmail);
      if (!email || !email.trim()) return;

      const trimmedEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        this._notification.error('Format alamat email tidak valid.');
        return;
      }

      const origText = btnResendLink.innerHTML;
      btnResendLink.disabled = true;
      btnResendLink.innerHTML = `
        <span class="inline-block w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
        <span>Mengirim Tautan Baru...</span>
      `;

      try {
        const res = await this._authService.sendPasswordResetEmail(trimmedEmail);
        if (res.success) {
          this._notification.success(res.message || 'Tautan pemulihan baru telah dikirimkan ke email Anda.');
        } else {
          this._notification.error(res.message || 'Gagal mengirimkan email pemulihan.');
        }
      } catch (err) {
        this._notification.error('Terjadi kesalahan: ' + err.message);
      } finally {
        btnResendLink.disabled = false;
        btnResendLink.innerHTML = origText;
      }
    });

    // Form Submit Handler
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newPass = newPasswordInput?.value?.trim() || '';
      const confirmPass = confirmPasswordInput?.value?.trim() || '';
      const emailVal = emailInput?.value?.trim() || (this._parsedParams.email ? decodeURIComponent(this._parsedParams.email) : '');
      const otpVal = otpInput?.value?.trim() || '';

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

      // Validasi kelengkapan OTP jika tidak ada tokenHash langsung
      if (!tokenHash && (!otpVal || !emailVal)) {
        this._notification.error('Harap isi alamat email dan kode OTP 8-digit dari email Anda.');
        if (!emailVal) emailInput?.focus();
        else otpInput?.focus();
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
        if (isSupabaseConfigured()) {
          let verified = false;

          // 1. Coba verifikasi dengan token_hash jika tersedia dari URL
          if (tokenHash) {
            const { error: verifyErr } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery'
            });

            if (!verifyErr) {
              verified = true;
            } else if (otpVal && emailVal) {
              // Fallback ke verifikasi kode OTP manual jika token_hash gagal
              const { error: otpErr } = await supabase.auth.verifyOtp({
                email: emailVal,
                token: otpVal,
                type: 'recovery'
              });
              if (!otpErr) {
                verified = true;
              } else {
                throw new Error(otpErr.message || 'Kode OTP tidak valid atau telah kedaluwarsa.');
              }
            } else {
              throw new Error(verifyErr.message || 'Tautan pemulihan tidak valid atau telah kedaluwarsa.');
            }
          } else if (otpVal && emailVal) {
            // 2. Verifikasi manual dengan email + kode OTP
            const { error: otpErr } = await supabase.auth.verifyOtp({
              email: emailVal,
              token: otpVal,
              type: 'recovery'
            });

            if (otpErr) {
              throw new Error(otpErr.message || 'Kode OTP tidak valid atau telah kedaluwarsa.');
            }
            verified = true;
          }
        }

        // 3. Simpan kata sandi baru ke Supabase Auth & sinkronkan tabel pengguna
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
        
        let errorMsg = err.message || 'Terjadi kesalahan saat memproses kata sandi baru.';
        if (errorMsg.toLowerCase().includes('otp') || errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('invalid')) {
          errorMsg = 'Kode OTP atau tautan pemulihan tidak valid/kedaluwarsa. Silakan periksa kembali kode di email Anda atau klik "Kirim Ulang Email Pemulihan".';
        }
        this._notification.error(errorMsg);
      }
    });
  }
}
