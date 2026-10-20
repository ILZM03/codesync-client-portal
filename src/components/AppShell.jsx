import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { displayLogin } from '../lib/config';
import { Avatar, Modal, Field } from './ui';
import { Icon, Wordmark } from './Icon';
import ThemeSwitch from './ThemeSwitch';

export default function AppShell() {
  const { profile, isStaff, signOut } = useAuth();
  const [projects, setProjects] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const menuRef = useRef(null);

  const loadProjects = useCallback(async () => {
    try {
      setProjects(await api.listProjects());
    } catch (e) {
      toast.error(e.message);
      setProjects([]);
    }
  }, [toast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`shell ${navOpen ? 'nav-open' : ''}`}>
      <header className="topbar">
        <button className="icon-btn on-dark" onClick={() => setNavOpen(true)} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        <div className="topbar-brand">
          <Wordmark height={26} tone="light" />
        </div>
        <Avatar profile={profile} size={28} />
      </header>

      <div className="scrim" onClick={() => setNavOpen(false)} />

      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <Wordmark height={34} tone="light" />
          <div className="brand-sub portal-label">Client Portal</div>
        </div>

        <nav className="side-nav">
          <NavLink to="/" end className="side-link">
            <Icon name="folder" /> {isStaff ? 'All projects' : 'My projects'}
          </NavLink>
          {isStaff && (
            <NavLink to="/admin" className="side-link">
              <Icon name="users" /> Clients & people
            </NavLink>
          )}
        </nav>

        <div className="side-section">
          <div className="side-label">Projects</div>
          {projects === null && <div className="side-skeleton" />}
          {projects?.length === 0 && <div className="side-empty">No projects yet</div>}
          {projects?.map((p) => (
            <NavLink key={p.id} to={`/p/${p.id}`} className="side-link side-project">
              <span className="side-dot" style={{ background: p.client?.accent_color || 'var(--text-3)' }} />
              <span className="truncate">{p.name}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-foot" ref={menuRef}>
          {api.demo && (
            <button
              className="demo-reset"
              onClick={() => {
                api.resetDemo();
                window.location.reload();
              }}
              title="Restore the original sample data"
            >
              <span className="badge badge-demo">Demo</span> Reset sample data
            </button>
          )}
          <button className="user-chip" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu">
            <Avatar profile={profile} size={30} />
            <span className="user-chip-text">
              <span className="truncate">{profile?.full_name}</span>
              <span className="brand-sub">{isStaff ? 'CodeSync team' : 'Client'}</span>
            </span>
            <Icon name="chevronUp" size={14} />
          </button>
          {menuOpen && (
            <div className="user-menu" role="menu">
              <div className="user-menu-email">{displayLogin(profile?.email)}</div>
              <div className="user-menu-theme">
                <span>Theme</span>
                <ThemeSwitch onDark />
              </div>
              <button role="menuitem" onClick={() => { setPwOpen(true); setMenuOpen(false); }}>
                <Icon name="key" size={15} /> Change password
              </button>
              <button role="menuitem" onClick={handleSignOut}>
                <Icon name="logout" size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <Outlet context={{ projects, reloadProjects: loadProjects }} />
      </main>

      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
    </div>
  );
}

function ChangePassword({ onClose }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toast = useToast();

  async function save(e) {
    e.preventDefault();
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('The passwords don’t match.');
    setBusy(true);
    try {
      await api.changePassword(pw);
      toast.success('Password updated');
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Change password" onClose={onClose}>
      <form onSubmit={save} className="stack">
        {err && <div className="form-error" role="alert"><Icon name="alert" size={15} /> {err}</div>}
        <Field label="New password" htmlFor="pw1">
          <input id="pw1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label="Confirm new password" htmlFor="pw2">
          <input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </Field>
        <div className="row-end">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </div>
      </form>
    </Modal>
  );
}
