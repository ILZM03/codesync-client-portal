import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { STATUS } from '../lib/constants';
import { addDays, diffDays, fmtDate, fmtRange, parseDate, startOfWeek, toISO, today } from '../lib/dates';
import { phaseBounds, phaseStats } from '../lib/metrics';
import { Avatar } from '../components/ui';
import { Icon } from '../components/Icon';

const ZOOMS = {
  week: { px: 34, label: 'Week' },
  month: { px: 12, label: 'Month' },
  quarter: { px: 4.5, label: 'Quarter' },
};
const LEFT = 300;
const ROW = 38;

export default function Timeline() {
  const { project, phases, tasks, profileById, openTask, isStaff } = useOutletContext();
  const [zoom, setZoom] = useState('month');
  const [collapsed, setCollapsed] = useState({});
  const scrollRef = useRef(null);
  const px = ZOOMS[zoom].px;

  const groups = useMemo(() => {
    const byPhase = phases.map((p) => ({
      phase: p,
      tasks: tasks.filter((t) => t.phase_id === p.id).sort((a, b) => (a.start_date || a.due_date || '9').localeCompare(b.start_date || b.due_date || '9')),
    }));
    const loose = tasks.filter((t) => !t.phase_id);
    if (loose.length) byPhase.push({ phase: { id: 'none', name: 'No phase' }, tasks: loose });
    return byPhase;
  }, [phases, tasks]);

  const range = useMemo(() => {
    const dates = [project.start_date, project.end_date, ...phases.flatMap((p) => [p.start_date, p.end_date]), ...tasks.flatMap((t) => [t.start_date, t.due_date]), toISO(today())]
      .filter(Boolean)
      .map(parseDate);
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const start = startOfWeek(addDays(min, -7));
    const end = addDays(max, 21);
    return { start, end, days: diffDays(start, end) + 1 };
  }, [project, phases, tasks]);

  const x = (d) => diffDays(range.start, d) * px;
  const width = range.days * px;
  const todayX = x(today());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - 220);
  }, [zoom, todayX]);

  // header ticks
  const months = [];
  for (let d = new Date(range.start.getFullYear(), range.start.getMonth(), 1); d <= range.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const left = Math.max(0, x(d));
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({
      key: toISO(d),
      left,
      width: Math.min(width, x(next)) - left,
      label: d.toLocaleDateString('en-GB', { month: zoom === 'quarter' ? 'short' : 'long', ...(d.getMonth() === 0 || zoom !== 'week' ? { year: 'numeric' } : {}) }),
    });
  }
  const minor = [];
  if (zoom === 'week') {
    for (let i = 0; i < range.days; i++) {
      const d = addDays(range.start, i);
      minor.push({ key: i, left: i * px, label: d.getDate(), weekend: d.getDay() === 0 || d.getDay() === 6, isToday: toISO(d) === toISO(today()) });
    }
  } else if (zoom === 'month') {
    for (let d = new Date(range.start); d <= range.end; d = addDays(d, 7)) minor.push({ key: toISO(d), left: x(d), label: d.getDate() });
  }

  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const unscheduled = tasks.filter((t) => !t.start_date && !t.due_date).length;

  return (
    <div className="page page-wide timeline-page">
      <div className="toolbar">
        <div className="segmented" role="radiogroup" aria-label="Zoom">
          {Object.entries(ZOOMS).map(([k, z]) => (
            <button key={k} role="radio" aria-checked={zoom === k} className={zoom === k ? 'is-on' : ''} onClick={() => setZoom(k)}>
              {z.label}
            </button>
          ))}
        </div>
        <button className="btn btn-sm" onClick={() => scrollRef.current && (scrollRef.current.scrollLeft = Math.max(0, todayX - 220))}>
          Today
        </button>
        <div className="legend small muted">
          {['backlog', 'in_progress', 'review', 'done'].map((s) => (
            <span key={s}><span className="legend-swatch" style={{ background: STATUS[s].color }} /> {STATUS[s].label}</span>
          ))}
          <span><Icon name="diamond" size={11} className="text-accent" /> Milestone</span>
        </div>
        {unscheduled > 0 && <span className="muted small">{unscheduled} task{unscheduled > 1 ? 's' : ''} without dates</span>}
      </div>

      <div className="gantt card" ref={scrollRef}>
        <div className="gantt-inner" style={{ width: LEFT + width }}>
          {/* header */}
          <div className="gantt-header">
            <div className="gantt-left gantt-corner" style={{ width: LEFT }}>
              <span>{isStaff ? 'Phase / task' : 'Phase / task'}</span>
            </div>
            <div className="gantt-scale" style={{ width }}>
              <div className="gantt-months">
                {months.map((m) => (
                  <div key={m.key} className="gantt-month" style={{ left: m.left, width: m.width }}>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
              {minor.length > 0 && (
                <div className="gantt-minor">
                  {minor.map((m) => (
                    <div key={m.key} className={`gantt-tick ${m.weekend ? 'is-weekend' : ''} ${m.isToday ? 'is-today' : ''}`} style={{ left: m.left, width: zoom === 'week' ? px : 7 * px }}>
                      {m.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* body */}
          <div className="gantt-body">
            <div className="gantt-grid" style={{ left: LEFT, width }} aria-hidden="true">
              {zoom === 'week' && minor.filter((m) => m.weekend).map((m) => <div key={m.key} className="gantt-weekend" style={{ left: m.left, width: px }} />)}
              {months.map((m) => <div key={m.key} className="gantt-line" style={{ left: m.left }} />)}
              {todayX >= 0 && todayX <= width && (
                <div className="gantt-today" style={{ left: todayX + (zoom === 'week' ? px / 2 : 0) }}>
                  <span>Today</span>
                </div>
              )}
            </div>

            {groups.map(({ phase, tasks: pts }) => {
              const isOpen = !collapsed[phase.id];
              const bounds = phase.id === 'none' ? { start: null, end: null } : phaseBounds(phase, tasks);
              const stats = phase.id === 'none' ? null : phaseStats(phase, tasks);
              return (
                <div key={phase.id} className="gantt-group">
                  <div className="gantt-row gantt-phase-row" style={{ height: ROW + 4 }}>
                    <button className="gantt-left gantt-phase-name" style={{ width: LEFT }} onClick={() => toggle(phase.id)} aria-expanded={isOpen}>
                      <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={14} />
                      <span className="truncate">{phase.name}</span>
                      {stats && <span className="mono small muted">{stats.progress}%</span>}
                    </button>
                    <div className="gantt-track" style={{ width }}>
                      {bounds.start && bounds.end && (
                        <div
                          className="gantt-phase-bar"
                          style={{ left: x(bounds.start), width: Math.max(px, (diffDays(bounds.start, bounds.end) + 1) * px) }}
                          title={`${phase.name} · ${fmtRange(toISO(bounds.start), toISO(bounds.end))}`}
                        >
                          <div className="gantt-phase-fill" style={{ width: `${stats?.progress || 0}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {isOpen &&
                    pts.map((t) => {
                      const s = parseDate(t.start_date || t.due_date);
                      const e = parseDate(t.due_date || t.start_date);
                      const barW = s && e ? Math.max(px, (diffDays(s, e) + 1) * px) : 0;
                      const label = `${t.title} · ${STATUS[t.status].label}${t.due_date ? ` · due ${fmtDate(t.due_date)}` : ''}`;
                      return (
                        <div key={t.id} className="gantt-row" style={{ height: ROW }}>
                          <button className="gantt-left gantt-task-name" style={{ width: LEFT }} onClick={() => openTask(t.id)}>
                            <span className="status-dot" style={{ background: STATUS[t.status].color }} />
                            <span className={`truncate ${t.status === 'done' ? 'muted' : ''}`}>{t.title}</span>
                            {t.is_blocked && <Icon name="alert" size={13} className="text-danger" />}
                            {t.internal && <Icon name="lock" size={12} className="muted" />}
                            <Avatar profile={profileById[t.assignee_id]} size={20} />
                          </button>
                          <div className="gantt-track" style={{ width }}>
                            {!s ? null : t.is_milestone ? (
                              <button className="gantt-milestone" style={{ left: x(e) + (zoom === 'week' ? px / 2 : 0) }} onClick={() => openTask(t.id)} title={label} aria-label={label}>
                                <Icon name="diamond" size={14} />
                                <span className="gantt-ms-label">{t.title}</span>
                              </button>
                            ) : (
                              <button
                                className={`gantt-bar status-${t.status} ${t.is_blocked ? 'is-blocked' : ''}`}
                                style={{ left: x(s), width: barW, '--bar': STATUS[t.status].color }}
                                onClick={() => openTask(t.id)}
                                title={label}
                                aria-label={label}
                              >
                                <span className="gantt-bar-fill" style={{ width: `${t.status === 'done' ? 100 : t.progress}%` }} />
                                {barW > 90 && <span className="gantt-bar-label truncate">{t.title}</span>}
                              </button>
                            )}
                            {s && !t.is_milestone && barW <= 90 && (
                              <span className="gantt-outside-label truncate" style={{ left: x(s) + barW + 6 }}>{t.title}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
