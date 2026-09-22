// ── Theme Management (light, system, dark) ──
const themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Applies the visual theme class to <html> and updates active state of theme buttons.
 * @param {'light'|'system'|'dark'} preference - The desired theme setting.
 */
function applyTheme(preference) {
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
function setTheme(preference) {
  Storage.setItem(Storage.KEYS.THEME, preference);
  applyTheme(preference);
}

/**
 * Initializes theme events and initial state.
 */
function initTheme() {
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
