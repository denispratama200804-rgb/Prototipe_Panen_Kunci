/**
 * DashboardView
 * Menampilkan ringkasan eksekutif, KPI cards, visualisasi grafik Chart.js,
 * dan log aktivitas mutasi saldo terbaru.
 */
export class DashboardView {
  constructor(dataService, onNavigate = () => {}, toastService = null) {
    this.dataService = dataService;
    this.onNavigate = onNavigate;
    this.toast = toastService;
    this.chartInstances = [];
  }

  destroy() {
    this.chartInstances.forEach(c => {
      if (c && typeof c.destroy === 'function') c.destroy();
    });
    this.chartInstances = [];
  }

  render() {
    const stats = this.dataService.getStats();
    const recentTx = this.dataService.getTransactions().slice(0, 5);

    return `
      <div class="space-y-8 view-fade-enter">
        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- Card 1: API Keys -->
          <div class="admin-card rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute -right-4 -bottom-4 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total API Key</span>
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-xl">vpn_key</span>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans'] mb-1">
              ${stats.totalKeys} <span class="text-sm font-normal text-slate-400">Kunci</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span class="material-symbols-outlined text-base">check_circle</span>
              <span>${stats.validKeysCount} Valid</span>
              <span class="text-slate-500">•</span>
              <span class="text-indigo-300">${stats.totalCredits} Kredit Kie.ai</span>
            </div>
          </div>

          <!-- Card 2: Payouts -->
          <div class="admin-card rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute -right-4 -bottom-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payout Dicairkan</span>
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-xl">payments</span>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-emerald-400 tracking-tight font-['Plus_Jakarta_Sans'] mb-1">
              Rp ${stats.totalPaidOut.toLocaleString('id-ID')}
            </div>
            <div class="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
              <span class="material-symbols-outlined text-base">hourglass_top</span>
              <span>${stats.pendingCount} Pending (Rp ${stats.pendingPayoutAmount.toLocaleString('id-ID')})</span>
            </div>
          </div>

          <!-- Card 3: Admin Fee Revenue -->
          <div class="admin-card rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute -right-4 -bottom-4 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pendapatan Fee Admin</span>
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-xl">savings</span>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans'] mb-1">
              Rp ${stats.totalAdminFees.toLocaleString('id-ID')}
            </div>
            <div class="text-xs text-slate-400">
              Biaya transfer yang dipotong dari transaksi
            </div>
          </div>

          <!-- Card 4: Users & Balance -->
          <div class="admin-card rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute -right-4 -bottom-4 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pengguna Terdaftar</span>
              <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-xl">group</span>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans'] mb-1">
              ${stats.totalUsers} <span class="text-sm font-normal text-slate-400">Akun</span>
            </div>
            <div class="text-xs text-slate-300">
              Saldo User Beredar: <strong class="text-indigo-300 font-mono">Rp ${stats.activeBalance.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        </div>

        <!-- Action Banner for Pending Withdrawals (If any) -->
        ${
          stats.pendingCount > 0
            ? `
          <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 animate-pulse">
                <span class="material-symbols-outlined text-xl">priority_high</span>
              </div>
              <div>
                <h4 class="text-sm font-bold text-white">Ada ${stats.pendingCount} Permintaan Penarikan Dana Baru</h4>
                <p class="text-xs text-amber-200/80">Total nominal: <strong>Rp ${stats.pendingPayoutAmount.toLocaleString('id-ID')}</strong> memerlukan persetujuan transfer Anda.</p>
              </div>
            </div>
            <button
              type="button"
              id="dash-btn-review-pending"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Tinjau & Setujui</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        `
            : ''
        }

        <!-- Charts Grid (Chart.js) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Chart: Activity Trend -->
          <div class="lg:col-span-2 admin-card rounded-2xl p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Aktivitas 7 Hari Terakhir</h3>
                <p class="text-xs text-slate-400">Setoran API Key vs Volume Pencairan Dana</p>
              </div>
              <div class="flex items-center gap-3 text-xs">
                <div class="flex items-center gap-1.5 text-indigo-400">
                  <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span>Setoran Kunci</span>
                </div>
                <div class="flex items-center gap-1.5 text-emerald-400">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Payout (Rp)</span>
                </div>
              </div>
            </div>
            <div class="h-64 relative">
              <canvas id="dashboard-trend-chart"></canvas>
            </div>
          </div>

          <!-- Donut Chart: Payment Method Distribution -->
          <div class="admin-card rounded-2xl p-6 flex flex-col justify-between">
            <div class="mb-4">
              <h3 class="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Metode Pencairan</h3>
              <p class="text-xs text-slate-400">Distribusi channel DANA, GoPay, OVO, & Bank</p>
            </div>
            <div class="h-52 relative flex items-center justify-center">
              <canvas id="dashboard-method-chart"></canvas>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-around text-center text-xs text-slate-400">
              <div>
                <div class="text-white font-bold text-sm">DANA</div>
                <span>Favorit #1</span>
              </div>
              <div>
                <div class="text-white font-bold text-sm">GoPay</div>
                <span>Instan</span>
              </div>
              <div>
                <div class="text-white font-bold text-sm">BCA/Bank</div>
                <span>Nominal Besar</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions Table -->
        <div class="admin-card rounded-2xl overflow-hidden">
          <div class="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white font-['Plus_Jakarta_Sans']">Transaksi Terbaru</h3>
              <p class="text-xs text-slate-400">Log mutasi saldo, setoran, dan penarikan yang tercatat di sistem</p>
            </div>
            <button
              type="button"
              id="dash-btn-view-all-tx"
              class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>Lihat Semua</span>
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left admin-table">
              <thead>
                <tr>
                  <th>ID / Waktu</th>
                  <th>Pengguna</th>
                  <th>Jenis Aktivitas</th>
                  <th>Nominal</th>
                  <th>Biaya Admin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${
                  recentTx.length === 0
                    ? `
                  <tr>
                    <td colspan="6" class="text-center py-8 text-slate-500">Belum ada aktivitas transaksi.</td>
                  </tr>
                `
                    : recentTx
                        .map(tx => {
                          const isDeposit = tx.type === 'deposit';
                          const statusClass =
                            tx.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : tx.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                          const statusLabel =
                            tx.status === 'success' ? 'Sukses' : tx.status === 'pending' ? 'Pending' : 'Ditolak';

                          return `
                    <tr>
                      <td>
                        <div class="font-mono text-xs font-semibold text-slate-300">${tx.id}</div>
                        <div class="text-[11px] text-slate-500">${new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                      </td>
                      <td>
                        <div class="font-medium text-slate-200">${tx.userId || 'usr_budi_01'}</div>
                        <div class="text-[11px] text-slate-400">${tx.recipient || '-'}</div>
                      </td>
                      <td>
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-sm ${isDeposit ? 'text-emerald-400' : 'text-blue-400'}">
                            ${isDeposit ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                          <span class="font-medium text-slate-200">${tx.title}</span>
                        </div>
                      </td>
                      <td>
                        <span class="font-mono font-bold ${isDeposit ? 'text-emerald-400' : 'text-slate-200'}">
                          ${isDeposit ? '+' : '-'}Rp ${Number(tx.amount || 0).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td>
                        <span class="font-mono text-xs text-slate-400">
                          ${tx.fee ? `Rp ${Number(tx.fee).toLocaleString('id-ID')}` : '-'}
                        </span>
                      </td>
                      <td>
                        <span class="text-xs px-2.5 py-1 rounded-full font-semibold border ${statusClass}">
                          ${statusLabel}
                        </span>
                      </td>
                    </tr>
                  `;
                        })
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents(container) {
    const reviewBtn = container.querySelector('#dash-btn-review-pending');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        this.onNavigate('withdrawals');
      });
    }

    const viewAllBtn = container.querySelector('#dash-btn-view-all-tx');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.onNavigate('withdrawals');
      });
    }

    this._initCharts(container);
  }

  _initCharts(container) {
    if (typeof Chart === 'undefined') {
      console.warn('[DashboardView] Chart.js belum tersedia di window.');
      return;
    }

    const chartData = this.dataService.getChartData();

    // 1. Line/Bar Chart Tren 7 Hari
    const trendCtx = container.querySelector('#dashboard-trend-chart');
    if (trendCtx) {
      const trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: 'Setoran Kunci',
              data: chartData.keyDeposits,
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: '#6366f1',
              borderWidth: 1,
              borderRadius: 6,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: 'Volume Payout (Rp)',
              data: chartData.withdrawalVolume,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#091124',
              titleColor: '#fff',
              bodyColor: '#94a3b8',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              padding: 10
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { size: 11 } }
            },
            y: {
              position: 'left',
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#818cf8', stepSize: 1, font: { size: 11 } }
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: {
                color: '#34d399',
                font: { size: 11 },
                callback: v => 'Rp ' + (v / 1000) + 'k'
              }
            }
          }
        }
      });
      this.chartInstances.push(trendChart);
    }

    // 2. Donut Chart Distribusi Metode
    const methodCtx = container.querySelector('#dashboard-method-chart');
    if (methodCtx) {
      const m = chartData.methods;
      const methodChart = new Chart(methodCtx, {
        type: 'doughnut',
        data: {
          labels: ['DANA', 'GoPay', 'OVO', 'Bank'],
          datasets: [
            {
              data: [m.DANA || 2, m.GOPAY || 1, m.OVO || 1, m.BANK || 1],
              backgroundColor: ['#06b6d4', '#10b981', '#a855f7', '#3b82f6'],
              borderWidth: 0,
              hoverOffset: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 }
            }
          }
        }
      });
      this.chartInstances.push(methodChart);
    }
  }
}
