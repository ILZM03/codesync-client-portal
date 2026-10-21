import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { STATUSES, STATUS, PRIORITIES } from '../lib/constants';

import { fmtDate, fmtDateTime, timeAgo, isOverdue, relDays } from '../lib/dates';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, ProgressBar, StatusDot, Toggle } from './ui';
import { Icon } from './Icon';
import { describeEvent } from '../lib/events';
import { CLIENT_TASK_FIELDS, canEditTask } from '../lib/permissions';

const STAFF_TASK_FIELDS = [...CLIENT_TASK_FIELDS, 'phase_id', 'assignee_id', 'is_milestone', 'internal'];
const norm = (v) => (v === '' || v === undefined ? null : v);

export default function TaskDrawer({ task, data, isStaff, onClose }) {
  const panelRef = useRef(null);
  // TaskBody sets this while it has unsaved changes; it returns true when it took over the close.
  const closeGuard = useRef(null);
  const requestClose = () => closeGuard.current?.() || onClose();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.target.closest?.('textarea, input')) closeGuard.current?.() || onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
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
          <TaskBody task={task} data={data} isStaff={isStaff} onClose={onClose} closeGuard={closeGuard} />
        )}
      </aside>
    </div>
  );
}

function TaskBody({ task, data, isStaff, onClose, closeGuard }) {
  const { actions, phases, owners, profileById, phaseById } = data;
  const { profile } = useAuth();
  const toast = useToast();
  const canEdit = canEditTask(task, profile);
  // Edits stay local until Save; fields the user hasn't touched keep following live updates.
  const [changes, setChanges] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState('comments');
  const titleRef = useRef(null);

  const d = { ...task, ...changes };
  const set = (patch) => setChanges((c) => ({ ...c, ...patch }));

  const allowed = isStaff ? STAFF_TASK_FIELDS : CLIENT_TASK_FIELDS;
  const pending = {};
  for (const [k, v] of Object.entries(changes)) {
    const next = k === 'title' ? v.trim() : v;
    if (allowed.includes(k) && norm(next) !== norm(task[k])) pending[k] = k === 'description' ? next : norm(next);
  }
  if (!d.is_blocked) delete pending.blocked_reason;
  const dirty = canEdit && Object.keys(pending).length > 0;
  const error = !canEdit
    ? null
    : !d.title.trim()
      ? 'Title can’t be empty.'
      : d.start_date && d.due_date && d.start_date > d.due_date
        ? 'Start date is after the due date.'
        : null;

  async function save() {
    if (!dirty || error || saving) return false;
    const sent = changes;
    setSaving(true);
    const row = await actions.updateTask(task.id, pending);
    setSaving(false);
    if (!row) return false; // the error toast is already shown; keep the draft so it can be retried
    setChanges((c) => Object.fromEntries(Object.entries(c).filter(([k, v]) => v !== sent[k])));
    toast.success('Changes saved');
    return true;
  }

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    closeGuard.current = dirty ? () => (setConfirmClose(true), true) : null;
    return () => {
      closeGuard.current = null;
    };
  }, [dirty, closeGuard]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (isStaff && task.title === 'New task') {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownerOptions = [...owners.filter((p) => p.role === 'staff'), ...owners.filter((p) => p.role !== 'staff')];
  const assignee = profileById[d.assignee_id];
  const phase = phaseById[task.phase_id];
  const overdue = isOverdue(task);

  async function remove() {
    await actions.deleteTask(task.id);
    onClose();
  }

  async function saveAndClose() {
    if (await save()) onClose();
  }
  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());

  return (
    <>
      <div className="drawer-head">
        <div className="drawer-tags">
          {task.is_milestone && <span className="badge badge-milestone"><Icon name="diamond" size={11} /> Milestone</span>}
          {task.internal && <span className="badge badge-internal"><Icon name="lock" size={11} /> Internal</span>}
          {task.is_blocked && <span className="badge badge-blocked"><Icon name="alert" size={11} /> Blocked</span>}
          {overdue && <span className="badge badge-blocked">Overdue</span>}
          {!isStaff && canEdit && <span className="badge badge-client" title="You can update this task">Assigned to you</span>}
        </div>
        <div className="row-gap">
          {confirmClose ? (
            <span className="confirm-inline">
              Unsaved changes
              <button className="btn btn-sm btn-primary" onClick={saveAndClose} disabled={!!error || saving}>Save & close</button>
              <button className="btn btn-sm" onClick={onClose}>Discard</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirmClose(false)}>Keep editing</button>
            </span>
          ) : (
            <>
              {dirty && (
                <button className="btn btn-sm btn-ghost" onClick={() => setChanges({})} disabled={saving}>Discard</button>
              )}
              {canEdit && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={save}
                  disabled={!dirty || !!error || saving}
                  title={error || (dirty ? 'Save changes (Ctrl + S)' : 'No unsaved changes')}
                >
                  <Icon name="check" size={14} /> {saving ? 'Saving…' : 'Save'}
                </button>
              )}
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
              <button className="icon-btn" onClick={requestClose} aria-label="Close task"><Icon name="x" /></button>
            </>
          )}
        </div>
      </div>

      <div className="drawer-scroll">
        {canEdit ? (
          <textarea
            ref={titleRef}
            className="drawer-title-input"
            value={d.title}
            rows={1}
            aria-label="Task title"
            onChange={(e) => set({ title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          />
        ) : (
          <h2 className="drawer-title">{task.title}</h2>
        )}
        {error && <div className="small text-danger">{error}</div>}

        <dl className="props">
          <dt>Status</dt>
          <dd>
            {canEdit ? (
              <div className="select-wrap with-dot">
                <StatusDot status={d.status} />
                <select value={d.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
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
              <select value={d.phase_id || ''} onChange={(e) => set({ phase_id: e.target.value || null })} aria-label="Phase">
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
                <select value={d.assignee_id || ''} onChange={(e) => set({ assignee_id: e.target.value || null })} aria-label="Owner">
                  <option value="">Unassigned</option>
                  {ownerOptions.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
            ) : (
              <span className="prop-value">
                <Avatar profile={assignee} size={20} /> {assignee?.full_name || 'Unassigned'}
                {assignee?.role === 'client' && <span className="badge badge-client tiny">Client</span>}
              </span>
            )}
            {isStaff && assignee?.role === 'client' && <div className="small muted">Client-side task — they can update it.</div>}
          </dd>

          <dt>Dates</dt>
          <dd>
            {canEdit ? (
              <div className="date-pair">
                <input type="date" value={d.start_date || ''} max={d.due_date || undefined} onChange={(e) => set({ start_date: e.target.value || null })} aria-label="Start date" />
                <span className="muted">→</span>
                <input type="date" value={d.due_date || ''} min={d.start_date || undefined} onChange={(e) => set({ due_date: e.target.value || null })} aria-label="Due date" />
              </div>
            ) : (
              <span className="prop-value">
                {task.start_date ? fmtDate(task.start_date) : '—'} → {task.due_date ? fmtDate(task.due_date, true) : '—'}
              </span>
            )}
            {d.due_date && d.status !== 'done' && (
              <div className={`small ${isOverdue(d) ? 'text-danger' : 'muted'}`}>Due {relDays(d.due_date)}</div>
            )}
          </dd>

          <dt>Progress</dt>
          <dd>
            {canEdit && d.status !== 'done' ? (
              <div className="progress-edit">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={d.progress}
                  aria-label="Progress"
                  style={{ '--fill': `${d.progress}%` }}
                  onChange={(e) => set({ progress: Number(e.target.value) })}
                />
                <span className="mono">{d.progress}%</span>
              </div>
            ) : (
              <div className="progress-edit">
                <ProgressBar value={d.status === 'done' ? 100 : d.progress} label="Task progress" />
                <span className="mono">{d.status === 'done' ? 100 : d.progress}%</span>
              </div>
            )}
          </dd>

          {canEdit && (
            <>
              <dt>Priority</dt>
              <dd>
                <div className="segmented" role="radiogroup" aria-label="Priority">
                  {PRIORITIES.map((p) => (
                    <button key={p.id} role="radio" aria-checked={d.priority === p.id} className={d.priority === p.id ? 'is-on' : ''} onClick={() => set({ priority: p.id })}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </dd>
            </>
          )}
        </dl>

        {canEdit && (
          <div className="flag-row">
            {isStaff && <Toggle id="tg-ms" checked={d.is_milestone} onChange={(v) => set({ is_milestone: v })} label="Milestone" />}
            <Toggle id="tg-bl" checked={d.is_blocked} onChange={(v) => set({ is_blocked: v })} label="Blocked" />
            {isStaff && <Toggle id="tg-in" checked={d.internal} onChange={(v) => set({ internal: v })} label="Internal (hidden from client)" />}
          </div>
        )}

        {d.is_blocked && (
          <div className="blocked-box">
            <Icon name="alert" size={15} />
            {canEdit ? (
              <input
                value={d.blocked_reason || ''}
                placeholder="What is this waiting on?"
                aria-label="Blocked reason"
                onChange={(e) => set({ blocked_reason: e.target.value })}
              />
            ) : (
              <span>{task.blocked_reason || 'Blocked'}</span>
            )}
          </div>
        )}

        <div className="section-label">Description</div>
        {canEdit ? (
          <textarea
            className="desc-input"
            value={d.description || ''}
            placeholder="Add details, acceptance criteria or links…"
            rows={Math.min(12, Math.max(4, (d.description || '').split('\n').length + 1))}
            onChange={(e) => set({ description: e.target.value })}
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
