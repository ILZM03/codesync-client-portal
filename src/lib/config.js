const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let params;
try {
  params = new URLSearchParams(window.location.search);
} catch {
  params = new URLSearchParams();
}

// Demo mode runs entirely on local sample data (no Supabase needed).
// On when VITE_DEMO=true, when the URL has ?demo, or when Supabase isn't configured.
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true' || params.has('demo') || !url || !key;

export const SUPABASE = { url, key };

// Username sign-in: a username like "jane" is stored in Supabase Auth as "jane@codesync.internal".
export const LOGIN_DOMAIN = 'codesync.internal';
export const toLoginEmail = (value) => {
  const v = String(value || '').trim();
  return v.includes('@') ? v : `${v.toLowerCase()}@${LOGIN_DOMAIN}`;
};
export const displayLogin = (email) => (email && email.endsWith(`@${LOGIN_DOMAIN}`) ? email.split('@')[0] : email || '');
