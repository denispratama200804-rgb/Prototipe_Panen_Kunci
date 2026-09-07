import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * LandingView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman awal perkenalan Panen Kunci / Kie Catcher dengan hero section, edukasi 3 langkah, dan CTA.
 */
export class LandingView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._authService = container.resolve('AuthService');
  }

  render() {
    const isAuth = this._authService.isAuthenticated();

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-12 pt-16">
        <!-- Hero Section -->
        <section class="relative px-margin-mobile pt-8 pb-8 flex flex-col items-center text-center overflow-hidden max-w-md mx-auto w-full">
          <!-- Ambient Glow -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-sm aspect-square bg-gradient-to-br from-primary-fixed/40 via-surface-tint/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
          <div class="absolute bottom-0 right-0 w-48 h-48 bg-secondary-container/30 rounded-full blur-2xl pointer-events-none -z-10"></div>

          <!-- Fast Badge -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card border border-surface-container text-primary text-xs font-semibold mb-5 shadow-sm">
            <span class="material-symbols-outlined text-[16px] text-warning-amber" style="font-variation-settings: 'FILL' 1;">bolt</span>
            <span>Pencairan Instan E-Wallet & Bank</span>
          </div>

          <!-- Main Headline -->
          <h1 class="font-headline-lg-mobile text-2xl sm:text-3xl text-text-heading font-extrabold mb-3 leading-tight">
            Ubah API Key Menjadi <br/>
            <span class="text-secondary bg-secondary-fixed/40 px-2 py-0.5 rounded-xl inline-block -rotate-1 shadow-sm mt-1">
              Rupiah Nyata
            </span>
          </h1>

          <p class="text-body-md text-text-body text-sm mb-6 max-w-xs leading-relaxed">
            Setorkan API Key valid dari Kie.ai dan dapatkan saldo instan <strong class="text-primary font-semibold">Rp 3.000 / key</strong> yang bisa langsung dicairkan ke DANA, GoPay, OVO, atau rekening Bank.
          </p>

          <!-- CTA Buttons -->
          <div class="w-full flex flex-col gap-2.5 px-2">
            ${isAuth ? `
              <a href="#/dashboard" class="w-full bg-primary text-on-primary py-3.5 px-6 rounded-2xl font-label-md text-sm font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-95 transition-all">
                <span>Buka Dashboard Saya</span>
                <span class="material-symbols-outlined text-[20px]">dashboard</span>
              </a>
              <a href="#/setor" class="w-full bg-surface-card border border-surface-container text-primary py-3.5 px-6 rounded-2xl font-label-md text-sm font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-surface-container-low active:scale-95 transition-all">
                <span>Mulai Setor API Key</span>
                <span class="material-symbols-outlined text-[20px]">vpn_key</span>
              </a>
            ` : `
              <a href="#/register" class="w-full bg-primary text-on-primary py-3.5 px-6 rounded-2xl font-label-md text-sm font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-95 transition-all">
                <span>Daftar Akun Gratis</span>
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              </a>
              <a href="#/login" class="w-full bg-surface-card border border-surface-container text-primary py-3.5 px-6 rounded-2xl font-label-md text-sm font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-surface-container-low active:scale-95 transition-all">
                <span>Sudah Punya Akun? Masuk</span>
                <span class="material-symbols-outlined text-[20px]">login</span>
              </a>
            `}
          </div>

          <p class="text-[11px] text-outline text-center mt-3 font-medium">Versi 1.2.0 • Verifikasi Otomatis 24/7</p>

          <!-- Hero Graphic / Illustration Card -->
          <div class="w-full mt-6 relative px-2">
            <div class="rounded-3xl p-5 bg-gradient-to-br from-primary to-primary-container text-white shadow-xl relative overflow-hidden text-left">
              <!-- Decorative circles -->
              <div class="absolute -right-8 -bottom-8 w-36 h-36 bg-secondary/30 rounded-full blur-2xl"></div>
              <div class="absolute right-4 top-4 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-secondary-fixed flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
                <span>Live Verifier</span>
              </div>

              <span class="text-xs text-primary-fixed-dim uppercase tracking-wider font-semibold">Simulasi Pendapatan</span>
              <div class="flex items-baseline gap-2 mt-1">
                <span class="text-3xl font-extrabold tracking-tight">Rp 90.000</span>
                <span class="text-xs text-secondary-fixed">/ 30 Keys</span>
              </div>
              <p class="text-xs text-white/80 mt-2">
                Hanya butuh 5-10 menit per hari untuk menghasilkan uang saku tambahan dari kuota gratis Kie.ai.
              </p>

              <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-primary-fixed">
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px] text-secondary-fixed">verified</span>
                  <span>Verifikasi Instan</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px] text-secondary-fixed">payments</span>
                  <span>Min. Penarikan Rp50.000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 3 Steps Section -->
        <section class="px-margin-mobile py-6 max-w-md mx-auto w-full">
          <div class="text-center mb-6">
            <h2 class="font-headline-md text-lg text-text-heading font-bold mb-1">Cara Kerja Sangat Mudah</h2>
            <p class="text-body-md text-text-body text-xs">Hanya 3 langkah sederhana untuk mulai menghasilkan uang</p>
          </div>

          <div class="flex flex-col gap-3 relative">
            <!-- Step 1 -->
            <div class="bg-surface-card border border-surface-container rounded-2xl p-4 flex gap-3.5 items-start shadow-sm hover:shadow-md transition-shadow">
              <div class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                1
              </div>
              <div class="flex-1">
                <h3 class="font-label-md text-sm font-bold text-text-heading mb-0.5">Daftar Akun di Kie.ai</h3>
                <p class="text-text-body text-xs leading-relaxed">Buka situs Kie.ai, buat akun gratis dan dapatkan kredensial API Key dengan kuota 80 kredit.</p>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="bg-surface-card border border-surface-container rounded-2xl p-4 flex gap-3.5 items-start shadow-sm hover:shadow-md transition-shadow">
              <div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                <span class="material-symbols-outlined text-[20px]">key</span>
              </div>
              <div class="flex-1">
                <h3 class="font-label-md text-sm font-bold text-text-heading mb-0.5">Setorkan API Key</h3>
                <p class="text-text-body text-xs leading-relaxed">Tempelkan API Key ke dalam aplikasi Panen Kunci. Sistem akan memverifikasi keaktifan kuota kredit secara otomatis.</p>
              </div>
            </div>

            <!-- Step 3 -->
            <div class="bg-surface-card border border-surface-container rounded-2xl p-4 flex gap-3.5 items-start shadow-sm hover:shadow-md transition-shadow">
              <div class="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
              </div>
              <div class="flex-1">
                <h3 class="font-label-md text-sm font-bold text-text-heading mb-0.5">Cairkan Saldo Langsung</h3>
                <p class="text-text-body text-xs leading-relaxed">Setiap key valid langsung menambah saldo Anda Rp 3.000. Tarik kapan saja ke DANA, GoPay, OVO, atau Bank BCA.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Security & Trust Section -->
        <section class="px-margin-mobile py-4 max-w-md mx-auto w-full">
          <div class="bg-surface-container-low rounded-2xl p-4 flex items-center gap-3 border border-surface-container">
            <div class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">security</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold text-text-heading">Keamanan Terjamin</span>
              <span class="text-[11px] text-text-body leading-tight">Enkripsi end-to-end dengan sistem proteksi anti-fraud dan pencairan dana resmi.</span>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  mount(container) {
    // No dynamic listeners needed for pure landing, links work via hash navigation
  }
}
