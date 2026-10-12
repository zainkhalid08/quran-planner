/**
 * @file storage.js
 * @description Safe localStorage abstraction layer for user preferences and plan persistence.
 *
 * What is this file for:
 * - Provides defensive, try/catch-wrapped storage methods to handle browser storage access
 *   (including private browsing modes and quota restrictions) gracefully without throwing uncaught exceptions.
 *
 * What you can find in this file:
 * - `Storage.KEYS`: Centralized registry of localStorage keys (`PLAN`, `THEME`).
 * - `Storage.getItem`: Safe string retrieval with default fallback.
 * - `Storage.getJSON`: Safe JSON parsing with default fallback.
 * - `Storage.setItem`: Safe serialization and persistence.
 * - `Storage.removeItem`: Safe key removal.
 * - `storageService`: Alias export for compatibility.
 */
const Storage = {

  KEYS: {
    PLAN: 'quran_planner_saved_plan',
    THEME: 'quran_planner_theme_preference'
  },

  /**
   * Retrieves a string value from localStorage safely.
   * @param {string} key - Storage key name.
   * @param {string|null} [fallback=null] - Value to return if missing or inaccessible.
   * @returns {string|null}
   */
  getItem(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Retrieves and parses a JSON object from localStorage safely.
   * @param {string} key - Storage key name.
   * @param {*} [fallback=null] - Value to return if missing or parsing fails.
   * @returns {*}
   */
  getJSON(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Saves a value (string or object) to localStorage safely.
   * @param {string} key - Storage key name.
   * @param {*} value - Value to store (automatically stringified if object/array).
   * @returns {boolean} Whether the save succeeded.
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Deletes an item from localStorage safely.
   * @param {string} key - Storage key name to remove.
   * @returns {boolean} Whether the removal succeeded.
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

const storageService = Storage;

export { Storage, storageService };


