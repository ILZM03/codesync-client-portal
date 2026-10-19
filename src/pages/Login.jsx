import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Icon, Wordmark } from '../components/Icon';

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (session) return <Navigate to={location.state?.from || '/'} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.signIn(email, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function demoSignIn(acct) {
    await api.signIn(acct.email, 'demo');
    navigate('/', { replace: true });
  }

  return (
    <div className="login">
      <aside className="login-brand">
        <div className="login-brand-top">
          <Wordmark height={44} tone="light" />
        </div>
        <div className="login-pitch">
          <h1>Your project,<br />in plain sight.</h1>
          <p>Follow progress, timelines and decisions for your CodeSync build — updated by the team as work happens.</p>
          <ul className="login-points">
            <li><Icon name="board" size={16} /> Live task board</li>
            <li><Icon name="timeline" size={16} /> Phase timeline</li>
            <li><Icon name="calendar" size={16} /> Bi-weekly review notes</li>
          </ul>
        </div>
        <div className="login-foot">© {new Date().getFullYear()} CodeSync Systems</div>
      </aside>

      <main className="login-main">
        <form className="login-form" onSubmit={submit}>
          <div className="login-mobile-logo">
            <Wordmark height={36} tone="dark" />
          </div>
          <h2>Sign in to your portal</h2>
          <p className="muted">Use the email and password your CodeSync project lead sent you.</p>

          {error && (
            <div className="form-error" role="alert">
              <Icon name="alert" size={15} /> {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" required={!api.demo} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="muted small center">Forgot your password? Ask your CodeSync project lead to reset it.</p>

          {api.demo && (
            <div className="demo-box">
              <div className="demo-box-head">
                <span className="badge badge-demo">Demo mode</span>
                <span className="muted small">Sample data stored in this browser only</span>
              </div>
              <div className="demo-accounts">
                {api.demoAccounts().map((a) => (
                  <button type="button" key={a.id} className="demo-account" onClick={() => demoSignIn(a)}>
                    <span>
                      <strong>{a.full_name}</strong>
                      <span className="muted small"> · {a.title}</span>
                    </span>
                    <span className={`badge ${a.role === 'staff' ? 'badge-staff' : 'badge-client'}`}>{a.role === 'staff' ? 'Team' : 'Client'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
