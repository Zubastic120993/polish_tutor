(function () {
  const THEME_KEY = 'patient_tutor_theme';
  const root = document.documentElement;

  function applyTheme(theme) {
    if (!theme) return;
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn('Unable to persist theme', e);
    }
  }

  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (e) {
      stored = null;
    }
    const initial = stored || 'light';
    applyTheme(initial);
    return initial;
  }

  function bindThemeDropdown() {
    const select = document.getElementById('settings-theme');
    if (!select) return;
    select.addEventListener('change', (event) => {
      applyTheme(event.target.value);
    });
  }

  const initialTheme = initTheme();
  bindThemeDropdown();

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('settings-theme');
    if (select) {
      select.value = initialTheme;
    }
  });
})();
