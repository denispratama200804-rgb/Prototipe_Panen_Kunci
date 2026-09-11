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

  _getAllConversations() {
    let registeredUsers = [];
    if (this.adminDataService) {
      if (typeof this.adminDataService.getAllUsers === 'function') {
        registeredUsers = this.adminDataService.getAllUsers();
      } else if (typeof this.adminDataService.getUsers === 'function') {
        registeredUsers = this.adminDataService.getUsers();
      }
    }
    return this.chatService.getAllConversations(registeredUsers);
  }

  render() {
    const conversations = this._getAllConversations();
    
    // Cegah terpilihnya user dummy secara otomatis
    if (this.selectedUserId === 'usr_budi_live' || this.selectedUserId === 'usr_siti_live') {
      this.selectedUserId = null;
    }

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
        
        <!-- Main Chat Console (Flex Layout on Desktop for perfect full-width split, Adaptive on Mobile) -->
        <div class="chat-console-card admin-card rounded-2xl overflow-hidden w-full max-w-full border border-admin shadow-2xl flex flex-col lg:flex-row gap-0 h-[calc(100dvh-4.6rem)] sm:h-[calc(100vh-5.4rem)] max-h-[calc(100dvh-4.6rem)] sm:max-h-[calc(100vh-5.4rem)]">
          
          <!-- Column 1: Inbox / Daftar Percakapan (Desktop: w-80 xl:w-96 shrink-0 | Mobile: Toggle Inbox) -->
          <div 
            id="admin-chat-inbox-pane" 
            class="chat-inbox-pane w-full lg:w-80 xl:w-96 shrink-0 ${this.mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} flex-col h-full min-h-0 overflow-hidden border-r border-admin"
          >
            <!-- Pane Header -->
            <div class="admin-card-header px-4 py-3 text-xs flex items-center justify-between border-b border-admin shrink-0">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-outlined text-lg text-indigo-500">forum</span>
                <span class="font-bold text-admin-heading text-sm">Live Chat Pengguna</span>
              </div>
              <div class="flex items-center gap-2">
                ${totalUnread > 0 ? `
                  <span class="text-[10px] bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    ${totalUnread} Baru
                  </span>
                ` : ''}
                <span class="chat-user-count-badge text-[11px] font-mono px-2.5 py-0.5 rounded-full">
                  ${conversations.length} Pengguna
                </span>
              </div>
            </div>

            <!-- Search Bar -->
            <div class="chat-search-bar-wrap p-2.5 sm:p-3 border-b border-admin shrink-0">
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  id="admin-chat-search"
                  placeholder="Cari nama, email, atau ID..."
                  value="${this.searchQuery}"
                  class="chat-search-input w-full pl-9 pr-3 py-2 rounded-xl text-xs transition-colors"
                />
              </div>
            </div>

            <!-- Conversations Scroll List -->
            <div id="admin-conv-list" class="chat-conv-list flex-1 min-h-0 overflow-y-auto chat-scrollbar">
              ${this._renderConversationList(conversations)}
            </div>
          </div>

          <!-- Column 2: Active Chat Workspace (Desktop: flex-1 min-w-0 fills remaining width | Mobile: Toggle Chat) -->
          <div 
            id="admin-chat-active-pane" 
            class="chat-active-pane flex-1 min-w-0 ${this.mobileView === 'inbox' ? 'hidden lg:flex' : 'flex'} flex-col h-full min-h-0 overflow-hidden relative"
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
        <div class="p-8 text-center text-admin-muted text-xs flex flex-col items-center justify-center h-48">
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
          class="conv-item p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer transition-all select-none relative ${isSelected ? 'active' : ''}"
        >
          <!-- User Avatar Squircle -->
          <div class="relative shrink-0 mt-0.5">
            ${conv.userAvatar ? `
              <img src="${conv.userAvatar}" alt="${conv.userName}" class="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700/80" onerror="this.src='/avatar.png'" />
            ` : `
              <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md border border-indigo-400/20">
                ${(conv.userName || 'PK').substring(0, 2).toUpperCase()}
              </div>
            `}
            <!-- Bulatan Status: Hijau jika online / login di app, Abu-abu jika offline / tidak login -->
            <span 
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${conv.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-400'} ring-2 ring-chat-avatar transition-colors"
              title="${conv.isOnline ? 'Sedang Login (Online)' : 'Tidak Login (Offline)'}"
            ></span>
          </div>

          <!-- User Info & Last Message -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-1">
              <h4 class="conv-name text-xs sm:text-sm font-bold truncate">
                ${conv.userName || 'Pengguna'}
              </h4>
              <span class="conv-time text-[11px] font-mono shrink-0">${lastMsgTime}</span>
            </div>
            
            <p class="conv-preview text-xs truncate leading-tight ${unread > 0 ? 'font-bold' : ''}">
              ${conv.lastMessage?.sender === 'admin' ? '<span class="text-indigo-500 dark:text-indigo-400 font-bold">Anda: </span>' : ''}${lastMsgText}
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
      <div class="admin-card-header px-4 sm:px-6 py-3 border-b border-admin flex items-center justify-between gap-2 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          
          <!-- Tombol Kembali untuk Tampilan Layar HP / Mobile PWA (Hidden on Desktop) -->
          <button
            type="button"
            id="admin-chat-back-btn"
            class="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-admin-muted hover:text-admin-heading admin-nav-btn active:scale-90 transition-all cursor-pointer -ml-1 shrink-0"
            title="Kembali ke Daftar Percakapan"
          >
            <span class="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          <div class="relative shrink-0">
            ${conv.userAvatar ? `
              <img src="${conv.userAvatar}" alt="${conv.userName}" class="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700/80" />
            ` : `
              <div class="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md border border-indigo-400/20">
                ${(conv.userName || 'PK').substring(0, 2).toUpperCase()}
              </div>
            `}
            <span 
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${conv.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-400'} ring-2 ring-chat-header-avatar transition-colors"
              title="${conv.isOnline ? 'Sedang Login (Online)' : 'Tidak Login (Offline)'}"
            ></span>
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-bold text-admin-heading truncate">${conv.userName || 'Pengguna'}</h3>
              <span class="chat-status-badge px-2 py-0.5 rounded-full text-[10px] font-bold ${
                conv.isOnline ? 'online' : 'offline'
              }">
                ${conv.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p class="text-xs text-admin-muted truncate mt-0.5">${conv.userEmail || conv.userId}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            id="admin-refresh-chat-btn"
            class="admin-nav-btn px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh Percakapan"
          >
            <span class="material-symbols-outlined text-base text-indigo-500">sync</span>
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      <!-- Messages Stream Scroll Area: min-h-0 guarantees scrollbar triggers when content overflows -->
      <div id="admin-messages-stream" class="chat-stream-bg flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 chat-scrollbar relative">
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
      <div class="chat-templates-bar px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-10">
        <span class="chat-templates-label text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1">TEMPLATE:</span>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          Halo kak, ada yang bisa kami bantu?
        </button>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          Pencairan dana sedang diproses ya kak.
        </button>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          API Key yang disetor sudah diverifikasi.
        </button>
        <button type="button" class="chat-quick-chip admin-quick-reply px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap active:scale-95 cursor-pointer">
          Mohon cek rekening tujuan di menu profil ya kak.
        </button>
      </div>

      <!-- Admin Reply Input Bar (Always pinned firmly at bottom) -->
      <div class="chat-input-bar p-3 sm:p-4 shrink-0 z-10 shadow-lg">
        <form id="admin-chat-form" class="flex items-center gap-2 sm:gap-3">
          <div class="relative flex-1">
            <input
              type="text"
              id="admin-chat-input"
              autocomplete="off"
              placeholder="Ketik balasan untuk ${conv.userName || 'pengguna'}..."
              class="chat-reply-input w-full text-xs sm:text-sm px-4 py-3 rounded-2xl transition-colors"
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
        <div class="p-12 text-center text-admin-muted text-xs">
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
        // User bubble: on the left with initial green badge on the left side
        const userInitial = (conv.userName || 'U').charAt(0).toUpperCase();
        return `
          <div class="flex justify-start items-end gap-2.5 w-full animate-fade-in">
            <div class="chat-user-avatar-initial w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0">
              ${userInitial}
            </div>
            <div class="chat-user-bubble px-4 py-3 rounded-2xl rounded-tl-xs max-w-[85%] sm:max-w-2xl shadow-sm flex flex-col">
              <span class="chat-user-bubble-name text-[11px] font-bold mb-1 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                ${conv.userName || 'Pengguna'}
              </span>
              <span class="chat-user-bubble-text text-xs sm:text-sm leading-relaxed break-words select-text">${this._escape(msg.text)}</span>
              <span class="chat-user-bubble-time text-[10px] font-mono text-right mt-1.5">${msg.timeStr || ''}</span>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  _renderEmptyState() {
    return `
      <div class="flex flex-col items-center justify-center h-full p-8 text-center text-admin-muted">
        <div class="chat-empty-icon-wrap w-14 h-14 rounded-2xl flex items-center justify-center mb-3">
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

    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      // Desktop: Kedua panel (inbox dan chat workspace) SELALU tampil berdampingan penuh
      inboxPane.classList.remove('hidden');
      inboxPane.classList.add('flex');
      activePane.classList.remove('hidden');
      activePane.classList.add('flex');
      return;
    }

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

    // Listener responsif saat ukuran layar window berubah
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
    }
    this._onResize = () => this._updateMobileViewPanes(container);
    window.addEventListener('resize', this._onResize);

    // Search input
    const searchInput = container.querySelector('#admin-chat-search');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      const convList = container.querySelector('#admin-conv-list');
      if (convList) {
        convList.innerHTML = this._renderConversationList(this._getAllConversations());
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

    // Sinkronisasi remote chats dari Supabase saat layar dibuka
    this.chatService.syncFromRemote().then(() => {
      const convList = container.querySelector('#admin-conv-list');
      if (convList) {
        convList.innerHTML = this._renderConversationList(this._getAllConversations());
        this._bindConvItems(container);
      }
      if (this.selectedUserId) {
        const streamEl = container.querySelector('#admin-messages-stream');
        if (streamEl) {
          const conv = this._getAllConversations().find(c => c.userId === this.selectedUserId);
          const messages = this.chatService.getMessages(this.selectedUserId);
          if (conv) {
            streamEl.innerHTML = this._renderAdminMessageBubbles(messages, conv);
            this._scrollToBottom(streamEl);
          }
        }
      }
    }).catch(() => {});

    // Listen to real-time incoming messages
    const unsubMsg = this.chatService.on('message_received', (msg) => {
      // Re-render conversation list item
      const convList = container.querySelector('#admin-conv-list');
      if (convList) {
        convList.innerHTML = this._renderConversationList(this._getAllConversations());
        this._bindConvItems(container);
      }

      // Jika pesan masuk untuk user yang sedang aktif dibuka
      if (this.selectedUserId && msg.userId === this.selectedUserId) {
        this.chatService.markAsRead(this.selectedUserId, 'admin');
        const streamEl = container.querySelector('#admin-messages-stream');
        if (streamEl) {
          const conv = this._getAllConversations().find(c => c.userId === this.selectedUserId);
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

    // Listen to storage update (sync dari cloud / multi-tab)
    const unsubStorage = this.chatService.on('storage_updated', () => {
      const convList = container.querySelector('#admin-conv-list');
      if (convList) {
        convList.innerHTML = this._renderConversationList(this._getAllConversations());
        this._bindConvItems(container);
      }
      if (this.selectedUserId) {
        const streamEl = container.querySelector('#admin-messages-stream');
        if (streamEl) {
          const conv = this._getAllConversations().find(c => c.userId === this.selectedUserId);
          const messages = this.chatService.getMessages(this.selectedUserId);
          if (conv) {
            streamEl.innerHTML = this._renderAdminMessageBubbles(messages, conv);
            this._scrollToBottom(streamEl);
          }
        }
      }
    });
    this._unsubscribers.push(unsubStorage);

    // Listen to real-time presence updates (status online/offline pengguna)
    const unsubPresence = this.chatService.on('presence_updated', () => {
      const convList = container.querySelector('#admin-conv-list');
      if (convList) {
        convList.innerHTML = this._renderConversationList(this._getAllConversations());
        this._bindConvItems(container);
      }
      if (this.selectedUserId) {
        const conv = this._getAllConversations().find(c => c.userId === this.selectedUserId);
        if (conv) {
          const activeHeader = container.querySelector('#admin-chat-active-pane .admin-card-header');
          if (activeHeader) {
            const dot = activeHeader.querySelector('.rounded-full.ring-2');
            if (dot) {
              dot.className = `absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${conv.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-400'} ring-2 ring-chat-header-avatar transition-colors`;
              dot.title = conv.isOnline ? 'Sedang Login (Online)' : 'Tidak Login (Offline)';
            }
            const statusBadge = activeHeader.querySelector('.chat-status-badge');
            if (statusBadge) {
              statusBadge.className = `chat-status-badge px-2 py-0.5 rounded-full text-[10px] font-bold ${conv.isOnline ? 'online' : 'offline'}`;
              statusBadge.textContent = conv.isOnline ? 'Online' : 'Offline';
            }
          }
        }
      }
    });
    this._unsubscribers.push(unsubPresence);
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
        const conv = this._getAllConversations().find(c => c.userId === userId);
        const messages = this.chatService.getMessages(userId);

        if (activePane && conv) {
          activePane.innerHTML = this._renderActiveChatWorkspace(conv, messages);
          this._bindChatWorkspace(container);
          const stream = container.querySelector('#admin-messages-stream');
          this._scrollToBottom(stream);
        }

        if (convList) {
          convList.innerHTML = this._renderConversationList(this._getAllConversations());
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

    // Refresh button dengan remote cloud fetch
    refreshBtn?.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.classList.add('animate-spin');
      try {
        await this.chatService.syncFromRemote(this.selectedUserId);
        if (this.selectedUserId) {
          const conv = this._getAllConversations().find(c => c.userId === this.selectedUserId);
          const messages = this.chatService.getMessages(this.selectedUserId);
          if (stream && conv) {
            stream.innerHTML = this._renderAdminMessageBubbles(messages, conv);
            this._scrollToBottom(stream);
          }
        }
        const convList = container.querySelector('#admin-conv-list');
        if (convList) {
          convList.innerHTML = this._renderConversationList(this._getAllConversations());
          this._bindConvItems(container);
        }
        if (this.toast) {
          this.toast.success('Percakapan disinkronkan dengan server', 'Sinkronisasi Cloud');
        }
      } finally {
        setTimeout(() => {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove('animate-spin');
        }, 400);
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
          const conv = this._getAllConversations().find(c => c.userId === this.selectedUserId);
          const messages = this.chatService.getMessages(this.selectedUserId);
          if (stream && conv) {
            stream.innerHTML = this._renderAdminMessageBubbles(messages, conv);
            this._scrollToBottom(stream, true);
          }

          const convList = container.querySelector('#admin-conv-list');
          if (convList) {
            convList.innerHTML = this._renderConversationList(this._getAllConversations());
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
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    this._unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this._unsubscribers = [];
  }
}
