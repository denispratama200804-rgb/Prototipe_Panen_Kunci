import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * HistoryView
 * Prinsip: Single Responsibility Principle (SRP) & Liskov Substitution Principle (LSP)
 * Halaman riwayat transaksi dengan dua tab interaktif: Riwayat Setoran Key & Riwayat Penarikan Saldo.
 */
export class HistoryView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._apiKeyService = container.resolve('ApiKeyService');
    this._walletService = container.resolve('WalletService');
    this._activeTab = 'setoran'; // 'setoran' or 'penarikan'
  }

  render() {
    const keys = this._apiKeyService.getAllKeys();
    const withdrawals = this._walletService.getWithdrawals();

    return `
      <div class="flex flex-col w-full min-h-screen bg-background pb-28 pt-20">
        <div class="px-margin-mobile max-w-md mx-auto w-full flex flex-col gap-4">
          
          <!-- Segmented Tab Controls -->
          <div class="flex bg-surface-container-low rounded-2xl p-1 gap-1 border border-surface-container shadow-inner">
            <button
              type="button"
              id="tabBtnSetoran"
              class="flex-1 py-3 px-3 rounded-xl font-label-md text-xs font-bold transition-all duration-200 ${this._activeTab === 'setoran' ? 'bg-surface-card text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
            >
              Setoran API Key (${keys.length})
            </button>
            <button
              type="button"
              id="tabBtnPenarikan"
              class="flex-1 py-3 px-3 rounded-xl font-label-md text-xs font-bold transition-all duration-200 ${this._activeTab === 'penarikan' ? 'bg-surface-card text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}"
            >
              Penarikan Dana (${withdrawals.length})
            </button>
          </div>

          <!-- Tab Content: Setoran API Key -->
          <div id="tabContentSetoran" class="flex flex-col gap-2.5 ${this._activeTab === 'setoran' ? '' : 'hidden'}">
            ${keys.length === 0 ? `
              <div class="bg-surface-card rounded-3xl p-10 text-center flex flex-col items-center border border-surface-container">
                <span class="material-symbols-outlined text-4xl text-outline mb-2">vpn_key_off</span>
                <p class="text-sm font-bold text-text-heading">Belum Ada Setoran Key</p>
                <p class="text-xs text-text-body mt-1">Mulai setorkan API Key valid dari Kie.ai untuk mendapatkan saldo.</p>
                <a href="#/setor" class="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm">
                  Setor Key Sekarang
                </a>
              </div>
            ` : keys.map(k => {
              const isPending = k.status === 'pending';
              const isValid = k.status === 'valid';
              const stripeColor = isPending ? 'bg-amber-500' : (isValid ? 'bg-secondary' : 'bg-error-ruby');
              const dateStr = new Date(k.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return `
                <div class="bg-surface-card border border-surface-container rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden group">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}"></div>
                  
                  <div class="flex flex-col gap-1 pl-2">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-bold text-text-heading bg-surface-container-low px-2 py-0.5 rounded-md border border-surface-container">
                        ${k.getMaskedKey()}
                      </span>
                      ${isPending ? `
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Menunggu Verifikasi</span>
                        </span>
                      ` : isValid ? `
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                          Valid
                        </span>
                      ` : `
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container">
                          Invalid
                        </span>
                      `}
                    </div>
                    <span class="text-[11px] text-text-body">${dateStr}</span>
                    ${k.errorMessage ? `<span class="text-[11px] text-error-ruby">${k.errorMessage}</span>` : ''}
                  </div>

                  <div class="flex flex-col items-end shrink-0">
                    <span class="font-headline-md text-sm font-extrabold ${isPending ? 'text-amber-500' : (isValid ? 'text-secondary' : 'text-outline')}">
                      ${(isPending || isValid) ? `+Rp ${(k.rewardAmount || 3000).toLocaleString('id-ID')}` : '+Rp 0'}
                    </span>
                    <span class="text-[10px] ${isPending ? 'text-amber-500 font-semibold' : 'text-outline font-semibold'}">
                      ${isPending ? 'Saldo Pasif' : 'Kie.ai 80 Kredit'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Tab Content: Penarikan Dana -->
          <div id="tabContentPenarikan" class="flex flex-col gap-2.5 ${this._activeTab === 'penarikan' ? '' : 'hidden'}">
            ${withdrawals.length === 0 ? `
              <div class="bg-surface-card rounded-3xl p-10 text-center flex flex-col items-center border border-surface-container">
                <span class="material-symbols-outlined text-4xl text-outline mb-2">receipt_long</span>
                <p class="text-sm font-bold text-text-heading">Belum Ada Riwayat Penarikan</p>
                <p class="text-xs text-text-body mt-1">Kumpulkan saldo dari setoran API key untuk melakukan penarikan pertama Anda.</p>
                <a href="#/tarik" class="mt-4 px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold shadow-sm">
                  Tarik Saldo
                </a>
              </div>
            ` : withdrawals.map(w => {
              const dateStr = new Date(w.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              const isPending = w.status === 'pending';
              const isSuccess = w.status === 'success';
              const isFailed = w.status === 'failed';

              let stripeColor = 'bg-warning-amber';
              let badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-amber/15 text-warning-amber border border-warning-amber/30 animate-pulse">Menunggu Persetujuan Admin</span>';

              if (isSuccess) {
                stripeColor = 'bg-secondary';
                badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">Berhasil Ditransfer</span>';
              } else if (isFailed) {
                stripeColor = 'bg-error-ruby';
                badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container">Ditolak (Dana Di-refund)</span>';
              }

              return `
                <div class="bg-surface-card border border-surface-container rounded-2xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}"></div>

                  <div class="flex flex-col gap-1 pl-2">
                    <div class="flex items-center gap-2">
                      <span class="font-label-md text-xs font-bold text-text-heading">${w.title}</span>
                      ${badgeHtml}
                    </div>
                    <span class="text-[11px] text-text-body">${w.description} • ${dateStr}</span>
                    ${w.proofImage ? `
                      <button
                        type="button"
                        data-proof-history="${w.id}"
                        class="mt-1 text-[11px] font-bold text-primary hover:underline flex items-center gap-1 w-fit"
                      >
                        <span class="material-symbols-outlined text-[14px]">image</span>
                        <span>Lihat Bukti Foto Transfer</span>
                      </button>
                    ` : ''}
                  </div>

                  <div class="flex flex-col items-end shrink-0">
                    <span class="font-headline-md text-sm font-extrabold ${isFailed ? 'text-text-body line-through' : 'text-error-ruby'}">
                      -Rp ${w.amount.toLocaleString('id-ID')}
                    </span>
                    <span class="text-[10px] ${isSuccess ? 'text-secondary' : isPending ? 'text-warning-amber' : 'text-text-body'} font-semibold">
                      ${isSuccess ? 'Ditransfer' : isPending ? 'Dalam Antrean' : 'Dikembalikan ke Saldo'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      </div>
    `;
  }

  mount(container) {
    const tabBtnSetoran = container.querySelector('#tabBtnSetoran');
    const tabBtnPenarikan = container.querySelector('#tabBtnPenarikan');
    const contentSetoran = container.querySelector('#tabContentSetoran');
    const contentPenarikan = container.querySelector('#tabContentPenarikan');

    tabBtnSetoran?.addEventListener('click', () => {
      this._activeTab = 'setoran';
      tabBtnSetoran.className = 'flex-1 py-3 px-3 rounded-xl font-label-md text-xs font-bold transition-all duration-200 bg-surface-card text-primary shadow-sm';
      tabBtnPenarikan.className = 'flex-1 py-3 px-3 rounded-xl font-label-md text-xs font-bold transition-all duration-200 text-on-surface-variant hover:text-on-surface';
      contentSetoran.classList.remove('hidden');
      contentPenarikan.classList.add('hidden');
    });

    tabBtnPenarikan?.addEventListener('click', () => {
      this._activeTab = 'penarikan';
      tabBtnPenarikan.className = 'flex-1 py-3 px-3 rounded-xl font-label-md text-xs font-bold transition-all duration-200 bg-surface-card text-primary shadow-sm';
      tabBtnSetoran.className = 'flex-1 py-3 px-3 rounded-xl font-label-md text-xs font-bold transition-all duration-200 text-on-surface-variant hover:text-on-surface';
      contentPenarikan.classList.remove('hidden');
      contentSetoran.classList.add('hidden');
    });

    // Event listener untuk preview bukti foto di history
    container.querySelectorAll('[data-proof-history]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-proof-history');
        const w = this._walletService.getWithdrawals().find(item => item.id === id);
        if (w && w.proofImage) {
          const lightbox = document.createElement('div');
          lightbox.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200';
          lightbox.innerHTML = `
            <div class="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 relative shadow-2xl flex flex-col gap-4 my-8">
              <button type="button" id="btn-close-hist-lightbox" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
              <div class="flex items-center gap-3 pr-8">
                <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-white">Bukti Transfer Resmi</h3>
                  <p class="text-[11px] text-slate-400">Penarikan #${w.id}</p>
                </div>
              </div>
              <div class="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-1">
                <img src="${w.proofImage}" alt="Bukti Transfer" class="w-full max-h-[55vh] object-contain rounded-xl" />
              </div>
              <div class="flex items-center gap-2 pt-1">
                <a href="${w.proofImage}" download="bukti-transfer-${w.id}.png" class="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold text-center flex items-center justify-center gap-2 shadow-md">
                  <span class="material-symbols-outlined text-[18px]">download</span>
                  <span>Unduh Foto Bukti</span>
                </a>
                <button type="button" id="btn-cancel-hist-lightbox" class="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Tutup</button>
              </div>
            </div>
          `;
          document.body.appendChild(lightbox);
          const close = () => lightbox.remove();
          lightbox.querySelector('#btn-close-hist-lightbox').addEventListener('click', close);
          lightbox.querySelector('#btn-cancel-hist-lightbox').addEventListener('click', close);
        }
      });
    });
  }
}
