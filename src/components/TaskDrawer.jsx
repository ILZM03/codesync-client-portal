import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { STATUSES, STATUS, PRIORITIES } from '../lib/constants';

import { fmtDate, fmtDateTime, timeAgo, isOverdue, relDays } from '../lib/dates';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, ProgressBar, StatusDot, Toggle } from './ui';
import { Icon } from './Icon';
import { describeEvent } from '../lib/events';

export default function TaskDrawer({ task, data, isStaff, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.target.closest?.('textarea, input')) onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={task ? task.title : 'Task'} ref={panelRef} tabIndex={-1}>
        {!task ? (
          <div className="drawer-missing">
            <div className="drawer-head">
              <span />
              <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
            </div>
            <p className="muted">This task no longer exists, or it isn’t shared with you.</p>
          </div>
        ) : (
          <TaskBody task={task} data={data} isStaff={isStaff} onClose={onClose} />
        )}
      </aside>
    </div>
  );
}

function TaskBody({ task, data, isStaff, onClose }) {
  const { actions, phases, profiles, profileById, phaseById } = data;
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || '');
  const [reason, setReason] = useState(task.blocked_reason || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState('comments');
  const titleRef = useRef(null);

  useEffect(() => setTitle(task.title), [task.title]);
  useEffect(() => setDesc(task.description || ''), [task.description]);
  useEffect(() => setReason(task.blocked_reason || ''), [task.blocked_reason]);
  const [prog, setProg] = useState(task.progress);
  useEffect(() => setProg(task.progress), [task.progress]);
  const commitProgress = () => prog !== task.progress && actions.updateTask(task.id, { progress: prog });

  useEffect(() => {
    if (isStaff && task.title === 'New task') {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch) => actions.updateTask(task.id, patch);
  const staffProfiles = profiles.filter((p) => p.role === 'staff');
  const assignee = profileById[task.assignee_id];
  const phase = phaseById[task.phase_id];
  const overdue = isOverdue(task);

  async function remove() {
    await actions.deleteTask(task.id);
    onClose();
  }

  return (
    <>
      <div className="drawer-head">
        <div className="drawer-tags">
          {task.is_milestone && <span className="badge badge-milestone"><Icon name="diamond" size={11} /> Milestone</span>}
          {task.internal && <span className="badge badge-internal"><Icon name="lock" size={11} /> Internal</span>}
          {task.is_blocked && <span className="badge badge-blocked"><Icon name="alert" size={11} /> Blocked</span>}
          {overdue && <span className="badge badge-blocked">Overdue</span>}
        </div>
        <div className="row-gap">
          {isStaff &&
            (confirmDelete ? (
              <span className="confirm-inline">
                Delete task?
                <button className="btn btn-sm btn-danger" onClick={remove}>Delete</button>
                <button className="btn btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>
            ) : (
              <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Delete task" title="Delete task">
                <Icon name="trash" />
              </button>
            ))}
          <button className="icon-btn" onClick={onClose} aria-label="Close task"><Icon name="x" /></button>
        </div>
      </div>

      <div className="drawer-scroll">
        {isStaff ? (
          <textarea
            ref={titleRef}
            className="drawer-title-input"
            value={title}
            rows={1}
            aria-label="Task title"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && update({ title: title.trim() })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <h2 className="drawer-title">{task.title}</h2>
        )}

        <dl className="props">
          <dt>Status</dt>
          <dd>
            {isStaff ? (
              <div className="select-wrap with-dot">
                <StatusDot status={task.status} />
                <select value={task.status} onChange={(e) => update({ status: e.target.value })} aria-label="Status">
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            ) : (
              <span className="prop-value"><StatusDot status={task.status} /> {STATUS[task.status].label}</span>
            )}
          </dd>

          <dt>Phase</dt>
          <dd>
            {isStaff ? (
              <select value={task.phase_id || ''} onChange={(e) => update({ phase_id: e.target.value || null })} aria-label="Phase">
                <option value="">No phase</option>
                {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <span className="prop-value">{phase?.name || '—'}</span>
            )}
          </dd>

          <dt>Owner</dt>
          <dd>
            {isStaff ? (
              <div className="select-wrap with-avatar">
                <Avatar profile={assignee} size={20} />
                <select value={task.assignee_id || ''} onChange={(e) => update({ assignee_id: e.target.value || null })} aria-label="Owner">
                  <option value="">Unassigned</option>
                  {staffProfiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
            ) : (
              <span className="prop-value"><Avatar profile={assignee} size={20} /> {assignee?.full_name || 'Unassigned'}</span>
            )}
          </dd>

          <dt>Dates</dt>
          <dd>
            {isStaff ? (
              <div className="date-pair">
                <input type="date" value={task.start_date || ''} max={task.due_date || undefined} onChange={(e) => update({ start_date: e.target.value || null })} aria-label="Start date" />
                <span className="muted">→</span>
                <input type="date" value={task.due_date || ''} min={task.start_date || undefined} onChange={(e) => update({ due_date: e.target.value || null })} aria-label="Due date" />
              </div>
            ) : (
              <span className="prop-value">
                {task.start_date ? fmtDate(task.start_date) : '—'} → {task.due_date ? fmtDate(task.due_date, true) : '—'}
              </span>
            )}
            {task.due_date && task.status !== 'done' && (
              <div className={`small ${overdue ? 'text-danger' : 'muted'}`}>Due {relDays(task.due_date)}</div>
            )}
          </dd>

          <dt>Progress</dt>
          <dd>
            {isStaff && task.status !== 'done' ? (
              <div className="progress-edit">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={prog}
                  aria-label="Progress"
                  style={{ '--fill': `${prog}%` }}
                  onChange={(e) => setProg(Number(e.target.value))}
                  onPointerUp={commitProgress}
                  onKeyUp={commitProgress}
                  onBlur={commitProgress}
                />
                <span className="mono">{prog}%</span>
              </div>
            ) : (
              <div className="progress-edit">
                <ProgressBar value={task.status === 'done' ? 100 : task.progress} label="Task progress" />
                <span className="mono">{task.status === 'done' ? 100 : task.progress}%</span>
              </div>
            )}
          </dd>

          {isStaff && (
            <>
              <dt>Priority</dt>
              <dd>
                <div className="segmented" role="radiogroup" aria-label="Priority">
                  {PRIORITIES.map((p) => (
                    <button key={p.id} role="radio" aria-checked={task.priority === p.id} className={task.priority === p.id ? 'is-on' : ''} onClick={() => update({ priority: p.id })}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </dd>
            </>
          )}
        </dl>

        {isStaff && (
          <div className="flag-row">
            <Toggle id="tg-ms" checked={task.is_milestone} onChange={(v) => update({ is_milestone: v })} label="Milestone" />
            <Toggle id="tg-bl" checked={task.is_blocked} onChange={(v) => update({ is_blocked: v, blocked_reason: v ? reason || null : null })} label="Blocked" />
            <Toggle id="tg-in" checked={task.internal} onChange={(v) => update({ internal: v })} label="Internal (hidden from client)" />
          </div>
        )}

        {task.is_blocked && (
          <div className="blocked-box">
            <Icon name="alert" size={15} />
            {isStaff ? (
              <input
                value={reason}
                placeholder="What is this waiting on?"
                aria-label="Blocked reason"
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => reason !== (task.blocked_reason || '') && update({ blocked_reason: reason || null })}
              />
            ) : (
              <span>{task.blocked_reason || 'Blocked'}</span>
            )}
          </div>
        )}

        <div className="section-label">Description</div>
        {isStaff ? (
          <textarea
            className="desc-input"
            value={desc}
            placeholder="Add details, acceptance criteria or links…"
            rows={4}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => desc !== (task.description || '') && update({ description: desc })}
          />
        ) : (
          <p className="desc">{task.description || <span className="muted">No description.</span>}</p>
        )}

        <div className="drawer-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'comments'} className={tab === 'comments' ? 'is-on' : ''} onClick={() => setTab('comments')}>
            <Icon name="message" size={14} /> Comments
          </button>
          <button role="tab" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'is-on' : ''} onClick={() => setTab('activity')}>
            <Icon name="activity" size={14} /> Activity
          </button>
        </div>
        {tab === 'comments' ? <Comments taskId={task.id} /> : <Activity task={task} data={data} />}
      </div>
    </>
  );
}

function Comments({ taskId }) {
  const { profile, isStaff } = useAuth();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.listComments(taskId).then((c) => alive && setList(c)).catch((e) => toast.error(e.message));
    return () => {
      alive = false;
    };
  }, [taskId, toast]);

  async function send(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const c = await api.addComment(taskId, body.trim());
      setList((l) => [...(l || []), c]);
      setBody('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await api.deleteComment(id);
      setList((l) => l.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="comments">
      {list === null && <div className="muted small">Loading comments…</div>}
      {list?.length === 0 && <div className="muted small">No comments yet. Questions and feedback go here.</div>}
      {list?.map((c) => (
        <div key={c.id} className="comment">
          <Avatar profile={c.author} size={26} />
          <div className="comment-body">
            <div className="comment-meta">
              <strong>{c.author?.full_name}</strong>
              {c.author?.role === 'client' && <span className="badge badge-client tiny">Client</span>}
              <span className="muted small" title={fmtDateTime(c.created_at)}>{timeAgo(c.created_at)}</span>
              {(c.author_id === profile?.id || isStaff) && (
                <button className="link-btn small" onClick={() => remove(c.id)}>Delete</button>
              )}
            </div>
            <div className="comment-text">{c.body}</div>
          </div>
        </div>
      ))}
      <form className="comment-form" onSubmit={send}>
        <Avatar profile={profile} size={26} />
        <div className="comment-input">
          <textarea
            value={body}
            rows={2}
            placeholder={isStaff ? 'Write an update…' : 'Ask a question or leave feedback…'}
            aria-label="Write a comment"
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e);
            }}
          />
          <div className="row-between">
            <span className="muted tiny">Ctrl + Enter to send</span>
            <button className="btn btn-sm btn-primary" disabled={busy || !body.trim()}>Comment</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Activity({ task, data }) {
  const events = data.events.filter((e) => e.task_id === task.id);
  if (!events.length) return <div className="muted small">No activity yet.</div>;
  return (
    <ol className="activity">
      {events.map((e) => (
        <li key={e.id}>
          <Avatar profile={data.profileById[e.actor_id]} size={20} />
          <span>
            <strong>{data.profileById[e.actor_id]?.full_name || 'Someone'}</strong> {describeEvent(e, data.profileById)}
          </span>
          <span className="muted small" title={fmtDateTime(e.created_at)}>{timeAgo(e.created_at)}</span>
        </li>
      ))}
    </ol>
  );
}
