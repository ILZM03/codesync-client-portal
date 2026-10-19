// "Keep me signed in": when on, the session lives in localStorage (survives closing the browser);
// when off, in sessionStorage (cleared when the browser closes). On by default.
const FLAG = 'cs-portal-remember';

export function getRemember() {
  try {
    return localStorage.getItem(FLAG) !== 'false';
  } catch {
    return true;
  }
}

export function setRemember(on) {
  try {
    localStorage.setItem(FLAG, on ? 'true' : 'false');
  } catch {
    /* storage unavailable */
  }
}

/** Storage adapter for supabase-js that honours the "keep me signed in" choice. */
export const rememberStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      const keep = getRemember();
      (keep ? localStorage : sessionStorage).setItem(key, value);
      (keep ? sessionStorage : localStorage).removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};
