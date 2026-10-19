// In-browser stand-in for Supabase, used in demo mode.
// Mirrors the database rules: staff can edit everything, clients only see
// their own projects (minus internal tasks) and can only comment.
import { SEED } from './seed';

const DB_KEY = 'cs-portal-demo-db-v1';
const SESSION_KEY = 'cs-portal-demo-session';
const clone = (o) => JSON.parse(JSON.stringify(o));
const nowIso = () => new Date().toISOString();
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage unavailable */
  }
  return clone(SEED);
}
let db = loadDb();
const save = () => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable */
  }
};

let sessionUser = null;
try {
  sessionUser = sessionStorage.getItem(SESSION_KEY);
} catch {
  /* storage unavailable */
}

const authListeners = new Set();
const me = () => db.profiles.find((p) => p.id === sessionUser);
const isStaff = () => me()?.role === 'staff';
const reply = (v) => new Promise((r) => setTimeout(() => r(v === undefined ? undefined : clone(v)), 90));
const fail = (msg) => Promise.reject(new Error(msg));
const staffOnly = () => {
  if (!isStaff()) throw new Error('Only the CodeSync team can do that.');
};

function canViewProject(pid) {
  if (isStaff()) return true;
  const p = db.projects.find((x) => x.id === pid);
  return !!p && db.client_members.some((m) => m.client_id === p.client_id && m.user_id === sessionUser);
}
const taskVisible = (t) => isStaff() || (!t.internal && canViewProject(t.project_id));
const withClient = (p) => ({ ...p, client: db.clients.find((c) => c.id === p.client_id) });

function logEvents(oldT, t) {
  const add = (kind, from_value, to_value) =>
    db.task_events.push({
      id: Date.now() + Math.random(),
      task_id: t.id,
      project_id: t.project_id,
      actor_id: sessionUser,
      kind,
      from_value,
      to_value,
      task_title: t.title,
      internal: t.internal,
      created_at: nowIso(),
    });
  if (!oldT) return add('created', null, t.status);
  if (oldT.status !== t.status) add('status', oldT.status, t.status);
  if (oldT.due_date !== t.due_date) add('due_date', oldT.due_date, t.due_date);
  if (oldT.is_blocked !== t.is_blocked) add(t.is_blocked ? 'blocked' : 'unblocked', null, t.blocked_reason);
  if (oldT.assignee_id !== t.assignee_id) add('assignee', oldT.assignee_id, t.assignee_id);
  if (oldT.progress !== t.progress && oldT.status === t.status) add('progress', String(oldT.progress), String(t.progress));
}

function applyTaskRules(t, old) {
  t.updated_at = nowIso();
  if (t.status === 'done' && (!old || old.status !== 'done')) {
    t.completed_at = nowIso();
    t.progress = 100;
  } else if (t.status !== 'done') t.completed_at = null;
  if (!t.is_blocked) t.blocked_reason = null;
}

const session = () => (sessionUser && me() ? { user: { id: sessionUser, email: me().email } } : null);

export const mockApi = {
  demo: true,
  demoAccounts: () => db.profiles.map(({ id, full_name, email, role, title }) => ({ id, full_name, email, role, title })),
  resetDemo() {
    db = clone(SEED);
    save();
  },

  // ---------- auth ----------
  async getSession() {
    return session();
  },
  onAuthChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  async signIn(email) {
    const p = db.profiles.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!p) throw new Error('Email or password is incorrect.');
    sessionUser = p.id;
    try {
      sessionStorage.setItem(SESSION_KEY, p.id);
    } catch {
      /* ignore */
    }
    authListeners.forEach((l) => l(session()));
  },
  async signOut() {
    sessionUser = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    authListeners.forEach((l) => l(null));
  },
  async changePassword() {
    return reply();
  },

  // ---------- profiles ----------
  getProfile: (id) => reply(db.profiles.find((p) => p.id === id)),
  async updateProfile(id, patch) {
    if (id !== sessionUser) return fail('You can only edit your own profile.');
    const p = db.profiles.find((x) => x.id === id);
    Object.assign(p, patch);
    save();
    return reply(p);
  },
  listProfiles: () => reply(db.profiles),
  async setRole(userId, role) {
    staffOnly();
    if (userId === sessionUser && role !== 'staff') return fail('You cannot remove your own staff access');
    db.profiles.find((p) => p.id === userId).role = role;
    save();
    return reply();
  },

  // ---------- projects ----------
  listProjects: () =>
    reply(
      db.projects
        .filter((p) => canViewProject(p.id))
        .map((p) => ({ ...withClient(p), tasks: db.tasks.filter((t) => t.project_id === p.id && taskVisible(t)) })),
    ),
  async loadProject(id) {
    const p = db.projects.find((x) => x.id === id);
    if (!p || !canViewProject(id)) return fail('Project not found, or you don’t have access to it.');
    const visibleProfileIds = new Set(
      isStaff()
        ? db.profiles.map((x) => x.id)
        : [
            sessionUser,
            ...db.profiles.filter((x) => x.role === 'staff').map((x) => x.id),
            ...db.client_members.filter((m) => m.client_id === p.client_id).map((m) => m.user_id),
          ],
    );
    return reply({
      project: withClient(p),
      phases: db.phases.filter((x) => x.project_id === id).sort((a, b) => a.position - b.position),
      tasks: db.tasks.filter((t) => t.project_id === id && taskVisible(t)).sort((a, b) => a.position - b.position),
      profiles: db.profiles.filter((x) => visibleProfileIds.has(x.id)),
      meetings: db.meetings.filter((m) => m.project_id === id).sort((a, b) => a.meeting_date.localeCompare(b.meeting_date)),
      events: db.task_events
        .filter((e) => e.project_id === id && (isStaff() || !e.internal))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    });
  },
  async createProject(p) {
    staffOnly();
    const row = { id: newId(), summary: '', status: 'active', created_at: nowIso(), ...p };
    db.projects.push(row);
    save();
    return reply(withClient(row));
  },
  async updateProject(id, patch) {
    staffOnly();
    const p = db.projects.find((x) => x.id === id);
    Object.assign(p, patch);
    save();
    return reply(withClient(p));
  },
  async deleteProject(id) {
    staffOnly();
    db.projects = db.projects.filter((x) => x.id !== id);
    save();
    return reply();
  },

  // ---------- phases ----------
  async createPhase(p) {
    staffOnly();
    const row = { id: newId(), created_at: nowIso(), ...p };
    db.phases.push(row);
    save();
    return reply(row);
  },
  async updatePhase(id, patch) {
    staffOnly();
    const p = db.phases.find((x) => x.id === id);
    Object.assign(p, patch);
    save();
    return reply(p);
  },
  async deletePhase(id) {
    staffOnly();
    db.phases = db.phases.filter((x) => x.id !== id);
    db.tasks.forEach((t) => {
      if (t.phase_id === id) t.phase_id = null;
    });
    save();
    return reply();
  },

  // ---------- tasks ----------
  async createTask(t) {
    staffOnly();
    const row = {
      id: newId(),
      description: '',
      status: 'backlog',
      priority: 'medium',
      assignee_id: null,
      phase_id: null,
      start_date: null,
      due_date: null,
      progress: 0,
      is_milestone: false,
      is_blocked: false,
      blocked_reason: null,
      internal: false,
      position: Date.now(),
      created_by: sessionUser,
      created_at: nowIso(),
      ...t,
    };
    applyTaskRules(row, null);
    db.tasks.push(row);
    logEvents(null, row);
    save();
    return reply(row);
  },
  async updateTask(id, patch) {
    staffOnly();
    const t = db.tasks.find((x) => x.id === id);
    if (!t) return fail('Task not found.');
    const old = { ...t };
    Object.assign(t, patch);
    applyTaskRules(t, old);
    logEvents(old, t);
    save();
    return reply(t);
  },
  async deleteTask(id) {
    staffOnly();
    db.tasks = db.tasks.filter((x) => x.id !== id);
    db.task_events.forEach((e) => {
      if (e.task_id === id) e.task_id = null;
    });
    db.comments = db.comments.filter((c) => c.task_id !== id);
    save();
    return reply();
  },
  listTaskEvents: (taskId) =>
    reply(db.task_events.filter((e) => e.task_id === taskId).sort((a, b) => b.created_at.localeCompare(a.created_at))),

  // ---------- comments ----------
  listComments(taskId) {
    const t = db.tasks.find((x) => x.id === taskId);
    if (!t || !taskVisible(t)) return reply([]);
    return reply(
      db.comments
        .filter((c) => c.task_id === taskId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((c) => ({ ...c, author: db.profiles.find((p) => p.id === c.author_id) })),
    );
  },
  async addComment(taskId, body) {
    const t = db.tasks.find((x) => x.id === taskId);
    if (!t || !taskVisible(t)) return fail('Task not found.');
    const row = { id: newId(), task_id: taskId, author_id: sessionUser, body, created_at: nowIso() };
    db.comments.push(row);
    save();
    return reply({ ...row, author: me() });
  },
  async deleteComment(id) {
    const c = db.comments.find((x) => x.id === id);
    if (!c || (c.author_id !== sessionUser && !isStaff())) return fail('You can only delete your own comments.');
    db.comments = db.comments.filter((x) => x.id !== id);
    save();
    return reply();
  },

  // ---------- meetings ----------
  async createMeeting(m) {
    staffOnly();
    const row = { id: newId(), title: 'Progress review', notes: '', decisions: '', created_by: sessionUser, created_at: nowIso(), ...m };
    db.meetings.push(row);
    save();
    return reply(row);
  },
  async updateMeeting(id, patch) {
    staffOnly();
    const m = db.meetings.find((x) => x.id === id);
    Object.assign(m, patch);
    save();
    return reply(m);
  },
  async deleteMeeting(id) {
    staffOnly();
    db.meetings = db.meetings.filter((x) => x.id !== id);
    save();
    return reply();
  },

  // ---------- clients (staff) ----------
  listClients() {
    if (!isStaff()) return reply([]);
    return reply(
      db.clients
        .map((c) => ({
          ...c,
          client_members: db.client_members.filter((m) => m.client_id === c.id).map((m) => ({ user_id: m.user_id })),
          projects: db.projects.filter((p) => p.client_id === c.id).map(({ id, name, status }) => ({ id, name, status })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  },
  async createClient(c) {
    staffOnly();
    const row = { id: newId(), created_at: nowIso(), accent_color: '#C42531', ...c };
    db.clients.push(row);
    save();
    return reply(row);
  },
  async updateClient(id, patch) {
    staffOnly();
    const c = db.clients.find((x) => x.id === id);
    Object.assign(c, patch);
    save();
    return reply(c);
  },
  async addMember(clientId, userId) {
    staffOnly();
    if (!db.client_members.some((m) => m.client_id === clientId && m.user_id === userId)) db.client_members.push({ client_id: clientId, user_id: userId });
    save();
    return reply();
  },
  async removeMember(clientId, userId) {
    staffOnly();
    db.client_members = db.client_members.filter((m) => !(m.client_id === clientId && m.user_id === userId));
    save();
    return reply();
  },

  subscribe() {
    return () => {};
  },
};
