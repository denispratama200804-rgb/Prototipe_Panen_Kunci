/**
 * HubDashboardView
 * Tampilan utama Admin Dashboard bergaya App Hub Card Grid modern
 * Dioptimalkan untuk Desktop Web & Mobile PWA
 */
export class HubDashboardView {
  constructor(dataService, onNavigate = () => {}, onSeed = () => {}, toastService = null) {
    this.dataService = dataService;
    this.onNavigate = onNavigate;
    this.onSeed = onSeed;
    this.toast = toastService;
  }

  render() {
    const stats = this.dataService.getStats();
    const pendingCount = stats.pendingCount || 0;
    const totalKeys = stats.totalKeys || 0;
    const validKeys = stats.validKeysCount || 0;
    const pendingKeys = stats.pendingKeysCount || 0;
    const totalUsers = stats.totalUsers || 4;

    const cards = [
      {
        id: 'withdrawals',
        title: 'Persetujuan Payout',
        desc: 'Validasi rekening tujuan, unggah bukti transfer m-Banking, dan proses pencairan dana.',
        icon: 'payments',
        squircleClass: 'squircle-amber',
        badge: pendingCount > 0 ? `${pendingCount} Antrean` : '0 Antrean',
        badgeColor: pendingCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      },
      {
        id: 'apikeys',
        title: 'Gudang API Key',
        desc: 'Kelola stok API Key OpenAI & Kie.ai, uji verifikasi status, dan pantau saldo kredit.',
        icon: 'vpn_key',
        squircleClass: 'squircle-blue',
        badge: pendingKeys > 0 ? `${pendingKeys} Pending` : `${totalKeys} Kunci`,
        badgeColor: pendingKeys > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      },
      {
        id: 'users',
        title: 'Kelola Pengguna',
        desc: 'Verifikasi status KYC member, pantau saldo dompet, dan audit riwayat setoran kunci.',
        icon: 'group',
        squircleClass: 'squircle-purple',
        badge: `${totalUsers} Pengguna`,
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      },
      {
        id: 'settings',
        title: 'Pengaturan Tarif',
        desc: 'Atur harga beli per kunci, minimum payout, dan konfigurasi persentase fee penarikan.',
        icon: 'tune',
        squircleClass: 'squircle-cyan',
        badge: 'Konfigurasi',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
      }
    ];

    return `
      <div class="view-fade-enter max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10 flex flex-col justify-center min-h-[calc(100vh-10rem)]">
        
        <!-- Header Hero (Reference Style) -->
        <div class="text-center max-w-2xl mx-auto pt-2 sm:pt-4">
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-admin-heading tracking-tight font-['Plus_Jakarta_Sans'] mb-2 sm:mb-3">
            Admin Dashboard
          </h1>
          <p class="text-admin-muted text-xs sm:text-base font-normal leading-relaxed">
            Manage your AI tools, payout queues, and user activity
          </p>
        </div>

        <!-- Unified Card Grid (4 Cards: 4 Cols on Desktop, 2 on Mobile/Tablet) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          ${cards.map((card) => `
            <div
              data-hub-target="${card.id}"
              class="hub-card p-4 sm:p-6 flex flex-col items-center text-center justify-center min-h-[135px] sm:min-h-[230px] group select-none cursor-pointer"
            >
              <!-- Center Squircle Icon & Title -->
              <div class="flex flex-col items-center py-1 sm:py-2">
                <div class="icon-squircle ${card.squircleClass}">
                  <span class="material-symbols-outlined text-3xl sm:text-4xl text-white">
                    ${card.icon}
                  </span>
                </div>

                <h3 class="pt-3.5 sm:pt-4 text-xs sm:text-base font-bold text-admin-heading tracking-tight mb-0.5 sm:mb-1.5 group-hover:text-indigo-400 transition-colors">
                  ${card.title}
                </h3>

                <p class="hidden sm:block text-[11px] sm:text-xs text-admin-muted leading-relaxed max-w-[220px]">
                  ${card.desc}
                </p>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }

  bindEvents(container) {
    container.querySelectorAll('[data-hub-target]').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.getAttribute('data-hub-target');
        this.onNavigate(target);
      });
    });
  }
}
