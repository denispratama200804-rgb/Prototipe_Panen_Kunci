import { AppEvents } from '../../core/events/EventBus.js';

/**
 * HeaderComponent
 * Prinsip: Single Responsibility Principle (SRP)
 * Menampilkan bar atas (Header) dengan judul dinamis, logo, tombol kembali, dan avatar profil.
 */
export class HeaderComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    this._container = container;
    this._eventBus = container.resolve('EventBus');
    this._authService = container.resolve('AuthService');
    this._notificationService = container.has('NotificationService') ? container.resolve('NotificationService') : null;
    this._element = null;
    const initialHash = (window.location.hash || '').replace(/^#\/?/, '/').split('?')[0];
    this._currentPath = initialHash ? `/${initialHash.replace(/^\//, '')}` : '/';
  }

  mount(containerEl) {
    this._element = document.createElement('header');
    this._element.className = 'fixed top-0 w-full z-40 glass shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/40 transition-all duration-300';
    containerEl.appendChild(this._element);

    this.render();

    this._eventBus.on(AppEvents.ROUTE_CHANGED, ({ path }) => {
      this._currentPath = path;
      this.render();
    });

    this._eventBus.on(AppEvents.AUTH_STATE_CHANGED, () => {
      this.render();
    });

    this._eventBus.on(AppEvents.USER_UPDATED, () => {
      this.render();
    });

    this._eventBus.on(AppEvents.NOTIFICATIONS_UPDATED, () => {
      this.render();
    });

    window.addEventListener('hashchange', () => {
      const hash = (window.location.hash || '').replace(/^#\/?/, '/').split('?')[0];
      this._currentPath = hash ? `/${hash.replace(/^\//, '')}` : '/';
      this.render();
    });
  }

  render() {
    if (!this._element) return;

    // Deteksi path secara akurat dari state maupun hash URL aktif
    const currentHash = (window.location.hash || '').replace(/^#\/?/, '/').split('?')[0];
    const path = (this._currentPath || currentHash || '/').trim();

    const isLogin = path === '/login' || path === 'login' || currentHash === '/login' || currentHash === 'login';
    const isRegister = path === '/register' || path === 'register' || currentHash === '/register' || currentHash === 'register';
    const isAuthPage = isLogin || isRegister;
    const isProfilePage = path === '/profil' || path === 'profil' || currentHash === '/profil' || currentHash === 'profil';

    const isAuth = this._authService.isAuthenticated();
    const user = this._authService.getCurrentUser();
    const unreadCount = this._notificationService ? this._notificationService.getUnreadCount() : 0;

    const pageTitles = {
      '/dashboard': 'Dashboard',
      '/saldo': 'Detail Saldo',
      '/setor': 'Setor API Key',
      '/tarik': 'Tarik Saldo',
      '/riwayat': 'Riwayat Transaksi',
      '/profil': 'Profil Pengguna',
      '/login': 'Masuk Akun',
      '/register': 'Daftar Akun'
    };

    const title = pageTitles[path] || (isLogin ? 'Masuk Akun' : (isRegister ? 'Daftar Akun' : 'Panen Kunci'));

    if (path === '/') {
      this._element.innerHTML = `
        <div class="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <img src="/Logo_PK.jpg" alt="Panen Kunci Logo" class="h-8 w-auto object-contain rounded-md" onerror="this.src='/logo.png'"/>
            <span class="font-headline-md text-lg font-bold text-primary tracking-tight">Panen Kunci</span>
          </div>
          <div class="flex items-center gap-2">
            <a href="#/login" class="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all">
              Login
            </a>
          </div>
        </div>
      `;
      return;
    }

    this._element.innerHTML = `
      <div class="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button type="button" id="header-back-btn" class="w-9 h-9 -ml-1 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-colors active:scale-95 cursor-pointer" aria-label="Kembali">
            <span class="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <img src="/Logo_PK.jpg" alt="Logo" class="h-8 w-auto object-contain rounded-md" onerror="this.src='/logo.png'"/>
          <h1 class="font-headline-md text-base sm:text-lg font-bold text-on-surface truncate">${title}</h1>
        </div>

        <div class="flex items-center gap-2.5">
          ${isAuthPage ? `
            <!-- Di halaman login dan register: TIDAK menampilkan profil sama sekali -->
            <div class="w-8 h-8"></div>
          ` : (isAuth ? `
            ${user?.role === 'admin' ? `
              <a href="/admin_panel/index.html" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-600/15 text-purple-600 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all" title="Buka Panel Admin">
                <span class="material-symbols-outlined text-[14px]">shield_person</span>
                <span>Admin</span>
              </a>
            ` : ''}

            <!-- Tombol Notifikasi (Sebelah Foto Profil) -->
            <button
              type="button"
              id="header-notif-btn"
              class="relative w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-all active:scale-95 cursor-pointer"
              title="Notifikasi & Bukti Transfer"
              aria-label="Notifikasi Bukti Transfer"
            >
              <span class="material-symbols-outlined text-[22px]">notifications</span>
              ${unreadCount > 0 ? `
                <span class="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 bg-secondary text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center ring-2 ring-white shadow-sm animate-pulse">
                  ${unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ` : ''}
            </button>

            ${!isProfilePage ? `
              <a href="#/profil" class="relative group flex items-center gap-2" title="Buka Profil">
                <div class="relative">
                  ${user?.avatar ? `
                    <img
                      src="${user.avatar}"
                      alt="${user?.name || 'User'}"
                      class="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all"
                      onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');"
                    />
                    <div class="w-8 h-8 rounded-full bg-surface-container ring-2 ring-primary/20 group-hover:ring-primary flex items-center justify-center text-outline transition-all hidden">
                      <span class="material-symbols-outlined text-[18px]">person</span>
                    </div>
                  ` : `
                    <div class="w-8 h-8 rounded-full bg-surface-container ring-2 ring-primary/20 group-hover:ring-primary flex items-center justify-center text-outline transition-all">
                      <span class="material-symbols-outlined text-[18px]">person</span>
                    </div>
                  `}
                  <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${user?.isVerified ? 'bg-secondary' : 'bg-outline'} rounded-full border-2 border-white"></div>
                </div>
              </a>
            ` : '<div class="w-8 h-8"></div>'}
          ` : `
            <a href="#/login" class="text-xs font-semibold text-primary hover:underline">Masuk</a>
          `)}
        </div>
      </div>

      <!-- Container Mount Point untuk Drawer Notifikasi & Lightbox -->
      <div id="header-notif-drawer-container"></div>
    `;

    // Bind Back Button
    const backBtn = this._element.querySelector('#header-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const currentHash = window.location.hash;
        window.history.back();
        setTimeout(() => {
          if (window.location.hash === currentHash) {
            window.location.hash = '/';
          }
        }, 200);
      });
    }

    // Bind Notification Button
    const notifBtn = this._element.querySelector('#header-notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        this._openNotificationDrawer();
      });
    }
  }

  /**
   * Menampilkan Drawer / Pop-up Panel Notifikasi Pengguna
   */
  _openNotificationDrawer() {
    const mount = this._element.querySelector('#header-notif-drawer-container');
    if (!mount) return;

    const notifs = this._notificationService ? this._notificationService.getNotifications() : [];
    const unreadCount = notifs.filter(n => !n.isRead).length;

    mount.innerHTML = `
      <div id="notif-drawer-backdrop" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 transition-all duration-200">
        <div class="w-full max-w-md bg-surface-card rounded-t-3xl sm:rounded-3xl border border-surface-container shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          <!-- Drawer Header -->
          <div class="p-4 px-5 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">notifications_active</span>
              </div>
              <div>
                <h3 class="font-headline-md text-sm font-bold text-text-heading">Notifikasi Transaksi</h3>
                <p class="text-[11px] text-text-body">${unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}</p>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              ${unreadCount > 0 ? `
                <button
                  type="button"
                  id="btn-drawer-mark-all"
                  class="text-[11px] font-bold text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  Tandai Dibaca
                </button>
              ` : ''}
              <button
                type="button"
                id="btn-close-notif-drawer"
                class="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <!-- Drawer Content -->
          <div class="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
            ${notifs.length === 0 ? `
              <div class="py-14 text-center flex flex-col items-center justify-center">
                <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-2.5">
                  <span class="material-symbols-outlined text-3xl">notifications_none</span>
                </div>
                <p class="font-bold text-sm text-text-heading">Belum Ada Notifikasi</p>
                <p class="text-xs text-text-body mt-1 max-w-[240px]">Bukti foto transfer dari admin akan otomatis muncul di sini setelah penarikan Anda disetujui.</p>
              </div>
            ` : notifs.map(n => {
              const isUnread = !n.isRead;
              const dateStr = new Date(n.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              return `
                <div class="rounded-2xl p-4 transition-all ${isUnread ? 'bg-secondary/5 border border-secondary/30 shadow-sm' : 'bg-surface-container-lowest border border-surface-container'} flex flex-col gap-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">task_alt</span>
                      </div>
                      <div>
                        <div class="flex items-center gap-1.5">
                          <h4 class="font-label-md text-xs font-bold text-text-heading">${n.title}</h4>
                          ${isUnread ? '<span class="w-2 h-2 rounded-full bg-secondary"></span>' : ''}
                        </div>
                        <span class="text-[10px] text-text-body">${dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <p class="text-xs text-text-body leading-relaxed pl-10">${n.message}</p>

                  <!-- Bukti Transfer Preview (Jika Ada) -->
                  ${n.proofImage ? `
                    <div class="mt-1 pl-10">
                      <div class="rounded-2xl p-3 bg-surface-container-low border border-surface-container flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-text-heading flex items-center gap-1">
                            <span class="material-symbols-outlined text-[15px] text-secondary">image</span>
                            <span>Bukti Foto Transfer Resmi</span>
                          </span>
                          <span class="text-[10px] text-secondary font-semibold">Terkonfirmasi</span>
                        </div>

                        <div class="relative rounded-xl overflow-hidden border border-surface-container group cursor-pointer" data-view-proof="${n.id}">
                          <img src="${n.proofImage}" alt="Bukti Transfer" class="w-full h-32 object-cover bg-slate-900 group-hover:scale-105 transition-transform duration-300" />
                          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[1px]">
                            <span class="material-symbols-outlined text-base">zoom_in</span>
                            <span>Ketuk Untuk Memperbesar</span>
                          </div>
                        </div>

                        ${n.proofNotes ? `
                          <div class="text-[10px] text-text-body italic bg-surface-card p-2 rounded-xl border border-surface-container/60">
                            <strong>Pesan Admin:</strong> "${n.proofNotes}"
                          </div>
                        ` : ''}

                        <button
                          type="button"
                          data-view-proof="${n.id}"
                          class="w-full py-2 px-3 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm"
                        >
                          <span class="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Lihat Bukti Foto Transaksi</span>
                        </button>
                      </div>
                    </div>
                  ` : ''}

                  ${isUnread ? `
                    <div class="flex justify-end pt-1">
                      <button
                        type="button"
                        data-mark-single-read="${n.id}"
                        class="text-[11px] text-primary hover:underline font-semibold"
                      >
                        Tandai sudah dibaca
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Drawer Footer -->
          <div class="p-3 bg-surface-container-lowest border-t border-surface-container text-center">
            <p class="text-[10px] text-outline">Panen Kunci • Notifikasi Realtime</p>
          </div>
        </div>
      </div>
    `;

    const closeDrawer = () => {
      mount.innerHTML = '';
    };

    const backdrop = mount.querySelector('#notif-drawer-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeDrawer();
    });

    const closeBtn = mount.querySelector('#btn-close-notif-drawer');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    // Mark All Read
    const markAllBtn = mount.querySelector('#btn-drawer-mark-all');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        if (this._notificationService) {
          this._notificationService.markAllAsRead();
        }
        this._openNotificationDrawer();
      });
    }

    // Mark Single Read
    mount.querySelectorAll('[data-mark-single-read]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-mark-single-read');
        if (this._notificationService) {
          this._notificationService.markAsRead(id);
        }
        this._openNotificationDrawer();
      });
    });

    // View Proof Lightbox
    mount.querySelectorAll('[data-view-proof]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-view-proof');
        const notif = notifs.find(n => n.id === id);
        if (notif && notif.proofImage) {
          // Tandai juga sudah dibaca saat user membuka fotonya
          if (this._notificationService && !notif.isRead) {
            this._notificationService.markAsRead(id);
          }
          this._openProofLightbox(notif);
        }
      });
    });
  }

  /**
   * Modal Lightbox Foto Bukti Transfer resolusi penuh dengan aksi Unduh
   */
  _openProofLightbox(notif) {
    const lightboxMount = document.createElement('div');
    lightboxMount.id = 'notif-proof-lightbox-modal';
    document.body.appendChild(lightboxMount);

    lightboxMount.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
        <div class="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 relative shadow-2xl flex flex-col gap-4 my-8">
          <!-- Close Button -->
          <button
            type="button"
            id="btn-close-proof-lightbox"
            class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>

          <!-- Header -->
          <div class="flex items-center gap-3 pr-8">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white">Foto Bukti Transfer</h3>
              <p class="text-[11px] text-slate-400">Pencairan #${notif.transactionId || 'tx'}</p>
            </div>
          </div>

          <!-- Image Container with Zoomable Look -->
          <div class="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center p-1 relative shadow-inner">
            <img src="${notif.proofImage}" alt="Bukti Transfer Penuh" class="w-full max-h-[55vh] object-contain rounded-xl" />
          </div>

          <!-- Transaction Summary Info -->
          <div class="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
            <div class="flex justify-between text-slate-400">
              <span>Nominal Dicairkan:</span>
              <span class="font-bold text-emerald-400 font-mono">Rp ${(Number(notif.amount) || 0).toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Tujuan Transfer:</span>
              <span class="font-medium text-white">${notif.recipient || notif.method || '-'}</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Waktu Pengiriman:</span>
              <span class="text-slate-300">${new Date(notif.createdAt).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2.5 pt-1">
            <a
              href="${notif.proofImage}"
              download="bukti-transfer-panenkunci-${notif.transactionId || 'tx'}.png"
              id="btn-download-proof-img"
              class="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98] shadow-md shadow-primary/20"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh Foto Bukti</span>
            </a>
            <button
              type="button"
              id="btn-dismiss-lightbox"
              class="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    `;

    const closeLightbox = () => {
      lightboxMount.remove();
    };

    lightboxMount.querySelector('#btn-close-proof-lightbox').addEventListener('click', closeLightbox);
    lightboxMount.querySelector('#btn-dismiss-lightbox').addEventListener('click', closeLightbox);
  }
}
