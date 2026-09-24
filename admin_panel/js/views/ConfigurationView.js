import { telegramService } from '../services/TelegramAdminService.js';

/**
 * ConfigurationView
 * Halaman Konfigurasi Telegram Bot Admin (Grup)
 * Sesuai desain Executive Control Center Panen Kunci
 */
export class ConfigurationView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
  }

  destroy() {}

  render() {
    const config = this.dataService.getConfig();
    const isMasterEnabled = config.telegramEnabled !== false;
    const isPaymentEnabled = config.telegramNotifyPayment !== false;
    const isSupportEnabled = config.telegramNotifySupport !== false;
    const botToken = config.telegramBotToken || '';
    const chatId = config.telegramChatId || '';

    return `
      <div class="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 view-fade-enter">
        
        <!-- Breadcrumb / Header navigasi cepat -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <a href="#dashboard" class="hover:text-white transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">home</span>
              <span>Dashboard</span>
            </a>
            <span class="material-symbols-outlined text-[10px] text-slate-600">chevron_right</span>
            <span class="text-indigo-400 font-medium">Konfigurasi Bot Telegram</span>
          </div>

          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs">
            <span class="w-2 h-2 rounded-full ${botToken && chatId && isMasterEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
            <span class="text-slate-300 font-medium">${botToken && chatId && isMasterEnabled ? 'Bot Siap Aktif' : 'Konfigurasi Belum Lengkap'}</span>
          </div>
        </div>

        <!-- Card Utama: Notifikasi Telegram Bot Admin (Grup) -->
        <div class="relative bg-slate-900/95 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl backdrop-blur-xl transition-all">
          
          <!-- Header Card dengan Master Toggle -->
          <div class="flex items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div class="flex items-start sm:items-center gap-3.5">
              <div class="text-2xl sm:text-3xl shrink-0 select-none">
                🤖
              </div>
              <div class="space-y-1">
                <h2 class="text-base sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans'] tracking-tight flex items-center gap-2">
                  <span>Notifikasi Telegram Bot Admin (Grup)</span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                  Kirimkan notifikasi transaksi pembayaran, bukti transfer foto, dan tiket bantuan user langsung ke Grup Telegram Admin secara instan.
                </p>
              </div>
            </div>

            <!-- Master Toggle Switch (Top Right) -->
            <div class="shrink-0 pt-1 sm:pt-0">
              <label class="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="telegramMasterToggle"
                  class="sr-only peer"
                  ${isMasterEnabled ? 'checked' : ''}
                />
                <div class="w-13 h-7 bg-slate-950 border-2 border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-950/90 peer-checked:border-emerald-400 peer-checked:after:translate-x-[24px] peer-checked:after:bg-emerald-400 peer-checked:after:border-emerald-300 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-500 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
              </label>
            </div>
          </div>

          <!-- Form Konfigurasi -->
          <form id="telegram-config-form" class="mt-6 space-y-6 sm:space-y-7">
            
            <!-- Section: AKTIFKAN FITUR NOTIFIKASI TELEGRAM -->
            <div class="space-y-3">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                AKTIFKAN FITUR NOTIFIKASI TELEGRAM:
              </label>

              <!-- Grid 2 Kotak Sub-Fitur -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                
                <!-- Kotak 1: Transaksi Pembayaran / Payout -->
                <div class="flex items-center justify-between p-4 sm:p-4.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div class="space-y-0.5 pr-3">
                    <h4 class="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
                      Transaksi Pembayaran
                    </h4>
                    <p class="text-xs text-slate-400">
                      Order, Bukti Transfer Foto, Approval
                    </p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      id="toggleNotifyPayment"
                      name="telegramNotifyPayment"
                      class="sr-only peer"
                      ${isPaymentEnabled ? 'checked' : ''}
                    />
                    <div class="w-12 h-6.5 bg-slate-900 border-2 border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-950/90 peer-checked:border-emerald-400 peer-checked:after:translate-x-[22px] peer-checked:after:bg-emerald-400 peer-checked:after:border-emerald-300 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-500 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                <!-- Kotak 2: Pesan Bantuan / Support -->
                <div class="flex items-center justify-between p-4 sm:p-4.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div class="space-y-0.5 pr-3">
                    <h4 class="text-sm font-bold text-white font-['Plus_Jakarta_Sans']">
                      Pesan Bantuan / Support
                    </h4>
                    <p class="text-xs text-slate-400">
                      Tiket Bantuan User & Balasan Email Admin
                    </p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      id="toggleNotifySupport"
                      name="telegramNotifySupport"
                      class="sr-only peer"
                      ${isSupportEnabled ? 'checked' : ''}
                    />
                    <div class="w-12 h-6.5 bg-slate-900 border-2 border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-950/90 peer-checked:border-emerald-400 peer-checked:after:translate-x-[22px] peer-checked:after:bg-emerald-400 peer-checked:after:border-emerald-300 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-500 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

              </div>
            </div>

            <!-- Grid Input Token & Chat ID -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
              
              <!-- Telegram Bot Token (@BotFather) -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-300">
                  Telegram Bot Token (@BotFather)
                </label>
                <div class="relative">
                  <input
                    type="password"
                    id="inputTelegramBotToken"
                    name="telegramBotToken"
                    value="${botToken}"
                    placeholder="••••••••••••••••••••••••••••••••••••••••"
                    autocomplete="off"
                    spellcheck="false"
                    class="w-full pl-4 pr-11 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    id="btnToggleTokenVisibility"
                    title="Tampilkan / Sembunyikan Token"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                  >
                    <span class="material-symbols-outlined text-lg" id="iconTokenVisibility">visibility</span>
                  </button>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  Token Bot dari Telegram @BotFather (Contoh: 123456789:AA...).
                </p>
              </div>

              <!-- Telegram Group Chat ID -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-300">
                  Telegram Group Chat ID
                </label>
                <div class="relative">
                  <input
                    type="text"
                    id="inputTelegramChatId"
                    name="telegramChatId"
                    value="${chatId}"
                    placeholder="-1004389058581"
                    autocomplete="off"
                    spellcheck="false"
                    class="w-full px-4 py-3 bg-slate-950/90 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  ID Grup Telegram (awali dengan -100). Pastikan Bot sudah di-add ke grup sebagai Admin!
                </p>
              </div>

            </div>

            <!-- Petunjuk Ringkas Menghubungkan Bot -->
            <div class="p-3.5 sm:p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3 text-xs text-indigo-300/90 leading-relaxed">
              <span class="material-symbols-outlined text-indigo-400 text-lg shrink-0 mt-0.5">info</span>
              <div>
                <strong class="text-indigo-200">Cara Menghubungkan:</strong>
                <ol class="list-decimal list-inside space-y-0.5 mt-1 text-[11px] text-slate-300">
                  <li>Buat bot baru melalui <code class="text-amber-300">@BotFather</code> di Telegram, lalu salin Token API yang diberikan.</li>
                  <li>Buat Grup Telegram Admin, lalu masukkan bot ke dalam grup tersebut dan jadikan sebagai <b>Administrator</b>.</li>
                  <li>Dapatkan ID grup (contoh: <code class="text-emerald-300">-1004389058581</code>) via <code class="text-amber-300">@userinfobot</code> atau <code class="text-amber-300">@RawDataBot</code>.</li>
                  <li>Klik tombol <b>Tes Kirim Notifikasi Telegram Bot</b> di bawah untuk memverifikasi sambungan secara langsung.</li>
                </ol>
              </div>
            </div>

            <!-- Action Buttons: Simpan & Tes Kirim -->
            <div class="pt-4 border-t border-slate-800/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              
              <!-- Tombol Simpan Konfigurasi -->
              <button
                type="submit"
                id="btnSaveTelegramConfig"
                class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span class="material-symbols-outlined text-base sm:text-lg">save</span>
                <span>Simpan Konfigurasi</span>
              </button>

              <!-- Tombol Tes Kirim Notifikasi (Sesuai Referensi Gambar) -->
              <button
                type="button"
                id="btnTestTelegram"
                class="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-cyan-500/60 active:scale-95 text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span class="text-base select-none">✈️</span>
                <span>Tes Kirim Notifikasi Telegram Bot</span>
              </button>

            </div>

          </form>

        </div>

      </div>
    `;
  }

  bindEvents(container, refreshCallback) {
    const form = container.querySelector('#telegram-config-form');
    const masterToggle = container.querySelector('#telegramMasterToggle');
    const togglePayment = container.querySelector('#toggleNotifyPayment');
    const toggleSupport = container.querySelector('#toggleNotifySupport');
    const inputToken = container.querySelector('#inputTelegramBotToken');
    const inputChatId = container.querySelector('#inputTelegramChatId');
    const btnToggleVis = container.querySelector('#btnToggleTokenVisibility');
    const iconVis = container.querySelector('#iconTokenVisibility');
    const btnTest = container.querySelector('#btnTestTelegram');
    const btnSave = container.querySelector('#btnSaveTelegramConfig');

    // Toggle password visibility for Bot Token
    if (btnToggleVis && inputToken && iconVis) {
      btnToggleVis.addEventListener('click', () => {
        const isPassword = inputToken.type === 'password';
        inputToken.type = isPassword ? 'text' : 'password';
        iconVis.textContent = isPassword ? 'visibility_off' : 'visibility';
      });
    }

    // Sinkronkan form dengan database remote jika ada update terbaru
    this.dataService.fetchConfigFromSupabase().then(latestCfg => {
      if (!latestCfg || !container || !form) return;
      if (document.activeElement && form.contains(document.activeElement)) return;

      if (masterToggle) masterToggle.checked = latestCfg.telegramEnabled !== false;
      if (togglePayment) togglePayment.checked = latestCfg.telegramNotifyPayment !== false;
      if (toggleSupport) toggleSupport.checked = latestCfg.telegramNotifySupport !== false;
      if (inputToken && !inputToken.value) inputToken.value = latestCfg.telegramBotToken || '';
      if (inputChatId && !inputChatId.value) inputChatId.value = latestCfg.telegramChatId || '';
    }).catch(() => {});

    // Helper untuk menyimpan konfigurasi
    const doSave = async (showSuccessToast = true) => {
      const origText = btnSave ? btnSave.innerHTML : '';
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>Menyimpan...</span>';
      }

      const isMaster = masterToggle ? masterToggle.checked : true;
      const isPayment = togglePayment ? togglePayment.checked : true;
      const isSupport = toggleSupport ? toggleSupport.checked : true;
      const token = (inputToken ? inputToken.value : '').trim();
      let rawChatId = (inputChatId ? inputChatId.value : '').trim();
      if (/^100\d{7,}$/.test(rawChatId)) {
        rawChatId = '-' + rawChatId;
        if (inputChatId) inputChatId.value = rawChatId;
      }
      const chatId = rawChatId;

      const curConfig = this.dataService.getConfig();
      const newConfig = {
        ...curConfig,
        telegramEnabled: isMaster,
        telegramNotifyPayment: isPayment,
        telegramNotifyWithdrawal: isPayment,
        telegramNotifySupport: isSupport,
        telegramBotToken: token,
        telegramChatId: chatId
      };

      await this.dataService.saveConfig(newConfig);

      if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = origText;
      }

      if (showSuccessToast) {
        this.toast.success('Pengaturan Telegram Bot berhasil disimpan & disinkronkan!', 'Tersimpan');
      }
      return newConfig;
    };

    // Event listener submit form
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await doSave(true);
      });
    }

    // Auto-save ringan saat toggle dirubah
    if (masterToggle) {
      masterToggle.addEventListener('change', () => {
        doSave(false);
        this.toast.info(masterToggle.checked ? 'Notifikasi Telegram diaktifkan' : 'Notifikasi Telegram dinonaktifkan', 'Status Bot');
      });
    }

    // Tombol Tes Kirim Notifikasi Telegram Bot
    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        const token = (inputToken ? inputToken.value : '').trim();
        const chatId = (inputChatId ? inputChatId.value : '').trim();

        if (!token) {
          this.toast.error('Silakan isi Telegram Bot Token terlebih dahulu!', 'Token Kosong');
          inputToken?.focus();
          return;
        }

        if (!chatId) {
          this.toast.error('Silakan isi Telegram Group Chat ID terlebih dahulu!', 'Chat ID Kosong');
          inputChatId?.focus();
          return;
        }

        // Simpan dulu config sebelum tes
        await doSave(false);

        const origTestHtml = btnTest.innerHTML;
        btnTest.disabled = true;
        btnTest.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>Mengirim Pesan Uji Coba...</span>';

        try {
          const res = await telegramService.testConnection(token, chatId);
          if (res.success) {
            const botName = res.bot?.username ? `@${res.bot.username}` : (res.bot?.firstName || 'Bot Telegram');
            this.toast.success(`Berhasil! Pesan uji coba terkirim ke grup melalui ${botName}.`, 'Koneksi Berhasil');
          } else {
            this.toast.error(res.error || 'Gagal mengirim pesan uji coba.', 'Gagal Terhubung');
          }
        } catch (err) {
          this.toast.error(err.message || 'Terjadi kesalahan saat menghubungi server Telegram.', 'Error');
        } finally {
          btnTest.disabled = false;
          btnTest.innerHTML = origTestHtml;
        }
      });
    }
  }
}
