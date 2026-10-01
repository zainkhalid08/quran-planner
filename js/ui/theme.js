/**
 * @file theme.js
 * @description Theme management supporting light mode, dark mode, and system color scheme synchronization.
 *
 * What is this file for:
 * - Controls visual theme switching, updates HTML class attributes, keeps theme buttons in sync,
 *   and listens to OS-level system theme changes.
 *
 * What you can find in this file:
 * - `applyTheme`: Applies `.dark` class to `document.documentElement` and toggles aria-pressed on buttons.
 * - `setTheme`: Persists selected preference to `Storage` and invokes `applyTheme`.
 * - `initTheme`: Binds click handlers to theme toggle buttons and registers system `matchMedia` listener.
 */
import { Storage } from '../services/storage.js';


const themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Applies the visual theme class to <html> and updates active state of theme buttons.
 * @param {'light'|'system'|'dark'} preference - The desired theme setting.
 */
export function applyTheme(preference) {
  const prefersDark = themeMediaQuery.matches;
  const effectiveDark = preference === 'dark' || (preference === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', effectiveDark);

  const themeButtons = document.querySelectorAll('.theme-btn');
  themeButtons.forEach(button => {
    const isActive = button.dataset.theme === preference;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

/**
 * Saves user theme choice to storage and updates the page theme.
 * @param {'light'|'system'|'dark'} preference - Theme selected by the user.
 */
export function setTheme(preference) {
  Storage.setItem(Storage.KEYS.THEME, preference);
  applyTheme(preference);
}

/**
 * Initializes theme events and initial state.
 */
export function initTheme() {
  const themeButtons = document.querySelectorAll('.theme-btn');
  themeButtons.forEach(button => {
    button.addEventListener('click', () => setTheme(button.dataset.theme));
  });

  themeMediaQuery.addEventListener('change', () => {
    const currentPref = Storage.getItem(Storage.KEYS.THEME, 'system');
    if (currentPref === 'system') {
      applyTheme('system');
    }
  });

  const currentThemePref = Storage.getItem(Storage.KEYS.THEME, 'system');
  applyTheme(currentThemePref);
}

