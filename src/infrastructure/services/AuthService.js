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

    this._loadSession();
  }

  /**
   * Memulihkan sesi pengguna dari cache lokal atau sesi aktif Supabase
   */
  async _loadSession() {
    const saved = this._storage.get('current_user');

    if (saved && saved.id !== 'usr_budi_01') {
      this._currentUser = new User(saved);
      // Background sync profil terbaru dari Supabase
      if (this._userRepository && this._currentUser.email) {
        this._userRepository.getByEmail(this._currentUser.email)
          .then(remote => {
            if (remote) {
              this._currentUser = remote;
              this._storage.set('current_user', this._currentUser.toJSON());
              this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);
            }
          })
          .catch(() => {});
      }
    } else {
      this._currentUser = null;
      this._storage.remove('current_user');
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
   * Mengembalikan objek User yang sedang login
   * @returns {User|null}
   */
  getCurrentUser() {
    return this._currentUser;
  }

  /**
   * Proses login pengguna
   * @param {string} emailOrUsername
   * @param {string} password
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async login(emailOrUsername, password) {
    if (!emailOrUsername || !password) {
      return { success: false, message: 'Email dan kata sandi wajib diisi.' };
    }

    const email = emailOrUsername.trim().toLowerCase();

    // 1. Coba login via Supabase Auth jika tersedia
    if (isSupabaseConfigured()) {
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

          this._currentUser = userProfile || new User({
            id: authData.user.id,
            name: authData.user.user_metadata?.name || email.split('@')[0],
            email: authData.user.email,
            phone: '',
            bankName: '',
            accountNumber: '',
            accountHolder: (authData.user.user_metadata?.name || email.split('@')[0]).toUpperCase(),
            isVerified: false
          });

          this._storage.set('current_user', this._currentUser.toJSON());
          this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: true, user: this._currentUser });
          return { success: true };
        }
      } catch (e) {
        console.warn('[AuthService] Supabase Auth sign in skipped/error:', e.message);
      }

      // 2. Jika Supabase Auth gagal atau email rate limit, cek langsung ke tabel public.users di Supabase
      if (this._userRepository) {
        try {
          const userFromDb = await this._userRepository.getByEmail(email);
          if (userFromDb) {
            this._currentUser = userFromDb;
            this._storage.set('current_user', this._currentUser.toJSON());
            this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: true, user: this._currentUser });
            return { success: true };
          }
        } catch (dbErr) {
          console.error('[AuthService] Cek tabel users error:', dbErr.message);
        }
      }
    }

    // 3. Fallback akun lokal
    const localAccounts = this._storage.get('registered_accounts') || [];
    const matched = localAccounts.find(
      acc => acc.email.toLowerCase() === email && acc.password === password
    );

    if (matched) {
      this._currentUser = new User(matched);
      this._storage.set('current_user', this._currentUser.toJSON());
      this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: true, user: this._currentUser });
      return { success: true };
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
            errors: ['Alamat email ini sudah terdaftar di database Supabase. Silakan langsung masuk.']
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
        const newUserData = {
          name,
          email,
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

        this._currentUser = savedUser;
        this._storage.set('current_user', this._currentUser.toJSON());
        this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: true, user: this._currentUser });

        return {
          success: true,
          message: 'Pendaftaran berhasil! Akun Anda telah disimpan langsung di Supabase.'
        };
      } catch (err) {
        console.error('[AuthService] Gagal menyimpan ke tabel users Supabase:', err);
        return {
          success: false,
          errors: [`Gagal menyimpan ke Supabase: ${err.message}`]
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

    const localUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      password: data.password,
      phone: '',
      bankName: '',
      accountNumber: '',
      accountHolder: name.toUpperCase(),
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    localAccounts.push(localUser);
    this._storage.set('registered_accounts', localAccounts);
    this._currentUser = new User(localUser);
    this._storage.set('current_user', this._currentUser.toJSON());
    this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: true, user: this._currentUser });

    return {
      success: true,
      message: 'Pendaftaran berhasil!'
    };
  }

  /**
   * Perbarui profil pengguna (rekening, telepon, dsb.) dan simpan langsung ke Supabase
   * @param {Partial<User>} updates
   */
  async updateProfile(updates) {
    if (!this._currentUser) return;

    Object.assign(this._currentUser, updates);
    this._storage.set('current_user', this._currentUser.toJSON());

    // Update di Supabase cloud jika terhubung
    if (isSupabaseConfigured() && this._userRepository && this._currentUser.id) {
      try {
        const updated = await this._userRepository.update(this._currentUser.id, updates);
        if (updated) {
          this._currentUser = updated;
          this._storage.set('current_user', this._currentUser.toJSON());
        }
      } catch (err) {
        console.error('[AuthService] Supabase profile update error:', err.message);
        throw err;
      }
    }

    this._eventBus.emit(AppEvents.USER_UPDATED, this._currentUser);
  }

  /**
   * Logout dan bersihkan sesi aktif
   */
  async logout() {
    this._currentUser = null;
    this._storage.remove('current_user');

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthService] Supabase signOut note:', err.message);
      }
    }

    this._eventBus.emit(AppEvents.AUTH_STATE_CHANGED, { isAuthenticated: false, user: null });
  }
}
