import { useState } from 'react';
import { getThemePref, setThemePref } from '../lib/theme';
import { Icon } from './Icon';

const OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'Match system', icon: 'monitor' },
];

export default function ThemeSwitch({ onDark = false }) {
  const [pref, setPref] = useState(getThemePref);
  return (
    <div className={`theme-switch ${onDark ? 'on-dark' : ''}`} role="radiogroup" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={pref === o.id}
          aria-label={o.label}
          title={o.label}
          className={pref === o.id ? 'is-on' : ''}
          onClick={() => {
            setThemePref(o.id);
            setPref(o.id);
          }}
        >
          <Icon name={o.icon} size={14} />
        </button>
      ))}
    </div>
  );
}
