import { AppEvents } from '../../core/events/EventBus.js';
import { ReceiptHelper } from '../utils/ReceiptHelper.js';

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

    // Sembunyikan Header bawaan di halaman /chat agar LiveChatView mengambil alih penuh (Foto 2)
    if (path === '/chat' || currentHash === '/chat' || path.startsWith('/chat')) {
      this._element.classList.add('hidden');
      return;
    } else {
      this._element.classList.remove('hidden');
    }

    const isLogin = path === '/login' || path === 'login' || currentHash === '/login' || currentHash === 'login';
    const isRegister = path === '/register' || path === 'register' || currentHash === '/register' || currentHash === 'register';
    const isResetPassword = path === '/reset-password' || path === 'reset-password' || currentHash === '/reset-password' || currentHash.startsWith('/reset-password') || path.startsWith('/reset-password');
    const isAuthPage = isLogin || isRegister || isResetPassword;
    const isProfilePage = path === '/profil' || path === 'profil' || currentHash === '/profil' || currentHash === 'profil' || path.startsWith('/profil') || currentHash.startsWith('/profil');

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
      '/register': 'Daftar Akun',
      '/reset-password': 'Panen Kunci'
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

    // Jika berjalan sebagai PWA standalone dan di halaman utama (login/dashboard),
    // atau di halaman reset kata sandi, sembunyikan tombol back.
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isDashboard = path === '/dashboard' || path === 'dashboard' || currentHash === '/dashboard';
    const hideBackBtn = (isPwa && (isLogin || isDashboard)) || isResetPassword;

    this._element.innerHTML = `
      <div class="h-16 max-w-md mx-auto px-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          ${hideBackBtn ? '' : `
          <button type="button" id="header-back-btn" class="w-9 h-9 -ml-1 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-colors active:scale-95 cursor-pointer" aria-label="Kembali">
            <span class="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          `}
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
              class="relative w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-all active:scale-95 cursor-pointer ${isProfilePage ? '-mr-1' : ''}"
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
            ` : ''}
          ` : `
            <a href="#/login" class="text-xs font-semibold text-primary hover:underline">Masuk</a>
          `)}
        </div>
      </div>
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
   * Portal mount point langsung di document.body agar terhindar dari
   * jebakan backdrop-filter / transform pada elemen header.
   */
  _getDrawerPortal() {
    let portal = document.getElementById('notif-drawer-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'notif-drawer-portal';
      document.body.appendChild(portal);
    }
    return portal;
  }

  /**
   * Menampilkan Drawer / Pop-up Panel Notifikasi Pengguna
   */
  _openNotificationDrawer() {
    const mount = this._getDrawerPortal();
    if (!mount) return;

    // Kunci scroll body saat drawer terbuka
    document.body.style.overflow = 'hidden';

    const notifs = this._notificationService ? this._notificationService.getNotifications() : [];
    const unreadCount = notifs.filter(n => !n.isRead).length;

    mount.innerHTML = `
      <div id="notif-drawer-backdrop" class="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 transition-all duration-200">
        <div class="w-full max-w-md bg-surface-card rounded-t-3xl sm:rounded-3xl border border-surface-container shadow-2xl overflow-hidden flex flex-col my-0 sm:my-auto" style="max-height: 85vh; max-height: 85dvh;">
          
          <!-- Drawer Header (Sticky) -->
          <div class="p-4 px-5 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest shrink-0">
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
                title="Tutup (Esc)"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <!-- Drawer Content (Scrollable) -->
          <div class="overflow-y-auto p-4 space-y-3 flex-1 min-h-0 custom-scrollbar">
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

              const isFailed = n.type === 'withdrawal_failed' || n.title?.toLowerCase().includes('ditolak');
              const iconName = isFailed ? 'cancel' : 'task_alt';
              const iconBgClass = isFailed ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500';
              const cardBgClass = isUnread
                ? (isFailed ? 'bg-red-500/5 border border-red-500/30 shadow-sm' : 'bg-emerald-500/5 border border-emerald-500/30 shadow-sm')
                : 'bg-surface-container-lowest border border-surface-container';
              const unreadDotClass = isFailed ? 'bg-red-500' : 'bg-emerald-500';
              const isWithdrawal = n.type === 'withdrawal_success' || n.type === 'withdrawal_failed' || n.transactionId || n.id?.startsWith('notif_wd_') || n.title?.toLowerCase().includes('penarikan');

              return `
                <div class="rounded-2xl p-4 transition-all ${cardBgClass} flex flex-col gap-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-xl ${iconBgClass} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">${iconName}</span>
                      </div>
                      <div>
                        <div class="flex items-center gap-1.5">
                          <h4 class="font-label-md text-xs font-bold text-text-heading">${n.title}</h4>
                          ${isUnread ? `<span class="w-2 h-2 rounded-full ${unreadDotClass}"></span>` : ''}
                        </div>
                        <span class="text-[10px] text-text-body">${dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <p class="text-xs text-text-body leading-relaxed pl-10">${n.message}</p>

                  <!-- Bukti Transfer Preview (Jika Ada Gambar Langsung) -->
                  ${n.proofImage ? `
                    <div class="mt-1 pl-10">
                      <div class="relative rounded-xl overflow-hidden border border-surface-container group cursor-pointer" data-view-proof="${n.id}">
                        <img src="${n.proofImage}" alt="Bukti Transfer" class="w-full h-28 object-cover bg-slate-900 group-hover:scale-105 transition-transform duration-300" />
                        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[1px]">
                          <span class="material-symbols-outlined text-base">zoom_in</span>
                          <span>Ketuk Untuk Memperbesar</span>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Tombol Aksi Detail Penarikan (Selalu Muncul untuk Transaksi Penarikan) -->
                  ${isWithdrawal ? `
                    <div class="pl-10 pt-1">
                      ${isFailed ? `
                        <button
                          type="button"
                          data-view-reject="${n.id}"
                          class="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-red-500/25 cursor-pointer shadow-2xs"
                        >
                          <span class="material-symbols-outlined text-[16px]">info</span>
                          <span>Lihat Rincian Penolakan</span>
                        </button>
                      ` : `
                        <button
                          type="button"
                          data-view-proof="${n.id}"
                          class="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-emerald-500/25 cursor-pointer shadow-2xs"
                        >
                          <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                          <span>Lihat Bukti Transfer & Rincian</span>
                        </button>
                      `}
                    </div>
                  ` : ''}

                  ${isUnread ? `
                    <div class="flex justify-end pt-1">
                      <button
                        type="button"
                        data-mark-single-read="${n.id}"
                        class="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Tandai sudah dibaca
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Drawer Footer (Sticky) -->
          <div class="p-3 bg-surface-container-lowest border-t border-surface-container text-center shrink-0">
            <p class="text-[10px] text-outline">Panen Kunci • Notifikasi Realtime</p>
          </div>
        </div>
      </div>
    `;

    if (this._drawerKeyHandler) {
      document.removeEventListener('keydown', this._drawerKeyHandler);
    }
    this._drawerKeyHandler = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', this._drawerKeyHandler);

    const closeDrawer = () => {
      if (this._drawerKeyHandler) {
        document.removeEventListener('keydown', this._drawerKeyHandler);
        this._drawerKeyHandler = null;
      }
      document.body.style.overflow = '';
      mount.innerHTML = '';
    };

    const backdrop = mount.querySelector('#notif-drawer-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeDrawer();
      });
    }

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

    // View Proof Lightbox (Bukti Transfer & Rincian)
    mount.querySelectorAll('[data-view-proof]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-view-proof');
        const notif = notifs.find(n => n.id === id);
        if (notif) {
          if (this._notificationService && !notif.isRead) {
            this._notificationService.markAsRead(id);
          }
          ReceiptHelper.openProofLightbox(notif);
        }
      });
    });

    // View Reject Lightbox (Rincian Penolakan)
    mount.querySelectorAll('[data-view-reject]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-view-reject');
        const notif = notifs.find(n => n.id === id);
        if (notif) {
          if (this._notificationService && !notif.isRead) {
            this._notificationService.markAsRead(id);
          }
          ReceiptHelper.openRejectLightbox(notif);
        }
      });
    });
  }

  /**
   * Modal Lightbox Foto Bukti Transfer resolusi penuh dengan aksi Unduh
   */
  _openProofLightbox(notif) {
    ReceiptHelper.openProofLightbox(notif);
  }
}
