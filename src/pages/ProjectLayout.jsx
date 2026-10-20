import { NavLink, Outlet, useParams, useSearchParams } from 'react-router-dom';
import { useProjectData } from '../lib/useProjectData';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';
import TaskDrawer from '../components/TaskDrawer';

export default function ProjectLayout() {
  const { projectId } = useParams();
  const data = useProjectData(projectId);
  const { isStaff } = useAuth();
  const [params, setParams] = useSearchParams();
  const taskId = params.get('task');

  const openTask = (id) => {
    const next = new URLSearchParams(params);
    next.set('task', id);
    setParams(next);
  };
  const closeTask = () => {
    const next = new URLSearchParams(params);
    next.delete('task');
    setParams(next);
  };

  async function newTask(fields = {}) {
    const row = await data.actions.createTask({ title: 'New task', status: 'backlog', position: Date.now(), ...fields });
    if (row) openTask(row.id);
  }

  if (data.loading) return <Spinner />;
  if (data.error || !data.project)
    return (
      <div className="page">
        <EmptyState icon="lock" title="Project unavailable">{data.error || 'This project doesn’t exist or you don’t have access to it.'}</EmptyState>
      </div>
    );

  const { project } = data;
  const tabs = [
    { to: '', label: 'Overview', icon: 'overview', end: true },
    { to: 'board', label: 'Board', icon: 'board' },
    { to: 'timeline', label: 'Timeline', icon: 'timeline' },
    { to: 'meetings', label: 'Meetings', icon: 'calendar' },
    ...(isStaff ? [{ to: 'settings', label: 'Settings', icon: 'settings' }] : []),
  ];
  const task = taskId ? data.tasks.find((t) => t.id === taskId) : null;

  return (
    <div className="project" style={{ '--accent': project.client?.accent_color || 'var(--brand)' }}>
      <header className="project-head">
        <div className="project-head-row">
          <div className="project-title">
            <div className="crumbs">
              <span className="side-dot" style={{ background: 'var(--accent)' }} />
              {project.client?.name || 'Team only · not shared with a client'}
            </div>
            <h1>{project.name}</h1>
          </div>
          <div className="project-actions">
            {!isStaff && (
              <span className="badge badge-client" title="You can view progress and leave comments">
                <Icon name="eye" size={13} /> View & comment
              </span>
            )}
            {isStaff && (
              <button className="btn btn-primary" onClick={() => newTask()}>
                <Icon name="plus" size={15} /> New task
              </button>
            )}
          </div>
        </div>
        <nav className="tabs" aria-label="Project sections">
          {tabs.map((t) => (
            <NavLink key={t.label} to={t.to} end={t.end} className="tab">
              <Icon name={t.icon} size={15} /> {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <Outlet context={{ ...data, openTask, newTask, isStaff }} />

      {taskId && (
        <TaskDrawer
          key={taskId}
          task={task}
          data={data}
          isStaff={isStaff}
          onClose={closeTask}
        />
      )}
    </div>
  );
}
