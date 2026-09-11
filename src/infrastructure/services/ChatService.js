import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';

/**
 * ChatService
 * Mengelola pesan obrolan real-time antara Pengguna dan Admin
 * Mendukung persistensi ganda (localStorage + Cloud Supabase via Serverless Proxy),
 * pembersihan data dummy otomatis, real-time polling 3 detik, dan multi-tab sync.
 */
export class ChatService {
  constructor(prefix = 'panenkunci:') {
    this.prefix = prefix;
    this.storageKey = `${prefix}live_chats`;
    this._listeners = {};
    this._onlineUserIds = new Set();
    this._cleanDummyChats();
    this._initSync();
    // Sinkronisasi awal dari Supabase di background
    this.syncFromRemote().catch(() => {});
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

  /**
   * Membersihkan data tiruan dummy (Budi Santoso & Siti Rahma demo chats)
   */
  _cleanDummyChats() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(m =>
          m &&
          m.userId !== 'usr_budi_live' &&
          m.userId !== 'usr_siti_live' &&
          !String(m.id || '').startsWith('msg_demo_') &&
          m.userEmail !== 'budi.santoso@gmail.com' &&
          !String(m.text || '').includes('penarikan saldo saya ke rekening BCA')
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.warn('[ChatService] _cleanDummyChats warning:', e);
    }
  }

  _initSync() {
    // 1. BroadcastChannel untuk sinkronisasi instan antar-tab pada peramban yang sama
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

        this._presenceChannel = new BroadcastChannel('panenkunci_presence_channel');
        this._presenceChannel.onmessage = (event) => {
          const data = event.data;
          if (data && data.type === 'USER_ONLINE' && data.userId) {
            this._onlineUserIds.add(data.userId);
            this.emit('presence_updated', Array.from(this._onlineUserIds));
          } else if (data && data.type === 'USER_OFFLINE' && data.userId) {
            this._onlineUserIds.delete(data.userId);
            this.emit('presence_updated', Array.from(this._onlineUserIds));
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or error:', err);
      }
    }

    // 2. Storage event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey) {
          this.emit('storage_updated', this._getRawChats());
        }
      });

      // 3. Sinkronisasi saat window/tab kembali aktif
      window.addEventListener('focus', () => {
        this.syncFromRemote().catch(() => {});
      });

      // 4. Background Polling berkala (setiap 3 detik saat tab aktif)
      this._pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.syncFromRemote().catch(() => {});
        }
      }, 3000);
    }

    // 5. Supabase Realtime channel jika dikonfigurasi
    this._setupRealtimeSubscription();
  }

  _setupRealtimeSubscription() {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      this._realtimeChannel = supabase
        .channel(`pk_live_chats_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_chat_messages' },
          () => {
            this.syncFromRemote().catch(() => {});
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[ChatService] Realtime subscription error:', err);
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
      if (typeof localStorage === 'undefined') return [];
      this._cleanDummyChats();
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
      if (typeof localStorage === 'undefined') return;
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
   * Sinkronisasi pesan obrolan dari Supabase / Serverless Proxy
   */
  async syncFromRemote(targetUserId = null) {
    try {
      const url = targetUserId
        ? `/api/supabase-proxy?type=live_chats&userId=${encodeURIComponent(targetUserId)}`
        : `/api/supabase-proxy?type=live_chats`;

      const res = await fetch(url);
      if (!res.ok) return this._getRawChats();

      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.onlineUserIds)) {
          this._onlineUserIds = new Set(json.onlineUserIds);
          this.emit('presence_updated', Array.from(this._onlineUserIds));
        }

        if (Array.isArray(json.data)) {
          const remoteChats = json.data.filter(r =>
            r &&
            r.userId !== 'usr_budi_live' &&
            r.userId !== 'usr_siti_live' &&
            !String(r.id || '').startsWith('msg_demo_') &&
            r.userEmail !== 'budi.santoso@gmail.com' &&
            !String(r.text || '').includes('penarikan saldo saya ke rekening BCA')
          );
          const localChats = this._getRawChats();
          const localMap = new Map();

        localChats.forEach(m => {
          if (m && m.id) localMap.set(m.id, m);
        });

        let hasNew = false;
        remoteChats.forEach(r => {
          if (!r || !r.id) return;
          const existing = localMap.get(r.id);
          if (!existing) {
            localMap.set(r.id, r);
            hasNew = true;
          } else {
            // Sinkronkan status read jika di cloud sudah terbaca
            if (r.readByAdmin && !existing.readByAdmin) {
              existing.readByAdmin = true;
              hasNew = true;
            }
            if (r.readByUser && !existing.readByUser) {
              existing.readByUser = true;
              hasNew = true;
            }
          }
        });

        if (hasNew || localChats.length !== localMap.size) {
          const merged = Array.from(localMap.values()).sort((a, b) => a.timestamp - b.timestamp);
          this._saveRawChats(merged);
          this.emit('storage_updated', merged);

          // Notifikasi pesan baru jika ada
          const latest = merged[merged.length - 1];
          if (latest && hasNew) {
            this.emit('message_received', latest);
          }
          return merged;
        }
      }
    }
  } catch (err) {
    // Offline fallback
  }
    return this._getRawChats();
  }

  /**
   * Mengecek apakah pengguna sedang online / aktif login di aplikasi
   * @param {string} userId
   * @returns {boolean}
   */
  isUserOnline(userId) {
    if (!userId) return false;
    try {
      if (typeof localStorage !== 'undefined') {
        const rawCurrent = localStorage.getItem(`${this.prefix}current_user`);
        if (rawCurrent) {
          const current = JSON.parse(rawCurrent);
          if (current && current.id === userId) return true;
        }
      }
    } catch (_) {}
    return this._onlineUserIds.has(userId);
  }

  /**
   * Ambil riwayat chat untuk user tertentu.
   * Jika percakapan masih kosong, inisialisasi dengan pesan sambutan Admin.
   */
  getMessages(userId) {
    if (!userId || userId === 'usr_budi_live' || userId === 'usr_siti_live') return [];
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
        timestamp: Date.now() - 30000,
        timeStr: this._formatTime(new Date(Date.now() - 30000)),
        readByAdmin: true,
        readByUser: false
      };
      chats.push(initialAdminMsg);
      this._saveRawChats(chats);
      userMessages = [initialAdminMsg];

      // Kirim sambutan ke cloud agar terekam juga di database
      fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_live_chat',
          message: initialAdminMsg
        })
      }).catch(() => {});
    }

    return userMessages.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Kirim pesan baru (baik dari user maupun admin).
   * Langsung update UI lokal (instant) dan kirim ke Supabase di background.
   */
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

    // Notifikasi listener lokal secara instan
    this.emit('message_received', message);

    // Broadcast ke tab lain di browser lokal
    if (this._channel) {
      try {
        this._channel.postMessage({ type: 'NEW_MESSAGE', message });
      } catch (err) {
        console.warn('Broadcast error:', err);
      }
    }

    // Kirim pesan ke Cloud Supabase via Serverless Proxy
    fetch('/api/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_live_chat',
        message: message
      })
    }).catch(err => {
      console.warn('[ChatService] Gagal mengirim pesan ke server:', err);
    });

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

      // Sinkronkan status read ke Supabase
      fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_chat_read',
          userId,
          reader
        })
      }).catch(() => {});
    }
  }

  /**
   * Ambil semua percakapan yang dikelompokkan per pengguna (untuk Admin Panel)
   * Mengabaikan user dummy dan menampilkan user nyata.
   */
  getAllConversations(registeredUsers = []) {
    this._cleanDummyChats();
    let chats = this._getRawChats();
    const groups = {};

    chats.forEach(m => {
      if (!m || !m.userId) return;
      // Filter mutlak user dummy
      if (
        m.userId === 'usr_budi_live' ||
        m.userId === 'usr_siti_live' ||
        String(m.id || '').startsWith('msg_demo_') ||
        m.userEmail === 'budi.santoso@gmail.com' ||
        String(m.text || '').includes('penarikan saldo saya ke rekening BCA')
      ) return;

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

      // Update metadata user jika ada dari pesan
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

    // Jika diberikan daftar user terdaftar (dari AdminDataService / Supabase), daftarkan pengguna asli ke inbox
    if (Array.isArray(registeredUsers) && registeredUsers.length > 0) {
      registeredUsers.forEach(u => {
        if (
          !u ||
          !u.id ||
          u.role === 'admin' ||
          u.role === 'system_config' ||
          u.email?.includes('panenkunci.internal') ||
          u.id === 'usr_budi_live' ||
          u.id === 'usr_siti_live' ||
          u.email === 'budi.santoso@gmail.com'
        ) return;

        if (groups[u.id]) {
          if (u.name) groups[u.id].userName = u.name;
          if (u.email) groups[u.id].userEmail = u.email;
          if (u.avatar) groups[u.id].userAvatar = u.avatar;
          if (u.isOnline) groups[u.id].isOnline = true;
        } else {
          // Pengguna terdaftar nyata yang belum pernah chat tetap muncul di daftar inbox
          groups[u.id] = {
            userId: u.id,
            userName: u.name || 'Pengguna',
            userAvatar: u.avatar || '',
            userEmail: u.email || '',
            messages: [],
            unreadCount: 0,
            lastMessage: null,
            isOnline: Boolean(u.isOnline)
          };
        }
      });
    }

    // Urutkan percakapan berdasarkan waktu pesan terakhir, atau abjad nama jika belum ada pesan
    const list = Object.values(groups).map(conv => {
      conv.messages.sort((a, b) => a.timestamp - b.timestamp);
      conv.lastMessage = conv.messages[conv.messages.length - 1] || null;
      conv.isOnline = this.isUserOnline(conv.userId) || Boolean(conv.isOnline);
      return conv;
    });

    return list.sort((a, b) => {
      const timeA = a.lastMessage ? a.lastMessage.timestamp : 0;
      const timeB = b.lastMessage ? b.lastMessage.timestamp : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (a.userName || '').localeCompare(b.userName || '');
    });
  }

  /**
   * Hitung total pesan unread dari pengguna untuk Admin
   */
  getUnreadCountForAdmin() {
    const chats = this._getRawChats();
    return chats.filter(m => m.sender === 'user' && !m.readByAdmin && m.userId !== 'usr_budi_live' && m.userId !== 'usr_siti_live').length;
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
