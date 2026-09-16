/**
 * CaptchaModal
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan modal verifikasi Captcha interaktif berbasis HTML5 Canvas
 * sebelum pengguna diarahkan masuk ke Dashboard.
 */
export class CaptchaModal {
  /**
   * Menampilkan modal captcha dan mengembalikan Promise<boolean>
   * @param {Object} [options]
   * @param {string} [options.title='Verifikasi Keamanan']
   * @param {string} [options.subtitle='Masukkan kode captcha di bawah ini untuk melanjutkan ke dashboard.']
   * @param {string} [options.confirmText='Verifikasi & Lanjutkan']
   * @param {string} [options.cancelText='Batal']
   * @returns {Promise<boolean>}
   */
  static show(options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Verifikasi Keamanan',
        subtitle = 'Masukkan kode captcha di bawah ini untuk melanjutkan ke dashboard.',
        confirmText = 'Verifikasi & Lanjutkan',
        cancelText = 'Batal'
      } = options;

      // Hapus modal captcha lama jika ada
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

          <!-- Security Icon -->
          <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner mt-1">
            <span class="material-symbols-outlined text-[32px]">shield_person</span>
          </div>

          <!-- Title & Subtitle -->
          <div class="flex flex-col gap-1 w-full">
            <h3 class="font-headline-md text-lg text-text-heading font-bold">${title}</h3>
            <p class="font-body-md text-xs text-text-body leading-relaxed">${subtitle}</p>
          </div>

          <!-- Captcha Canvas Box -->
          <div class="w-full flex items-center justify-center gap-2 bg-bg-subtle p-2.5 rounded-2xl border border-outline-variant/40 shadow-inner">
            <div class="relative overflow-hidden rounded-xl bg-white shadow-sm border border-outline-variant/30 flex items-center justify-center select-none">
              <canvas id="captchaCanvas" width="220" height="60" class="block cursor-pointer" title="Klik untuk mengganti kode"></canvas>
            </div>
            <button
              type="button"
              id="btnRefreshCaptcha"
              class="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-card hover:bg-surface-container active:scale-95 text-primary border border-outline-variant/40 transition-all cursor-pointer shadow-sm"
              title="Ganti kode captcha baru"
            >
              <span class="material-symbols-outlined text-[22px] transition-transform duration-300" id="iconRefreshCaptcha">refresh</span>
            </button>
          </div>

          <!-- Input Field -->
          <div class="w-full flex flex-col gap-1 text-left">
            <label for="captchaInput" class="font-label-sm text-xs font-semibold text-text-heading uppercase tracking-wider">
              Ketik Kode Di Atas
            </label>
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">verified</span>
              <input
                id="captchaInput"
                type="text"
                maxlength="5"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="characters"
                spellcheck="false"
                placeholder="5 Karakter"
                class="w-full bg-bg-subtle text-text-heading font-mono text-center font-bold text-lg tracking-[0.3em] uppercase rounded-xl py-2.5 pl-10 pr-4 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline/40 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
              />
            </div>
            <span id="captchaErrorMsg" class="text-[11px] text-error-ruby font-medium min-h-[16px] transition-all"></span>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2.5 w-full mt-1">
            <button
              type="button"
              id="btnCancelCaptcha"
              class="flex-1 py-3 px-4 rounded-xl font-label-md text-xs font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-[0.98] cursor-pointer"
            >
              ${cancelText}
            </button>
            <button
              type="button"
              id="btnConfirmCaptcha"
              class="flex-1 py-3 px-4 rounded-xl font-label-md text-xs font-bold bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>${confirmText}</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modalWrapper);

      // Trigger animasi masuk
      requestAnimationFrame(() => {
        modalWrapper.classList.remove('opacity-0');
        const card = modalWrapper.querySelector('.captcha-card');
        if (card) {
          card.classList.remove('scale-95');
          card.classList.add('scale-100');
        }
      });

      // Canvas & Generator Logic
      const canvas = modalWrapper.querySelector('#captchaCanvas');
      const input = modalWrapper.querySelector('#captchaInput');
      const errorMsg = modalWrapper.querySelector('#captchaErrorMsg');
      const refreshBtn = modalWrapper.querySelector('#btnRefreshCaptcha');
      const refreshIcon = modalWrapper.querySelector('#iconRefreshCaptcha');
      const confirmBtn = modalWrapper.querySelector('#btnConfirmCaptcha');
      const cancelBtn = modalWrapper.querySelector('#btnCancelCaptcha');
      const closeBtn = modalWrapper.querySelector('.captcha-close-btn');
      const backdrop = modalWrapper.querySelector('.captcha-backdrop');

      // Karakter alfanumerik (tanpa karakter ambigu seperti 0, O, 1, I, l)
      const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let currentCode = '';

      const generateCode = () => {
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        }
        return code;
      };

      const drawCaptcha = () => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        currentCode = generateCode();

        const w = canvas.width;
        const h = canvas.height;

        // 1. Background gradient halus
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(1, '#eef2f6');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Garis derau (noise lines)
        const lineColors = ['#cbd5e1', '#94a3b8', '#bfdbfe', '#ddd6fe', '#fed7aa'];
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = lineColors[i % lineColors.length];
          ctx.lineWidth = 1 + Math.random() * 1.5;
          ctx.beginPath();
          ctx.moveTo(Math.random() * w, Math.random() * h);
          ctx.bezierCurveTo(
            Math.random() * w, Math.random() * h,
            Math.random() * w, Math.random() * h,
            Math.random() * w, Math.random() * h
          );
          ctx.stroke();
        }

        // 3. Titik-titik derau (noise dots)
        for (let i = 0; i < 35; i++) {
          ctx.fillStyle = lineColors[Math.floor(Math.random() * lineColors.length)];
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Gambar tiap karakter dengan rotasi & warna kontras
        const textColors = ['#1e3a8a', '#1d4ed8', '#047857', '#6d28d9', '#b91c1c', '#0f766e', '#4338ca'];
        const charSpacing = w / (currentCode.length + 1);

        for (let i = 0; i < currentCode.length; i++) {
          const char = currentCode[i];
          const x = charSpacing * (i + 0.8) + (Math.random() * 4 - 2);
          const y = h / 2 + (Math.random() * 6 - 3);
          const angle = (Math.random() * 36 - 18) * (Math.PI / 180);

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.font = `bold ${26 + Math.floor(Math.random() * 4)}px 'Courier New', Courier, monospace`;
          ctx.fillStyle = textColors[Math.floor(Math.random() * textColors.length)];
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, 0, 0);
          ctx.restore();
        }
      };

      // Buat captcha awal
      drawCaptcha();

      // Refresh event
      const onRefresh = () => {
        if (refreshIcon) {
          refreshIcon.classList.add('rotate-180');
          setTimeout(() => refreshIcon.classList.remove('rotate-180'), 300);
        }
        drawCaptcha();
        if (input) {
          input.value = '';
          input.focus();
        }
        if (errorMsg) errorMsg.textContent = '';
      };

      refreshBtn?.addEventListener('click', onRefresh);
      canvas?.addEventListener('click', onRefresh);

      // Tutup modal
      const closeModal = (result) => {
        window.removeEventListener('keydown', onKeyDown);
        modalWrapper.classList.add('opacity-0');
        const card = modalWrapper.querySelector('.captcha-card');
        if (card) {
          card.classList.remove('scale-100');
          card.classList.add('scale-95');
        }
        setTimeout(() => {
          modalWrapper.remove();
          resolve(result);
        }, 250);
      };

      // Verifikasi submit
      const verifyCaptcha = () => {
        const userVal = (input?.value || '').trim().toUpperCase();

        if (!userVal) {
          if (errorMsg) errorMsg.textContent = 'Harap ketik kode captcha di atas.';
          input?.focus();
          return;
        }

        if (userVal === currentCode) {
          if (errorMsg) {
            errorMsg.className = 'text-[11px] text-secondary font-semibold min-h-[16px] flex items-center justify-center gap-1';
            errorMsg.innerHTML = '<span class="material-symbols-outlined text-[14px]">check_circle</span><span>Verifikasi Berhasil!</span>';
          }
          if (input) {
            input.classList.remove('border-outline-variant/40', 'border-error-ruby');
            input.classList.add('border-secondary', 'bg-secondary/5');
          }
          if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span>Masuk...</span>';
          }
          setTimeout(() => {
            closeModal(true);
          }, 350);
        } else {
          if (errorMsg) {
            errorMsg.className = 'text-[11px] text-error-ruby font-medium min-h-[16px] text-center';
            errorMsg.textContent = 'Kode salah. Silakan coba kode baru.';
          }
          if (input) {
            input.classList.add('border-error-ruby');
            input.classList.add('animate-shake');
            setTimeout(() => input.classList.remove('animate-shake'), 400);
            input.value = '';
            input.focus();
          }
          // Regenerate kode baru
          drawCaptcha();
        }
      };

      confirmBtn?.addEventListener('click', verifyCaptcha);
      cancelBtn?.addEventListener('click', () => closeModal(false));
      closeBtn?.addEventListener('click', () => closeModal(false));
      backdrop?.addEventListener('click', () => closeModal(false));

      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          closeModal(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          verifyCaptcha();
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // Auto focus input
      setTimeout(() => input?.focus(), 150);
    });
  }
}
