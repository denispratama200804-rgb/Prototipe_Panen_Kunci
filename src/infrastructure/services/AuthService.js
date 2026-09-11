import { User } from '../../domain/models/User.js';
import { AppEvents } from '../../core/events/EventBus.js';
import { supabase, isSupabaseConfigured, googleClientId, appBaseUrl } from '../supabase/supabaseClient.js';

/**
 * AuthService
 * Prinsip: Single Responsibility Principle (SRP) & Dependency Inversion Principle (DIP)
 *
 * Mengelola autentikasi pengguna dan menjamin data tersimpan langsung ke tabel `public.users`
 * di database Supabase cloud.
 */
export class AuthService {
  /**
   * @param {import('../../core/interfaces/IStorage.js').IStorage} storage
   * @param {import('../../domain/validators/AuthValidator.js').AuthValidator} validator
   * @param {import('../../core/events/EventBus.js').EventBus} eventBus
   * @param {import('../../core/interfaces/IUserRepository.js').IUserRepository} [userRepository]
   */
  constructor(storage, validator, eventBus, userRepository = null) {
    this._storage = storage;
    this._validator = validator;
    this._eventBus = eventBus;
    this._userRepository = userRepository;
    this._currentUser = null;
    this._isSyncingOAuth = false;
    this._isPasswordRecovery = false;

    this._session = null;
    this._loadSession();
    this._initSupabaseOAuthListener();
  }

  /**
   * Menyimpan sesi login ke storage lokal
   * @param {User} user
   * @param {'admin'|'user'} role
   * @private
   */
  _saveSession(user, role = 'user') {
    this._currentUser = user;
    this._session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: role,
      loginAt: new Date().toISOString()
    };

    // Simpan ke adapter storage internal
    this._storage.set('current_user', user.toJSON());
    this._storage.set('session', this._session);

    // Simpan flag terpisah untuk aksesibilitas global dan admin panel
    if (typeof localStorage !== 'undefined') {
      if (role === 'admin') {
        localStorage.setItem('panenkunci:admin_logged_in', 'true');
        localStorage.setItem('panenkunci:auth_role', 'admin');
      } else {
        localStorage.removeItem('panenkunci:admin_logged_in');
        localStorage.setItem('panenkunci:auth_role', 'user');
      }
    }

    if (role !== 'admin' && user && user.id) {
      this._startPresenceHeartbeat(user.id);
    }
  }

  /**
   * Menjalankan heartbeat status online pengguna ke server
   * @private
   */
  _startPresenceHeartbeat(userId) {
    this._stopPresenceHeartbeat();
    if (!userId || String(userId).startsWith('usr_budi') || String(userId).startsWith('00000000-')) return;

    this._activePresenceUserId = userId;

    const sendHeartbeat = () => {
      try {
        fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'user_heartbeat',
            userId: userId
          })
        }).catch(() => {});

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('panenkunci_presence_channel');
            bc.postMessage({ type: 'USER_ONLINE', userId });
            bc.close();
          } catch (_) {}
        }
      } catch (_) {}
    };

    // Kirim langsung saat login
    sendHeartbeat();

    // Ulangi berkala setiap 20 detik saat tab browser aktif
    this._presenceTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    }, 20000);

    // Kirim ulang saat tab fokus kembali & kirim offline saat tab ditutup
    if (typeof window !== 'undefined' && !this._presenceBoundEvents) {
      this._presenceBoundEvents = true;
      window.addEventListener('focus', () => {
        if (this._activePresenceUserId) sendHeartbeat();
      });
      window.addEventListener('beforeunload', () => {
        this._stopPresenceHeartbeat();
      });
    }
  }

  /**
   * Menghentikan heartbeat dan menandai status user menjadi offline
   * @private
   */
  _stopPresenceHeartbeat(userId = null) {
    if (this._presenceTimer) {
      clearInterval(this._presenceTimer);
      this._presenceTimer = null;
    }
    const targetId = userId || this._activePresenceUserId;
    if (targetId) {
      this._activePresenceUserId = null;
      try {
        const payload = JSON.stringify({ action: 'user_offline', userId: targetId });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/supabase-proxy', payload);
        } else {
          fetch('/api/supabase-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(() => {});
        }

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('panenkunci_presence_channel');
            bc.postMessage({ type: 'USER_OFFLINE', userId: targetId });
            bc.close();
          } catch (_) {}
        }
      } catch (_) {}
    }
  }

  /**
   * Memulihkan sesi pengguna dari cache lokal atau sesi aktif Supabase
   */
  async _loadSession() {
    const savedSession = this._storage.get('session');
    const saved = this._storage.get('current_user');

    if (saved && saved.id !== 'usr_budi_01') {
      if (saved.avatar === '/avatar.png') {
        saved.avatar = '';
        this._storage.set('current_user', saved);
      }
      this._currentUser = new User(saved);
      this._session = savedSession || {
        userId: this._currentUser.id,
        name: this._currentUser.name,
        email: this._currentUser.email,
        role: this._currentUser.role || 'user',
        loginAt: new Date().toISOString()
      };

      if (this._currentUser.role !== 'admin' && this._currentUser.id) {
        this._startPresenceHeartbeat(this._currentUser.id);
      }

      // Background sync profil terbaru dari Supabase
      if (this._userRepository && this._currentUser.email) {
        this._userRepository.getByEmail(this._currentUser.email)
          .then(remote => {
            if (remote) {
              this._currentUser = remote;
              this._saveSession(this._currentUser, this._currentUser.role);
              this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);
            }
          })
          .catch(() => {});
      }
    } else {
      this._currentUser = null;
      this._session = null;
      this._storage.remove('current_user');
      this._storage.remove('session');
    }

    // Periksa apakah ada pesan selamat datang dari OAuth Google yang tersimpan
    this.checkPendingOAuthWelcome();
  }

  /**
   * Periksa dan tampilkan toast selamat datang setelah reload bersih pasca OAuth Google
   */
  checkPendingOAuthWelcome() {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const welcomeName = sessionStorage.getItem('panenkunci:oauth_welcome');
      if (welcomeName) {
        sessionStorage.removeItem('panenkunci:oauth_welcome');
        setTimeout(() => {
          this._eventBus.emit(AppEvents.SHOW_TOAST, {
            type: 'success',
            message: `Selamat datang, ${welcomeName}! Berhasil masuk menggunakan akun Google.`
          });
        }, 400);
      }
    } catch (e) {
      console.warn('[AuthService] checkPendingOAuthWelcome note:', e);
    }
  }

  /**
   * Cek apakah ada sesi user yang aktif
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this._currentUser && this._currentUser.id);
  }

  /**
   * Mengembalikan data session aktif
   * @returns {{ userId: string, name: string, email: string, role: string, loginAt: string } | null}
   */
  getSession() {
    return this._session;
  }

  /**
   * Cek apakah sesi saat ini adalah Administrator
   * @returns {boolean}
   */
  isAdmin() {
    return Boolean(this._currentUser && this._currentUser.isAdmin());
  }

  /**
   * Cek apakah sesi saat ini adalah Pengguna Biasa
   * @returns {boolean}
   */
  isUser() {
    return Boolean(this._currentUser && this._currentUser.isUser());
  }

  /**
   * Mengembalikan objek User yang sedang login
   * @returns {User|null}
   */
  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Proses login pengguna atau admin
   * @param {string} emailInput
   * @param {string} password
   * @returns {Promise<{ success: boolean, role?: 'admin'|'user', message?: string, redirectTo?: string }>}
   */
  async login(emailInput, password) {
    if (!emailInput || !password) {
      return { success: false, message: 'Email dan kata sandi wajib diisi.' };
    }

    const email = emailInput.trim().toLowerCase();

    // ── 2. Login via Database Supabase (Cek email & password di tabel users) ──
    if (isSupabaseConfigured() && this._userRepository) {
      try {
        const userFromDb = await this._userRepository.getByEmail(email);
        if (userFromDb) {
          // Jika kolom password tersedia di database, periksa kecocokan password
          if (userFromDb.password && userFromDb.password !== password) {
            return {
              success: false,
              message: 'Kata sandi yang Anda masukkan salah. Silakan periksa kembali.'
            };
          }

          const isAdmin = userFromDb.role === 'admin' ||
                          userFromDb.isAdmin() ||
                          email === 'admin@panenkunci.id' ||
                          email === 'admin@panenkunci.com' ||
                          email.startsWith('admin@');
          const role = isAdmin ? 'admin' : 'user';

          this._saveSession(userFromDb, role);
          this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
            isAuthenticated: true,
            user: userFromDb,
            role
          });

          return {
            success: true,
            role,
            redirectTo: role === 'admin' ? '/admin_panel/index.html' : '#/dashboard',
            message: `Login berhasil sebagai ${role === 'admin' ? 'Administrator' : 'Pengguna'}!`
          };
        }
      } catch (dbErr) {
        console.warn('[AuthService] Cek tabel users Supabase warning:', dbErr.message);
      }

      // ── 3. Login via Supabase Auth jika akun terdaftar di auth.users ──
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!authError && authData.user) {
          let userProfile = null;
          if (this._userRepository) {
            userProfile = await this._userRepository.getById(authData.user.id);
            if (!userProfile) {
              userProfile = await this._userRepository.getByEmail(email);
            }
          }

          const isRoleAdmin = (userProfile && userProfile.role === 'admin') ||
                              email.startsWith('admin') ||
                              authData.user.user_metadata?.role === 'admin';

          const resolvedUser = userProfile || new User({
            id: authData.user.id,
            name: authData.user.user_metadata?.name || email.split('@')[0],
            email: authData.user.email,
            password,
            role: isRoleAdmin ? 'admin' : 'user',
            phone: '',
            bankName: '',
            accountNumber: '',
            accountHolder: (authData.user.user_metadata?.name || email.split('@')[0]).toUpperCase(),
            isVerified: false
          });

          const role = isRoleAdmin ? 'admin' : 'user';
          this._saveSession(resolvedUser, role);
          this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
            isAuthenticated: true,
            user: resolvedUser,
            role
          });

          return {
            success: true,
            role,
            redirectTo: role === 'admin' ? '/admin_panel/index.html' : '#/dashboard',
            message: `Login berhasil sebagai ${role === 'admin' ? 'Administrator' : 'Pengguna'}!`
          };
        }
      } catch (e) {
        console.warn('[AuthService] Supabase Auth sign in skipped/error:', e.message);
      }
    }

    // ── 4. Fallback akun lokal ──
    const localAccounts = this._storage.get('registered_accounts') || [];
    const matched = localAccounts.find(
      acc => acc.email.toLowerCase() === email && acc.password === password
    );

    if (matched) {
      const userObj = new User(matched);
      const role = userObj.role === 'admin' ? 'admin' : 'user';
      this._saveSession(userObj, role);
      this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
        isAuthenticated: true,
        user: userObj,
        role
      });

      return {
        success: true,
        role,
        redirectTo: role === 'admin' ? '/admin_panel/index.html' : '#/dashboard',
        message: `Login berhasil sebagai ${role === 'admin' ? 'Administrator' : 'Pengguna'}!`
      };
    }

    return {
      success: false,
      message: 'Email atau kata sandi tidak cocok. Silakan periksa kembali.'
    };
  }

  /**
   * Proses pendaftaran akun baru — LANGSUNG MENYIMPAN KE TABEL `public.users` DI SUPABASE
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} [data.confirmPassword]
   * @returns {Promise<{ success: boolean, errors?: string[], message?: string }>}
   */
  async register(data) {
    const validation = this._validator.validate(data);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();

    // ── SIMPAN LANGSUNG KE SUPABASE CLOUD ──
    if (isSupabaseConfigured() && this._userRepository) {
      try {
        // A. Cek apakah email sudah ada di tabel users Supabase
        const existingUser = await this._userRepository.getByEmail(email);
        if (existingUser) {
          return {
            success: false,
            errors: ['Alamat email ini sudah terdaftar. Silakan langsung masuk.']
          };
        }

        // B. Daftarkan juga ke Supabase Auth (jika memungkinkan)
        let authUserId = null;
        try {
          const { data: authData } = await supabase.auth.signUp({
            email,
            password: data.password,
            options: { data: { name } }
          });
          if (authData && authData.user) {
            authUserId = authData.user.id;
          }
        } catch (authErr) {
          console.warn('[AuthService] Supabase auth sign-up note:', authErr.message);
        }

        // C. Simpan data profil pengguna PASTI ke tabel `public.users` di Supabase
        const isRoleAdmin = email.startsWith('admin') || email === 'admin@panenkunci.id';
        const role = isRoleAdmin ? 'admin' : 'user';

        const newUserData = {
          name,
          email,
          password: data.password,
          role,
          phone: '',
          bankName: '',
          accountNumber: '',
          accountHolder: name.toUpperCase(),
          isVerified: false
        };

        if (authUserId) {
          newUserData.id = authUserId;
        }

        const savedUser = await this._userRepository.create(newUserData);

        this._saveSession(savedUser, role);
        this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
          isAuthenticated: true,
          user: this._currentUser,
          role
        });

        return {
          success: true,
          role: 'user',
          message: 'Pendaftaran Anda telah berhasil! Silahkan setor Key API dan hasilkan uang sebanyak banyak nya!'
        };
      } catch (err) {
        console.error('[AuthService] Gagal menyimpan akun pengguna:', err);
        const errMsg = (err.message || '').toLowerCase();
        if (errMsg.includes('duplicate') || errMsg.includes('already') || errMsg.includes('unique') || errMsg.includes('23505')) {
          return {
            success: false,
            errors: ['Alamat email ini sudah terdaftar. Silakan langsung masuk.']
          };
        }
        return {
          success: false,
          errors: [`Pendaftaran gagal: ${err.message}`]
        };
      }
    }

    // Fallback jika kredensial .env belum diatur sama sekali
    const localAccounts = this._storage.get('registered_accounts') || [];
    if (localAccounts.some(acc => acc.email.toLowerCase() === email)) {
      return {
        success: false,
        errors: ['Alamat email ini sudah terdaftar. Silakan langsung masuk.']
      };
    }

    const isLocalAdmin = email.startsWith('admin') || email === 'admin@panenkunci.id';
    const localRole = isLocalAdmin ? 'admin' : 'user';

    const localUser = new User({
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      password: data.password,
      role: localRole,
      phone: '',
      bankName: '',
      accountNumber: '',
      accountHolder: name.toUpperCase(),
      isVerified: false
    });

    localAccounts.push({
      ...localUser.toJSON(),
      password: data.password
    });
    this._storage.set('registered_accounts', localAccounts);

    this._saveSession(localUser, localRole);
    this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
      isAuthenticated: true,
      user: this._currentUser,
      role: localRole
    });

    return {
      success: true,
      role: localRole,
      message: 'Pendaftaran Anda telah berhasil! Silahkan setor Key API dan hasilkan uang sebanyak banyak nya!'
    };
  }

  /**
   * Perbarui profil pengguna (rekening, telepon, dsb.) dan simpan langsung ke Supabase
   * @param {Partial<User>} updates
   */
  async updateProfile(updates) {
    if (!this._currentUser) return;

    // Evaluasi apakah pengguna telah mendaftarkan rekening atau e-wallet yang valid
    const finalBank = updates.bankName !== undefined ? updates.bankName : this._currentUser.bankName;
    const finalAcc = updates.accountNumber !== undefined ? updates.accountNumber : this._currentUser.accountNumber;
    const finalPhone = updates.phone !== undefined ? updates.phone : this._currentUser.phone;

    const b = (finalBank || '').trim();
    const a = (finalAcc || '').trim();
    const p = (finalPhone || '').trim();
    const hasPayment = Boolean(b && b !== '-' && ((a && a !== '-') || (p && p !== '-')));

    // Otomatis verifikasi akun jika user sudah mendaftarkan rekening e-wallet
    updates.isVerified = hasPayment;

    Object.assign(this._currentUser, updates);
    this._currentUser.isVerified = hasPayment;
    this._saveSession(this._currentUser, this._currentUser.role || 'user');

    // Update di Supabase cloud jika terhubung
    if (isSupabaseConfigured() && this._userRepository && this._currentUser.id) {
      try {
        const updated = await this._userRepository.update(this._currentUser.id, updates);
        if (updated) {
          this._currentUser = updated;
          this._currentUser.isVerified = hasPayment;
          this._saveSession(this._currentUser, this._currentUser.role || 'user');
        }
      } catch (err) {
        console.warn('[AuthService] Supabase profile update warning:', err.message);
        if (err.message && !err.message.toLowerCase().includes('avatar')) {
          throw err;
        }
      }
    }

    // Perbarui juga data di cache registered_accounts lokal jika ada
    const localAccounts = this._storage.get('registered_accounts') || [];
    const accIdx = localAccounts.findIndex(acc => acc.id === this._currentUser.id || acc.email?.toLowerCase() === this._currentUser.email?.toLowerCase());
    if (accIdx !== -1) {
      localAccounts[accIdx] = { ...localAccounts[accIdx], ...updates, isVerified: hasPayment };
      this._storage.set('registered_accounts', localAccounts);
    }

    this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);
  }

  /**
   * Logout dan bersihkan seluruh sesi aktif (user & admin)
   */
  async logout() {
    const oldUserId = this._currentUser ? this._currentUser.id : null;
    this._stopPresenceHeartbeat(oldUserId);
    this._currentUser = null;
    this._session = null;
    this._storage.remove('current_user');
    this._storage.remove('session');

    // Hapus seluruh session storage & local keys terkait sesi autentikasi
    try {
      localStorage.removeItem('panenkunci:current_user');
      localStorage.removeItem('panenkunci:session');
      localStorage.removeItem('panenkunci:admin_logged_in');
      localStorage.removeItem('panenkunci:auth_role');
      sessionStorage.clear();
    } catch (e) {
      console.warn('[AuthService] Storage clean warning:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthService] Supabase signOut note:', err.message);
      }
    }

    this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
      isAuthenticated: false,
      user: null,
      role: null
    });
  }

  /**
   * Inisialisasi listener autentikasi Supabase untuk OAuth Google
   * @private
   */
  _initSupabaseOAuthListener() {
    if (!isSupabaseConfigured()) return;

    // 0. Deteksi jika tautan membawa token pemulihan kata sandi (baik format standar Supabase maupun double-hash)
    const rawHash = window.location.hash || '';
    const rawSearch = window.location.search || '';

    const isRecoveryToken = rawHash.includes('type=recovery') ||
                            rawSearch.includes('type=recovery') ||
                            (rawHash.includes('access_token=') && rawHash.includes('/reset-password'));

    if (isRecoveryToken) {
      this._isPasswordRecovery = true;

      // Ekstrak access_token dan refresh_token dari hash jika ada (mengatasi bug double hash dari fragment)
      if (rawHash.includes('access_token=')) {
        const accessMatch = rawHash.match(/access_token=([^&]+)/);
        const refreshMatch = rawHash.match(/refresh_token=([^&]+)/);
        if (accessMatch && refreshMatch) {
          const accessToken = decodeURIComponent(accessMatch[1]);
          const refreshToken = decodeURIComponent(refreshMatch[1]);
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).catch(err => {
            console.warn('[AuthService] setSession recovery note:', err.message);
          });
        }
      }

      window.history.replaceState(null, '', window.location.pathname + '#/reset-password');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }

    // 1. Tangani jika callback URL membawa parameter error dari Google OAuth
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('error=') || hash.includes('error_description=') || search.includes('error=')) {
      const params = new URLSearchParams(hash.includes('error=') ? hash.replace(/^#/, '') : search.replace(/^\?/, ''));
      const errorDesc = params.get('error_description') || params.get('error') || 'Autentikasi Google gagal atau dibatalkan.';

      window.history.replaceState(null, '', window.location.pathname + '#/login');
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      setTimeout(() => {
        this._eventBus.emit(AppEvents.SHOW_TOAST, {
          type: 'error',
          message: errorDesc.replace(/\+/g, ' ')
        });
      }, 300);
      return;
    }

    // 2. Dengarkan perubahan sesi autentikasi Supabase
    supabase.auth.onAuthStateChange(async (event, session) => {
      // Tangani event pemulihan kata sandi (user klik link dari email reset)
      if (event === 'PASSWORD_RECOVERY') {
        this._isPasswordRecovery = true;
        window.history.replaceState(null, '', window.location.pathname + '#/reset-password');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }

      if (this._isPasswordRecovery) {
        return; // Jangan biarkan OAuth sync atau navigasi lain menginterupsi alur pemulihan kata sandi
      }

      const isRecovery = window.location.hash.includes('type=recovery') ||
                         window.location.search.includes('type=recovery') ||
                         window.location.hash.startsWith('#/reset-password');
      if (isRecovery) {
        this._isPasswordRecovery = true;
        window.history.replaceState(null, '', window.location.pathname + '#/reset-password');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        if (this._isPasswordRecovery) return;

        const isGoogle = session.user.app_metadata?.provider === 'google' ||
                         session.user.identities?.some(i => i.provider === 'google');
        const hasOAuthParam = window.location.hash.includes('access_token') ||
                              window.location.hash.includes('refresh_token') ||
                              window.location.search.includes('code=');

        if (isGoogle || hasOAuthParam) {
          await this._syncOAuthUser(session.user, hasOAuthParam);
        }
      }
    });

    // 3. Tangani token OAuth jika user baru diarahkan kembali dari Google (kecuali jika itu recovery token)
    if (!this._isPasswordRecovery) {
      const isRecoveryParam = window.location.hash.includes('type=recovery') ||
                              window.location.search.includes('type=recovery');

      if (isRecoveryParam) {
        this._isPasswordRecovery = true;
        window.history.replaceState(null, '', window.location.pathname + '#/reset-password');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
          if (!error && session?.user && !this._isPasswordRecovery) {
            await this._syncOAuthUser(session.user, true);
          }
        }).catch(err => {
          console.warn('[AuthService] getSession OAuth error:', err);
        });
      }
    }
  }

  /**
   * Masuk atau Daftar menggunakan Google OAuth
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async loginWithGoogle() {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Layanan database Supabase belum dikonfigurasi.'
      };
    }

    try {
      // Selalu gunakan URL production Vercel agar redirect dari Google/Supabase tidak ke IP lokal
      const redirectUrl = appBaseUrl || (window.location.origin + window.location.pathname);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        console.error('[AuthService] Supabase signInWithOAuth error:', error);
        return {
          success: false,
          message: error.message || 'Gagal memulai autentikasi Google.'
        };
      }

      if (data?.url) {
        window.location.href = data.url;
      }

      return {
        success: true,
        data
      };
    } catch (err) {
      console.error('[AuthService] loginWithGoogle error:', err);
      return {
        success: false,
        message: err.message || 'Terjadi kendala saat menghubungkan ke Google.'
      };
    }
  }

  /**
   * Masuk menggunakan Google ID Token (Google One Tap / GIS)
   * @param {string} idToken
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async loginWithGoogleIdToken(idToken) {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Layanan database Supabase belum dikonfigurasi.'
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data?.user) {
        await this._syncOAuthUser(data.user, true);
        return { success: true, user: data.user };
      }

      return { success: false, message: 'Gagal memproses kredensial Google.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Sinkronisasi data akun dari Google ke database Supabase (tabel public.users)
   * @param {import('@supabase/supabase-js').User} authUser
   * @param {boolean} [isFreshLogin=false]
   * @private
   */
  async _syncOAuthUser(authUser, isFreshLogin = false) {
    if (!authUser || !authUser.email || this._isSyncingOAuth || this._isPasswordRecovery) return;
    this._isSyncingOAuth = true;

    try {
      const email = authUser.email.toLowerCase().trim();
      const meta = authUser.user_metadata || {};
      const fullName = (meta.full_name || meta.name || email.split('@')[0]).trim();
      const avatarUrl = meta.avatar_url || meta.picture || '';

      const isRoleAdmin = email.startsWith('admin') ||
                          email === 'admin@panenkunci.id' ||
                          email === 'admin@panenkunci.com';
      const defaultRole = isRoleAdmin ? 'admin' : 'user';

      let userRecord = null;

      if (this._userRepository) {
        try {
          // A. Periksa apakah user sudah terdaftar di database public.users
          userRecord = await this._userRepository.getByEmail(email);

          if (!userRecord) {
            // B. Jika belum ada, buat record pengguna baru di tabel public.users
            const newUserData = {
              id: authUser.id,
              name: fullName,
              email: email,
              password: '', // OAuth tidak memerlukan password manual
              role: defaultRole,
              phone: '',
              bankName: '',
              accountNumber: '',
              accountHolder: fullName.toUpperCase(),
              isVerified: false,
              avatar: avatarUrl
            };

            userRecord = await this._userRepository.create(newUserData);
            console.log('[AuthService] Pengguna baru dari Google berhasil disimpan ke database:', userRecord);
          } else {
            // C. Jika user sudah ada, perbarui foto profil jika sebelumnya kosong
            if ((!userRecord.avatar || userRecord.avatar === '/avatar.png') && avatarUrl) {
              try {
                await this._userRepository.update(userRecord.id, { avatar: avatarUrl });
                userRecord.avatar = avatarUrl;
              } catch (updateErr) {
                console.warn('[AuthService] Update avatar Google dilewati:', updateErr.message);
              }
            }
          }
        } catch (dbErr) {
          console.error('[AuthService] Gagal sinkronisasi data user Google ke database:', dbErr);
        }
      }

      // Fallback domain model jika repositori belum mengembalikan objek
      if (!userRecord) {
        userRecord = new User({
          id: authUser.id,
          name: fullName,
          email: email,
          password: '',
          role: defaultRole,
          phone: '',
          bankName: '',
          accountNumber: '',
          accountHolder: fullName.toUpperCase(),
          isVerified: false,
          avatar: avatarUrl
        });
      }

      const role = userRecord.role || defaultRole;
      this._saveSession(userRecord, role);

      this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, {
        isAuthenticated: true,
        user: userRecord,
        role
      });
      this._eventBus.emit(AppEvents.USER_UPDATED, userRecord);

      // Bersihkan parameter token OAuth pada URL dan navigasikan ke halaman yang tepat
      const curHash = window.location.hash || '';
      const curSearch = window.location.search || '';
      const hasOAuthTokens = curHash.includes('access_token') || curHash.includes('refresh_token') || curSearch.includes('code=');

      if (hasOAuthTokens) {
        // Simpan nama pengguna ke sessionStorage agar toast selamat datang muncul saat halaman termuat segar
        try {
          sessionStorage.setItem('panenkunci:oauth_welcome', userRecord.name || fullName);
        } catch (e) {}

        const targetUrl = role === 'admin'
          ? '/admin_panel/index.html'
          : (window.location.pathname + '#/dashboard');

        // Ganti URL menjadi bersih dan muat ulang halaman otomatis.
        // Tindakan reload ini menjamin browser mobile (Chrome/Safari/PWA) menghitung ulang
        // viewport layar 100% penuh tanpa mengecil/ter-zoom out pasca redirect OAuth eksternal.
        window.location.replace(targetUrl);
        window.location.reload();
        return;
      }

      if (isFreshLogin) {
        this._eventBus.emit(AppEvents.SHOW_TOAST, {
          type: 'success',
          message: `Selamat datang, ${userRecord.name}! Berhasil masuk menggunakan akun Google.`
        });
      }

      if (curHash === '#/login' || curHash === '#/register' || !curHash || curHash === '#/') {
        window.history.replaceState(null, '', window.location.pathname + '#/dashboard');
        window.dispatchEvent(new HashChangeEvent('hashchange'));

        if (role === 'admin') {
          setTimeout(() => {
            window.location.href = '/admin_panel/index.html';
          }, 300);
        }
      }
    } catch (err) {
      console.error('[AuthService] _syncOAuthUser fatal error:', err);
    } finally {
      this._isSyncingOAuth = false;
    }
  }

  /**
   * Mengirim email reset kata sandi kepada pengguna
   * @param {string} emailInput
   * @returns {Promise<{ success: boolean, message: string, code?: string }>}
   */
  async sendPasswordResetEmail(emailInput) {
    if (!emailInput) {
      return { success: false, message: 'Alamat email wajib diisi.' };
    }

    const email = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Format alamat email tidak valid.' };
    }

    // 1. Verifikasi apakah email terdaftar di sistem (database public.users / storage lokal)
    let userRecord = null;
    if (this._userRepository) {
      try {
        userRecord = await this._userRepository.getByEmail(email);
      } catch (err) {
        console.warn('[AuthService] Cek email repository note:', err.message);
      }
    }

    const localAccounts = this._storage.get('registered_accounts') || [];
    const localUser = localAccounts.find(acc => acc.email?.toLowerCase() === email);

    if (!userRecord && !localUser) {
      return {
        success: false,
        message: 'Alamat email ini tidak terdaftar di sistem Panen Kunci. Silakan periksa kembali email Anda.'
      };
    }

    // 2. Jika Supabase dikonfigurasi, kirim email reset password via Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        // Tentukan URL redirect saat tautan di email diklik
        const origin = window.location.origin + window.location.pathname;
        const cleanOrigin = origin.replace(/\/$/, '');
        const redirectUrl = `${cleanOrigin}/#/reset-password`;

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (error) {
          console.warn('[AuthService] Supabase resetPasswordForEmail error:', error);

          // Coba buat link pemulihan instan via backend proxy menggunakan kunci admin
          // Ini mengatasi masalah jika kuota email penuh (429) atau konfigurasi SMTP Supabase gagal (500)
          try {
            const proxyRes = await fetch('/api/supabase-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'generate_recovery_link',
                data: { email, redirectTo: redirectUrl }
              })
            });
            if (proxyRes.ok) {
              const proxyData = await proxyRes.json();
              if (proxyData.success && proxyData.action_link) {
                return {
                  success: true,
                  isDirectLink: true,
                  actionLink: proxyData.action_link,
                  message: 'Tautan pemulihan kata sandi instan telah berhasil dibuat untuk akun Anda!'
                };
              }
            } else {
              const proxyErrJson = await proxyRes.json().catch(() => null);
              console.warn('[AuthService] Fallback recovery proxy status:', proxyRes.status, proxyErrJson);
            }
          } catch (proxyErr) {
            console.warn('[AuthService] Fallback recovery link proxy note:', proxyErr.message);
          }

          // Jika fallback proxy tidak tersedia, berikan pesan error yang jelas dan spesifik
          const errMsg = (error.message || '').toLowerCase();

          if (
            error.status === 429 ||
            error.code === 'over_email_send_rate_limit' ||
            errMsg.includes('rate limit') ||
            errMsg.includes('security purposes')
          ) {
            return {
              success: false,
              code: 'RATE_LIMIT',
              message: 'Batas frekuensi pengiriman email tercapai (cooldown keamanan Supabase). Silakan tunggu 60 detik sebelum mencoba lagi atau periksa folder Kotak Masuk / Spam email Anda.'
            };
          }

          if (errMsg.includes('recovery email') || error.status === 500) {
            return {
              success: false,
              message: 'Gagal mengirim email melalui SMTP provider Supabase. Pastikan Anda menggunakan "Sandi Aplikasi (App Password)" 16 digit Gmail, bukan kata sandi akun biasa.'
            };
          }

          if (error.code === 'email_address_invalid' || errMsg.includes('invalid')) {
            return {
              success: false,
              message: 'Alamat email ini belum aktif atau belum diverifikasi di Supabase Auth.'
            };
          }

          return {
            success: false,
            message: error.message || 'Gagal mengirimkan email reset kata sandi.'
          };
        }

        return {
          success: true,
          message: `Tautan reset kata sandi telah dikirim ke ${email}. Silakan periksa Kotak Masuk atau folder Spam Anda.`
        };
      } catch (err) {
        console.error('[AuthService] sendPasswordResetEmail error:', err);
        return {
          success: false,
          message: err.message || 'Terjadi kesalahan saat memproses permintaan reset kata sandi.'
        };
      }
    }

    // Fallback jika berjalan offline / mode mock lokal
    return {
      success: true,
      message: `[Simulasi Mode Lokal] Instruksi reset kata sandi telah dikirim ke ${email}.`
    };
  }

  /**
   * Memperbarui kata sandi pengguna (setelah membuka link reset di email)
   * @param {string} newPassword
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async updateUserPassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) {
          console.error('[AuthService] Supabase updateUser password error:', error);
          return {
            success: false,
            message: error.message || 'Gagal memperbarui kata sandi di Supabase.'
          };
        }

        // Sinkronkan juga perubahan kata sandi ke tabel public.users
        const updatedEmail = data?.user?.email || this._currentUser?.email;
        if (updatedEmail && this._userRepository) {
          try {
            const dbUser = await this._userRepository.getByEmail(updatedEmail);
            if (dbUser) {
              await this._userRepository.update(dbUser.id, { password: newPassword });
            }
          } catch (dbErr) {
            console.warn('[AuthService] Update password in public.users note:', dbErr.message);
          }
        }

        // Sinkronkan jika ada di local storage
        if (updatedEmail) {
          const localAccounts = this._storage.get('registered_accounts') || [];
          const idx = localAccounts.findIndex(acc => acc.email?.toLowerCase() === updatedEmail.toLowerCase());
          if (idx !== -1) {
            localAccounts[idx].password = newPassword;
            this._storage.set('registered_accounts', localAccounts);
          }
        }

        this._isPasswordRecovery = false;
        try {
          await this.logout();
        } catch (logoutErr) {
          console.warn('[AuthService] Logout after reset note:', logoutErr);
        }

        return {
          success: true,
          message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.'
        };
      } catch (err) {
        console.error('[AuthService] updateUserPassword error:', err);
        return {
          success: false,
          message: err.message || 'Terjadi kendala saat memperbarui kata sandi.'
        };
      }
    }

    // Fallback mode lokal
    if (this._currentUser) {
      this._currentUser.password = newPassword;
      this._saveSession(this._currentUser, this._currentUser.role || 'user');
    }
    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui! Silakan masuk kembali.'
    };
  }
}
