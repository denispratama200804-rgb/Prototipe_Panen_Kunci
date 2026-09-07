import { IComponent } from '../../core/interfaces/IComponent.js';
import { AppEvents } from '../../core/events/EventBus.js';

/**
 * LandingView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman awal perkenalan Panen Kunci dengan hero section modern, 3D illustration card,
 * langkah cara kerja, proof pembayaran, dan tombol CTA.
 */
export class LandingView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._authService = container.resolve('AuthService');
    this._eventBus = container.resolve('EventBus');
  }

  render() {
    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-20 pt-16">
        <div class="px-margin-mobile py-4 max-w-md mx-auto w-full">
          <div class="flex flex-col w-full min-h-full font-body-md text-text-body bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-surface-container/60">
            
            <!-- Hero Section -->
            <section class="relative px-margin-mobile pt-8 pb-8 flex flex-col items-center text-center overflow-hidden">
              <!-- Decorative Background Elements -->
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg aspect-square bg-gradient-to-br from-primary-fixed/30 via-surface-tint/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
              <div class="absolute bottom-0 right-0 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none -z-10 translate-x-1/4 translate-y-1/4"></div>
              
              <!-- Instant Payout Badge -->
              <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-primary text-label-sm font-label-sm mb-6 shadow-sm border border-surface-container">
                <span class="material-symbols-outlined text-[16px] text-warning-amber" style="font-variation-settings: 'FILL' 1;">bolt</span>
                <span>Pencairan Instan</span>
              </div>

              <!-- Main Heading -->
              <h2 class="font-headline-lg-mobile text-2xl sm:text-3xl text-text-heading mb-3 leading-tight font-extrabold">
                Ubah API Key Menjadi <br/>
                <span class="text-secondary bg-secondary-fixed/40 px-2.5 py-0.5 rounded-xl inline-block -rotate-1 shadow-sm mt-1">Rupiah Nyata</span>
              </h2>

              <p class="text-body-md font-body-md text-on-surface-variant mb-6 max-w-md leading-relaxed text-sm">
                Setorkan API Key valid dari Kie.ai dan dapatkan saldo yang bisa langsung dicairkan ke e-wallet favoritmu.
              </p>

              <!-- CTA Buttons -->
              <div class="w-full max-w-sm flex flex-col gap-2.5 px-2">
                <a href="#/register" id="btn-daftarkan-akun" class="w-full bg-primary text-on-primary py-3.5 px-6 rounded-xl font-label-md text-sm font-bold shadow-md shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-primary-container">
                  <span>Daftarkan Akun</span>
                  <span class="material-symbols-outlined text-[20px]">person_add</span>
                </a>
                <button type="button" id="btn-download-app" class="w-full bg-surface-card border border-surface-container text-primary py-3.5 px-6 rounded-xl font-label-md text-sm font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-surface-container-low active:scale-95 transition-all">
                  <span>Download Apps Sekarang</span>
                  <span class="material-symbols-outlined text-[20px]">download</span>
                </button>
                <div class="flex items-center justify-center gap-1.5 mt-1">
                  <span class="text-xs text-on-surface-variant font-medium">Sudah punya akun?</span>
                  <a href="#/login" class="text-xs text-primary font-bold hover:underline inline-flex items-center gap-0.5">
                    <span>Login</span>
                    <span class="material-symbols-outlined text-[14px]">login</span>
                  </a>
                </div>
                <p class="text-xs text-outline text-center font-label-sm mt-1">Versi 1.2.0 • Bebas Iklan</p>
              </div>

              <!-- Hero Image / Illustration Placeholder -->
              <div class="w-full mt-8 relative px-1">
                <div class="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg bg-surface-container-low relative border border-surface-container">
                  <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('/hero-illustration.jpg'), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCVaCKdZStYu3S3bI-vKI5YgudgcLjNgyySZO4AvVty7qFVwpRAEdMfKEUy5R-YSzIDJpQWuLJ096MNUSNDZKnVRBNqcV32zENpmDIlnIUP2WzUSJHhC2NF_Y1JOitUyPKp8Olrr4excXtMCNLRSBGvYnAWcaZPozjnHHfllbJS6cH9PzLnvGgSJIqE361k3k94hkVNCwIrUqE8hBZ6Z_Y3QBQCbVShZzy3Dg0JOza_oFdkfblH-G7x');"></div>
                </div>
                <!-- Floating Earning Chip -->
                <div class="absolute -bottom-3 right-4 bg-surface-card rounded-xl p-3 shadow-lg border border-surface-container flex items-center gap-3 animate-bounce" style="animation-duration: 3s;">
                  <div class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">payments</span>
                  </div>
                  <div class="text-left">
                    <p class="text-[10px] text-outline font-label-sm uppercase tracking-wider font-semibold">Berhasil Masuk</p>
                    <p class="font-headline-md text-[16px] text-secondary font-bold">+Rp 50.000</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Value Proposition / How it Works -->
            <section class="px-margin-mobile py-8 bg-surface-bright border-y border-surface-container">
              <div class="text-center mb-6">
                <h3 class="font-headline-md text-lg text-text-heading font-bold mb-1.5">Cara Kerja Sangat Mudah</h3>
                <p class="text-body-md text-on-surface-variant text-xs">Hanya butuh 3 langkah untuk mulai menghasilkan uang.</p>
              </div>
              <div class="flex flex-col gap-6 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-container">
                <!-- Step 1 -->
                <div class="flex gap-4 relative z-10">
                  <div class="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0 shadow-sm font-headline-md font-bold text-base">1</div>
                  <div class="pt-1.5 text-left">
                    <h4 class="font-label-md text-sm font-bold text-text-heading mb-1">Daftar di Kie.ai</h4>
                    <p class="text-body-md text-on-surface-variant text-xs leading-relaxed">Buat akun gratis di Kie.ai dan dapatkan API Key eksklusif milikmu.</p>
                  </div>
                </div>
                <!-- Step 2 -->
                <div class="flex gap-4 relative z-10">
                  <div class="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md font-headline-md font-bold text-base">2</div>
                  <div class="pt-1.5 text-left flex-1">
                    <h4 class="font-label-md text-sm font-bold text-text-heading mb-1">Setor API Key</h4>
                    <p class="text-body-md text-on-surface-variant text-xs leading-relaxed">Paste API Key tersebut ke dalam aplikasi Panen Kunci. Sistem akan memverifikasi secara instan.</p>
                    <!-- Mock Input Field -->
                    <div class="mt-3 bg-surface p-2.5 rounded-xl border border-surface-container shadow-sm flex items-center justify-between font-mono text-xs text-text-heading">
                      <span class="truncate pr-2 opacity-60">kie_live_8f92a...</span>
                      <span class="material-symbols-outlined text-primary text-[18px]">content_paste</span>
                    </div>
                  </div>
                </div>
                <!-- Step 3 -->
                <div class="flex gap-4 relative z-10">
                  <div class="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-sm font-headline-md font-bold text-base">3</div>
                  <div class="pt-1.5 text-left">
                    <h4 class="font-label-md text-sm font-bold text-text-heading mb-1">Tarik Saldo</h4>
                    <p class="text-body-md text-on-surface-variant text-xs leading-relaxed">Setiap key valid langsung diubah jadi saldo. Tarik kapan saja tanpa batas minimum.</p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Earnings Highlight & Trust -->
            <section class="px-margin-mobile py-8 bg-surface-container-low text-center">
              <div class="bg-surface-card rounded-2xl p-6 shadow-sm border border-surface-container mb-6">
                <span class="material-symbols-outlined text-secondary text-4xl mb-2" style="font-variation-settings: 'FILL' 1;">monitoring</span>
                <h3 class="font-headline-lg-mobile text-2xl font-extrabold mb-1.5 text-secondary">Rp 100.000.000+</h3>
                <p class="text-body-md text-on-surface-variant text-xs">Telah berhasil dicairkan oleh ribuan pengguna aktif kami bulan ini.</p>
              </div>
              <h4 class="font-label-md text-xs font-bold text-text-heading uppercase tracking-wider mb-3">Mendukung Penarikan Melalui</h4>
              <div class="flex flex-wrap justify-center gap-2">
                <!-- Payment Method Pills -->
                <div class="bg-surface-card border border-surface-container px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold text-on-surface-variant flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#118EEA]"></span> DANA
                </div>
                <div class="bg-surface-card border border-surface-container px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold text-on-surface-variant flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#00AED6]"></span> GoPay
                </div>
                <div class="bg-surface-card border border-surface-container px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold text-on-surface-variant flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#4C3494]"></span> OVO
                </div>
                <div class="bg-surface-card border border-surface-container px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold text-on-surface-variant flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px] text-primary">account_balance</span> Bank Transfer
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    `;
  }

  mount(container) {
    const downloadBtn = container.querySelector('#btn-download-app');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this._handleInstall(downloadBtn);
    });
  }

  /**
   * Langsung trigger PWA install prompt saat tombol diklik.
   * - Jika deferredInstallPrompt tersedia → install native langsung (Android Chrome)
   * - Jika iOS Safari → modal panduan Share → Add to Home Screen
   * - Jika Android tanpa prompt → toast singkat panduan manual
   * - Jika sudah terinstall → notifikasi sudah terpasang
   * @param {HTMLButtonElement} btn
   */
  async _handleInstall(btn) {
    const originalHTML = btn.innerHTML;

    // ── Loading state ─────────────────────────────────────────────────────────
    btn.disabled = true;
    btn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
      <span>Menyiapkan Instalasi...</span>
    `;

    // ── Sudah terinstall sebagai PWA? ─────────────────────────────────────────
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (isStandalone) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      this._eventBus.emit(AppEvents.SHOW_TOAST, {
        message: '✅ Panen Kunci sudah terinstal di perangkat Anda!',
        type: 'success',
        duration: 3000
      });
      return;
    }

    // ── Native install prompt (Android Chrome / Desktop Chrome) ───────────────
    if (window.deferredInstallPrompt) {
      try {
        await window.deferredInstallPrompt.prompt();
        const { outcome } = await window.deferredInstallPrompt.userChoice;
        window.deferredInstallPrompt = null;

        if (outcome === 'accepted') {
          // Tampilkan konfirmasi sukses di tombol
          btn.innerHTML = `
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Berhasil Dipasang!</span>
          `;
          this._eventBus.emit(AppEvents.SHOW_TOAST, {
            message: '🎉 Panen Kunci berhasil dipasang di perangkat Anda!',
            type: 'success',
            duration: 4000
          });
          // Kembalikan tombol ke semula setelah 3 detik
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
          }, 3000);
        } else {
          // User batalkan install
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }
      } catch (err) {
        console.warn('[PWA] Install prompt error:', err);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
      return;
    }

    // ── Fallback: Tidak ada native prompt ────────────────────────────────────
    btn.disabled = false;
    btn.innerHTML = originalHTML;

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
    const isAndroid = /android/.test(ua);

    // iOS Safari — wajib pakai Share → Add to Home Screen
    if (isIOS && isSafari) {
      this._eventBus.emit(AppEvents.SHOW_MODAL, {
        title: '📲 Install di iPhone / iPad',
        message: `
          <div class="flex flex-col gap-3 text-left mt-2">
            <div class="flex gap-3 items-start">
              <div class="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 text-xs font-bold">1</div>
              <p class="text-sm text-on-surface-variant pt-0.5">Ketuk ikon <strong class="text-on-surface">Bagikan □↑</strong> di bawah layar Safari.</p>
            </div>
            <div class="flex gap-3 items-start">
              <div class="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 text-xs font-bold">2</div>
              <p class="text-sm text-on-surface-variant pt-0.5">Pilih <strong class="text-on-surface">"Add to Home Screen"</strong>.</p>
            </div>
            <div class="flex gap-3 items-start">
              <div class="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 text-xs font-bold">3</div>
              <p class="text-sm text-on-surface-variant pt-0.5">Ketuk <strong class="text-on-surface">Add</strong> — selesai!</p>
            </div>
          </div>`,
        type: 'info',
        confirmText: 'Siap!',
        onConfirm: () => { }
      });
      return;
    }

    // Android Chrome tapi prompt belum siap (belum memenuhi kriteria install)
    if (isAndroid) {
      this._eventBus.emit(AppEvents.SHOW_TOAST, {
        message: '💡 Ketuk ⋮ Menu Chrome → "Tambahkan ke layar utama" untuk install.',
        type: 'info',
        duration: 5000
      });
      return;
    }

    // Desktop atau browser lain
    this._eventBus.emit(AppEvents.SHOW_TOAST, {
      message: '💡 Buka halaman ini di Chrome Android untuk install aplikasi.',
      type: 'info',
      duration: 5000
    });
  }
}
