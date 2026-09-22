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

      // Sinkronkan cadangan pk_bound_ref_ jika properti referredBy kosong
      if (!this._currentUser.referredBy && typeof localStorage !== 'undefined') {
        try {
          const bound = localStorage.getItem('pk_bound_ref_' + this._currentUser.id) ||
                        localStorage.getItem('pk_bound_ref_' + (this._currentUser.email || '').toLowerCase());
          if (bound) {
            this._currentUser.referredBy = bound.trim().toUpperCase();
          }
        } catch (_) {}
      }

      // Pastikan nicknameUpdatedAt tersinkron dari fallback localStorage jika belum ada
      if (!this._currentUser.nicknameUpdatedAt && typeof localStorage !== 'undefined') {
        const savedTime = (this._currentUser.id && localStorage.getItem('pk_nickname_updated_' + this._currentUser.id)) ||
                          (this._currentUser.email && localStorage.getItem('pk_nickname_updated_' + this._currentUser.email.toLowerCase()));
        if (savedTime) {
          this._currentUser.nicknameUpdatedAt = savedTime;
        }
      }

      // Sinkronkan nicknameUpdatedAt dari Supabase Auth user_metadata secara cloud (lintas device)
      if (isSupabaseConfigured()) {
        supabase.auth.getUser().then(({ data: authData }) => {
          const metaNickTime = authData?.user?.user_metadata?.nickname_updated_at;
          if (metaNickTime && this._currentUser) {
            this._currentUser.nicknameUpdatedAt = metaNickTime;
            if (typeof localStorage !== 'undefined') {
              if (this._currentUser.id) localStorage.setItem('pk_nickname_updated_' + this._currentUser.id, metaNickTime);
              if (this._currentUser.email) localStorage.setItem('pk_nickname_updated_' + this._currentUser.email.toLowerCase(), metaNickTime);
            }
            this._saveSession(this._currentUser, this._currentUser.role || 'user');
          }
        }).catch(() => {});
      }

      // Pastikan role bersih, tegas, dan konsisten (mencegah perpindahan sesi ke admin secara otomatis)
      const isExplicitAdmin = (this._currentUser.role === 'admin') ||
                              (this._currentUser.email === 'admin@panenkunci.id') ||
                              (this._currentUser.email === 'admin@panenkunci.com');
      const safeRole = isExplicitAdmin ? 'admin' : 'user';
      this._currentUser.role = safeRole;

      this._session = savedSession || {
        userId: this._currentUser.id,
        name: this._currentUser.name,
        email: this._currentUser.email,
        role: safeRole,
        loginAt: new Date().toISOString()
      };
      this._session.role = safeRole;

      // Bersihkan / sinkronkan flag localStorage agar role user biasa tidak pernah mengakses admin panel
      if (typeof localStorage !== 'undefined') {
        if (safeRole === 'admin') {
          localStorage.setItem('panenkunci:admin_logged_in', 'true');
          localStorage.setItem('panenkunci:auth_role', 'admin');
        } else {
          localStorage.removeItem('panenkunci:admin_logged_in');
          localStorage.setItem('panenkunci:auth_role', 'user');
        }
      }

      if (this._currentUser.role !== 'admin' && this._currentUser.id) {
        this._startPresenceHeartbeat(this._currentUser.id);
      }

      // Background sync profil terbaru dari Supabase
      if (this._userRepository && this._currentUser.email) {
        this._userRepository.getByEmail(this._currentUser.email)
          .then(async remote => {
            if (remote) {
              const prevNicknameUpdatedAt = this._currentUser?.nicknameUpdatedAt;
              const prevReferredBy = this._currentUser?.referredBy;
              const isRemoteAdmin = (remote.role === 'admin') ||
                                    (remote.email === 'admin@panenkunci.id') ||
                                    (remote.email === 'admin@panenkunci.com');
              const validatedRole = isRemoteAdmin ? 'admin' : 'user';
              remote.role = validatedRole;
              if (!remote.nicknameUpdatedAt) {
                if (prevNicknameUpdatedAt) {
                  remote.nicknameUpdatedAt = prevNicknameUpdatedAt;
                } else if (typeof localStorage !== 'undefined') {
                  const savedTime = (remote.id && localStorage.getItem('pk_nickname_updated_' + remote.id)) ||
                                    (remote.email && localStorage.getItem('pk_nickname_updated_' + (remote.email || '').toLowerCase()));
                  if (savedTime) {
                    remote.nicknameUpdatedAt = savedTime;
                  }
                }
              }

              // Jika remote masih belum memiliki nicknameUpdatedAt, periksa Supabase Auth user_metadata
              if (!remote.nicknameUpdatedAt && isSupabaseConfigured()) {
                try {
                  const { data: authData } = await supabase.auth.getUser();
                  const metaTime = authData?.user?.user_metadata?.nickname_updated_at;
                  if (metaTime) {
                    remote.nicknameUpdatedAt = metaTime;
                    if (typeof localStorage !== 'undefined') {
                      if (remote.id) localStorage.setItem('pk_nickname_updated_' + remote.id, metaTime);
                      if (remote.email) localStorage.setItem('pk_nickname_updated_' + (remote.email || '').toLowerCase(), metaTime);
                    }
                  }
                } catch (_) {}
              }

              if (!remote.referredBy && prevReferredBy) {
                remote.referredBy = prevReferredBy;
              }

              // Jika remote belum memiliki referredBy, periksa session auth user_metadata Supabase
              if (!remote.referredBy && isSupabaseConfigured()) {
                try {
                  const { data: authData } = await supabase.auth.getUser();
                  const metaRef = authData?.user?.user_metadata?.referred_by || authData?.user?.user_metadata?.referredBy;
                  if (metaRef) {
                    remote.referredBy = String(metaRef).trim().toUpperCase();
                  }
                } catch (_) {}
              }

              // Jika masih belum ada, cek cadangan localStorage
              if (!remote.referredBy && typeof localStorage !== 'undefined') {
                try {
                  const bound = localStorage.getItem('pk_bound_ref_' + remote.id) ||
                                localStorage.getItem('pk_bound_ref_' + (remote.email || '').toLowerCase());
                  if (bound) {
                    remote.referredBy = bound.trim().toUpperCase();
                  }
                } catch (_) {}
              }

              this._currentUser = remote;
              this._saveSession(this._currentUser, validatedRole);
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
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('panenkunci:admin_logged_in');
        localStorage.removeItem('panenkunci:auth_role');
      }
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
    if (this._currentUser && !this._currentUser.referredBy && typeof localStorage !== 'undefined') {
      try {
        const bound = localStorage.getItem('pk_bound_ref_' + this._currentUser.id) ||
                      localStorage.getItem('pk_bound_ref_' + (this._currentUser.email || '').toLowerCase());
        if (bound) {
          this._currentUser.referredBy = bound.trim().toUpperCase();
        }
      } catch (_) {}
    }
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
                          email === 'admin@panenkunci.id' ||
                          email === 'admin@panenkunci.com';
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
                              email === 'admin@panenkunci.id' ||
                              email === 'admin@panenkunci.com' ||
                              authData.user.user_metadata?.role === 'admin';

          const metaRef = (authData.user.user_metadata?.referred_by || authData.user.user_metadata?.referredBy || '').trim().toUpperCase();
          if (userProfile && !userProfile.referredBy && metaRef) {
            userProfile.referredBy = metaRef;
          }

          const metaNickTime = authData.user.user_metadata?.nickname_updated_at;
          if (userProfile && !userProfile.nicknameUpdatedAt && metaNickTime) {
            userProfile.nicknameUpdatedAt = metaNickTime;
          }

          if (metaNickTime && typeof localStorage !== 'undefined') {
            try {
              if (authData.user.id) localStorage.setItem('pk_nickname_updated_' + authData.user.id, metaNickTime);
              if (authData.user.email) localStorage.setItem('pk_nickname_updated_' + authData.user.email.toLowerCase(), metaNickTime);
            } catch (_) {}
          }

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
            isVerified: false,
            referralCode: authData.user.user_metadata?.referral_code || authData.user.user_metadata?.referralCode || User.generateReferralCode(authData.user.id),
            referredBy: metaRef,
            nicknameUpdatedAt: metaNickTime || null
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
        const isRoleAdmin = email === 'admin@panenkunci.id' || email === 'admin@panenkunci.com';
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
          isVerified: false,
          referralCode: User.generateReferralCode(authUserId || email || name),
          referredBy: (data.referredBy || '').trim().toUpperCase()
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

        // Sinkronkan tautan kode referral ke store proxy & auth user_metadata jika ada
        if (newUserData.referredBy && (savedUser?.id || authUserId)) {
          const targetId = savedUser?.id || authUserId;
          try {
            fetch('/api/supabase-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'bind_referral',
                userId: targetId,
                userEmail: email,
                referralCode: newUserData.referredBy
              })
            }).catch(() => {});
          } catch (_) {}
        }

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

    const isLocalAdmin = email === 'admin@panenkunci.id' || email === 'admin@panenkunci.com';
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
      isVerified: false,
      referralCode: User.generateReferralCode(email || name),
      referredBy: (data.referredBy || '').trim().toUpperCase()
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
          if (!updated.referredBy && this._currentUser.referredBy) {
            updated.referredBy = this._currentUser.referredBy;
          }
          if (!updated.nicknameUpdatedAt && this._currentUser.nicknameUpdatedAt) {
            updated.nicknameUpdatedAt = this._currentUser.nicknameUpdatedAt;
          }
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
   * Menautkan akun saat ini ke kode referral akun lain (pengundang)
   * @param {string} referralCode
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async bindReferralCode(referralCode) {
    if (!this._currentUser) {
      return { success: false, message: 'Anda harus masuk akun terlebih dahulu.' };
    }
    const cleanCode = (referralCode || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Kode referral tidak boleh kosong.' };
    }
    if (cleanCode === (this._currentUser.referralCode || '').toUpperCase()) {
      return { success: false, message: 'Tidak dapat mengikat kode referral milik akun sendiri.' };
    }
    if (this._currentUser.referredBy) {
      return { success: false, message: `Akun Anda sudah terikat ke kode rujukan ${this._currentUser.referredBy}. Penautan hanya dapat dilakukan 1 kali.` };
    }

    // Validasi apakah kode referral yang dimasukkan benar-benar ada di sistem
    let referralExists = false;

    // 1. Validasi via Server Proxy (menggunakan Service Role admin untuk bypass RLS & mendeteksi generator hash)
    try {
      const proxyRes = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_referral_code',
          referralCode: cleanCode
        })
      });
      if (proxyRes.ok) {
        const proxyJson = await proxyRes.json();
        if (proxyJson.success && proxyJson.exists) {
          referralExists = true;
        }
      }
    } catch (proxyErr) {
      console.warn('[AuthService] Cek kode referral via proxy warning:', proxyErr.message);
    }

    // 2. Fallback query direct Supabase (jika proxy offline dan kolom referral_code tersedia)
    if (!referralExists && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, referral_code')
          .ilike('referral_code', cleanCode)
          .maybeSingle();

        if (!error && data && data.referral_code) {
          referralExists = true;
        }
      } catch (err) {
        console.warn('[AuthService] Cek kode referral Supabase warning:', err.message);
      }
    }

    // 3. Fallback akun lokal
    if (!referralExists) {
      const localAccounts = this._storage.get('registered_accounts') || [];
      if (localAccounts.some(acc => (acc.referralCode || '').toUpperCase() === cleanCode)) {
        referralExists = true;
      }
    }

    if (!referralExists) {
      return { success: false, message: `Kode referral "${cleanCode}" tidak ditemukan atau tidak valid.` };
    }

    // Simpan penautan ke akun saat ini:
    // A. Amankan ke localStorage segera agar tahan refresh & reload kapan pun
    if (typeof localStorage !== 'undefined') {
      try {
        if (this._currentUser.id) localStorage.setItem('pk_bound_ref_' + this._currentUser.id, cleanCode);
        if (this._currentUser.email) localStorage.setItem('pk_bound_ref_' + (this._currentUser.email).toLowerCase(), cleanCode);
      } catch (_) {}
    }

    // B. Update local domain, session, dan repository
    this._currentUser.referredBy = cleanCode;
    this._saveSession(this._currentUser, this._currentUser.role || 'user');
    await this.updateProfile({ referredBy: cleanCode });
    this._currentUser.referredBy = cleanCode;
    this._saveSession(this._currentUser, this._currentUser.role || 'user');

    // C. Simpan ke Supabase auth user_metadata di client jika ada session
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.updateUser({
          data: { referred_by: cleanCode }
        });
      } catch (_) {}
    }

    // D. Simpan ke Supabase database & Auth user_metadata via Server Proxy (admin bypass RLS)
    if (this._currentUser.id) {
      try {
        await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'bind_referral',
            userId: this._currentUser.id,
            userEmail: this._currentUser.email,
            referralCode: cleanCode
          })
        });
      } catch (proxyErr) {
        console.warn('[AuthService] Bind referral proxy warning:', proxyErr.message);
      }
    }

    this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);

    return { success: true, message: `Berhasil menautkan akun ke kode referral ${cleanCode}!` };
  }

  /**
   * Memeriksa kelayakan pergantian nickname secara cloud realtime (lintas device/browser)
   * @returns {Promise<{ allowed: boolean, daysLeft: number, nextDate: Date|null }>}
   */
  async checkNicknameEligibility() {
    if (!this._currentUser) {
      return { allowed: false, daysLeft: 0, nextDate: null };
    }

    // 1. Cek dulu domain model & localStorage lokal
    const localCheck = this._currentUser.canChangeNickname();
    if (!localCheck.allowed) {
      return localCheck;
    }

    // 2. Jika secara lokal tampak boleh, verifikasi ke Cloud (proxy) untuk memastikan tidak pernah diubah di device lain
    if (isSupabaseConfigured() && (this._currentUser.id || this._currentUser.email)) {
      try {
        const res = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_nickname_cooldown',
            userId: this._currentUser.id,
            email: this._currentUser.email
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            if (json.nicknameUpdatedAt) {
              this._currentUser.nicknameUpdatedAt = json.nicknameUpdatedAt;
              if (typeof localStorage !== 'undefined') {
                if (this._currentUser.id) localStorage.setItem('pk_nickname_updated_' + this._currentUser.id, json.nicknameUpdatedAt);
                if (this._currentUser.email) localStorage.setItem('pk_nickname_updated_' + this._currentUser.email.toLowerCase(), json.nicknameUpdatedAt);
              }
              this._saveSession(this._currentUser, this._currentUser.role || 'user');
            }

            if (!json.allowed) {
              return {
                allowed: false,
                daysLeft: json.daysLeft || 30,
                nextDate: json.nextDate ? new Date(json.nextDate) : null
              };
            }
          }
        }
      } catch (err) {
        console.warn('[AuthService] checkNicknameEligibility cloud check note:', err.message);
      }
    }

    return this._currentUser.canChangeNickname();
  }

  /**
   * Mengganti nickname pengguna dengan batasan 1 kali sebulan (30 hari).
   * Sinkron secara realtime ke database Supabase (tabel users), Auth user_metadata, dan Admin Panel.
   * @param {string} newNickname
   * @returns {Promise<{ success: boolean, name: string, nicknameUpdatedAt: string }>}
   */
  async updateNickname(newNickname) {
    if (!this._currentUser) {
      throw new Error('Pengguna belum masuk akun.');
    }

    const trimmed = (newNickname || '').trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      throw new Error('Nickname tidak boleh kosong.');
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
      throw new Error('Nickname hanya boleh berisi huruf abjad dan spasi (tidak boleh mengandung angka atau simbol).');
    }
    if (trimmed.replace(/\s+/g, '').length < 3) {
      throw new Error('Nickname minimal terdiri dari 3 huruf abjad.');
    }
    if (trimmed.length > 30) {
      throw new Error('Nickname maksimal 30 karakter.');
    }
    if (trimmed.toLowerCase() === (this._currentUser.name || '').toLowerCase()) {
      throw new Error('Nickname baru tidak boleh sama dengan nickname saat ini.');
    }

    // 1. Cek batasan cooldown 1 bulan (30 hari) secara komprehensif (lokal + cloud)
    const check = await this.checkNicknameEligibility();
    if (!check.allowed) {
      const formattedDate = check.nextDate ? check.nextDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : '';
      throw new Error(
        `Nickname hanya dapat diganti sebulan sekali (30 hari). Anda dapat menggantinya kembali dalam ${check.daysLeft} hari${formattedDate ? ` (pada ${formattedDate})` : ''}.`
      );
    }

    const nowIso = new Date().toISOString();
    const oldName = this._currentUser.name;

    // Update di model domain lokal & sesi
    this._currentUser.name = trimmed;
    this._currentUser.nicknameUpdatedAt = nowIso;
    if (typeof localStorage !== 'undefined') {
      try {
        if (this._currentUser.id) localStorage.setItem('pk_nickname_updated_' + this._currentUser.id, nowIso);
        if (this._currentUser.email) localStorage.setItem('pk_nickname_updated_' + this._currentUser.email.toLowerCase(), nowIso);
      } catch (_) {}
    }
    this._saveSession(this._currentUser, this._currentUser.role || 'user');

    // 2. Simpan ke database Supabase dan Auth metadata
    if (isSupabaseConfigured() && (this._currentUser.id || this._currentUser.email)) {
      let proxySuccess = false;
      // A. Coba update via Server Proxy (action: 'update_nickname' yang meng-handle bypass RLS & metadata)
      try {
        const proxyRes = await fetch('/api/supabase-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_nickname',
            userId: this._currentUser.id,
            email: this._currentUser.email,
            name: trimmed,
            nicknameUpdatedAt: nowIso
          })
        });

        const proxyJson = await proxyRes.json().catch(() => ({}));
        if (proxyRes.ok && proxyJson.success) {
          proxySuccess = true;
        } else {
          // Jika server proxy menolak (misal: cooldown 30 hari aktif), KEMBALIKAN state dan batalkan segera!
          const errMsg = proxyJson.error || 'Gagal memperbarui nickname di server.';
          this._currentUser.name = oldName;
          if (proxyJson.nicknameUpdatedAt) {
            this._currentUser.nicknameUpdatedAt = proxyJson.nicknameUpdatedAt;
            if (typeof localStorage !== 'undefined') {
              if (this._currentUser.id) localStorage.setItem('pk_nickname_updated_' + this._currentUser.id, proxyJson.nicknameUpdatedAt);
              if (this._currentUser.email) localStorage.setItem('pk_nickname_updated_' + this._currentUser.email.toLowerCase(), proxyJson.nicknameUpdatedAt);
            }
          }
          this._saveSession(this._currentUser, this._currentUser.role || 'user');
          throw new Error(errMsg);
        }
      } catch (proxyErr) {
        this._currentUser.name = oldName;
        this._saveSession(this._currentUser, this._currentUser.role || 'user');
        throw proxyErr;
      }

      // B. Update langsung ke tabel users via supabase client jika proxy belum aktif
      if (!proxySuccess && this._userRepository && this._currentUser.id) {
        try {
          await this._userRepository.update(this._currentUser.id, { name: trimmed, nicknameUpdatedAt: nowIso });
        } catch (dbErr) {
          console.warn('[AuthService] Direct users table update note:', dbErr.message);
        }
      }

      // C. Simpan ke Supabase Auth user_metadata
      try {
        await supabase.auth.updateUser({
          data: {
            name: trimmed,
            full_name: trimmed,
            nickname_updated_at: nowIso
          }
        });
      } catch (authMetaErr) {
        console.warn('[AuthService] Supabase auth updateUser metadata note:', authMetaErr.message);
      }
    }

    // 3. Update cache akun lokal jika ada
    const localAccounts = this._storage.get('registered_accounts') || [];
    const accIdx = localAccounts.findIndex(acc => acc.id === this._currentUser.id || acc.email?.toLowerCase() === this._currentUser.email?.toLowerCase());
    if (accIdx !== -1) {
      localAccounts[accIdx] = {
        ...localAccounts[accIdx],
        name: trimmed,
        nicknameUpdatedAt: nowIso
      };
      this._storage.set('registered_accounts', localAccounts);
    }

    // 4. Broadcast realtime ke tab lain & Admin Panel via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('panenkunci_sync');
        bc.postMessage({
          type: 'USER_NICKNAME_CHANGED',
          userId: this._currentUser.id,
          name: trimmed,
          nicknameUpdatedAt: nowIso
        });
        bc.close();
      } catch (bcErr) {
        console.warn('[AuthService] BroadcastChannel note:', bcErr);
      }
    }

    // 5. Emit event update
    this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);

    return {
      success: true,
      name: trimmed,
      nicknameUpdatedAt: nowIso
    };
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

    // 0. Deteksi jika tautan membawa token pemulihan kata sandi (baik format standar Supabase maupun token_hash / OTP)
    const rawHash = window.location.hash || '';
    const rawSearch = window.location.search || '';

    const isRecoveryToken = rawHash.includes('type=recovery') ||
                            rawSearch.includes('type=recovery') ||
                            rawHash.includes('token_hash=') ||
                            rawSearch.includes('token_hash=') ||
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

      // Jika URL memiliki token_hash atau search parameter pemulihan, pertahankan query agar dapat dibaca view
      if (!rawHash.includes('token_hash=') && !rawSearch.includes('token_hash=')) {
        window.history.replaceState(null, '', window.location.pathname + '#/reset-password');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }

    // 1. Tangani jika callback URL membawa parameter error
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('error=') || hash.includes('error_description=') || search.includes('error=')) {
      const params = new URLSearchParams(hash.includes('error=') ? hash.replace(/^#/, '') : search.replace(/^\?/, ''));
      const errorCode = params.get('error_code') || '';
      const errorDesc = params.get('error_description') || params.get('error') || 'Autentikasi gagal atau dibatalkan.';

      const isRecoveryError = errorCode === 'otp_expired' ||
                             hash.includes('reset-password') ||
                             errorDesc.toLowerCase().includes('email link') ||
                             errorDesc.toLowerCase().includes('otp');

      if (isRecoveryError) {
        this._isPasswordRecovery = true;
        // Jangan tendang ke /login! Arahkan ke /reset-password dengan parameter error=otp_expired
        // agar ResetPasswordView dapat menampilkan panduan ramah pengguna dan form input kode OTP
        window.history.replaceState(null, '', window.location.pathname + '#/reset-password?error=otp_expired');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }

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
                         window.location.hash.includes('token_hash=') ||
                         window.location.search.includes('token_hash=') ||
                         window.location.hash.startsWith('#/reset-password');
      if (isRecovery) {
        this._isPasswordRecovery = true;
        if (!window.location.hash.includes('token_hash=')) {
          window.history.replaceState(null, '', window.location.pathname + '#/reset-password');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
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

      const isRoleAdmin = email === 'admin@panenkunci.id' ||
                          email === 'admin@panenkunci.com';
      const defaultRole = isRoleAdmin ? 'admin' : 'user';

      let userRecord = null;
      const metaReferredBy = (authUser.user_metadata?.referred_by || authUser.user_metadata?.referredBy || '').trim().toUpperCase();
      let storedLocalRef = '';
      try {
        storedLocalRef = (localStorage.getItem('pk_referral_code') ||
                          sessionStorage.getItem('pk_referral_code') ||
                          localStorage.getItem('pk_bound_ref_' + authUser.id) ||
                          localStorage.getItem('pk_bound_ref_' + email) || '').trim().toUpperCase();
      } catch (_) {}
      const effectiveOAuthRef = metaReferredBy || storedLocalRef;

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
              avatar: avatarUrl,
              referralCode: User.generateReferralCode(authUser.id || email || fullName),
              referredBy: effectiveOAuthRef
            };

            userRecord = await this._userRepository.create(newUserData);
            console.log('[AuthService] Pengguna baru dari Google berhasil disimpan ke database:', userRecord);
          } else {
            // Jika user sudah ada, perbarui referredBy jika sebelumnya kosong dan metadata/local punya
            if (!userRecord.referredBy) {
              if (effectiveOAuthRef) {
                userRecord.referredBy = effectiveOAuthRef;
              } else if (this._currentUser?.referredBy) {
                userRecord.referredBy = this._currentUser.referredBy;
              }
            }
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
          avatar: avatarUrl,
          referralCode: User.generateReferralCode(authUser.id || email || fullName),
          referredBy: effectiveOAuthRef || (this._currentUser?.referredBy || '')
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
   * Mengirim kode OTP ke email calon pengguna untuk verifikasi pendaftaran
   * @param {string} emailInput
   * @returns {Promise<{ success: boolean, message: string, token?: string, expiresAt?: number, debugOtp?: string }>}
   */
  async sendRegisterOtp(emailInput) {
    if (!emailInput) {
      return { success: false, message: 'Alamat email wajib diisi.' };
    }

    const email = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Format alamat email tidak valid.' };
    }

    // 1. Cek apakah email sudah terdaftar di repository lokal / database
    if (this._userRepository) {
      try {
        const existing = await this._userRepository.getByEmail(email);
        if (existing) {
          return {
            success: false,
            message: 'Alamat email ini sudah terdaftar. Silakan langsung masuk ke akun Anda.'
          };
        }
      } catch (_) {}
    }

    const localAccounts = this._storage.get('registered_accounts') || [];
    if (localAccounts.some(acc => acc.email?.toLowerCase() === email)) {
      return {
        success: false,
        message: 'Alamat email ini sudah terdaftar. Silakan langsung masuk ke akun Anda.'
      };
    }

    // 2. Kirim permintaan OTP ke server backend proxy
    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_register_otp',
          data: { email }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          token: data.token,
          expiresAt: data.expiresAt,
          debugOtp: data.debugOtp,
          message: data.message || `Kode OTP berhasil dikirimkan ke ${email}.`
        };
      } else {
        return {
          success: false,
          message: data.error || 'Gagal mengirim kode OTP ke email.'
        };
      }
    } catch (err) {
      console.error('[AuthService] sendRegisterOtp error:', err);
      return {
        success: false,
        message: 'Terjadi kesalahan jaringan saat mengirim kode OTP.'
      };
    }
  }

  /**
   * Memverifikasi kecocokan kode OTP yang dimasukkan calon pengguna
   * @param {string} emailInput
   * @param {string} otp
   * @param {string} token
   * @returns {Promise<{ success: boolean, verified?: boolean, verifiedToken?: string, message: string }>}
   */
  async verifyRegisterOtp(emailInput, otp, token) {
    if (!emailInput || !otp || !token) {
      return { success: false, message: 'Email, kode OTP, dan token verifikasi wajib disertakan.' };
    }

    const email = emailInput.trim().toLowerCase();
    const cleanOtp = otp.trim();

    try {
      const res = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_register_otp',
          data: {
            email,
            otp: cleanOtp,
            token
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          verified: true,
          verifiedToken: data.verifiedToken,
          message: data.message || 'Email berhasil diverifikasi!'
        };
      } else {
        return {
          success: false,
          message: data.error || 'Kode OTP salah atau kedaluwarsa.'
        };
      }
    } catch (err) {
      console.error('[AuthService] verifyRegisterOtp error:', err);
      return {
        success: false,
        message: 'Terjadi kesalahan jaringan saat memverifikasi kode OTP.'
      };
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

        // 1. Prioritaskan pengiriman via backend proxy (Brevo) agar tidak terikat batasan SMTP Supabase
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
            if (proxyData.success) {
              return {
                success: true,
                isDirectLink: Boolean(proxyData.isDirectLink),
                actionLink: proxyData.action_link,
                message: proxyData.message || 'Email pemulihan kata sandi berhasil dikirimkan via Brevo.'
              };
            } else if (proxyData.error) {
              console.warn('[AuthService] Proxy generate_recovery_link returned error:', proxyData.error);
            }
          }
        } catch (proxyErr) {
          console.warn('[AuthService] Brevo proxy recovery link note:', proxyErr.message);
        }

        // 2. Fallback jika proxy belum aktif: kirim via Supabase Auth bawaan
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

        if (error) {
          console.warn('[AuthService] Supabase resetPasswordForEmail error:', error);

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
        let updatedEmail = data?.user?.email || this._currentUser?.email;
        if (!updatedEmail) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            updatedEmail = userData?.user?.email;
          } catch (_) {}
        }
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
