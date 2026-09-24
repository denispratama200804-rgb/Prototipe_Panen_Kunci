import { telegramService } from '../services/TelegramAdminService.js';
import { aiKreativService } from '../services/AiKreativService.js';

/**
 * ConfigurationView
 * Halaman Konfigurasi Integrasi ai.kreativ & Telegram Bot Admin
 * Sesuai desain Executive Control Center Panen Kunci
 */
export class ConfigurationView {
  constructor(dataService, toastService) {
    this.dataService = dataService;
    this.toast = toastService;
    this.activeSection = 'all'; // 'all', 'aikreativ', 'telegram'
  }

  destroy() {}

  render() {
    // Config Telegram
    const config = this.dataService.getConfig();
    const isMasterTelegramEnabled = config.telegramEnabled !== false;
    const isPaymentEnabled = config.telegramNotifyPayment !== false;
    const isSupportEnabled = config.telegramNotifySupport !== false;
    const botToken = config.telegramBotToken || '';
    const chatId = config.telegramChatId || '';

    // Config ai.kreativ
    const aiConfig = aiKreativService.getConfig();
    const isAiMasterEnabled = aiConfig.enabled !== false;
    const isAiAutoForward = aiConfig.autoForwardOnValid === true;
    const aiEndpoint = aiConfig.endpoint || 'https://aikreativ.app/api/keys/receive';
    const aiApiKey = aiConfig.apiKey || '4511d6a00b4f76cd329fa1c011f0aa5f90ddc4b086e6b0d7ceb642a4e3969230';
    const aiSource = aiConfig.source || 'Panen Kunci';

    return `
      <div class="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 view-fade-enter">
        
        <!-- Breadcrumb / Header navigasi cepat -->
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <a href="#dashboard" class="hover:text-white transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">home</span>
              <span>Dashboard</span>
            </a>
            <span class="material-symbols-outlined text-[10px] text-slate-600">chevron_right</span>
            <span class="text-indigo-400 font-medium">Konfigurasi Integrasi & Bot</span>
          </div>

          <!-- Section Switcher Tabs -->
          <div class="inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <button
              type="button"
              data-config-tab="all"
              class="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                this.activeSection === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }"
            >
              Semua
            </button>
            <button
              type="button"
              data-config-tab="aikreativ"
              class="px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                this.activeSection === 'aikreativ' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }"
            >
              <span class="material-symbols-outlined text-sm">smart_toy</span>
              <span>ai.kreativ</span>
            </button>
            <button
              type="button"
              data-config-tab="telegram"
              class="px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                this.activeSection === 'telegram' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }"
            >
              <span class="material-symbols-outlined text-sm">send</span>
              <span>Bot Telegram</span>
            </button>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- CARD 1: INTEGRASI API AI.KREATIV (Endpoint Pengiriman Key)-->
        <!-- ======================================================== -->
        <div id="section-aikreativ" class="relative bg-slate-900/95 border border-purple-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl backdrop-blur-xl transition-all ${
          this.activeSection === 'telegram' ? 'hidden' : 'block'
        }">
          <!-- Top Accent Light -->
          <div class="absolute top-0 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent pointer-events-none"></div>

          <!-- Header Card dengan Master Toggle -->
          <div class="flex items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div class="flex items-start sm:items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10">
                <span class="material-symbols-outlined text-3xl">smart_toy</span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-base sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                    Integrasi API ai.kreativ
                  </h2>
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Endpoint Receiver
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
                  Kirimkan API Key Kie.ai yang telah disetor pengguna dari Panen Kunci ke sistem <strong class="text-purple-300">ai.kreativ</strong> untuk langsung diverifikasi dan disimpan.
                </p>
              </div>
            </div>

            <!-- Master Toggle Switch (Top Right) -->
            <div class="shrink-0 pt-1 sm:pt-0">
              <label class="relative inline-flex items-center cursor-pointer select-none" title="Aktif/Nonaktifkan integrasi ai.kreativ">
                <input
                  type="checkbox"
                  id="aiKreativMasterToggle"
                  class="sr-only peer"
                  ${isAiMasterEnabled ? 'checked' : ''}
                />
                <div class="w-13 h-7 bg-slate-950 border-2 border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-950/90 peer-checked:border-purple-400 peer-checked:after:translate-x-[24px] peer-checked:after:bg-purple-400 peer-checked:after:border-purple-300 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-500 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
              </label>
            </div>
          </div>

          <!-- Form Konfigurasi ai.kreativ -->
          <form id="aikreativ-config-form" class="mt-6 space-y-6 sm:space-y-7">
            
            <!-- Section: Sub-fitur Auto Forward -->
            <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
              <div class="space-y-0.5">
                <h4 class="text-sm font-bold text-white flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-purple-400">autorenew</span>
                  <span>Otomatis Teruskan Kunci Valid ke ai.kreativ</span>
                </h4>
                <p class="text-xs text-slate-400">
                  Saat kunci dinyatakan valid (kredit 80 cr & masa pantau selesai), sistem akan otomatis mengirimkannya ke ai.kreativ.
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  id="toggleAiKreativAutoForward"
                  name="aiKreativAutoForward"
                  class="sr-only peer"
                  ${isAiAutoForward ? 'checked' : ''}
                />
                <div class="w-12 h-6.5 bg-slate-900 border-2 border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-950/90 peer-checked:border-purple-400 peer-checked:after:translate-x-[22px] peer-checked:after:bg-purple-400 peer-checked:after:border-purple-300 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-500 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>

            <!-- Grid Input Kredensial & Endpoint -->
            <div class="space-y-4">
              <!-- Field 1: Endpoint URL -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label for="inputAiKreativEndpoint" class="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span>Target Endpoint URL:</span>
                    <span class="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    id="btn-reset-endpoint"
                    class="text-[11px] text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Gunakan Default
                  </button>
                </div>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 text-lg">link</span>
                  <input
                    type="text"
                    id="inputAiKreativEndpoint"
                    value="${aiEndpoint}"
                    placeholder="https://aikreativ.app/api/keys/receive"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-purple-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
                <p class="text-[11px] text-slate-500">Method: <strong class="text-purple-300">POST</strong> | Body: <code>{ "key" / "keys", "source" }</code></p>
              </div>

              <!-- Field 2: Header x-api-key -->
              <div class="space-y-1.5">
                <label for="inputAiKreativApiKey" class="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>Header Nilai (x-api-key):</span>
                  <span class="text-rose-400">*</span>
                </label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 text-lg">key</span>
                  <input
                    type="password"
                    id="inputAiKreativApiKey"
                    value="${aiApiKey}"
                    placeholder="4511d6a00b4f76cd329fa1c011f0aa5f90ddc4b086e6b0d7ceb642a4e3969230"
                    class="w-full pl-10 pr-12 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all select-all"
                  />
                  <button
                    type="button"
                    id="btnToggleAiKeyVis"
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Tampilkan / Sembunyikan API Key"
                  >
                    <span id="iconAiKeyVis" class="material-symbols-outlined text-lg">visibility</span>
                  </button>
                </div>
                <p class="text-[11px] text-slate-500">Kunci rahasia untuk autentikasi ke server ai.kreativ pada header permintaan.</p>
              </div>

              <!-- Field 3: Source Identifier -->
              <div class="space-y-1.5">
                <label for="inputAiKreativSource" class="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Nama Aplikasi Pengirim (source):
                </label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 text-lg">badge</span>
                  <input
                    type="text"
                    id="inputAiKreativSource"
                    value="${aiSource}"
                    placeholder="Panen Kunci"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
                <p class="text-[11px] text-slate-500">Nilai atribut <code>source</code> yang dicatat di dashboard ai.kreativ saat menerima key.</p>
              </div>
            </div>

            <!-- Feedback Alert Uji Koneksi -->
            <div id="aiKreativTestFeedback" class="hidden p-3.5 rounded-xl text-xs font-medium border transition-all"></div>

            <!-- Tombol Aksi: Uji Koneksi & Simpan -->
            <div class="flex items-center justify-between pt-4 border-t border-slate-800/80 gap-3 flex-wrap">
              <button
                type="button"
                id="btnTestAiKreativ"
                class="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 active:scale-95 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <span class="material-symbols-outlined text-base text-purple-400">network_ping</span>
                <span>Uji Koneksi (Test Ping)</span>
              </button>

              <button
                type="submit"
                id="btnSaveAiKreativConfig"
                class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <span class="material-symbols-outlined text-base">save</span>
                <span>Simpan Konfigurasi ai.kreativ</span>
              </button>
            </div>
          </form>
        </div>


        <!-- ======================================================== -->
        <!-- CARD 2: NOTIFIKASI TELEGRAM BOT ADMIN (GRUP)            -->
        <!-- ======================================================== -->
        <div id="section-telegram" class="relative bg-slate-900/95 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl backdrop-blur-xl transition-all ${
          this.activeSection === 'aikreativ' ? 'hidden' : 'block'
        }">
          
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
                  ${isMasterTelegramEnabled ? 'checked' : ''}
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

            <!-- Section: KREDENSIAL BOT TELEGRAM -->
            <div class="space-y-4">
              
              <!-- Input: Telegram Bot Token -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label for="inputTelegramBotToken" class="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span>Telegram Bot Token:</span>
                    <span class="text-rose-400">*</span>
                  </label>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 text-decoration-none"
                  >
                    <span>Dapatkan di @BotFather</span>
                    <span class="material-symbols-outlined text-xs">open_in_new</span>
                  </a>
                </div>
                <div class="relative">
                  <input
                    type="password"
                    id="inputTelegramBotToken"
                    name="telegramBotToken"
                    value="${botToken}"
                    placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    class="w-full px-4 pr-12 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all select-all"
                  />
                  <button
                    type="button"
                    id="btnToggleTokenVis"
                    class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Tampilkan / Sembunyikan Token"
                  >
                    <span id="iconTokenVis" class="material-symbols-outlined text-lg">visibility</span>
                  </button>
                </div>
              </div>

              <!-- Input: Telegram Group Chat ID -->
              <div class="space-y-1.5">
                <label for="inputTelegramChatId" class="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>Telegram Group Chat ID:</span>
                  <span class="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="inputTelegramChatId"
                  name="telegramChatId"
                  value="${chatId}"
                  placeholder="Contoh: -1003971650678"
                  class="w-full px-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all select-all"
                />
                <p class="text-[11px] text-slate-500">
                  Wajib diawali tanda minus (-) untuk Supergroup, contoh: <code class="text-slate-400 font-mono">-1003971650678</code>. Tambahkan Bot Anda ke dalam grup sebagai Admin.
                </p>
              </div>

            </div>

            <!-- Tombol Aksi: Tes Koneksi & Simpan -->
            <div class="flex items-center justify-between pt-4 border-t border-slate-800/80 gap-3 flex-wrap">
              <button
                type="button"
                id="btnTestTelegram"
                class="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <span class="material-symbols-outlined text-base text-emerald-400">send</span>
                <span>Kirim Pesan Uji Coba</span>
              </button>

              <button
                type="submit"
                id="btnSaveTelegramConfig"
                class="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <span class="material-symbols-outlined text-base">save</span>
                <span>Simpan Konfigurasi Bot</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    `;
  }

  bindEvents(container) {
    if (!container) return;

    // ── Tab Switcher Filter ──
    const tabBtns = container.querySelectorAll('[data-config-tab]');
    const sectionAi = container.querySelector('#section-aikreativ');
    const sectionTg = container.querySelector('#section-telegram');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-config-tab');
        this.activeSection = tab;

        tabBtns.forEach(b => {
          b.className = 'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer text-slate-400 hover:text-white';
        });

        if (tab === 'all') {
          btn.className = 'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer bg-indigo-600 text-white shadow-sm';
          sectionAi?.classList.remove('hidden');
          sectionTg?.classList.remove('hidden');
        } else if (tab === 'aikreativ') {
          btn.className = 'px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-purple-600 text-white shadow-sm';
          sectionAi?.classList.remove('hidden');
          sectionTg?.classList.add('hidden');
        } else if (tab === 'telegram') {
          btn.className = 'px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600 text-white shadow-sm';
          sectionAi?.classList.add('hidden');
          sectionTg?.classList.remove('hidden');
        }
      });
    });

    // ── BIND EVENT AI.KREATIV ──
    this._bindAiKreativEvents(container);

    // ── BIND EVENT TELEGRAM ──
    this._bindTelegramEvents(container);
  }

  _bindAiKreativEvents(container) {
    const aiForm = container.querySelector('#aikreativ-config-form');
    const aiMasterToggle = container.querySelector('#aiKreativMasterToggle');
    const aiAutoForward = container.querySelector('#toggleAiKreativAutoForward');
    const inputEndpoint = container.querySelector('#inputAiKreativEndpoint');
    const inputApiKey = container.querySelector('#inputAiKreativApiKey');
    const inputSource = container.querySelector('#inputAiKreativSource');
    const btnToggleVis = container.querySelector('#btnToggleAiKeyVis');
    const iconVis = container.querySelector('#iconAiKeyVis');
    const btnResetEndpoint = container.querySelector('#btn-reset-endpoint');
    const btnTestAi = container.querySelector('#btnTestAiKreativ');
    const btnSaveAi = container.querySelector('#btnSaveAiKreativConfig');
    const feedbackBox = container.querySelector('#aiKreativTestFeedback');

    // Visibility toggle x-api-key
    if (btnToggleVis && inputApiKey && iconVis) {
      btnToggleVis.addEventListener('click', () => {
        const isPass = inputApiKey.type === 'password';
        inputApiKey.type = isPass ? 'text' : 'password';
        iconVis.textContent = isPass ? 'visibility_off' : 'visibility';
      });
    }

    // Reset Endpoint to default
    btnResetEndpoint?.addEventListener('click', () => {
      if (inputEndpoint) {
        inputEndpoint.value = 'https://aikreativ.app/api/keys/receive';
        this.toast.info('Endpoint diatur kembali ke default.', 'Default');
      }
    });

    // Helper simpan config ai.kreativ
    const saveAiConfig = async (showToast = true) => {
      const origText = btnSaveAi ? btnSaveAi.innerHTML : '';
      if (btnSaveAi) {
        btnSaveAi.disabled = true;
        btnSaveAi.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>Menyimpan...</span>';
      }

      const newAiCfg = {
        enabled: aiMasterToggle ? aiMasterToggle.checked : true,
        autoForwardOnValid: aiAutoForward ? aiAutoForward.checked : false,
        endpoint: (inputEndpoint?.value || '').trim() || 'https://aikreativ.app/api/keys/receive',
        apiKey: (inputApiKey?.value || '').trim(),
        source: (inputSource?.value || '').trim() || 'Panen Kunci'
      };

      await aiKreativService.saveConfig(newAiCfg);

      if (btnSaveAi) {
        btnSaveAi.disabled = false;
        btnSaveAi.innerHTML = origText;
      }

      if (showToast) {
        this.toast.success('Konfigurasi ai.kreativ berhasil disimpan!', 'ai.kreativ');
      }
      return newAiCfg;
    };

    // Submit form ai.kreativ
    aiForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveAiConfig(true);
    });

    // Toggle master change
    aiMasterToggle?.addEventListener('change', () => {
      saveAiConfig(false);
      this.toast.info(aiMasterToggle.checked ? 'Integrasi ai.kreativ diaktifkan.' : 'Integrasi ai.kreativ dinonaktifkan.', 'Status Integrasi');
    });

    // Test Koneksi ai.kreativ
    btnTestAi?.addEventListener('click', async () => {
      const endpoint = (inputEndpoint?.value || '').trim();
      const apiKey = (inputApiKey?.value || '').trim();

      if (!apiKey) {
        this.toast.error('Nilai header x-api-key wajib diisi untuk pengujian!', 'API Key Kosong');
        inputApiKey?.focus();
        return;
      }

      // Simpan konfigurasi saat ini dulu
      await saveAiConfig(false);

      const origHtml = btnTestAi.innerHTML;
      btnTestAi.disabled = true;
      btnTestAi.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>Menguji Handshake...</span>';

      if (feedbackBox) {
        feedbackBox.className = 'hidden';
      }

      try {
        const testRes = await aiKreativService.testConnection(endpoint, apiKey);

        if (feedbackBox) {
          feedbackBox.classList.remove('hidden');
          if (testRes.success) {
            feedbackBox.className = 'p-3.5 rounded-xl text-xs font-medium border bg-emerald-950/40 border-emerald-500/40 text-emerald-300 flex items-start gap-2';
            feedbackBox.innerHTML = `
              <span class="material-symbols-outlined text-emerald-400 text-lg shrink-0">check_circle</span>
              <div class="space-y-0.5">
                <div class="font-bold">Koneksi Berhasil (HTTP 200)</div>
                <div>Header <code>x-api-key</code> valid & terverifikasi oleh server ai.kreativ. Endpoint siap menerima pengiriman API Key!</div>
              </div>
            `;
            this.toast.success('Koneksi ke endpoint ai.kreativ Berhasil!', 'Sukses');
          } else {
            feedbackBox.className = 'p-3.5 rounded-xl text-xs font-medium border bg-rose-950/40 border-rose-500/40 text-rose-300 flex items-start gap-2';
            feedbackBox.innerHTML = `
              <span class="material-symbols-outlined text-rose-400 text-lg shrink-0">error</span>
              <div class="space-y-0.5">
                <div class="font-bold">Uji Koneksi Gagal</div>
                <div>${testRes.error || 'Autentikasi gagal atau server tidak merespon.'}</div>
              </div>
            `;
            this.toast.error(testRes.error || 'Gagal terhubung ke ai.kreativ', 'Gagal');
          }
        }
      } catch (err) {
        this.toast.error(err.message, 'Kesalahan Jaringan');
      } finally {
        btnTestAi.disabled = false;
        btnTestAi.innerHTML = origHtml;
      }
    });
  }

  _bindTelegramEvents(container) {
    const form = container.querySelector('#telegram-config-form');
    const masterToggle = container.querySelector('#telegramMasterToggle');
    const togglePayment = container.querySelector('#toggleNotifyPayment');
    const toggleSupport = container.querySelector('#toggleNotifySupport');
    const inputToken = container.querySelector('#inputTelegramBotToken');
    const inputChatId = container.querySelector('#inputTelegramChatId');
    const btnToggleVis = container.querySelector('#btnToggleTokenVis');
    const iconVis = container.querySelector('#iconTokenVis');
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
