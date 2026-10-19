// Light / dark / system theme, remembered per browser.
const KEY = 'cs-portal-theme';
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemePref() {
  try {
    return localStorage.getItem(KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(pref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && !!media?.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setThemePref(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable — still apply for this visit */
  }
  applyTheme(pref);
}

// Follow the OS setting live while on "system".
media?.addEventListener?.('change', () => getThemePref() === 'system' && applyTheme('system'));
