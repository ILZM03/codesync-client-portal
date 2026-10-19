import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { meetingWindows, buildReport } from '../lib/report';
import { projectStats, dueSoon } from '../lib/metrics';
import { fmtDate, toISO, today } from '../lib/dates';
import { Avatar, ProgressBar } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Meetings() {
  const { project, meetings, events, tasks, profileById, phaseById, actions, openTask, isStaff } = useOutletContext();
  const windows = useMemo(() => meetingWindows(meetings, project), [meetings, project]);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('m') || 'next';
  const win = windows.find((w) => w.id === selectedId) || windows[0];
  const report = useMemo(() => buildReport(win, events, tasks), [win, events, tasks]);
  const stats = projectStats(tasks);

  const select = (id) => {
    const next = new URLSearchParams(params);
    if (id === 'next') next.delete('m');
    else next.set('m', id);
    setParams(next);
  };

  async function logMeeting() {
    const row = await actions.createMeeting({ meeting_date: toISO(today()), title: 'Progress review' });
    if (row) select(row.id);
  }

  return (
    <div className="page page-wide meetings">
      <aside className="meeting-list card" aria-label="Meetings">
        <div className="card-head">
          <h2>Reviews</h2>
          {isStaff && (
            <button className="btn btn-sm" onClick={logMeeting} title="Log today’s meeting">
              <Icon name="plus" size={14} /> Log
            </button>
          )}
        </div>
        <ul>
          {windows.map((w) => (
            <li key={w.id}>
              <button className={`meeting-item ${w.id === win.id ? 'is-on' : ''}`} onClick={() => select(w.id)}>
                <span className={`meeting-dot ${w.upcoming ? 'is-next' : ''}`} />
                <span className="meeting-item-text">
                  <strong className="truncate">{w.title}</strong>
                  <span className="small muted">{w.upcoming ? 'Changes so far' : fmtDate(w.to, true)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="small muted meeting-hint">Reviews run every two weeks. Each report shows what changed since the previous review.</p>
      </aside>

      <section className="meeting-report card">
        <header className="report-head">
          <div>
            <div className="eyebrow">{win.upcoming ? 'Live report · updates as the team works' : 'Meeting report'}</div>
            {win.meeting && isStaff ? (
              <MeetingTitle meeting={win.meeting} onSave={(title) => actions.updateMeeting(win.meeting.id, { title })} />
            ) : (
              <h2 className="report-title">{win.title}</h2>
            )}
            <div className="muted small">
              {win.from ? `${fmtDate(win.from, true)} → ${win.upcoming ? 'today' : fmtDate(win.to, true)}` : `Up to ${fmtDate(win.to, true)}`}
            </div>
          </div>
          <div className="row-gap no-print">
            <button className="btn btn-sm" onClick={() => window.print()}>
              <Icon name="printer" size={14} /> Print / PDF
            </button>
            {isStaff && win.meeting && (
              <DeleteMeeting onDelete={async () => { await actions.deleteMeeting(win.meeting.id); select('next'); }} />
            )}
          </div>
        </header>

        {win.upcoming && (
          <div className="report-progress">
            <div className="row-between small"><span>Overall progress</span><span className="mono">{stats.progress}%</span></div>
            <ProgressBar value={stats.progress} height={8} label="Overall progress" />
          </div>
        )}

        <div className="report-summary">
          <Summary n={report.completed.length} label="Completed" tone="done" />
          <Summary n={report.started.length} label="Started / in review" tone="progress" />
          <Summary n={report.slipped.length} label="Dates moved later" tone="warn" />
          <Summary n={report.blocked.filter((e) => e.kind === 'blocked').length} label="Newly blocked" tone="danger" />
        </div>

        {report.total === 0 && <p className="muted">No changes were recorded in this period.</p>}

        <ReportSection title="Completed" icon="checkCircle" tone="done" items={report.completed} render={(e) => <>{e.title}</>} meta={(e) => fmtDate(e.created_at)} profileById={profileById} openTask={openTask} />
        <ReportSection title="Started or moved to review" icon="refresh" tone="progress" items={report.started} render={(e) => <>{e.title} <span className="muted">→ {e.to_value === 'review' ? 'In review' : 'In progress'}</span></>} meta={(e) => fmtDate(e.created_at)} profileById={profileById} openTask={openTask} />
        <ReportSection title="Dates moved later" icon="clock" tone="warn" items={report.slipped} render={(e) => <>{e.title} <span className="muted">· {fmtDate(e.from_value)} → {fmtDate(e.to_value)}</span></>} profileById={profileById} openTask={openTask} />
        <ReportSection title="Dates brought forward" icon="clock" tone="done" items={report.pulledIn} render={(e) => <>{e.title} <span className="muted">· {fmtDate(e.from_value)} → {fmtDate(e.to_value)}</span></>} profileById={profileById} openTask={openTask} />
        <ReportSection title="Blockers" icon="alert" tone="danger" items={report.blocked} render={(e) => <>{e.title} <span className="muted">· {e.kind === 'blocked' ? e.to_value || 'Blocked' : 'Unblocked'}</span></>} profileById={profileById} openTask={openTask} />
        <ReportSection title="New tasks added" icon="plus" tone="neutral" items={report.added} render={(e) => <>{e.title}</>} meta={(e) => fmtDate(e.created_at)} profileById={profileById} openTask={openTask} />

        {win.upcoming && <LookingAhead tasks={tasks} phaseById={phaseById} profileById={profileById} openTask={openTask} />}

        {win.meeting ? (
          <MeetingNotes key={win.meeting.id} meeting={win.meeting} isStaff={isStaff} onSave={(patch) => actions.updateMeeting(win.meeting.id, patch)} />
        ) : (
          isStaff && (
            <div className="callout no-print">
              <Icon name="calendar" size={16} />
              <span>When the review is done, log it to save this report with your notes and decisions.</span>
              <button className="btn btn-sm btn-primary" onClick={logMeeting}>Log today’s review</button>
            </div>
          )
        )}
      </section>
    </div>
  );
}

function Summary({ n, label, tone }) {
  return (
    <div className={`since since-${tone}`}>
      <div className="since-n">{n}</div>
      <div className="since-l small">{label}</div>
    </div>
  );
}

function ReportSection({ title, icon, tone, items, render, meta, profileById, openTask }) {
  if (!items.length) return null;
  return (
    <div className="report-section">
      <h3 className={`report-section-title tone-${tone}`}>
        <Icon name={icon} size={15} /> {title} <span className="count">{items.length}</span>
      </h3>
      <ul>
        {items.map((e) => (
          <li key={e.id}>
            <button className="report-item" onClick={() => e.task && openTask(e.task.id)} disabled={!e.task}>
              <span className="report-item-text">{render(e)}</span>
              {meta && <span className="small muted nowrap">{meta(e)}</span>}
              <Avatar profile={profileById[e.actor_id]} size={20} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LookingAhead({ tasks, phaseById, profileById, openTask }) {
  const next = dueSoon(tasks, 14);
  if (!next.length) return null;
  return (
    <div className="report-section">
      <h3 className="report-section-title tone-neutral">
        <Icon name="arrowRight" size={15} /> Due in the next two weeks <span className="count">{next.length}</span>
      </h3>
      <ul>
        {next.map((t) => (
          <li key={t.id}>
            <button className="report-item" onClick={() => openTask(t.id)}>
              <span className="report-item-text">
                {t.is_milestone && <Icon name="diamond" size={11} className="text-accent" />} {t.title}{' '}
                <span className="muted">· {phaseById[t.phase_id]?.name.split('·')[0].trim() || 'No phase'}</span>
              </span>
              <span className="small muted nowrap">{fmtDate(t.due_date)}</span>
              <Avatar profile={profileById[t.assignee_id]} size={20} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MeetingTitle({ meeting, onSave }) {
  const [v, setV] = useState(meeting.title);
  useEffect(() => setV(meeting.title), [meeting.title]);
  return (
    <input
      className="report-title-input"
      value={v}
      aria-label="Meeting title"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== meeting.title && onSave(v.trim())}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function MeetingNotes({ meeting, isStaff, onSave }) {
  const [notes, setNotes] = useState(meeting.notes || '');
  const [decisions, setDecisions] = useState(meeting.decisions || '');
  const [date, setDate] = useState(meeting.meeting_date);
  return (
    <div className="notes-grid">
      {isStaff && (
        <div className="field">
          <label htmlFor="mt-date">Meeting date</label>
          <input id="mt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} onBlur={() => date && date !== meeting.meeting_date && onSave({ meeting_date: date })} />
        </div>
      )}
      <div className="field">
        <label htmlFor="mt-notes">Discussion notes</label>
        {isStaff ? (
          <textarea id="mt-notes" rows={5} value={notes} placeholder="What did we talk about?" onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== meeting.notes && onSave({ notes })} />
        ) : (
          <p className="prewrap">{meeting.notes || <span className="muted">No notes.</span>}</p>
        )}
      </div>
      <div className="field">
        <label htmlFor="mt-dec">Decisions & action items</label>
        {isStaff ? (
          <textarea id="mt-dec" rows={4} value={decisions} placeholder="What was agreed, and who does what?" onChange={(e) => setDecisions(e.target.value)} onBlur={() => decisions !== meeting.decisions && onSave({ decisions })} />
        ) : (
          <p className="prewrap">{meeting.decisions || <span className="muted">No decisions recorded.</span>}</p>
        )}
      </div>
    </div>
  );
}

function DeleteMeeting({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <span className="confirm-inline">
      Delete meeting?
      <button className="btn btn-sm btn-danger" onClick={onDelete}>Delete</button>
      <button className="btn btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
    </span>
  ) : (
    <button className="icon-btn" onClick={() => setConfirm(true)} aria-label="Delete meeting" title="Delete meeting">
      <Icon name="trash" />
    </button>
  );
}
