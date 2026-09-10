export class SettingsView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
  }

  destroy() {}

  render() {
    const config = this.dataService.getConfig();

    return `
      <div class="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 view-fade-enter">

        <!-- Form Konfigurasi Tarif -->
        <div class="admin-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-7 shadow-xl">
          
          <!-- Header Pengaturan -->
          <div class="border-b border-slate-800/80 pb-4 sm:pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-start sm:items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-2xl">tune</span>
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                  Pengaturan Tarif & Kebijakan Sistem
                </h3>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Atur nominal reward per kunci dan parameter penarikan dana untuk pengguna
                </p>
              </div>
            </div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold self-start sm:self-auto shrink-0">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Konfigurasi Realtime</span>
            </div>
          </div>

          <form id="settings-form" class="space-y-6">
            <!-- Grid Input Utama: Reward & Batas Minimal -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                    class="w-full pl-11 pr-4 py-3 sm:py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-base sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  />
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">Nominal reward yang diterima pengguna saat menyetor 1 API Key Kie.ai valid.</p>
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
                    id="input-minWithdrawal"
                    value="${config.minWithdrawal || 50000}"
                    step="1000"
                    min="1000"
                    class="w-full pl-11 pr-4 py-3 sm:py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-base sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                  />
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">Ambang batas saldo minimum sebelum pengguna diizinkan mencairkan dana.</p>
              </div>
            </div>

            <!-- Biaya Admin E-Wallet & Bank Grid -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Biaya Admin per Metode Pencairan
                </h4>
                <span class="text-[11px] text-slate-400">Dipotong saat payout disetujui</span>
              </div>
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <!-- DANA -->
                <div class="space-y-2 p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/50 transition-colors">
                  <label class="text-xs font-bold text-cyan-400 flex items-center gap-1.5 truncate">
                    <span class="material-symbols-outlined text-base shrink-0">wallet</span>
                    <span class="truncate">Fee DANA</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      name="feeDana"
                      value="${config.feeDana || 1000}"
                      step="500"
                      class="w-full pl-8 pr-2.5 py-2.5 sm:py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-base sm:text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <!-- GoPay -->
                <div class="space-y-2 p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 focus-within:border-emerald-500/50 transition-colors">
                  <label class="text-xs font-bold text-emerald-400 flex items-center gap-1.5 truncate">
                    <span class="material-symbols-outlined text-base shrink-0">bolt</span>
                    <span class="truncate">Fee GoPay</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      name="feeGopay"
                      value="${config.feeGopay || 1000}"
                      step="500"
                      class="w-full pl-8 pr-2.5 py-2.5 sm:py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-base sm:text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <!-- OVO -->
                <div class="space-y-2 p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 focus-within:border-purple-500/50 transition-colors">
                  <label class="text-xs font-bold text-purple-400 flex items-center gap-1.5 truncate">
                    <span class="material-symbols-outlined text-base shrink-0">account_balance_wallet</span>
                    <span class="truncate">Fee OVO</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      name="feeOvo"
                      value="${config.feeOvo || 1000}"
                      step="500"
                      class="w-full pl-8 pr-2.5 py-2.5 sm:py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-base sm:text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <!-- Bank Transfer -->
                <div class="space-y-2 p-3 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 focus-within:border-indigo-500/50 transition-colors">
                  <label class="text-xs font-bold text-indigo-400 flex items-center gap-1.5 truncate">
                    <span class="material-symbols-outlined text-base shrink-0">account_balance</span>
                    <span class="truncate">Fee Bank</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      name="feeBank"
                      value="${config.feeBank || 2500}"
                      step="500"
                      class="w-full pl-8 pr-2.5 py-2.5 sm:py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-base sm:text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Mode Validasi Kie.ai -->
            <div class="space-y-2.5">
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mode Validasi Setoran API Key
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label class="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition-all select-none active:scale-[0.99]">
                  <input
                    type="radio"
                    name="validationMode"
                    value="simulation"
                    ${config.validationMode === 'simulation' ? 'checked' : ''}
                    class="mt-1 accent-indigo-500 cursor-pointer shrink-0"
                  />
                  <div class="space-y-0.5">
                    <div class="text-xs sm:text-sm font-bold text-white">Simulasi Cepat (Default Prototipe)</div>
                    <p class="text-[11px] sm:text-xs text-slate-400 leading-relaxed">Mendeteksi format key & kredit secara otomatis instan tanpa ketergantungan koneksi pihak ketiga.</p>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition-all select-none active:scale-[0.99]">
                  <input
                    type="radio"
                    name="validationMode"
                    value="real"
                    ${config.validationMode === 'real' ? 'checked' : ''}
                    class="mt-1 accent-indigo-500 cursor-pointer shrink-0"
                  />
                  <div class="space-y-0.5">
                    <div class="text-xs sm:text-sm font-bold text-white">Endpoint Live Kie.ai</div>
                    <p class="text-[11px] sm:text-xs text-slate-400 leading-relaxed">Melakukan HTTP ping ke API resmi Kie.ai sebelum menyetujui dan menambah saldo pengguna.</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Save Button & Realtime Status -->
            <div class="pt-4 sm:pt-6 border-t border-slate-800/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div class="text-[11px] sm:text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 text-center sm:text-left">
                <span class="material-symbols-outlined text-sm text-emerald-400 shrink-0">check_circle</span>
                <span>Pengaturan langsung diterapkan secara realtime di seluruh aplikasi.</span>
              </div>
              <button
                type="submit"
                class="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span class="material-symbols-outlined text-base sm:text-lg">save</span>
                <span>Simpan Perubahan Tarif</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    // Sinkronkan form dengan config terbaru dari database di background
    this.dataService.fetchConfigFromSupabase().then(latestCfg => {
      if (!latestCfg || !container) return;
      const form = container.querySelector('#settings-form');
      if (!form) return;
      // Jangan timpa jika admin sedang aktif mengetik di dalam form
      if (document.activeElement && form.contains(document.activeElement)) return;
      if (form.elements['rewardPerKey']) form.elements['rewardPerKey'].value = latestCfg.rewardPerKey || 3000;
      if (form.elements['minWithdrawal']) form.elements['minWithdrawal'].value = latestCfg.minWithdrawal || 50000;
      if (form.elements['feeDana']) form.elements['feeDana'].value = latestCfg.feeDana ?? 1000;
      if (form.elements['feeGopay']) form.elements['feeGopay'].value = latestCfg.feeGopay ?? 1000;
      if (form.elements['feeOvo']) form.elements['feeOvo'].value = latestCfg.feeOvo ?? 1000;
      if (form.elements['feeBank']) form.elements['feeBank'].value = latestCfg.feeBank ?? 2500;
      if (form.elements['validationMode']) form.elements['validationMode'].value = latestCfg.validationMode || 'simulation';
    }).catch(() => {});

    // Form submit
    const form = container.querySelector('#settings-form');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>Menyinkronkan...</span>';
        }

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

        await this.dataService.saveConfig(newConfig);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }

        // Kunci nilai input agar tetap konsisten dengan yang baru disimpan
        if (form.elements['minWithdrawal']) form.elements['minWithdrawal'].value = newConfig.minWithdrawal;
        if (form.elements['rewardPerKey']) form.elements['rewardPerKey'].value = newConfig.rewardPerKey;

        this.toast.success(`Target penarikan Rp ${newConfig.minWithdrawal.toLocaleString('id-ID')} & konfigurasi sistem berhasil disimpan dan disinkronkan ke seluruh pengguna!`, 'Tersimpan');
      });
    }
  }
}
