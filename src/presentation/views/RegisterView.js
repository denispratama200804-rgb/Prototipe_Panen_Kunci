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
    this._otpToken = null;
    this._isOtpVerified = false;
    this._verifiedEmail = '';
    this._verifiedToken = null;
    this._countdownTimer = null;
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
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-28 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  id="btnSendOtp"
                  class="absolute right-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary active:scale-95 font-label-sm font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-[16px]" id="iconSendOtp">send</span>
                  <span id="textSendOtp">Kirim OTP</span>
                </button>
              </div>
            </div>

            <!-- Kode OTP Email -->
            <div class="flex flex-col gap-1" id="regOtpContainer">
              <div class="flex items-center justify-between">
                <label class="font-label-sm text-xs text-text-heading font-semibold uppercase tracking-wider" for="regOtp">
                  Kode OTP Email
                </label>
                <span id="badgeOtpStatus" class="text-[11px] font-medium text-outline flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-outline/60"></span>
                  <span id="textOtpStatus">Belum diverifikasi</span>
                </span>
              </div>
              <div class="relative flex items-center">
                <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">pin</span>
                <input
                  id="regOtp"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="6 Digit Kode OTP"
                  autocomplete="one-time-code"
                  class="w-full bg-bg-subtle text-text-heading font-body-md text-sm rounded-xl py-3 pl-11 pr-28 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all tracking-widest font-mono"
                />
                <button
                  type="button"
                  id="btnVerifyOtp"
                  class="absolute right-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary active:scale-95 font-label-sm font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-[16px]" id="iconVerifyOtp">verified_user</span>
                  <span id="textVerifyOtp">Verifikasi</span>
                </button>
              </div>
              <p class="text-[11px] text-text-body/70 mt-0.5" id="helpOtpText">
                Masukkan email lalu klik <strong>"Kirim OTP"</strong> untuk menerima kode verifikasi.
              </p>
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

            <!-- Terms and Condition Checkbox -->
            <div class="pt-1">
              <label class="flex items-start gap-2.5 cursor-pointer select-none text-left" for="regAgreeTerms">
                <input
                  id="regAgreeTerms"
                  name="agreeTerms"
                  type="checkbox"
                  required
                  class="mt-1 w-4 h-4 rounded border-outline-variant/40 text-primary accent-primary focus:ring-0 cursor-pointer"
                />
                <span class="font-body-md text-xs text-text-body leading-snug">
                  Saya setuju dengan
                  <button type="button" id="btnOpenTerms" class="text-primary font-semibold hover:underline inline p-0 m-0 bg-transparent border-0 cursor-pointer align-baseline text-xs">Syarat &amp; Ketentuan Layanan</button>
                  serta
                  <button type="button" id="btnOpenPrivacy" class="text-primary font-semibold hover:underline inline p-0 m-0 bg-transparent border-0 cursor-pointer align-baseline text-xs">Kebijakan Privasi</button>
                  Panen Kunci.
                </span>
              </label>
            </div>

            <!-- Submit Button -->
            <button
              id="btnRegSubmit"
              type="submit"
              class="w-full bg-primary text-on-primary font-label-md font-bold text-sm rounded-2xl py-3.5 mt-2 shadow-lg shadow-primary/25 hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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

          <!-- Google Register Button -->
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

    const btnSendOtp = container.querySelector('#btnSendOtp');
    const iconSendOtp = container.querySelector('#iconSendOtp');
    const textSendOtp = container.querySelector('#textSendOtp');

    const otpInput = container.querySelector('#regOtp');
    const btnVerifyOtp = container.querySelector('#btnVerifyOtp');
    const iconVerifyOtp = container.querySelector('#iconVerifyOtp');
    const textVerifyOtp = container.querySelector('#textVerifyOtp');
    const badgeOtpStatus = container.querySelector('#badgeOtpStatus');
    const helpOtpText = container.querySelector('#helpOtpText');

    const s1 = container.querySelector('#str1');
    const s2 = container.querySelector('#str2');
    const s3 = container.querySelector('#str3');
    const strLabel = container.querySelector('#strLabel');

    // ── Logika Verifikasi OTP Email ──
    const doVerify = async () => {
      const email = emailInput.value.trim().toLowerCase();
      const otp = otpInput.value.trim();

      if (!email) {
        this._notification.error('Harap masukkan alamat email terlebih dahulu.');
        emailInput.focus();
        return false;
      }

      if (!this._otpToken) {
        this._notification.error('Harap klik "Kirim OTP" ke email Anda terlebih dahulu.');
        btnSendOtp?.focus();
        return false;
      }

      if (!otp || otp.length < 6) {
        this._notification.error('Harap masukkan 6 digit kode OTP yang diterima.');
        otpInput.focus();
        return false;
      }

      btnVerifyOtp.disabled = true;
      iconVerifyOtp.textContent = 'progress_activity';
      iconVerifyOtp.classList.add('animate-spin');
      textVerifyOtp.textContent = 'Cek...';

      const res = await this._authService.verifyRegisterOtp(email, otp, this._otpToken);

      if (res.success && res.verified) {
        this._isOtpVerified = true;
        this._verifiedEmail = email;
        this._verifiedToken = res.verifiedToken;

        badgeOtpStatus.className = 'text-[11px] font-semibold text-secondary flex items-center gap-1 bg-secondary/10 px-2 py-0.5 rounded-full';
        badgeOtpStatus.innerHTML = '<span class="material-symbols-outlined text-[14px]">check_circle</span><span id="textOtpStatus">Terverifikasi</span>';

        otpInput.classList.remove('border-outline-variant/40');
        otpInput.classList.add('border-secondary', 'bg-secondary/5');

        btnVerifyOtp.disabled = true;
        btnVerifyOtp.className = 'absolute right-1.5 px-3 py-1.5 bg-secondary text-white font-label-sm font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-default';
        iconVerifyOtp.classList.remove('animate-spin');
        iconVerifyOtp.textContent = 'check';
        textVerifyOtp.textContent = 'Sesuai';

        helpOtpText.className = 'text-[11px] text-secondary font-medium mt-0.5';
        helpOtpText.innerHTML = '✓ Alamat email berhasil diverifikasi. Silakan lanjutkan pendaftaran Anda.';

        this._notification.success('Email berhasil diverifikasi!');
        return true;
      } else {
        btnVerifyOtp.disabled = false;
        btnVerifyOtp.className = 'absolute right-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary active:scale-95 font-label-sm font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
        iconVerifyOtp.classList.remove('animate-spin');
        iconVerifyOtp.textContent = 'verified_user';
        textVerifyOtp.textContent = 'Verifikasi';

        this._notification.error(res.message || 'Kode OTP yang Anda masukkan salah.');
        otpInput.focus();
        return false;
      }
    };

    // Tombol Kirim OTP
    btnSendOtp?.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim().toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this._notification.error('Harap masukkan format alamat email yang valid.');
        emailInput.focus();
        return;
      }

      btnSendOtp.disabled = true;
      iconSendOtp.textContent = 'progress_activity';
      iconSendOtp.classList.add('animate-spin');
      textSendOtp.textContent = 'Kirim...';

      const res = await this._authService.sendRegisterOtp(email);

      if (!res.success) {
        btnSendOtp.disabled = false;
        iconSendOtp.textContent = 'send';
        iconSendOtp.classList.remove('animate-spin');
        textSendOtp.textContent = 'Kirim OTP';
        this._notification.error(res.message || 'Gagal mengirim kode OTP.');
        return;
      }

      // Berhasil kirim
      this._otpToken = res.token;
      this._isOtpVerified = false;
      this._verifiedEmail = '';
      this._verifiedToken = null;

      otpInput.value = '';
      otpInput.classList.remove('border-secondary', 'bg-secondary/5');
      otpInput.classList.add('border-outline-variant/40');
      btnVerifyOtp.disabled = false;
      btnVerifyOtp.className = 'absolute right-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary active:scale-95 font-label-sm font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
      iconVerifyOtp.textContent = 'verified_user';
      textVerifyOtp.textContent = 'Verifikasi';

      badgeOtpStatus.className = 'text-[11px] font-medium text-primary flex items-center gap-1';
      badgeOtpStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span><span id="textOtpStatus">OTP Terkirim</span>';

      helpOtpText.className = 'text-[11px] text-text-body mt-0.5';
      helpOtpText.innerHTML = `Kode 6 digit telah dikirim ke <strong>${email}</strong>. Periksa Kotak Masuk atau Spam.`;

      // Cooldown timer 60 detik
      if (this._countdownTimer) clearInterval(this._countdownTimer);
      let countdown = 60;
      iconSendOtp.classList.remove('animate-spin');
      iconSendOtp.textContent = 'timer';
      textSendOtp.textContent = `${countdown}s`;

      this._countdownTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(this._countdownTimer);
          this._countdownTimer = null;
          btnSendOtp.disabled = false;
          iconSendOtp.textContent = 'send';
          textSendOtp.textContent = 'Kirim Ulang';
        } else {
          textSendOtp.textContent = `${countdown}s`;
        }
      }, 1000);

      otpInput.focus();

      this._notification.success(res.message || `Kode OTP verifikasi telah dikirimkan ke email ${email}. Silakan periksa Kotak Masuk atau folder Spam Anda.`);
    });

    // Validasi input angka OTP & auto-verify saat 6 digit
    otpInput?.addEventListener('input', (e) => {
      const raw = e.target.value;
      const clean = raw.replace(/\D/g, '').slice(0, 6);
      if (raw !== clean) {
        e.target.value = clean;
      }

      if (this._isOtpVerified && clean.length < 6) {
        this._isOtpVerified = false;
        this._verifiedEmail = '';
        this._verifiedToken = null;
        badgeOtpStatus.className = 'text-[11px] font-medium text-outline flex items-center gap-1';
        badgeOtpStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-outline/60"></span><span id="textOtpStatus">Belum diverifikasi</span>';
        otpInput.classList.remove('border-secondary', 'bg-secondary/5');
        otpInput.classList.add('border-outline-variant/40');
        btnVerifyOtp.disabled = false;
        btnVerifyOtp.className = 'absolute right-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary active:scale-95 font-label-sm font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
        iconVerifyOtp.textContent = 'verified_user';
        textVerifyOtp.textContent = 'Verifikasi';
      }

      if (clean.length === 6 && !this._isOtpVerified && this._otpToken) {
        doVerify();
      }
    });

    // Tombol Verifikasi OTP manual
    btnVerifyOtp?.addEventListener('click', (e) => {
      e.preventDefault();
      doVerify();
    });

    // Reset status verifikasi jika user mengganti email yang sudah diverifikasi
    emailInput?.addEventListener('input', () => {
      const currentVal = emailInput.value.trim().toLowerCase();
      if (this._isOtpVerified && currentVal !== this._verifiedEmail) {
        this._isOtpVerified = false;
        this._verifiedEmail = '';
        this._verifiedToken = null;
        this._otpToken = null;
        otpInput.value = '';
        badgeOtpStatus.className = 'text-[11px] font-medium text-outline flex items-center gap-1';
        badgeOtpStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-outline/60"></span><span id="textOtpStatus">Belum diverifikasi</span>';
        otpInput.classList.remove('border-secondary', 'bg-secondary/5');
        otpInput.classList.add('border-outline-variant/40');
        btnVerifyOtp.disabled = false;
        btnVerifyOtp.className = 'absolute right-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary active:scale-95 font-label-sm font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
        iconVerifyOtp.textContent = 'verified_user';
        textVerifyOtp.textContent = 'Verifikasi';
        helpOtpText.className = 'text-[11px] text-text-body/70 mt-0.5';
        helpOtpText.innerHTML = 'Alamat email berubah. Silakan klik <strong>"Kirim OTP"</strong> untuk verifikasi ulang.';
      }
    });

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

    const agreeTermsInput = container.querySelector('#regAgreeTerms');
    const btnOpenTerms = container.querySelector('#btnOpenTerms');
    const btnOpenPrivacy = container.querySelector('#btnOpenPrivacy');

    // Buka Modal Syarat & Ketentuan Layanan (Langkah 1 QA: Baca dokumen/tautan Syarat & Ketentuan Layanan)
    btnOpenTerms?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._notification.showModal({
        title: 'Syarat & Ketentuan Layanan',
        html: `
          <div class="flex flex-col gap-3 text-xs text-text-body leading-relaxed max-h-60 overflow-y-auto pr-1">
            <p><strong>1. Ketentuan Akun:</strong> Setiap pengguna wajib mengisi data akun dengan valid dan bertanggung jawab atas keamanan kredensial akun Panen Kunci masing-masing.</p>
            <p><strong>2. Penyetoran API Key:</strong> Setiap API Key yang disetor harus merupakan key resmi yang valid dan memiliki saldo kredit aktif dari Kie.ai. Key duplikat atau tidak aktif akan otomatis ditolak oleh sistem verifikasi.</p>
            <p><strong>3. Penarikan Saldo:</strong> Saldo hasil penjualan API Key dapat ditarik ke rekening bank atau e-wallet terdaftar setelah mencapai batas minimum penarikan.</p>
            <p><strong>4. Kepatuhan:</strong> Dilarang keras melakukan rekayasa sistem, bot ilegal, atau manipulasi data. Pelanggaran terhadap ketentuan ini dapat mengakibatkan pembekuan akun.</p>
          </div>
        `,
        type: 'info',
        confirmText: 'Saya Mengerti'
      });
    });

    // Buka Modal Kebijakan Privasi
    btnOpenPrivacy?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._notification.showModal({
        title: 'Kebijakan Privasi',
        html: `
          <div class="flex flex-col gap-3 text-xs text-text-body leading-relaxed max-h-60 overflow-y-auto pr-1">
            <p><strong>1. Perlindungan Data:</strong> Panen Kunci memprioritaskan keamanan informasi pribadi pengguna dengan enkripsi standar industri.</p>
            <p><strong>2. Penggunaan Data:</strong> Data hanya digunakan untuk autentikasi akun, transaksi penyetoran, dan proses pencairan dana.</p>
            <p><strong>3. Kerahasiaan:</strong> Kami tidak pernah menjual atau membagikan kredensial pengguna kepada pihak ketiga yang tidak berwenang.</p>
          </div>
        `,
        type: 'info',
        confirmText: 'Saya Mengerti'
      });
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const email = emailInput.value.trim().toLowerCase();
      const password = passInput.value;
      const confirmPassword = confirmInput.value;
      const agreeTerms = agreeTermsInput ? agreeTermsInput.checked : false;

      // Validasi persetujuan Syarat & Ketentuan Layanan
      if (!agreeTerms) {
        this._notification.error('Harap centang dan setujui Syarat & Ketentuan Layanan sebelum melanjutkan pendaftaran.');
        agreeTermsInput?.focus();
        return;
      }

      // Validasi verifikasi kode OTP Email
      if (!this._isOtpVerified || this._verifiedEmail !== email) {
        const currentOtp = otpInput.value.trim();
        if (currentOtp.length === 6 && this._otpToken) {
          const verified = await doVerify();
          if (!verified) return;
        } else {
          this._notification.error('Harap verifikasi alamat email Anda dengan kode OTP terlebih dahulu.');
          if (!this._otpToken) {
            btnSendOtp?.focus();
          } else {
            otpInput?.focus();
          }
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Proses</span>';

      const res = await this._authService.register({
        name,
        email,
        password,
        confirmPassword,
        agreeTerms,
        verifiedToken: this._verifiedToken
      });

      if (res.success) {
        if (this._countdownTimer) {
          clearInterval(this._countdownTimer);
          this._countdownTimer = null;
        }
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

    // Register via Google OAuth
    const googleBtn = container.querySelector('#btnGoogleRegister');
    const googleTxt = container.querySelector('#txtGoogleRegister');

    googleBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
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
