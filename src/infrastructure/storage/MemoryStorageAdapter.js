import { IStorage } from '../../core/interfaces/IStorage.js';

/**
 * MemoryStorageAdapter
 * Prinsip: Liskov Substitution Principle (LSP)
 * Implementasi IStorage berbasis In-Memory Map.
 */
export class MemoryStorageAdapter extends IStorage {
  constructor() {
    super();
    this._map = new Map();
  }

  get(key) {
    return this._map.has(key) ? this._map.get(key) : null;
  }

  set(key, value) {
    this._map.set(key, value);
  }

  remove(key) {
    this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }
}
