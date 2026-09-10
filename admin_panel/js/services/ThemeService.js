/**
 * ThemeService
 * Pengelolaan tema Tampilan (Malam / Gelap vs Siang / Terang)
 * Prinsip: Single Responsibility Principle (SRP)
 * Menyimpan preferensi di localStorage, menyinkronkan atribut DOM dan multi-tab.
 */
class ThemeService {
  constructor() {
    this.STORAGE_KEY = 'panenkunci:theme';
    this._listeners = new Set();
    this._currentTheme = this._loadSavedTheme();
  }

  _loadSavedTheme() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch (e) {
      console.warn('Gagal membaca tema dari localStorage:', e);
    }
    // Default tema admin adalah dark ('malam')
    return 'dark';
  }

  /**
   * Inisialisasi tema saat aplikasi mulai dimuat
   */
  init() {
    this.applyTheme(this._currentTheme);

    // Sinkronisasi perubahan tema jika diubah dari tab lain
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        this._currentTheme = e.newValue;
        this.applyTheme(this._currentTheme);
        this._notifyListeners(this._currentTheme);
      }
    });

    return this._currentTheme;
  }

  /**
   * Mengembalikan tema aktif saat ini ('dark' | 'light')
   */
  getTheme() {
    return this._currentTheme;
  }

  /**
   * Mengecek apakah tema aktif adalah tema malam
   */
  isDark() {
    return this._currentTheme === 'dark';
  }

  /**
   * Mengatur tema ('dark' atau 'light')
   */
  setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    this._currentTheme = theme;
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Gagal menyimpan tema:', e);
    }
    this.applyTheme(theme);
    this._notifyListeners(theme);
  }

  /**
   * Beralih secara instan antara tema malam dan siang
   */
  toggleTheme() {
    const nextTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  }

  /**
   * Menerapkan atribut data-theme dan class pada elemen DOM
   */
  applyTheme(theme) {
    const isDark = theme === 'dark';
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      if (body) {
        body.classList.remove('dark');
        body.classList.add('light');
      }
    }

    // Update meta theme-color jika tersedia
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#060b18' : '#f8fafc');
    }
  }

  /**
   * Daftarkan pendengar event saat tema berganti
   */
  onThemeChange(callback) {
    if (typeof callback === 'function') {
      this._listeners.add(callback);
      return () => this._listeners.delete(callback);
    }
    return () => {};
  }

  _notifyListeners(theme) {
    this._listeners.forEach((cb) => {
      try {
        cb(theme);
      } catch (e) {
        console.error('Error on theme change callback:', e);
      }
    });

    // Dispatch custom DOM event
    window.dispatchEvent(new CustomEvent('panenkunci:theme-changed', { detail: { theme } }));
  }
}

export const themeService = new ThemeService();
