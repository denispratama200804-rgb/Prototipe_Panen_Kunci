import { themeService } from '../services/ThemeService.js';

/**
 * SettingsView
 * Konfigurasi Sistem & Tarif Panen Kunci:
 * Mengatur reward per key, batas penarikan, biaya admin per channel,
 * preferensi tema (malam/siang), serta kontrol mode validasi.
 */
export class SettingsView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
  }

  destroy() {}

  render() {
    const config = this.dataService.getConfig();
    const isDark = themeService.isDark();

    return `
      <div class="space-y-8 view-fade-enter max-w-5xl">
        <!-- Pengaturan Tampilan & Tema Sistem -->
        <div class="admin-card rounded-2xl p-6 space-y-5">
          <div class="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 class="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Tampilan & Tema Panel Admin</h3>
              <p class="text-xs text-slate-400">Pilih skema warna antarmuka: Tema Malam (Gelap) atau Tema Siang (Terang)</p>
            </div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-xs ${isDark ? 'text-indigo-300' : 'text-amber-600'} border border-slate-700 shrink-0">
              <span class="material-symbols-outlined text-sm">${isDark ? 'dark_mode' : 'light_mode'}</span>
              <span class="font-semibold">${isDark ? 'Tema Malam Aktif' : 'Tema Siang Aktif'}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Pilihan Tema Malam -->
            <label class="theme-option-card flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${isDark ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}">
              <input
                type="radio"
                name="settingAppTheme"
                value="dark"
                ${isDark ? 'checked' : ''}
                class="mt-1 accent-indigo-500 cursor-pointer"
              />
              <div class="space-y-1.5 flex-1">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400">
                    <span class="material-symbols-outlined text-base">dark_mode</span>
                  </div>
                  <span class="text-sm font-bold text-white">Tema Malam (Dark Mode)</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">Palet futuristik dengan latar deep navy (#060b18), aksen neon glow, dan kenyamanan mata saat malam hari.</p>
                <div class="flex items-center gap-2 pt-1">
                  <span class="w-4 h-4 rounded-full bg-[#060b18] border border-slate-700 inline-block" title="#060b18"></span>
                  <span class="w-4 h-4 rounded-full bg-[#0e172e] border border-slate-700 inline-block" title="#0e172e"></span>
                  <span class="w-4 h-4 rounded-full bg-indigo-500 inline-block" title="Indigo"></span>
                  <span class="w-4 h-4 rounded-full bg-emerald-500 inline-block" title="Emerald"></span>
                </div>
              </div>
            </label>

            <!-- Pilihan Tema Siang -->
            <label class="theme-option-card flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${!isDark ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}">
              <input
                type="radio"
                name="settingAppTheme"
                value="light"
                ${!isDark ? 'checked' : ''}
                class="mt-1 accent-amber-500 cursor-pointer"
              />
              <div class="space-y-1.5 flex-1">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <span class="material-symbols-outlined text-base">light_mode</span>
                  </div>
                  <span class="text-sm font-bold text-white">Tema Siang (Light Mode)</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">Palet cerah, bersih dan profesional dengan latar slate-50 (#f8fafc), kartu putih bersih, dan keterbacaan tinggi di siang hari.</p>
                <div class="flex items-center gap-2 pt-1">
                  <span class="w-4 h-4 rounded-full bg-[#f8fafc] border border-slate-300 inline-block" title="#f8fafc"></span>
                  <span class="w-4 h-4 rounded-full bg-white border border-slate-300 inline-block" title="#ffffff"></span>
                  <span class="w-4 h-4 rounded-full bg-indigo-600 inline-block" title="Indigo"></span>
                  <span class="w-4 h-4 rounded-full bg-amber-500 inline-block" title="Amber"></span>
                </div>
              </div>
            </label>
          </div>
        </div>

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
                  <label class="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base">account_balance</span>
                    <span>Fee Bank Transfer</span>
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
                class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
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
    // Radio Theme Change Event
    container.querySelectorAll('input[name="settingAppTheme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        themeService.setTheme(selectedTheme);
        refreshCallback();
      });
    });

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
