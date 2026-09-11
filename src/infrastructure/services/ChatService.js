/**
 * ChatService
 * Mengelola pesan obrolan real-time antara Pengguna dan Admin
 * Mendukung persistensi localStorage, multi-tab sync via BroadcastChannel, dan auto-reply bot.
 */
export class ChatService {
  constructor(prefix = 'panenkunci:') {
    this.prefix = prefix;
    this.storageKey = `${prefix}live_chats`;
    this._listeners = {};
    this._initSync();
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
      }
    };
  }

  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error('ChatService listener error:', e); }
      });
    }
  }

  _initSync() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this._channel = new BroadcastChannel('panenkunci_chat_channel');
        this._channel.onmessage = (event) => {
          const data = event.data;
          if (data && data.type === 'NEW_MESSAGE') {
            this.emit('message_received', data.message);
          } else if (data && data.type === 'MESSAGES_READ') {
            this.emit('read_updated', data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey) {
          this.emit('storage_updated', this._getRawChats());
        }
      });
    }
  }

  _deduplicateChats(chats) {
    if (!Array.isArray(chats)) return [];
    const cleaned = [];
    const seenIds = new Set();

    chats.forEach((msg) => {
      if (!msg || !msg.id) return;
      if (seenIds.has(msg.id)) return;

      // Cek apakah ada pesan identik sebelumnya dalam rentang waktu berdekatan (< 2.5 detik)
      const prev = cleaned[cleaned.length - 1];
      if (
        prev &&
        prev.userId === msg.userId &&
        prev.sender === msg.sender &&
        prev.text === msg.text &&
        Math.abs(msg.timestamp - prev.timestamp) < 2500
      ) {
        return; // Lewati duplikasi pesan cepat
      }

      seenIds.add(msg.id);
      cleaned.push(msg);
    });

    return cleaned;
  }

  _getRawChats() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return this._deduplicateChats(parsed);
    } catch (e) {
      console.error('Error reading chats from localStorage:', e);
      return [];
    }
  }

  _saveRawChats(chats) {
    try {
      const cleaned = this._deduplicateChats(chats);
      localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
    } catch (e) {
      console.error('Error saving chats to localStorage:', e);
    }
  }

  /**
   * Format waktu seperti foto referensi (e.g. 10:25 AM, 01:31 PM)
   */
  _formatTime(date = new Date()) {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  /**
   * Ambil riwayat chat untuk user tertentu.
   * Jika percakapan masih kosong, inisialisasi dengan pesan sambutan Admin.
   */
  getMessages(userId) {
    if (!userId) return [];
    let chats = this._getRawChats();
    let userMessages = chats.filter(m => m.userId === userId);

    // Jika belum pernah ada chat sama sekali untuk user ini, berikan pesan sambutan resmi dari Admin
    if (userMessages.length === 0) {
      const initialAdminMsg = {
        id: 'msg_welcome_' + userId,
        userId: userId,
        userName: 'Admin Panen Kunci',
        userAvatar: '/Logo_PK.jpg',
        userEmail: 'support@panenkunci.id',
        sender: 'admin',
        text: 'Halo! Selamat datang di Pusat Bantuan Resmi Panen Kunci. Ada yang bisa kami bantu terkait akun, penyetoran API Key, atau penarikan saldo Anda?',
        timestamp: Date.now() - 60000,
        timeStr: this._formatTime(new Date(Date.now() - 60000)),
        readByAdmin: true,
        readByUser: false
      };
      chats.push(initialAdminMsg);
      this._saveRawChats(chats);
      userMessages = [initialAdminMsg];
    }

    return userMessages.sort((a, b) => a.timestamp - b.timestamp);
  }

  sendMessage({ userId, userName, userAvatar, userEmail, sender = 'user', text }) {
    if (!userId || !text || !text.trim()) return null;

    const trimmed = text.trim();
    const chats = this._getRawChats();
    const now = new Date();
    const nowTime = now.getTime();

    // Proteksi pengiriman pesan ganda dalam rentang 1.5 detik
    const lastMsg = chats.length > 0 ? chats[chats.length - 1] : null;
    if (
      lastMsg &&
      lastMsg.userId === userId &&
      lastMsg.sender === sender &&
      lastMsg.text === trimmed &&
      nowTime - lastMsg.timestamp < 1500
    ) {
      console.warn('Pesan ganda dicegah:', trimmed);
      return lastMsg;
    }

    const message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      userName: userName || (sender === 'admin' ? 'Admin Panen Kunci' : 'Pengguna'),
      userAvatar: userAvatar || (sender === 'admin' ? '/Logo_PK.jpg' : ''),
      userEmail: userEmail || '',
      sender,
      text: trimmed,
      timestamp: now.getTime(),
      timeStr: this._formatTime(now),
      readByAdmin: sender === 'admin',
      readByUser: sender === 'user'
    };

    chats.push(message);
    this._saveRawChats(chats);

    // Notifikasi listener lokal
    this.emit('message_received', message);

    // Broadcast ke tab lain
    if (this._channel) {
      try {
        this._channel.postMessage({ type: 'NEW_MESSAGE', message });
      } catch (err) {
        console.warn('Broadcast error:', err);
      }
    }

    return message;
  }

  /**
   * Tandai pesan sebagai telah dibaca
   */
  markAsRead(userId, reader = 'user') {
    if (!userId) return;
    const chats = this._getRawChats();
    let updated = false;

    chats.forEach(m => {
      if (m.userId === userId) {
        if (reader === 'admin' && !m.readByAdmin) {
          m.readByAdmin = true;
          updated = true;
        } else if (reader === 'user' && !m.readByUser) {
          m.readByUser = true;
          updated = true;
        }
      }
    });

    if (updated) {
      this._saveRawChats(chats);
      this.emit('read_updated', { userId, reader });
      if (this._channel) {
        try {
          this._channel.postMessage({ type: 'MESSAGES_READ', userId, reader });
        } catch (e) {}
      }
    }
  }

  /**
   * Ambil semua percakapan yang dikelompokkan per pengguna (untuk Admin Panel)
   */
  getAllConversations() {
    let chats = this._getRawChats();

    // Jika belum ada chat, auto-inisialisasi dengan user aktif saat ini atau seed demo percakapan
    if (chats.length === 0) {
      try {
        const rawAuth = localStorage.getItem(`${this.prefix}auth_user`);
        if (rawAuth) {
          const authUser = JSON.parse(rawAuth);
          if (authUser && authUser.id) {
            this.getMessages(authUser.id);
            chats = this._getRawChats();
          }
        }
      } catch (e) {}

      // Jika masih kosong, sediakan percakapan awal agar admin panel tidak kosong melompong
      if (chats.length === 0) {
        const now = Date.now();
        const demoChats = [
          {
            id: 'msg_demo_1',
            userId: 'usr_budi_live',
            userName: 'Budi Santoso',
            userAvatar: '',
            userEmail: 'budi.santoso@gmail.com',
            sender: 'user',
            text: 'Halo admin, penarikan saldo saya ke rekening BCA sedang menunggu persetujuan. Kira-kira kapan diproses ya?',
            timestamp: now - 3600000,
            timeStr: this._formatTime(new Date(now - 3600000)),
            readByAdmin: false,
            readByUser: true
          },
          {
            id: 'msg_demo_2',
            userId: 'usr_siti_live',
            userName: 'Siti Rahma',
            userAvatar: '',
            userEmail: 'siti.rahma@yahoo.com',
            sender: 'user',
            text: 'Selamat siang min, saya baru setor 5 API Key OpenAI. Mau tanya status verifikasinya.',
            timestamp: now - 1800000,
            timeStr: this._formatTime(new Date(now - 1800000)),
            readByAdmin: true,
            readByUser: true
          },
          {
            id: 'msg_demo_3',
            userId: 'usr_siti_live',
            userName: 'Admin Panen Kunci',
            userAvatar: '/Logo_PK.jpg',
            userEmail: 'support@panenkunci.id',
            sender: 'admin',
            text: 'Halo kak Siti, sedang diverifikasi otomatis oleh sistem kami ya. Mohon ditunggu beberapa menit.',
            timestamp: now - 900000,
            timeStr: this._formatTime(new Date(now - 900000)),
            readByAdmin: true,
            readByUser: true
          }
        ];
        chats = demoChats;
        this._saveRawChats(chats);
      }
    }

    const groups = {};

    chats.forEach(m => {
      if (!groups[m.userId]) {
        groups[m.userId] = {
          userId: m.userId,
          userName: m.userName || 'Pengguna',
          userAvatar: m.userAvatar || '',
          userEmail: m.userEmail || '',
          messages: [],
          unreadCount: 0,
          lastMessage: null
        };
      }

      // Update info nama/email jika tersedia dari pesan terbaru
      if (m.sender === 'user') {
        if (m.userName) groups[m.userId].userName = m.userName;
        if (m.userAvatar) groups[m.userId].userAvatar = m.userAvatar;
        if (m.userEmail) groups[m.userId].userEmail = m.userEmail;
      }

      groups[m.userId].messages.push(m);
      if (m.sender === 'user' && !m.readByAdmin) {
        groups[m.userId].unreadCount++;
      }
    });

    // Urutkan percakapan berdasarkan waktu pesan terakhir
    const list = Object.values(groups).map(conv => {
      conv.messages.sort((a, b) => a.timestamp - b.timestamp);
      conv.lastMessage = conv.messages[conv.messages.length - 1] || null;
      return conv;
    });

    return list.sort((a, b) => {
      const timeA = a.lastMessage ? a.lastMessage.timestamp : 0;
      const timeB = b.lastMessage ? b.lastMessage.timestamp : 0;
      return timeB - timeA;
    });
  }

  /**
   * Hitung total pesan unread dari pengguna untuk Admin
   */
  getUnreadCountForAdmin() {
    const chats = this._getRawChats();
    return chats.filter(m => m.sender === 'user' && !m.readByAdmin).length;
  }

  /**
   * Hitung total pesan unread dari admin untuk user tertentu
   */
  getUnreadCountForUser(userId) {
    if (!userId) return 0;
    const chats = this._getRawChats();
    return chats.filter(m => m.userId === userId && m.sender === 'admin' && !m.readByUser).length;
  }
}

export const chatService = new ChatService();
