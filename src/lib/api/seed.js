// Sample data for demo mode. Mirrors the data seeded in Supabase.
const at = (date, time = '10:00') => new Date(`${date}T${time}:00+08:00`).toISOString();

const profiles = [
  { id: 'u-ivan', full_name: 'Ivan Lim', email: 'ivan@example.com', title: 'Project lead', role: 'staff', avatar_color: '#C42531' },
  { id: 'u-dev', full_name: 'Demo Developer', email: 'dev@example.com', title: 'Full-stack developer', role: 'staff', avatar_color: '#2747E8' },
  { id: 'u-design', full_name: 'Demo Designer', email: 'design@example.com', title: 'Product designer', role: 'staff', avatar_color: '#7B61FF' },
  { id: 'u-client', full_name: 'Client Viewer', email: 'client@example.com', title: 'Client stakeholder', role: 'client', avatar_color: '#0F4C5C' },
];

const clients = [{ id: 'c-tcg', name: 'TCG Marketplace', accent_color: '#0F4C5C', created_at: at('2026-09-01') }];
const client_members = [{ client_id: 'c-tcg', user_id: 'u-client' }];

const projects = [
  {
    id: 'p-tcg',
    client_id: 'c-tcg',
    name: 'TCG Marketplace',
    summary: 'Dedicated TCG marketplace for Malaysia and Singapore — Pokémon, Yu-Gi-Oh! and Magic: The Gathering.',
    start_date: '2026-09-01',
    end_date: '2027-04-30',
    status: 'active',
    created_at: at('2026-09-01'),
  },
];

const phases = [
  { id: 'ph0', project_id: 'p-tcg', name: 'Phase 0 · Validation & discovery', position: 0, start_date: '2026-09-01', end_date: '2026-10-02' },
  { id: 'ph1', project_id: 'p-tcg', name: 'Phase 1 · Infrastructure', position: 1, start_date: '2026-10-05', end_date: '2026-12-18' },
  { id: 'ph2', project_id: 'p-tcg', name: 'Phase 2 · Marketplace MVP', position: 2, start_date: '2027-01-04', end_date: '2027-03-26' },
  { id: 'ph3', project_id: 'p-tcg', name: 'Phase 3 · Specialised functions', position: 3, start_date: '2027-03-29', end_date: '2027-04-30' },
];

// [phase, title, description, status, priority, assignee, start, due, progress, milestone, blocked, blockedReason, internal]
const rows = [
  ['ph0', 'Market & competitor research', 'Malaysia/Singapore TCG ecosystem, CTRL Collectibles, TCG.SG, Shopee/Lazada sellers.', 'done', 'medium', 'u-ivan', '2026-09-01', '2026-09-12', 100],
  ['ph0', 'Card data source assessment', 'Licensed data vs authorised APIs vs internal catalogue + seller photos.', 'done', 'high', 'u-dev', '2026-09-08', '2026-09-26', 100],
  ['ph0', 'MVP specification', 'Final requirements, scope and success criteria for MVP.', 'done', 'high', 'u-ivan', '2026-09-15', '2026-10-02', 100],
  ['ph0', 'Discovery sign-off', 'Gate 2 — technical feasibility confirmed.', 'done', 'high', 'u-ivan', '2026-10-02', '2026-10-02', 100, true],
  ['ph1', 'Design system foundations', 'Colour, type, spacing, controls and components.', 'done', 'high', 'u-design', '2026-10-05', '2026-10-14', 100],
  ['ph1', 'Mobile screen mockups (10 screens)', 'Home, sign up, log in, search, filters, catalogue, set & card detail, profile, no results.', 'done', 'high', 'u-design', '2026-10-07', '2026-10-16', 100],
  ['ph1', 'Brand palette selection', 'Client selected the Kartu palette (Straits Teal / Hibiscus Coral / Sand).', 'done', 'medium', 'u-design', '2026-10-16', '2026-10-18', 100],
  ['ph1', 'Admin panel mockups', 'Overview, card catalogue, add card, users, suspend user.', 'review', 'medium', 'u-design', '2026-10-12', '2026-10-23', 90],
  ['ph1', 'Design sign-off', 'Client approval of Phase 1 screens and design system.', 'backlog', 'high', 'u-ivan', '2026-10-26', '2026-10-26', 0, true],
  ['ph1', 'Database schema & catalogue model', 'Separate card catalogue from marketplace listings.', 'in_progress', 'high', 'u-dev', '2026-10-15', '2026-10-30', 45],
  ['ph1', 'Accounts & roles', 'Buyer, individual seller and professional seller registration.', 'in_progress', 'high', 'u-dev', '2026-10-19', '2026-11-06', 20],
  ['ph1', 'Card catalogue import', 'Populate Pokémon, Yu-Gi-Oh! and MTG catalogue records.', 'backlog', 'high', 'u-dev', '2026-11-02', '2026-11-20', 0, false, true, "Waiting on the client's card data source decision."],
  ['ph1', 'Search & filters API', 'Search by name; filter by game, set, language, rarity.', 'backlog', 'high', 'u-dev', '2026-11-16', '2026-12-04', 0],
  ['ph1', 'Admin panel build', 'Catalogue management, users, seller verification hooks.', 'backlog', 'medium', 'u-dev', '2026-11-23', '2026-12-11', 0],
  ['ph1', 'Security review', 'Auth, RBAC, PDPA and Malaysian e-commerce compliance check.', 'backlog', 'high', 'u-ivan', '2026-12-07', '2026-12-16', 0],
  ['ph1', 'Phase 1 complete', 'Infrastructure ready for marketplace MVP.', 'backlog', 'high', 'u-ivan', '2026-12-18', '2026-12-18', 0, true],
  ['ph1', 'Refactor Stitch export into components', 'Internal clean-up before build.', 'in_progress', 'low', 'u-design', '2026-10-19', '2026-10-24', 30, false, false, null, true],
  ['ph2', 'Listings & product pages', '', 'backlog', 'high', null, '2027-01-04', '2027-02-05', 0],
  ['ph2', 'Cart, checkout & payments', '', 'backlog', 'high', null, '2027-01-25', '2027-03-05', 0],
  ['ph2', 'Shipping & order tracking', '', 'backlog', 'medium', null, '2027-02-15', '2027-03-19', 0],
  ['ph2', 'Marketplace MVP ready', '', 'backlog', 'high', 'u-ivan', '2027-03-26', '2027-03-26', 0, true],
  ['ph3', 'Card scanning & AI identification', '', 'backlog', 'medium', null, '2027-03-29', '2027-04-23', 0],
  ['ph3', 'Auctions (feasibility)', '', 'backlog', 'low', null, '2027-04-12', '2027-04-30', 0],
];

const posInPhase = {};
const tasks = rows.map((r, i) => {
  const [phase_id, title, description, status, priority, assignee_id, start_date, due_date, progress, is_milestone = false, is_blocked = false, blocked_reason = null, internal = false] = r;
  posInPhase[phase_id] = (posInPhase[phase_id] || 0) + 1;
  return {
    id: `t-${i + 1}`,
    project_id: 'p-tcg',
    phase_id,
    title,
    description,
    status,
    priority,
    assignee_id,
    start_date,
    due_date,
    progress,
    is_milestone,
    is_blocked,
    blocked_reason,
    internal,
    position: posInPhase[phase_id],
    created_by: 'u-ivan',
    completed_at: status === 'done' ? at(due_date, '17:00') : null,
    created_at: at(start_date, '09:00'),
    updated_at: at(start_date, '09:00'),
  };
});

let eid = 1;
const task_events = [];
const ev = (t, kind, from_value, to_value, created_at, actor_id = t.assignee_id || 'u-ivan') =>
  task_events.push({ id: eid++, task_id: t.id, project_id: 'p-tcg', actor_id, kind, from_value, to_value, task_title: t.title, internal: t.internal, created_at });

for (const t of tasks) {
  const created = new Date(`${t.start_date}T09:00:00+08:00`);
  created.setDate(created.getDate() - 3);
  ev(t, 'created', null, 'backlog', created.toISOString(), 'u-ivan');
  if (t.status === 'done') ev(t, 'status', 'in_progress', 'done', at(t.due_date, '17:00'));
  if ((t.status === 'in_progress' || t.status === 'review') && t.start_date <= '2026-10-19') ev(t, 'status', 'backlog', 'in_progress', at(t.start_date));
  if (t.status === 'review') ev(t, 'status', 'in_progress', 'review', at('2026-10-17', '15:00'));
  if (t.is_blocked) ev(t, 'blocked', null, t.blocked_reason, at('2026-10-13', '11:20'), 'u-ivan');
  if (t.title === 'Admin panel mockups') ev(t, 'due_date', '2026-10-20', '2026-10-23', at('2026-10-15', '09:40'), 'u-design');
}

const meetings = [
  {
    id: 'm-1',
    project_id: 'p-tcg',
    meeting_date: '2026-09-21',
    title: 'Discovery check-in',
    notes: 'Reviewed competitor landscape and data-source options.',
    decisions: 'Proceed with Option C (internal catalogue + seller photos) as the fallback.',
    created_by: 'u-ivan',
  },
  {
    id: 'm-2',
    project_id: 'p-tcg',
    meeting_date: '2026-10-05',
    title: 'Phase 1 kick-off',
    notes: 'Walked through Phase 1 scope: accounts, database, catalogue, search, admin, security.',
    decisions: 'Bi-weekly reviews every other Monday. Client to confirm card data source by 30 Oct.',
    created_by: 'u-ivan',
  },
];

const comments = [
  {
    id: 'cm-1',
    task_id: 't-8',
    author_id: 'u-client',
    body: 'Looks great — can the Users table show the seller verification status too?',
    created_at: at('2026-10-18', '14:12'),
  },
  {
    id: 'cm-2',
    task_id: 't-8',
    author_id: 'u-design',
    body: 'Yes, adding a Verification column with Pending / Verified badges.',
    created_at: at('2026-10-18', '16:40'),
  },
];

export const SEED = { profiles, clients, client_members, projects, phases, tasks, task_events, meetings, comments };
