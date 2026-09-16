/**
 * CaptchaModal
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan modal verifikasi resmi Google reCAPTCHA v2 ("Saya bukan robot")
 * sebelum pengguna diarahkan masuk ke Dashboard.
 */

// Official Google reCAPTCHA v2 Test Site Key (selalu valid untuk localhost & testing)
// Pengguna dapat menggantinya dengan Site Key pribadi di file .env (VITE_RECAPTCHA_SITE_KEY)
const DEFAULT_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

/**
 * Memuat skrip Google reCAPTCHA v2 secara dinamis
 * @returns {Promise<any>} Objek window.grecaptcha
 */
function loadGoogleRecaptchaScript() {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      resolve(window.grecaptcha);
      return;
    }

    const callbackName = `__panenkunci_recaptcha_ready_${Date.now()}`;
    window[callbackName] = () => {
      if (window.grecaptcha) {
        resolve(window.grecaptcha);
      } else {
        reject(new Error('Google reCAPTCHA tidak terinisialisasi.'));
      }
      delete window[callbackName];
    };

    const existingScript = document.getElementById('google-recaptcha-script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'google-recaptcha-script';
    script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit&hl=id`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      reject(new Error('Gagal memuat skrip Google reCAPTCHA. Periksa koneksi internet Anda.'));
    };

    document.head.appendChild(script);
  });
}

export class CaptchaModal {
  /**
   * Menampilkan modal Google reCAPTCHA dan mengembalikan Promise<boolean|string>
   * @param {Object} [options]
   * @param {string} [options.title='Verifikasi Google reCAPTCHA']
   * @param {string} [options.subtitle='Centang kotak di bawah untuk memverifikasi bahwa Anda bukan robot sebelum melanjutkan.']
   * @param {string} [options.cancelText='Batal']
   * @returns {Promise<boolean|string>} Mengembalikan token reCAPTCHA jika lolos, atau false jika dibatalkan
   */
  static show(options = {}) {
    return new Promise(async (resolve) => {
      const {
        title = 'Verifikasi Google reCAPTCHA',
        subtitle = 'Centang kotak di bawah untuk memverifikasi bahwa Anda bukan robot sebelum melanjutkan.',
        cancelText = 'Batal'
      } = options;

      const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || DEFAULT_TEST_SITE_KEY).trim();

      // Bersihkan modal lama jika ada
      const existing = document.getElementById('panenkunci-captcha-modal-root');
      if (existing) existing.remove();

      const modalWrapper = document.createElement('div');
      modalWrapper.id = 'panenkunci-captcha-modal-root';
      modalWrapper.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 opacity-0';

      modalWrapper.innerHTML = `
        <!-- Backdrop with blur -->
        <div class="captcha-backdrop absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300"></div>

        <!-- Card Container -->
        <div class="captcha-card relative bg-surface-card w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 transform scale-95 transition-transform duration-300 z-10 border border-surface-container">
          <!-- Close Button -->
          <button type="button" class="captcha-close-btn absolute right-4 top-4 text-outline hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container transition-colors" aria-label="Tutup">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>

          <!-- Google Captcha Header Brand -->
          <div class="flex items-center gap-2 mt-1">
            <div class="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center p-1.5 border border-outline-variant/30">
              <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </div>
            <div class="text-left">
              <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Security Check</span>
              <h4 class="text-sm font-bold text-text-heading leading-tight">reCAPTCHA Google</h4>
            </div>
          </div>

          <!-- Title & Subtitle -->
          <div class="flex flex-col gap-1 w-full">
            <h3 class="font-headline-md text-base text-text-heading font-bold">${title}</h3>
            <p class="font-body-md text-xs text-text-body leading-relaxed">${subtitle}</p>
          </div>

          <!-- Google reCAPTCHA Container -->
          <div class="w-full flex flex-col items-center justify-center p-3 bg-bg-subtle rounded-2xl border border-outline-variant/40 min-h-[100px] relative overflow-hidden">
            <!-- Loading indicator -->
            <div id="recaptchaLoadingSpinner" class="flex flex-col items-center justify-center gap-2 py-4 text-text-muted">
              <span class="material-symbols-outlined animate-spin text-[26px] text-primary">progress_activity</span>
              <span class="text-xs font-medium">Memuat Google reCAPTCHA...</span>
            </div>

            <!-- Error message if network fails -->
            <div id="recaptchaErrorBox" class="hidden flex flex-col items-center justify-center gap-2 py-2 text-error-ruby">
              <span class="material-symbols-outlined text-[26px]">wifi_off</span>
              <span id="recaptchaErrorText" class="text-xs text-center font-medium"></span>
              <button type="button" id="btnRetryRecaptcha" class="mt-1 px-3 py-1 bg-primary text-on-primary text-xs rounded-lg font-medium hover:bg-primary-hover transition-colors">
                Coba Lagi
              </button>
            </div>

            <!-- Official Google reCAPTCHA Widget Mount Point -->
            <div id="googleRecaptchaContainer" class="flex justify-center items-center w-full"></div>

            <!-- Success indicator -->
            <div id="recaptchaSuccessBadge" class="hidden flex items-center justify-center gap-2 py-2 text-emerald-500 font-semibold text-xs">
              <span class="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Terverifikasi oleh Google!</span>
            </div>
          </div>

          <!-- Notice -->
          <p class="text-[10px] text-text-muted">
            Dilindungi oleh Google reCAPTCHA. 
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" class="underline hover:text-primary">Privasi</a> & 
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener" class="underline hover:text-primary">Persyaratan</a> berlaku.
          </p>

          <!-- Cancel Button -->
          <div class="w-full">
            <button
              type="button"
              id="btnCancelCaptcha"
              class="w-full py-2.5 px-4 rounded-xl font-label-md text-xs font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-[0.98] cursor-pointer"
            >
              ${cancelText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modalWrapper);

      // Elements
      const card = modalWrapper.querySelector('.captcha-card');
      const closeBtn = modalWrapper.querySelector('.captcha-close-btn');
      const cancelBtn = modalWrapper.querySelector('#btnCancelCaptcha');
      const backdrop = modalWrapper.querySelector('.captcha-backdrop');
      const spinner = modalWrapper.querySelector('#recaptchaLoadingSpinner');
      const errorBox = modalWrapper.querySelector('#recaptchaErrorBox');
      const errorText = modalWrapper.querySelector('#recaptchaErrorText');
      const retryBtn = modalWrapper.querySelector('#btnRetryRecaptcha');
      const recaptchaContainer = modalWrapper.querySelector('#googleRecaptchaContainer');
      const successBadge = modalWrapper.querySelector('#recaptchaSuccessBadge');

      let widgetId = null;
      let isSettled = false;

      // Animasi Buka
      requestAnimationFrame(() => {
        modalWrapper.classList.remove('opacity-0');
        modalWrapper.classList.add('opacity-100');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
      });

      const closeModal = (result) => {
        if (isSettled) return;
        isSettled = true;

        modalWrapper.classList.remove('opacity-100');
        modalWrapper.classList.add('opacity-0');
        card.classList.remove('scale-100');
        card.classList.add('scale-95');

        setTimeout(() => {
          try {
            if (widgetId !== null && window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
              window.grecaptcha.reset(widgetId);
            }
          } catch (e) {
            // Ignore reset error on unmount
          }
          modalWrapper.remove();
          resolve(result);
        }, 250);
      };

      // Event batal & tutup
      closeBtn?.addEventListener('click', () => closeModal(false));
      cancelBtn?.addEventListener('click', () => closeModal(false));
      backdrop?.addEventListener('click', () => closeModal(false));

      // ESC key listener
      const escListener = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escListener);
          closeModal(false);
        }
      };
      document.addEventListener('keydown', escListener);

      // Render Google reCAPTCHA
      const renderWidget = async () => {
        spinner?.classList.remove('hidden');
        errorBox?.classList.add('hidden');
        recaptchaContainer.innerHTML = '';

        try {
          const grecaptcha = await loadGoogleRecaptchaScript();
          spinner?.classList.add('hidden');

          widgetId = grecaptcha.render(recaptchaContainer, {
            sitekey: siteKey,
            theme: 'light',
            size: 'normal',
            callback: (token) => {
              // Pengguna berhasil mencentang "Saya bukan robot"
              successBadge?.classList.remove('hidden');
              setTimeout(() => {
                closeModal(token || true);
              }, 400);
            },
            'expired-callback': () => {
              // Token kadaluarsa
              if (widgetId !== null) grecaptcha.reset(widgetId);
            },
            'error-callback': () => {
              spinner?.classList.add('hidden');
              errorBox?.classList.remove('hidden');
              if (errorText) errorText.textContent = 'Terjadi kesalahan saat memverifikasi reCAPTCHA Google.';
            }
          });
        } catch (err) {
          spinner?.classList.add('hidden');
          errorBox?.classList.remove('hidden');
          if (errorText) errorText.textContent = err.message || 'Gagal memuat Google reCAPTCHA.';
        }
      };

      retryBtn?.addEventListener('click', () => {
        renderWidget();
      });

      renderWidget();
    });
  }
}
