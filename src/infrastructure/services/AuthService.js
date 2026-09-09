import { User } from '../../domain/models/User.js';
import { AppEvents } from '../../core/events/EventBus.js';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';

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

    this._session = null;
    this._loadSession();
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
    if (role === 'admin') {
      localStorage.setItem('panenkunci:admin_logged_in', 'true');
      localStorage.setItem('panenkunci:auth_role', 'admin');
    } else {
      localStorage.removeItem('panenkunci:admin_logged_in');
      localStorage.setItem('panenkunci:auth_role', 'user');
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

    Object.assign(this._currentUser, updates);
    this._saveSession(this._currentUser, this._currentUser.role || 'user');

    // Update di Supabase cloud jika terhubung
    if (isSupabaseConfigured() && this._userRepository && this._currentUser.id) {
      try {
        const updated = await this._userRepository.update(this._currentUser.id, updates);
        if (updated) {
          this._currentUser = updated;
          this._saveSession(this._currentUser, this._currentUser.role || 'user');
        }
      } catch (err) {
        console.warn('[AuthService] Supabase profile update warning:', err.message);
        if (err.message && !err.message.toLowerCase().includes('avatar')) {
          throw err;
        }
      }
    }

    this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);
  }

  /**
   * Logout dan bersihkan seluruh sesi aktif (user & admin)
   */
  async logout() {
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
}
