import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PROJECT_STATUSES } from '../lib/constants';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { Field } from '../components/ui';
import { Icon } from '../components/Icon';

export default function ProjectSettings() {
  const { project, phases, tasks, actions } = useOutletContext();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: project.name,
    summary: project.summary || '',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    status: project.status,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const row = await actions.updateProject({ ...form, start_date: form.start_date || null, end_date: form.end_date || null });
    if (row) toast.success('Project saved');
  }

  async function addPhase() {
    const pos = phases.length ? Math.max(...phases.map((p) => p.position)) + 1 : 0;
    await actions.createPhase({ name: `Phase ${pos}`, position: pos });
  }

  async function move(phase, dir) {
    const sorted = [...phases].sort((a, b) => a.position - b.position);
    const i = sorted.findIndex((p) => p.id === phase.id);
    const other = sorted[i + dir];
    if (!other) return;
    await Promise.all([actions.updatePhase(phase.id, { position: other.position }), actions.updatePhase(other.id, { position: phase.position })]);
  }

  async function deleteProject() {
    try {
      await api.deleteProject(project.id);
      toast.success('Project deleted');
      navigate('/', { replace: true });
      window.location.reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="page settings-page">
      <form className="card stack" onSubmit={save}>
        <div className="card-head"><h2>Project details</h2></div>
        <Field label="Name" htmlFor="pj-name"><input id="pj-name" required value={form.name} onChange={set('name')} /></Field>
        <Field label="Summary" htmlFor="pj-sum" hint="Shown to the client at the top of the overview.">
          <textarea id="pj-sum" rows={3} value={form.summary} onChange={set('summary')} />
        </Field>
        <div className="grid-3">
          <Field label="Start date" htmlFor="pj-s"><input id="pj-s" type="date" value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="Target end date" htmlFor="pj-e"><input id="pj-e" type="date" value={form.end_date} onChange={set('end_date')} /></Field>
          <Field label="Status" htmlFor="pj-st">
            <select id="pj-st" value={form.status} onChange={set('status')}>
              {PROJECT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="row-end"><button className="btn btn-primary">Save details</button></div>
      </form>

      <section className="card stack">
        <div className="card-head">
          <h2>Phases</h2>
          <button className="btn btn-sm" onClick={addPhase}><Icon name="plus" size={14} /> Add phase</button>
        </div>
        <p className="muted small">Phases group tasks on the timeline and overview. Dates are optional — the timeline falls back to the tasks inside.</p>
        {phases.length === 0 && <div className="muted small">No phases yet.</div>}
        <div className="phase-editor">
          {[...phases].sort((a, b) => a.position - b.position).map((p, i, arr) => (
            <PhaseRow
              key={p.id}
              phase={p}
              taskCount={tasks.filter((t) => t.phase_id === p.id).length}
              first={i === 0}
              last={i === arr.length - 1}
              onMove={(d) => move(p, d)}
              onSave={(patch) => actions.updatePhase(p.id, patch)}
              onDelete={() => actions.deletePhase(p.id)}
            />
          ))}
        </div>
      </section>

      <section className="card stack danger-zone">
        <div className="card-head"><h2>Delete project</h2></div>
        <p className="muted small">Removes the project with all its phases, tasks, meetings and comments. This can’t be undone.</p>
        <div>
          {confirmDelete ? (
            <span className="confirm-inline">
              Delete “{project.name}” permanently?
              <button className="btn btn-sm btn-danger" onClick={deleteProject}>Delete project</button>
              <button className="btn btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </span>
          ) : (
            <button className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>Delete project…</button>
          )}
        </div>
      </section>
    </div>
  );
}

function PhaseRow({ phase, taskCount, first, last, onMove, onSave, onDelete }) {
  const [name, setName] = useState(phase.name);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="phase-row">
      <div className="phase-move">
        <button className="icon-btn sm" disabled={first} onClick={() => onMove(-1)} aria-label="Move phase up"><Icon name="chevronUp" size={14} /></button>
        <button className="icon-btn sm" disabled={last} onClick={() => onMove(1)} aria-label="Move phase down"><Icon name="chevronDown" size={14} /></button>
      </div>
      <input className="phase-name-input" value={name} aria-label="Phase name" onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== phase.name && onSave({ name: name.trim() })} />
      <input type="date" value={phase.start_date || ''} aria-label="Phase start" onChange={(e) => onSave({ start_date: e.target.value || null })} />
      <input type="date" value={phase.end_date || ''} aria-label="Phase end" onChange={(e) => onSave({ end_date: e.target.value || null })} />
      <span className="small muted nowrap">{taskCount} tasks</span>
      {confirm ? (
        <span className="confirm-inline">
          <button className="btn btn-sm btn-danger" onClick={onDelete}>Delete</button>
          <button className="btn btn-sm" onClick={() => setConfirm(false)}>Keep</button>
        </span>
      ) : (
        <button className="icon-btn" onClick={() => setConfirm(true)} aria-label={`Delete ${phase.name}`} title={taskCount ? 'Tasks will move to “No phase”' : 'Delete phase'}><Icon name="trash" /></button>
      )}
    </div>
  );
}
