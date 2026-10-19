import { Link, useOutletContext } from 'react-router-dom';
import { projectStats, phaseStats, dueSoon } from '../lib/metrics';
import { meetingWindows, buildReport } from '../lib/report';
import { fmtDate, fmtRange, relDays, diffDays, today } from '../lib/dates';
import { Avatar, EmptyState, ProgressBar, StatusDot } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Overview() {
  const { project, phases, tasks, meetings, events, profileById, phaseById, openTask } = useOutletContext();
  const s = projectStats(tasks);
  const upcoming = dueSoon(tasks, 14);
  const attention = [...s.blocked, ...s.overdue.filter((t) => !t.is_blocked)];
  const win = meetingWindows(meetings, project)[0];
  const since = buildReport(win, events, tasks);
  const daysLeft = project.end_date ? diffDays(today(), project.end_date) : null;

  return (
    <div className="page page-wide">
      <section className="hero card">
        <div className="hero-main">
          <p className="hero-summary">{project.summary || 'No summary yet.'}</p>
          <div className="hero-meta small muted">
            <span><Icon name="calendar" size={14} /> {fmtRange(project.start_date, project.end_date)}</span>
            {daysLeft !== null && daysLeft >= 0 && <span><Icon name="clock" size={14} /> {daysLeft} days to go</span>}
            <span className={`badge badge-${project.status}`}>{project.status.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="hero-progress">
          <div className="big-number">
            {s.progress}
            <span>%</span>
          </div>
          <div className="small muted">overall progress</div>
          <ProgressBar value={s.progress} height={8} label="Overall progress" />
        </div>
      </section>

      <section className="stat-grid">
        <Stat icon="checkCircle" label="Completed" value={`${s.done}`} sub={`of ${s.total} tasks`} />
        <Stat icon="refresh" label="In progress" value={s.inProgress + s.review} sub={s.review ? `${s.review} awaiting review` : 'being worked on'} />
        <Stat icon="alert" label="Needs attention" value={attention.length} sub={`${s.blocked.length} blocked · ${s.overdue.length} overdue`} tone={attention.length ? 'danger' : ''} />
        <Stat
          icon="diamond"
          label="Next milestone"
          value={s.nextMilestone ? fmtDate(s.nextMilestone.due_date) : '—'}
          sub={s.nextMilestone ? `${s.nextMilestone.title} · ${relDays(s.nextMilestone.due_date)}` : 'None scheduled'}
          onClick={s.nextMilestone ? () => openTask(s.nextMilestone.id) : undefined}
        />
      </section>

      <div className="overview-grid">
        <section className="card">
          <div className="card-head">
            <h2>Phases</h2>
            <Link to="timeline" className="link small">Open timeline <Icon name="arrowRight" size={13} /></Link>
          </div>
          {phases.length === 0 ? (
            <div className="muted small">No phases yet.</div>
          ) : (
            <ul className="phase-list">
              {phases.map((p) => {
                const ps = phaseStats(p, tasks);
                return (
                  <li key={p.id} className={`phase-item phase-${ps.state}`}>
                    <div className="row-between">
                      <span className="phase-name">
                        {p.name}
                        {ps.state === 'current' && <span className="badge badge-current">Current</span>}
                        {ps.state === 'complete' && <span className="badge badge-done">Complete</span>}
                      </span>
                      <span className="mono small">{ps.progress}%</span>
                    </div>
                    <ProgressBar value={ps.progress} color={ps.state === 'complete' ? 'var(--s-done)' : 'var(--accent-ink)'} label={`${p.name} progress`} />
                    <div className="small muted">
                      {fmtRange(p.start_date, p.end_date)} · {ps.done}/{ps.total} tasks
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Since the last meeting</h2>
            <Link to="meetings" className="link small">Full report <Icon name="arrowRight" size={13} /></Link>
          </div>
          <div className="since-grid">
            <SinceStat n={since.completed.length} label="completed" tone="done" />
            <SinceStat n={since.started.length} label="started" tone="progress" />
            <SinceStat n={since.slipped.length} label="dates moved" tone="warn" />
            <SinceStat n={since.added.length} label="new tasks" tone="neutral" />
          </div>
          <div className="small muted">{win.from ? `Since ${fmtDate(win.from, true)}` : 'Since the project started'}</div>
          {since.completed.slice(0, 4).map((e) => (
            <button key={e.id} className="mini-row" onClick={() => e.task && openTask(e.task.id)} disabled={!e.task}>
              <Icon name="check" size={14} className="text-done" />
              <span className="truncate">{e.title}</span>
              <span className="muted small">{fmtDate(e.created_at)}</span>
            </button>
          ))}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Coming up</h2>
            <span className="muted small">Next 14 days</span>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing due soon" />
          ) : (
            upcoming.map((t) => <TaskRow key={t.id} task={t} profileById={profileById} phaseById={phaseById} onOpen={openTask} />)
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Needs attention</h2>
            <span className="muted small">{attention.length} {attention.length === 1 ? 'item' : 'items'}</span>
          </div>
          {attention.length === 0 ? (
            <EmptyState icon="checkCircle" title="All clear">Nothing blocked or overdue.</EmptyState>
          ) : (
            attention.map((t) => (
              <TaskRow key={t.id} task={t} profileById={profileById} phaseById={phaseById} onOpen={openTask} note={t.is_blocked ? t.blocked_reason || 'Blocked' : `Overdue · was due ${fmtDate(t.due_date)}`} danger />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`stat card ${tone ? `stat-${tone}` : ''} ${onClick ? 'is-clickable' : ''}`} onClick={onClick}>
      <div className="stat-label"><Icon name={icon} size={15} /> {label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub small muted truncate">{sub}</div>
    </Tag>
  );
}

function SinceStat({ n, label, tone }) {
  return (
    <div className={`since since-${tone}`}>
      <div className="since-n">{n}</div>
      <div className="since-l small">{label}</div>
    </div>
  );
}

export function TaskRow({ task, profileById, phaseById, onOpen, note, danger }) {
  return (
    <button className="task-row" onClick={() => onOpen(task.id)}>
      <StatusDot status={task.status} />
      <span className="task-row-main">
        <span className="truncate">{task.is_milestone && <Icon name="diamond" size={11} className="text-accent" />} {task.title}</span>
        <span className={`small truncate ${danger ? 'text-danger' : 'muted'}`}>{note || phaseById[task.phase_id]?.name || 'No phase'}</span>
      </span>
      <span className="small muted nowrap">{task.due_date ? fmtDate(task.due_date) : ''}</span>
      <Avatar profile={profileById[task.assignee_id]} size={22} />
    </button>
  );
}
