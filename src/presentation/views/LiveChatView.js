import { IComponent } from '../../core/interfaces/IComponent.js';

/**
 * LiveChatView
 * Tampilan obrolan langsung (Live Chat) antara Pengguna dan Admin
 * Disesuaikan presisi dengan referensi Foto 2 (Top Bar Pusat Bantuan, Bubble Hijau, Input Bar).
 */
export class LiveChatView extends IComponent {
  /**
   * @param {import('../../core/container/ServiceContainer.js').ServiceContainer} container
   */
  constructor(container) {
    super();
    this._container = container;
    this._authService = container.resolve('AuthService');
    this._chatService = container.resolve('ChatService');
    this._notification = container.resolve('NotificationService');
    this._unsubscribers = [];
  }

  render() {
    const user = this._authService.getCurrentUser();
    if (!user) {
      return `
        <div class="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-3xl">chat_error</span>
          </div>
          <h2 class="font-headline-md text-xl font-bold text-text-heading">Perlu Masuk Akun</h2>
          <p class="text-xs text-text-body max-w-xs mt-1 mb-6">
            Silakan masuk akun terlebih dahulu untuk memulai obrolan langsung dengan admin.
          </p>
          <a href="#/login" class="bg-primary text-white font-label-md text-sm font-bold px-6 py-3 rounded-2xl shadow-md hover:bg-primary-container transition-all">
            Masuk Sekarang
          </a>
        </div>
      `;
    }

    const messages = this._chatService.getMessages(user.id);

    return `
      <div id="live-chat-screen" class="fixed inset-0 z-50 flex flex-col bg-[#f5f6fa] dark:bg-[#070b14] w-full h-full max-w-md mx-auto overflow-hidden shadow-2xl">
        
        <!-- Header Chat (Persis Referensi Foto 2: Brand Theme, Avatar Headset, Subtitle Online) -->
        <header class="h-16 px-4 bg-[#0b1c30] text-white flex items-center justify-between shrink-0 shadow-md border-b border-white/10 z-10">
          <div class="flex items-center gap-3">
            <!-- Back Button -->
            <button
              type="button"
              id="chat-back-btn"
              class="w-9 h-9 -ml-1 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95 cursor-pointer"
              aria-label="Kembali"
            >
              <span class="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>

            <!-- Support Avatar with Headset -->
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
                <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">support_agent</span>
              </div>
            </div>

            <!-- Title & Status -->
            <div class="flex flex-col">
              <h1 class="font-bold text-base text-white tracking-tight leading-tight">Pusat Bantuan</h1>
              <div class="flex items-center gap-1.5 text-[11px] text-white/80 font-medium">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Admin Online</span>
              </div>
            </div>
          </div>

          <!-- Quick Option Actions -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              id="btn-chat-info"
              class="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Informasi Bantuan"
            >
              <span class="material-symbols-outlined text-[20px]">info</span>
            </button>
          </div>
        </header>

        <!-- Chat Messages Container -->
        <div id="chat-messages-container" class="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth overscroll-contain">
          <!-- Date Separator -->
          <div class="flex justify-center my-2">
            <span class="px-3 py-1 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-text-body">
              Hari ini
            </span>
          </div>

          <!-- Message Bubbles Stream -->
          <div id="chat-bubble-stream" class="flex flex-col space-y-3">
            ${this._renderMessagesHtml(messages, user)}
          </div>
        </div>

        <!-- Quick Reply Suggestions Bar (Chips) -->
        <div class="px-3 py-1.5 bg-surface-card/60 dark:bg-black/20 backdrop-blur-sm border-t border-surface-container/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button type="button" class="quick-chip px-3 py-1 rounded-full text-[11px] font-medium bg-surface-container hover:bg-surface-container-high text-text-heading whitespace-nowrap transition-all border border-surface-container-highest active:scale-95">
            Saya sudah transfer / setor key
          </button>
          <button type="button" class="quick-chip px-3 py-1 rounded-full text-[11px] font-medium bg-surface-container hover:bg-surface-container-high text-text-heading whitespace-nowrap transition-all border border-surface-container-highest active:scale-95">
            Cek status penarikan
          </button>
          <button type="button" class="quick-chip px-3 py-1 rounded-full text-[11px] font-medium bg-surface-container hover:bg-surface-container-high text-text-heading whitespace-nowrap transition-all border border-surface-container-highest active:scale-95">
            Bantuan rekening
          </button>
        </div>

        <!-- Bottom Input Bar (Sesuai Referensi Foto 2) -->
        <div class="p-3 bg-white dark:bg-[#0d1526] border-t border-surface-container shadow-lg shrink-0 safe-area-pb">
          <form id="chat-input-form" class="flex items-center gap-2.5">
            <div class="relative flex-1">
              <input
                type="text"
                id="chat-input-text"
                autocomplete="off"
                placeholder="Tulis pesan..."
                class="w-full bg-[#f1f4f9] dark:bg-[#162035] text-text-heading text-sm px-4 py-3 rounded-full border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1a2640] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-text-body/60"
              />
            </div>
            <button
              type="submit"
              id="chat-send-btn"
              class="w-11 h-11 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Kirim Pesan"
            >
              <span class="material-symbols-outlined text-[20px] -rotate-12 translate-x-0.5">send</span>
            </button>
          </form>
        </div>

      </div>
    `;
  }

  _renderMessagesHtml(messages, currentUser) {
    if (!messages || messages.length === 0) {
      return `
        <div class="text-center py-8 text-xs text-text-body">
          Belum ada pesan. Mulai obrolan dengan admin kami sekarang.
        </div>
      `;
    }

    return messages.map(msg => {
      const isUser = msg.sender === 'user';
      if (isUser) {
        // User bubble: Right side, green background, white text, timestamp bottom right (Persis Foto 2)
        return `
          <div data-msg-id="${msg.id}" class="flex justify-end w-full animate-fade-in">
            <div class="bg-[#16a34a] text-white px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[82%] shadow-sm flex flex-col">
              <span class="text-[13px] leading-relaxed break-words select-text">${this._escapeAndFormat(msg.text)}</span>
              <div class="flex items-center justify-end gap-1 mt-1">
                <span class="text-[10px] text-white/80 font-medium">${msg.timeStr || ''}</span>
                <span class="material-symbols-outlined text-[13px] text-white/80">done_all</span>
              </div>
            </div>
          </div>
        `;
      } else {
        // Admin bubble: Left side, white/light background, dark text (Persis Foto 2)
        return `
          <div data-msg-id="${msg.id}" class="flex justify-start items-end gap-2 w-full animate-fade-in">
            <div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0 border border-primary/20">
              <span class="material-symbols-outlined text-[16px]">support_agent</span>
            </div>
            <div class="bg-white dark:bg-[#121c30] text-text-heading border border-surface-container dark:border-white/10 px-4 py-2.5 rounded-2xl rounded-tl-xs max-w-[82%] shadow-sm flex flex-col">
              <span class="text-[11px] font-bold text-primary dark:text-indigo-400 mb-0.5">${msg.userName || 'Admin Panen Kunci'}</span>
              <span class="text-[13px] leading-relaxed break-words select-text text-text-heading">${this._escapeAndFormat(msg.text)}</span>
              <span class="text-[10px] text-text-body/70 font-medium text-right mt-1">${msg.timeStr || ''}</span>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  _escapeAndFormat(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    let escaped = div.innerHTML;

    // Convert link text to clickable anchor
    escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 font-bold hover:text-amber-200 transition-colors">$1</a>');
    return escaped;
  }

  mount(container) {
    const user = this._authService.getCurrentUser();
    if (!user) return;

    const backBtn = container.querySelector('#chat-back-btn');
    const inputForm = container.querySelector('#chat-input-form');
    const inputText = container.querySelector('#chat-input-text');
    const sendBtn = container.querySelector('#chat-send-btn');
    const messagesContainer = container.querySelector('#chat-messages-container');
    const bubbleStream = container.querySelector('#chat-bubble-stream');
    const quickChips = container.querySelectorAll('.quick-chip');
    const infoBtn = container.querySelector('#btn-chat-info');

    // Tandai pesan sebagai sudah dibaca oleh user
    this._chatService.markAsRead(user.id, 'user');

    // Sinkronisasi data obrolan langsung dari Cloud Supabase saat layar dibuka
    this._chatService.syncFromRemote(user.id).then(() => {
      const freshMessages = this._chatService.getMessages(user.id);
      if (bubbleStream) {
        bubbleStream.innerHTML = this._renderMessagesHtml(freshMessages, user);
        this._scrollToBottom(messagesContainer);
      }
    }).catch(() => {});

    // Active polling interval untuk menerima balasan admin secara instan (setiap 2.5 detik saat chat terbuka)
    const chatPollTimer = setInterval(() => {
      if (window.location.hash.includes('/chat')) {
        this._chatService.syncFromRemote(user.id).catch(() => {});
      }
    }, 2500);
    this._unsubscribers.push(() => clearInterval(chatPollTimer));

    // Auto scroll ke pesan paling bawah
    this._scrollToBottom(messagesContainer);

    // Handler Kembali
    backBtn?.addEventListener('click', () => {
      window.history.back();
      setTimeout(() => {
        if (window.location.hash === '#/chat' || window.location.hash === '/chat') {
          window.location.hash = '/profil';
        }
      }, 150);
    });

    // Info modal
    infoBtn?.addEventListener('click', () => {
      this._notification.showModal({
        title: 'Pusat Bantuan Resmi',
        message: 'Layanan Live Chat ini langsung terhubung dengan Admin Panel Panen Kunci. Anda dapat menyampaikan kendala transaksi, verifikasi rekening, atau deposit kunci.',
        type: 'info',
        confirmText: 'Mengerti'
      });
    });

    // Quick chip buttons
    quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (inputText) {
          inputText.value = chip.textContent.trim();
          inputText.focus();
        }
      });
    });

    let isSending = false;

    // Kirim pesan (Dicegah duplikasi & ditangani terpusat via message_received listener)
    const handleSend = () => {
      const text = inputText?.value?.trim();
      if (!text || isSending) return;

      isSending = true;
      if (sendBtn) sendBtn.disabled = true;
      if (inputText) inputText.value = '';

      try {
        this._chatService.sendMessage({
          userId: user.id,
          userName: user.name || 'Pengguna',
          userAvatar: user.avatar || '',
          userEmail: user.email || '',
          sender: 'user',
          text: text
        });
      } finally {
        setTimeout(() => {
          isSending = false;
          if (sendBtn) sendBtn.disabled = false;
          inputText?.focus();
        }, 300);
      }
    };

    inputForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSend();
    });

    // Listen incoming messages realtime
    const unsubMsg = this._chatService.on('message_received', (msg) => {
      if (msg.userId === user.id) {
        if (msg.sender === 'admin') {
          this._chatService.markAsRead(user.id, 'user');
        }
        // Jangan duplikasi jika sudah di-append lokal saat send
        const exists = bubbleStream?.querySelector(`[data-msg-id="${msg.id}"]`);
        if (!exists) {
          this._appendBubble(msg, user, bubbleStream);
          this._scrollToBottom(messagesContainer);
        }
      }
    });
    this._unsubscribers.push(unsubMsg);

    const unsubStorage = this._chatService.on('storage_updated', () => {
      const freshMessages = this._chatService.getMessages(user.id);
      if (bubbleStream) {
        bubbleStream.innerHTML = this._renderMessagesHtml(freshMessages, user);
        this._scrollToBottom(messagesContainer);
      }
    });
    this._unsubscribers.push(unsubStorage);
  }

  _appendBubble(msg, currentUser, streamEl) {
    if (!streamEl || !msg) return;
    if (streamEl.querySelector(`[data-msg-id="${msg.id}"]`)) return; // Cegah duplikasi ID yang sama

    const temp = document.createElement('div');
    const isUser = msg.sender === 'user';
    temp.setAttribute('data-msg-id', msg.id);

    if (isUser) {
      temp.className = 'flex justify-end w-full animate-fade-in';
      temp.innerHTML = `
        <div class="bg-[#16a34a] text-white px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[82%] shadow-sm flex flex-col">
          <span class="text-[13px] leading-relaxed break-words select-text">${this._escapeAndFormat(msg.text)}</span>
          <div class="flex items-center justify-end gap-1 mt-1">
            <span class="text-[10px] text-white/80 font-medium">${msg.timeStr || ''}</span>
            <span class="material-symbols-outlined text-[13px] text-white/80">done_all</span>
          </div>
        </div>
      `;
    } else {
      temp.className = 'flex justify-start items-end gap-2 w-full animate-fade-in';
      temp.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0 border border-primary/20">
          <span class="material-symbols-outlined text-[16px]">support_agent</span>
        </div>
        <div class="bg-white dark:bg-[#121c30] text-text-heading border border-surface-container dark:border-white/10 px-4 py-2.5 rounded-2xl rounded-tl-xs max-w-[82%] shadow-sm flex flex-col">
          <span class="text-[11px] font-bold text-primary dark:text-indigo-400 mb-0.5">${msg.userName || 'Admin Panen Kunci'}</span>
          <span class="text-[13px] leading-relaxed break-words select-text text-text-heading">${this._escapeAndFormat(msg.text)}</span>
          <span class="text-[10px] text-text-body/70 font-medium text-right mt-1">${msg.timeStr || ''}</span>
        </div>
      `;
    }

    streamEl.appendChild(temp);
  }

  _scrollToBottom(el) {
    if (!el) return;
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 50);
  }

  unmount() {
    this.destroy();
  }

  destroy() {
    this._unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this._unsubscribers = [];
  }
}
