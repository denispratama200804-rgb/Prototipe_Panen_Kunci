/**
 * SettingsView
 * Konfigurasi Sistem & Tarif Panen Kunci:
 * Mengatur reward per key, batas penarikan, biaya admin per channel,
 * serta kontrol database cadangan & data seeder simulator.
 */
export class SettingsView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
  }

  destroy() {}

  render() {
    const config = this.dataService.getConfig();

    return `
      <div class="space-y-8 view-fade-enter max-w-5xl">
        <!-- Form Konfigurasi Tarif -->
        <div class="admin-card rounded-2xl p-6 space-y-6">
          <div class="border-b border-slate-800 pb-4">
            <h3 class="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Pengaturan Tarif & Kebijakan Sistem</h3>
            <p class="text-xs text-slate-400">Atur nominal reward per kunci dan parameter penarikan dana untuk pengguna</p>
          </div>

          <form id="settings-form" class="space-y-6">
            <!-- Grid Input -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Reward per Valid Key -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Reward per API Key Valid (Rp)
                </label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400 font-mono">Rp</span>
                  <input
                    type="number"
                    name="rewardPerKey"
                    value="${config.rewardPerKey || 3000}"
                    step="500"
                    min="1000"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  />
                </div>
                <p class="text-[11px] text-slate-400">Nominal reward yang diterima pengguna saat menyetor 1 API Key Kie.ai valid.</p>
              </div>

              <!-- Minimal Penarikan Dana -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Batas Minimal Penarikan (Rp)
                </label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400 font-mono">Rp</span>
                  <input
                    type="number"
                    name="minWithdrawal"
                    value="${config.minWithdrawal || 50000}"
                    step="10000"
                    min="10000"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  />
                </div>
                <p class="text-[11px] text-slate-400">Ambang batas saldo minimum sebelum pengguna diizinkan mencairkan dana.</p>
              </div>
            </div>

            <!-- Biaya Admin E-Wallet & Bank Grid -->
            <div>
              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Biaya Admin per Metode Pencairan</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="space-y-1.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <label class="text-xs font-medium text-cyan-400 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base">wallet</span>
                    <span>Fee DANA</span>
                  </label>
                  <input
                    type="number"
                    name="feeDana"
                    value="${config.feeDana || 1000}"
                    step="500"
                    class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono font-bold text-white"
                  />
                </div>

                <div class="space-y-1.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <label class="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base">bolt</span>
                    <span>Fee GoPay</span>
                  </label>
                  <input
                    type="number"
                    name="feeGopay"
                    value="${config.feeGopay || 1000}"
                    step="500"
                    class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono font-bold text-white"
                  />
                </div>

                <div class="space-y-1.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <label class="text-xs font-medium text-purple-400 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base">account_balance_wallet</span>
                    <span>Fee OVO</span>
                  </label>
                  <input
                    type="number"
                    name="feeOvo"
                    value="${config.feeOvo || 1000}"
                    step="500"
                    class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono font-bold text-white"
                  />
                </div>

                <div class="space-y-1.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <label class="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base">account_balance</span>
                    <span>Fee Transfer Bank</span>
                  </label>
                  <input
                    type="number"
                    name="feeBank"
                    value="${config.feeBank || 2500}"
                    step="500"
                    class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono font-bold text-white"
                  />
                </div>
              </div>
            </div>

            <!-- Mode Validasi Kie.ai -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mode Validasi Setoran API Key
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label class="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition-colors">
                  <input
                    type="radio"
                    name="validationMode"
                    value="simulation"
                    ${config.validationMode === 'simulation' ? 'checked' : ''}
                    class="accent-indigo-500"
                  />
                  <div>
                    <div class="text-xs font-bold text-white">Simulasi Cepat (Default Prototipe)</div>
                    <div class="text-[11px] text-slate-400">Mendeteksi format key & kredit secara otomatis instan.</div>
                  </div>
                </label>

                <label class="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition-colors">
                  <input
                    type="radio"
                    name="validationMode"
                    value="real"
                    ${config.validationMode === 'real' ? 'checked' : ''}
                    class="accent-indigo-500"
                  />
                  <div>
                    <div class="text-xs font-bold text-white">Endpoint Live Kie.ai</div>
                    <div class="text-[11px] text-slate-400">Melakukan HTTP ping ke API resmi Kie.ai sebelum menyetujui.</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Save Button -->
            <div class="pt-2 flex justify-end">
              <button
                type="submit"
                class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <span class="material-symbols-outlined text-base">save</span>
                <span>Simpan Perubahan Tarif</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    // Form submit
    const form = container.querySelector('#settings-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(form);
        const getNum = (val, def) => (val !== null && String(val).trim() !== '' && !isNaN(Number(val))) ? Number(val) : def;
        const newConfig = {
          rewardPerKey: getNum(fd.get('rewardPerKey'), 3000),
          minWithdrawal: getNum(fd.get('minWithdrawal'), 50000),
          feeDana: getNum(fd.get('feeDana'), 1000),
          feeGopay: getNum(fd.get('feeGopay'), 1000),
          feeOvo: getNum(fd.get('feeOvo'), 1000),
          feeBank: getNum(fd.get('feeBank'), 2500),
          validationMode: fd.get('validationMode') || 'simulation'
        };

        this.dataService.saveConfig(newConfig);
        this.toast.success('Pengaturan tarif sistem berhasil disimpan dan langsung aktif!', 'Tersimpan');
        refreshCallback();
      });
    }
  }
}
