import { Link, Navigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectStats } from '../lib/metrics';
import { fmtDate, fmtRange } from '../lib/dates';
import { EmptyState, ProgressBar, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Projects() {
  const { projects } = useOutletContext();
  const { profile, isStaff } = useAuth();

  if (projects === null) return <Spinner />;
  // Clients with a single project go straight to it.
  if (!isStaff && projects.length === 1) return <Navigate to={`/p/${projects[0].id}`} replace />;

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">{isStaff ? 'CodeSync workspace' : 'Welcome back'}</div>
          <h1>{isStaff ? 'All projects' : `Hi ${firstName}`}</h1>
          <p className="muted">{isStaff ? 'Every client build in one place.' : 'Here’s where your projects stand.'}</p>
        </div>
        {isStaff && (
          <Link to="/admin" className="btn">
            <Icon name="plus" size={15} /> New client or project
          </Link>
        )}
      </header>

      {projects.length === 0 ? (
        <EmptyState icon="folder" title="No projects yet">
          {isStaff ? 'Create a client and a project from Clients & people.' : 'Your CodeSync project lead will add you to your project shortly.'}
        </EmptyState>
      ) : (
        <div className="project-grid">
          {projects.map((p) => {
            const s = projectStats(p.tasks || []);
            return (
              <Link key={p.id} to={`/p/${p.id}`} className="project-card" style={{ '--accent': p.client?.accent_color || 'var(--brand)' }}>
                <div className="project-card-top">
                  <span className="client-chip">
                    <span className="side-dot" style={{ background: p.client?.accent_color || 'var(--text-3)' }} />
                    {p.client?.name || 'Team only'}
                  </span>
                  <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>
                </div>
                <h3>{p.name}</h3>
                <p className="muted clamp-2">{p.summary}</p>
                <div className="project-card-progress">
                  <div className="row-between small">
                    <span>{s.progress}% complete</span>
                    <span className="muted">{s.done}/{s.total} tasks</span>
                  </div>
                  <ProgressBar value={s.progress} label={`${p.name} progress`} />
                </div>
                <div className="project-card-meta small muted">
                  <span><Icon name="calendar" size={13} /> {fmtRange(p.start_date, p.end_date)}</span>
                  {s.nextMilestone && (
                    <span><Icon name="diamond" size={12} /> {s.nextMilestone.title} · {fmtDate(s.nextMilestone.due_date)}</span>
                  )}
                  {s.blocked.length > 0 && <span className="text-danger"><Icon name="alert" size={13} /> {s.blocked.length} blocked</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
