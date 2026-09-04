import { IStorage } from '../../core/interfaces/IStorage.js';

/**
 * LocalStorageAdapter
 * Prinsip: Liskov Substitution Principle (LSP) & Dependency Inversion Principle (DIP)
 * Mengimplementasikan interface IStorage menggunakan window.localStorage
 * dengan safe JSON parse/stringify dan prefix namespace.
 */
export class LocalStorageAdapter extends IStorage {
  constructor(prefix = 'panenkunci:') {
    super();
    this.prefix = prefix;
  }

  get(key) {
    try {
      const raw = localStorage.getItem(`${this.prefix}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`LocalStorage read error for key "${key}":`, e);
      return null;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch (e) {
      console.error(`LocalStorage write error for key "${key}":`, e);
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (e) {
      console.error(`LocalStorage remove error for key "${key}":`, e);
    }
  }

  clear() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('LocalStorage clear error:', e);
    }
  }
}
