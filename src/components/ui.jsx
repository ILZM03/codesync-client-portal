import { useEffect, useRef } from 'react';
import { STATUS } from '../lib/constants';
import { Icon } from './Icon';

export function Avatar({ profile, size = 24, title }) {
  if (!profile)
    return (
      <span className="avatar avatar-empty" style={{ width: size, height: size }} title="Unassigned" aria-label="Unassigned">
        <Icon name="users" size={size * 0.55} />
      </span>
    );
  // The CodeSync team's shared "Admin" account (or anyone with avatar_color "brand") shows the company mark.
  if (profile.avatar_color === 'brand' || (profile.role === 'staff' && profile.full_name?.trim().toLowerCase() === 'admin'))
    return (
      <span className="avatar avatar-brand" style={{ width: size, height: size }} title={title ?? `${profile.full_name} · CodeSync Systems`} aria-label={profile.full_name}>
        <img src={`${import.meta.env.BASE_URL}brand/codesync-mark-light.png`} alt="" />
      </span>
    );
  const initials = (profile.full_name || profile.email || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: profile.avatar_color, fontSize: Math.max(9, size * 0.4) }}
      title={title ?? profile.full_name}
      aria-label={profile.full_name}
    >
      {initials}
    </span>
  );
}

export function StatusDot({ status, size = 8 }) {
  return <span className="status-dot" style={{ width: size, height: size, background: STATUS[status]?.color }} aria-hidden="true" />;
}

export function StatusPill({ status }) {
  return (
    <span className="pill">
      <StatusDot status={status} />
      {STATUS[status]?.label}
    </span>
  );
}

export function ProgressBar({ value, color = 'var(--accent-ink)', height = 6, label }) {
  return (
    <div className="progress" style={{ height }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = 'sparkle', title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="empty-title">{title}</div>
      {children && <div className="empty-body">{children}</div>}
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, width = 460 }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width }} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled, id }) {
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}
