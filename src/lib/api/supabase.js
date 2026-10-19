import { createClient } from '@supabase/supabase-js';
import { SUPABASE, toLoginEmail } from '../config';

let _sb;
const sb = () =>
  (_sb ||= createClient(SUPABASE.url, SUPABASE.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

const PROJECT = '*, client:clients(id,name,accent_color)';
const AUTHOR = '*, author:profiles(id,full_name,avatar_color,role)';

export const supabaseApi = {
  demo: false,

  // ---------- auth ----------
  async getSession() {
    const { data } = await sb().auth.getSession();
    return data.session;
  },
  onAuthChange(cb) {
    const { data } = sb().auth.onAuthStateChange((_event, session) => cb(session));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await sb().auth.signInWithPassword({ email: toLoginEmail(email), password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Username or password is incorrect.' : error.message);
  },
  async signOut() {
    await sb().auth.signOut();
  },
  async changePassword(password) {
    const { error } = await sb().auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  // ---------- profiles ----------
  getProfile: (id) => run(sb().from('profiles').select('*').eq('id', id).single()),
  updateProfile: (id, patch) => run(sb().from('profiles').update(patch).eq('id', id).select().single()),
  listProfiles: () => run(sb().from('profiles').select('*').order('full_name')),
  setRole: (userId, role) => run(sb().rpc('set_user_role', { target: userId, new_role: role })),

  // ---------- projects ----------
  listProjects: () =>
    run(sb().from('projects').select(`${PROJECT}, tasks(id,status,progress,is_blocked,is_milestone,due_date,title)`).order('created_at')),
  async loadProject(id) {
    const [project, phases, tasks, profiles, meetings, events] = await Promise.all([
      run(sb().from('projects').select(PROJECT).eq('id', id).single()),
      run(sb().from('phases').select('*').eq('project_id', id).order('position')),
      run(sb().from('tasks').select('*').eq('project_id', id).order('position')),
      run(sb().from('profiles').select('id,full_name,title,role,avatar_color,email').order('full_name')),
      run(sb().from('meetings').select('*').eq('project_id', id).order('meeting_date')),
      run(sb().from('task_events').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(1000)),
    ]);
    return { project, phases, tasks, profiles, meetings, events };
  },
  createProject: (p) => run(sb().from('projects').insert(p).select(PROJECT).single()),
  updateProject: (id, patch) => run(sb().from('projects').update(patch).eq('id', id).select(PROJECT).single()),
  deleteProject: (id) => run(sb().from('projects').delete().eq('id', id)),

  // ---------- phases ----------
  createPhase: (p) => run(sb().from('phases').insert(p).select().single()),
  updatePhase: (id, patch) => run(sb().from('phases').update(patch).eq('id', id).select().single()),
  deletePhase: (id) => run(sb().from('phases').delete().eq('id', id)),

  // ---------- tasks ----------
  createTask: (t) => run(sb().from('tasks').insert(t).select().single()),
  updateTask: (id, patch) => run(sb().from('tasks').update(patch).eq('id', id).select().single()),
  deleteTask: (id) => run(sb().from('tasks').delete().eq('id', id)),
  listTaskEvents: (taskId) => run(sb().from('task_events').select('*').eq('task_id', taskId).order('created_at', { ascending: false })),

  // ---------- comments ----------
  listComments: (taskId) => run(sb().from('comments').select(AUTHOR).eq('task_id', taskId).order('created_at')),
  addComment: (taskId, body) => run(sb().from('comments').insert({ task_id: taskId, body }).select(AUTHOR).single()),
  deleteComment: (id) => run(sb().from('comments').delete().eq('id', id)),

  // ---------- meetings ----------
  createMeeting: (m) => run(sb().from('meetings').insert(m).select().single()),
  updateMeeting: (id, patch) => run(sb().from('meetings').update(patch).eq('id', id).select().single()),
  deleteMeeting: (id) => run(sb().from('meetings').delete().eq('id', id)),

  // ---------- clients (staff) ----------
  listClients: () => run(sb().from('clients').select('*, client_members(user_id), projects(id,name,status)').order('name')),
  createClient: (c) => run(sb().from('clients').insert(c).select().single()),
  updateClient: (id, patch) => run(sb().from('clients').update(patch).eq('id', id).select().single()),
  addMember: (clientId, userId) => run(sb().from('client_members').insert({ client_id: clientId, user_id: userId })),
  removeMember: (clientId, userId) => run(sb().from('client_members').delete().eq('client_id', clientId).eq('user_id', userId)),

  // ---------- realtime ----------
  subscribe(projectId, onChange) {
    const ch = sb().channel(`project-${projectId}`);
    for (const table of ['tasks', 'task_events', 'meetings', 'phases']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `project_id=eq.${projectId}` }, () => onChange(table));
    }
    ch.subscribe();
    return () => {
      sb().removeChannel(ch);
    };
  },
};
