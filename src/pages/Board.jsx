import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { STATUSES } from '../lib/constants';
import { fmtDate, isOverdue } from '../lib/dates';
import { useAuth } from '../context/AuthContext';
import { Avatar, ProgressBar } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Board() {
  const { tasks, phases, profiles, profileById, phaseById, actions, openTask } = useOutletContext();
  const { isStaff, profile } = useAuth();
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (phaseFilter === 'all' || (phaseFilter === 'none' ? !t.phase_id : t.phase_id === phaseFilter)) &&
        (ownerFilter === 'all' || (ownerFilter === 'me' ? t.assignee_id === profile?.id : t.assignee_id === ownerFilter)) &&
        (!q || t.title.toLowerCase().includes(q)),
    );
  }, [tasks, phaseFilter, ownerFilter, query, profile?.id]);

  const columns = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((s) => [
          s.id,
          filtered
            .filter((t) => t.status === s.id)
            .sort((a, b) => (s.id === 'done' ? (b.completed_at || '').localeCompare(a.completed_at || '') : a.position - b.position)),
        ]),
      ),
    [filtered],
  );

  function onDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const overTask = tasks.find((t) => t.id === over.id);
    const status = overTask ? overTask.status : over.id;
    const col = (columns[status] || []).filter((t) => t.id !== task.id);
    let position;
    if (overTask && overTask.id !== task.id) {
      const idx = col.findIndex((t) => t.id === overTask.id);
      const prev = col[idx - 1];
      position = prev ? (prev.position + overTask.position) / 2 : overTask.position - 1;
    } else {
      const last = col[col.length - 1];
      position = last ? last.position + 1 : Date.now();
    }
    if (status === task.status && Math.abs(position - task.position) < 1e-9) return;
    const patch = { status, position };
    if (status !== task.status && status === 'in_progress' && !task.start_date) patch.start_date = new Date().toISOString().slice(0, 10);
    actions.updateTask(task.id, patch);
  }

  async function quickAdd(status, title) {
    await actions.createTask({ title, status, phase_id: phaseFilter !== 'all' && phaseFilter !== 'none' ? phaseFilter : null, position: Date.now() });
  }

  const staff = profiles.filter((p) => p.role === 'staff');
  const activeTask = tasks.find((t) => t.id === activeId);
  const filtersOn = phaseFilter !== 'all' || ownerFilter !== 'all' || query;

  return (
    <div className="page page-wide board-page">
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
        </div>
        <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} aria-label="Filter by phase">
          <option value="all">All phases</option>
          {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="none">No phase</option>
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} aria-label="Filter by owner">
          <option value="all">Everyone</option>
          {isStaff && <option value="me">My tasks</option>}
          {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        {filtersOn && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setPhaseFilter('all'); setOwnerFilter('all'); setQuery(''); }}>
            Clear
          </button>
        )}
        {!isStaff && <span className="muted small toolbar-note">Click a card to see details and leave comments.</span>}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragCancel={() => setActiveId(null)} onDragEnd={onDragEnd}>
        <div className="board">
          {STATUSES.map((s) => (
            <Column key={s.id} status={s} tasks={columns[s.id]} isStaff={isStaff} onAdd={quickAdd} render={(t) => (
              <DraggableCard key={t.id} task={t} disabled={!isStaff} onOpen={openTask} profileById={profileById} phaseById={phaseById} />
            )} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? <Card task={activeTask} profileById={profileById} phaseById={phaseById} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ status, tasks, isStaff, onAdd, render }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return setAdding(false);
    await onAdd(status.id, title.trim());
    setTitle('');
  }

  return (
    <section className={`column ${isOver ? 'is-over' : ''}`} aria-label={status.label}>
      <header className="column-head">
        <span className="status-dot" style={{ background: status.color }} />
        <h2>{status.label}</h2>
        <span className="count">{tasks.length}</span>
        {isStaff && (
          <button className="icon-btn sm" onClick={() => setAdding(true)} aria-label={`Add task to ${status.label}`}>
            <Icon name="plus" size={15} />
          </button>
        )}
      </header>
      <div className="column-body" ref={setNodeRef}>
        {adding && (
          <form onSubmit={submit} className="quick-add">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => e.key === 'Escape' && (setTitle(''), setAdding(false))}
              placeholder="Task title, then Enter"
              aria-label="New task title"
            />
          </form>
        )}
        {tasks.map(render)}
        {tasks.length === 0 && !adding && <div className="column-empty">{isStaff ? 'Drop tasks here' : 'Nothing here yet'}</div>}
      </div>
    </section>
  );
}

function DraggableCard({ task, disabled, onOpen, profileById, phaseById }) {
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({ id: task.id, disabled });
  const { setNodeRef: dropRef } = useDroppable({ id: task.id });
  return (
    <div
      ref={(n) => {
        dragRef(n);
        dropRef(n);
      }}
      className={`card-slot ${isDragging ? 'is-dragging' : ''}`}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      role="button"
      tabIndex={0}
      aria-roledescription={disabled ? undefined : 'draggable task'}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task.id);
        if (!disabled) listeners?.onKeyDown?.(e);
      }}
    >
      <Card task={task} profileById={profileById} phaseById={phaseById} />
    </div>
  );
}

function Card({ task, profileById, phaseById, overlay }) {
  const overdue = isOverdue(task);
  const phase = phaseById[task.phase_id];
  return (
    <article className={`task-card ${overlay ? 'is-overlay' : ''} ${task.status === 'done' ? 'is-done' : ''}`}>
      <div className="task-card-flags">
        {phase && <span className="phase-tag truncate">{phase.name.split('·')[0].trim()}</span>}
        {task.is_milestone && <span className="flag flag-milestone" title="Milestone"><Icon name="diamond" size={11} /></span>}
        {task.internal && <span className="flag" title="Internal — hidden from client"><Icon name="lock" size={11} /></span>}
        {task.priority === 'high' && task.status !== 'done' && <span className="flag flag-high" title="High priority">High</span>}
      </div>
      <h3 className="task-card-title">{task.title}</h3>
      {task.is_blocked && (
        <div className="task-card-blocked"><Icon name="alert" size={12} /> <span className="truncate">{task.blocked_reason || 'Blocked'}</span></div>
      )}
      {(task.status === 'in_progress' || task.status === 'review') && task.progress > 0 && (
        <ProgressBar value={task.progress} height={4} label="Task progress" />
      )}
      <footer className="task-card-foot">
        <span className={`due ${overdue ? 'is-overdue' : ''}`}>
          {task.due_date ? (
            <>
              <Icon name="calendar" size={12} /> {fmtDate(task.due_date)}
            </>
          ) : (
            <span className="muted">No date</span>
          )}
        </span>
        <Avatar profile={profileById[task.assignee_id]} size={22} />
      </footer>
    </article>
  );
}
