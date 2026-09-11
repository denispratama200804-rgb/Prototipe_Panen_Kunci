import { chatService } from '../../../src/infrastructure/services/ChatService.js';

/**
 * LiveChatAdminView
 * Panel Admin untuk memantau obrolan masuk dan membalas pesan dari pengguna secara real-time.
 * Desain Desktop 100% presisi sesuai referensi (Split-Pane, squircle avatars, template chips, styled bubbles),
 * dan Mobile PWA tetap menggunakan navigasi layar penuh adaptif dengan tombol kembali.
 */
export class LiveChatAdminView {
  constructor(adminDataService, toastService = null) {
    this.adminDataService = adminDataService;
    this.toast = toastService;
    this.chatService = chatService;
    this.selectedUserId = null;
    this.searchQuery = '';
    this.mobileView = 'inbox'; // 'inbox' (daftar percakapan) atau 'chat' (layar obrolan aktif di mobile)
    this._unsubscribers = [];
  }

  render() {
    const conversations = this.chatService.getAllConversations();
    
    // Default pilih user pertama jika belum ada yang dipilih
    if (!this.selectedUserId && conversations.length > 0) {
      this.selectedUserId = conversations[0].userId;
    }

    const selectedConv = conversations.find(c => c.userId === this.selectedUserId) || (conversations.length > 0 ? conversations[0] : null);
    if (selectedConv && !this.selectedUserId) {
      this.selectedUserId = selectedConv.userId;
    }
    const messages = selectedConv ? this.chatService.getMessages(selectedConv.userId) : [];
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    return `
      <div class="view-fade-enter max-w-7xl mx-auto w-full">
        
        <!-- Main Chat Console (Mobile PWA Adaptive & Desktop Referensi) -->
        <div class="chat-console-card admin-card rounded-2xl overflow-hidden w-full max-w-full border border-slate-800/90 shadow-2xl bg-[#0b1329] flex flex-col lg:grid lg:grid-cols-12 gap-0 h-[calc(100dvh-4.6rem)] sm:h-[calc(100vh-5.4rem)] max-h-[calc(100dvh-4.6rem)] sm:max-h-[calc(100vh-5.4rem)]">
          
          <!-- Column 1: Inbox / Daftar Percakapan (Mobile: Toggle Inbox | Desktop: Col 4) -->
          <div 
            id="admin-chat-inbox-pane" 
            class="chat-inbox-pane lg:col-span-4 ${this.mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} flex-col h-full min-h-0 overflow-hidden border-r border-slate-800/80 bg-[#080f20]/95 w-full lg:w-auto"
          >
            <!-- Pane Header -->
            <div class="admin-card-header px-4 py-3 text-xs flex items-center justify-between border-b border-slate-800/80 shrink-0">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-lg text-indigo-400">forum</span>
                <span class="font-bold text-admin-heading text-sm">Live Chat Pengguna</span>
              </div>
              <div class="flex items-center gap-2">
                ${totalUnread > 0 ? `
                  <span class="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    ${totalUnread} Baru
                  </span>
                ` : ''}
                <span class="text-[11px] text-slate-300 font-mono bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60">
                  ${conversations.length} Pengguna
                </span>
              </div>
            </div>

            <!-- Search Bar -->
            <div class="p-2.5 sm:p-3 border-b border-slate-800/80 bg-[#070c18]/60 shrink-0">
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  id="admin-chat-search"
                  placeholder="Cari nama, email, atau ID..."
                  value="${this.searchQuery}"
                  class="w-full pl-9 pr-3 py-2 bg-[#070c18] border border-slate-800/90 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <!-- Conversations Scroll List -->
            <div id="admin-conv-list" class="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/50 chat-scrollbar">
              ${this._renderConversationList(conversations)}
            </div>
          </div>

          <!-- Column 2: Active Chat Workspace (Mobile: Toggle Chat | Desktop: Col 8) -->
          <div 
            id="admin-chat-active-pane" 
            class="lg:col-span-8 ${this.mobileView === 'inbox' ? 'hidden lg:flex' : 'flex'} flex-col h-full min-h-0 overflow-hidden bg-[#0b1329] w-full lg:w-auto relative"
          >
            ${selectedConv ? this._renderActiveChatWorkspace(selectedConv, messages) : this._renderEmptyState()}
          </div>

        </div>

      </div>
    `;
  }

  _renderConversationList(conversations) {
    let filtered = conversations;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = conversations.filter(c => 
        (c.userName && c.userName.toLowerCase().includes(q)) ||
        (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
        (c.userId && c.userId.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      return `
        <div class="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-48">
          <span class="material-symbols-outlined text-3xl opacity-40 mb-2">chat_bubble_outline</span>
          <span>Tidak ada percakapan ditemukan</span>
        </div>
      `;
    }

    return filtered.map(conv => {
      const isSelected = conv.userId === this.selectedUserId;
      const lastMsgText = conv.lastMessage ? conv.lastMessage.text : 'Memulai obrolan...';
      const lastMsgTime = conv.lastMessage ? conv.lastMessage.timeStr : '';
      const unread = conv.unreadCount || 0;

      return `
        <div
          data-conv-user-id="${conv.userId}"
          class="conv-item p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer transition-all select-none relative ${
            isSelected 
              ? 'bg-[#152244] border-l-4 border-indigo-500 shadow-inner' 
              : 'hover:bg-slate-800/40'
          }"
        >
          <!-- User Avatar Squircle -->
          <div class="relative shrink-0 mt-0.5">
            ${conv.userAvatar ? `
              <img src="${conv.userAvatar}" alt="${conv.userName}" class="w-11 h-11 rounded-2xl object-cover border border-slate-700/80" onerror="this.src='/avatar.png'" />
            ` : `
              <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md border border-indigo-400/20">
                ${(conv.userName || 'PK').substring(0, 2).toUpperCase()}
              </div>
            `}
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#080f20]"></span>
          </div>

          <!-- User Info & Last Message -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-1">
              <h4 class="text-xs sm:text-sm font-bold text-admin-heading truncate ${isSelected ? 'text-white' : ''}">
                ${conv.userName || 'Pengguna'}
              </h4>
              <span class="text-[11px] text-slate-400 font-mono shrink-0">${lastMsgTime}</span>
            </div>
            
            <p class="text-xs text-slate-400 truncate leading-tight ${unread > 0 ? 'font-semibold text-white' : ''}">
              ${conv.lastMessage?.sender === 'admin' ? '<span class="text-indigo-400 font-bold">Anda: </span>' : ''}${lastMsgText}
            </p>
          </div>

          <!-- Unread Badge -->
          ${unread > 0 ? `
            <span class="shrink-0 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm animate-pulse self-center">
              ${unread}
            </span>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  _renderActiveChatWorkspace(conv, messages) {
    return `
      <!-- Workspace Header -->
      <div class="admin-card-header px-4 sm:px-6 py-3 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          
          <!-- Tombol Kembali untuk Tampilan Layar HP / Mobile PWA (Hidden on Desktop) -->
          <button
            type="button"
            id="admin-chat-back-btn"
            class="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 active:scale-90 transition-all cursor-pointer -ml-1 shrink-0"
            title="Kembali ke Daftar Percakapan"
          >
            <span class="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          <div class="relative shrink-0">
            ${conv.userAvatar ? `
              <img src="${conv.userAvatar}" alt="${conv.userName}" class="w-11 h-11 rounded-2xl object-cover border border-slate-700/80" />
            ` : `
              <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md border border-indigo-400/20">
                ${(conv.userName || 'PK').substring(0, 2).toUpperCase()}
              </div>
            `}
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0b1329]"></span>
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-bold text-admin-heading truncate">${conv.userName || 'Pengguna'}</h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Member
              </span>
            </div>
            <p class="text-xs text-slate-400 truncate mt-0.5">${conv.userEmail || conv.userId}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            id="admin-refresh-chat-btn"
            class="admin-nav-btn px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors cursor-pointer border border-slate-700/80 bg-slate-800/40"
            title="Refresh Percakapan"
          >
            <span class="material-symbols-outlined text-base text-indigo-400">sync</span>
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      <!-- Messages Stream Scroll Area: min-h-0 guarantees scrollbar triggers when content overflows -->
      <div id="admin-messages-stream" class="chat-stream-bg flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-[#060b18]/60 chat-scrollbar relative">
        ${this._renderAdminMessageBubbles(messages, conv)}
      </div>

      <!-- Floating Scroll Down to Latest Messages Button -->
      <button
        type="button"
        id="admin-scroll-down-btn"
        class="hidden absolute bottom-28 right-6 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-xl shadow-indigo-600/50 flex items-center justify-center transition-all z-20 cursor-pointer animate-bounce"
        title="Scroll ke pesan terbaru"
      >
        <span class="material-symbols-outlined text-lg">arrow_downward</span>
      </button>

      <!-- Quick Reply Templates Bar -->
      <div class="px-4 py-2 border-t border-slate-800/80 bg-[#070c18]/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-10">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">TEMPLATE:</span>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium bg-[#0a1226] hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-800 hover:border-indigo-500 transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          Halo kak, ada yang bisa kami bantu?
        </button>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium bg-[#0a1226] hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-800 hover:border-indigo-500 transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          Pencairan dana sedang diproses ya kak.
        </button>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium bg-[#0a1226] hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-800 hover:border-indigo-500 transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          API Key yang disetor sudah diverifikasi.
        </button>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium bg-[#0a1226] hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-800 hover:border-indigo-500 transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          Mohon cek rekening tujuan di menu profil ya kak.
        </button>
      </div>

      <!-- Admin Reply Input Bar (Always pinned firmly at bottom) -->
      <div class="p-3 sm:p-4 border-t border-slate-800/80 bg-[#0b1329] shrink-0 z-10 shadow-lg">
        <form id="admin-chat-form" class="flex items-center gap-2 sm:gap-3">
          <div class="relative flex-1">
            <input
              type="text"
              id="admin-chat-input"
              autocomplete="off"
              placeholder="Ketik balasan untuk ${conv.userName || 'pengguna'}..."
              class="w-full bg-[#070c18] text-white text-xs sm:text-sm px-4 py-3 rounded-2xl border border-slate-800/90 focus:border-indigo-500 focus:outline-none placeholder-slate-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            id="admin-chat-submit-btn"
            class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
          >
            <span class="material-symbols-outlined text-base">send</span>
            <span>Kirim Balasan</span>
          </button>
        </form>
      </div>
    `;
  }

  _renderAdminMessageBubbles(messages, conv) {
    if (!messages || messages.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 text-xs">
          Belum ada pesan dalam percakapan ini.
        </div>
      `;
    }

    return messages.map(msg => {
      const isAdmin = msg.sender === 'admin';

      if (isAdmin) {
        // Admin bubble: on the right (Indigo gradient bubble matching Admin theme)
        return `
          <div class="flex justify-end w-full animate-fade-in">
            <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] sm:max-w-xl shadow-md shadow-indigo-600/20 flex flex-col">
              <span class="text-[11px] font-bold text-indigo-200 mb-0.5 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Admin Support (Anda)
              </span>
              <span class="text-xs sm:text-sm leading-relaxed break-words select-text">${this._escape(msg.text)}</span>
              <div class="flex items-center justify-end gap-1 mt-1 text-[10px] text-indigo-200 font-mono">
                <span>${msg.timeStr || ''}</span>
                <span class="material-symbols-outlined text-[13px]">done_all</span>
              </div>
            </div>
          </div>
        `;
      } else {
        // User bubble: on the left with initial green badge on the left side (Persis Foto Referensi)
        const userInitial = (conv.userName || 'U').charAt(0).toUpperCase();
        return `
          <div class="flex justify-start items-end gap-2.5 w-full animate-fade-in">
            <div class="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 border border-emerald-500/40">
              ${userInitial}
            </div>
            <div class="chat-user-bubble bg-[#0c1626] text-slate-100 border border-slate-800/90 px-4 py-3 rounded-2xl rounded-tl-xs max-w-[85%] sm:max-w-2xl shadow-sm flex flex-col">
              <span class="text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ${conv.userName || 'Pengguna'}
              </span>
              <span class="text-xs sm:text-sm text-slate-200 leading-relaxed break-words select-text">${this._escape(msg.text)}</span>
              <span class="text-[10px] text-slate-400 font-mono text-right mt-1.5">${msg.timeStr || ''}</span>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  _renderEmptyState() {
    return `
      <div class="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3">
          <span class="material-symbols-outlined text-3xl">chat</span>
        </div>
        <h3 class="text-sm font-bold text-admin-heading mb-1">Pilih Percakapan Pengguna</h3>
        <p class="text-xs max-w-xs text-admin-muted leading-relaxed">
          Pilih salah satu pengguna di sebelah kiri untuk membaca riwayat dan membalas pesan kendala secara real-time.
        </p>
      </div>
    `;
  }

  _escape(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline font-bold text-amber-300 hover:text-white">$1</a>');
  }

  _updateMobileViewPanes(container) {
    if (!container) return;
    const inboxPane = container.querySelector('#admin-chat-inbox-pane');
    const activePane = container.querySelector('#admin-chat-active-pane');
    if (!inboxPane || !activePane) return;

    if (this.mobileView === 'chat') {
      // Sembunyikan inbox di layar HP, tampilkan obrolan aktif secara full-screen
      inboxPane.classList.add('hidden');
      inboxPane.classList.remove('flex');
      activePane.classList.remove('hidden');
      activePane.classList.add('flex');
    } else {
      // Tampilkan daftar inbox di layar HP, sembunyikan obrolan aktif
      inboxPane.classList.remove('hidden');
      inboxPane.classList.add('flex');
      activePane.classList.add('hidden');
      activePane.classList.remove('flex');
    }
  }

  bindEvents(container) {
    if (!container) return;

    // Search input
    const searchInput = container.querySelector('#admin-chat-search');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      const convList = container.querySelector('#admin-conv-list');
      if (convList) {
        convList.innerHTML = this._renderConversationList(this.chatService.getAllConversations());
        this._bindConvItems(container);
      }
    });

    this._bindConvItems(container);
    this._bindChatWorkspace(container);
    this._updateMobileViewPanes(container);

    // Tandai percakapan aktif sebagai read oleh admin
    if (this.selectedUserId) {
      this.chatService.markAsRead(this.selectedUserId, 'admin');
    }

    // Scroll to bottom
    const stream = container.querySelector('#admin-messages-stream');
    this._scrollToBottom(stream);

    // Listen to real-time incoming messages
    const unsubMsg = this.chatService.on('message_received', (msg) => {
      // Re-render conversation list item
      const convList = container.querySelector('#admin-conv-list');
      if (convList) {
        convList.innerHTML = this._renderConversationList(this.chatService.getAllConversations());
        this._bindConvItems(container);
      }

      // Jika pesan masuk untuk user yang sedang aktif dibuka
      if (this.selectedUserId && msg.userId === this.selectedUserId) {
        this.chatService.markAsRead(this.selectedUserId, 'admin');
        const streamEl = container.querySelector('#admin-messages-stream');
        if (streamEl) {
          const conv = this.chatService.getAllConversations().find(c => c.userId === this.selectedUserId);
          const messages = this.chatService.getMessages(this.selectedUserId);
          streamEl.innerHTML = this._renderAdminMessageBubbles(messages, conv || { userName: 'Pengguna' });
          this._scrollToBottom(streamEl);
        }
      } else if (msg.sender === 'user') {
        if (this.toast) {
          this.toast.info(`Pesan baru dari ${msg.userName}: "${msg.text.substring(0, 40)}..."`, 'Live Chat User');
        }
      }
    });
    this._unsubscribers.push(unsubMsg);
  }

  _bindConvItems(container) {
    const convItems = container.querySelectorAll('.conv-item');
    convItems.forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.getAttribute('data-conv-user-id');
        if (!userId) return;
        this.selectedUserId = userId;
        this.chatService.markAsRead(userId, 'admin');

        // Beralih ke tampilan layar obrolan di mobile PWA
        this.mobileView = 'chat';

        // Re-render active workspace
        const activePane = container.querySelector('#admin-chat-active-pane');
        const convList = container.querySelector('#admin-conv-list');
        const conv = this.chatService.getAllConversations().find(c => c.userId === userId);
        const messages = this.chatService.getMessages(userId);

        if (activePane && conv) {
          activePane.innerHTML = this._renderActiveChatWorkspace(conv, messages);
          this._bindChatWorkspace(container);
          const stream = container.querySelector('#admin-messages-stream');
          this._scrollToBottom(stream);
        }

        if (convList) {
          convList.innerHTML = this._renderConversationList(this.chatService.getAllConversations());
          this._bindConvItems(container);
        }

        this._updateMobileViewPanes(container);
      });
    });
  }

  _bindChatWorkspace(container) {
    const chatForm = container.querySelector('#admin-chat-form');
    const chatInput = container.querySelector('#admin-chat-input');
    const stream = container.querySelector('#admin-messages-stream');
    const quickReplies = container.querySelectorAll('.admin-quick-reply');
    const refreshBtn = container.querySelector('#admin-refresh-chat-btn');
    const backBtn = container.querySelector('#admin-chat-back-btn');
    const scrollDownBtn = container.querySelector('#admin-scroll-down-btn');

    // Deteksi posisi scroll pada area chat stream untuk menampilkan tombol scroll-to-bottom
    if (stream && scrollDownBtn) {
      stream.addEventListener('scroll', () => {
        const distFromBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
        if (distFromBottom > 80) {
          scrollDownBtn.classList.remove('hidden');
        } else {
          scrollDownBtn.classList.add('hidden');
        }
      });

      scrollDownBtn.addEventListener('click', () => {
        this._scrollToBottom(stream, true);
      });
    }

    // Tombol Back di Mobile PWA (Kembali ke daftar inbox)
    backBtn?.addEventListener('click', () => {
      this.mobileView = 'inbox';
      this._updateMobileViewPanes(container);
    });

    // Quick replies chips
    quickReplies.forEach(btn => {
      btn.addEventListener('click', () => {
        if (chatInput) {
          chatInput.value = btn.textContent.trim();
          chatInput.focus();
        }
      });
    });

    // Refresh button
    refreshBtn?.addEventListener('click', () => {
      if (this.selectedUserId) {
        const conv = this.chatService.getAllConversations().find(c => c.userId === this.selectedUserId);
        const messages = this.chatService.getMessages(this.selectedUserId);
        if (stream && conv) {
          stream.innerHTML = this._renderAdminMessageBubbles(messages, conv);
          this._scrollToBottom(stream);
        }
        if (this.toast) {
          this.toast.success('Percakapan diperbarui', 'Sinkronisasi');
        }
      }
    });

    // Send reply handler
    let isSending = false;
    const sendReply = () => {
      const text = chatInput?.value?.trim();
      if (!text || !this.selectedUserId || isSending) return;

      isSending = true;
      const submitBtn = container.querySelector('#admin-chat-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50');
      }

      try {
        const sent = this.chatService.sendMessage({
          userId: this.selectedUserId,
          userName: 'Admin Support',
          sender: 'admin',
          text: text
        });

        if (sent) {
          chatInput.value = '';
          const conv = this.chatService.getAllConversations().find(c => c.userId === this.selectedUserId);
          const messages = this.chatService.getMessages(this.selectedUserId);
          if (stream && conv) {
            stream.innerHTML = this._renderAdminMessageBubbles(messages, conv);
            this._scrollToBottom(stream, true);
          }

          const convList = container.querySelector('#admin-conv-list');
          if (convList) {
            convList.innerHTML = this._renderConversationList(this.chatService.getAllConversations());
            this._bindConvItems(container);
          }
        }
      } finally {
        setTimeout(() => {
          isSending = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50');
          }
          chatInput?.focus();
        }, 150);
      }
    };

    chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      sendReply();
    });

    // Dukung kirim langsung dengan tombol Enter
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendReply();
      }
    });
  }

  _scrollToBottom(el, smooth = false) {
    if (!el) return;
    const scrollAction = () => {
      try {
        if (smooth) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } else {
          el.scrollTop = el.scrollHeight;
        }
      } catch (e) {
        el.scrollTop = el.scrollHeight;
      }
    };

    scrollAction();
    requestAnimationFrame(scrollAction);
    setTimeout(scrollAction, 60);
    setTimeout(scrollAction, 180);
  }

  destroy() {
    this._unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this._unsubscribers = [];
  }
}
