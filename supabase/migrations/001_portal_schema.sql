-- CodeSync Client Portal — database schema, access rules and activity logging.
-- Already applied to the "codesync-client-portal" Supabase project. Kept here so the
-- database can be recreated (paste into the Supabase SQL editor on a fresh project).

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ============ tables ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  title text,
  role text not null default 'client' check (role in ('staff','client')),
  avatar_color text not null default '#5B5B66',
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  accent_color text not null default '#C42531',
  created_at timestamptz not null default now()
);

create table public.client_members (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index client_members_user_idx on public.client_members(user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  summary text not null default '',
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active','on_hold','completed')),
  created_at timestamptz not null default now()
);
create index projects_client_idx on public.projects(client_id);

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  position int not null default 0,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);
create index phases_project_idx on public.phases(project_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_id uuid references public.phases(id) on delete set null,
  title text not null check (length(title) between 1 and 300),
  description text not null default '',
  status text not null default 'backlog' check (status in ('backlog','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  assignee_id uuid references public.profiles(id) on delete set null,
  start_date date,
  due_date date,
  progress int not null default 0 check (progress between 0 and 100),
  is_milestone boolean not null default false,
  is_blocked boolean not null default false,
  blocked_reason text,
  internal boolean not null default false,
  position double precision not null default 0,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_project_idx on public.tasks(project_id);
create index tasks_phase_idx on public.tasks(phase_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_created_by_idx on public.tasks(created_by);

create table public.task_events (
  id bigint generated always as identity primary key,
  task_id uuid references public.tasks(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  from_value text,
  to_value text,
  task_title text,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index task_events_project_idx on public.task_events(project_id, created_at desc);
create index task_events_task_idx on public.task_events(task_id);
create index task_events_actor_idx on public.task_events(actor_id);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  meeting_date date not null default current_date,
  title text not null default 'Progress review',
  notes text not null default '',
  decisions text not null default '',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index meetings_project_idx on public.meetings(project_id, meeting_date desc);
create index meetings_created_by_idx on public.meetings(created_by);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index comments_task_idx on public.comments(task_id, created_at);
create index comments_author_idx on public.comments(author_id);

-- ============ helper functions (private schema, not exposed over the API) ============
create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'staff');
$$;

create or replace function private.can_view_client(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.client_members where client_id = cid and user_id = (select auth.uid()));
$$;

create or replace function private.can_view_project(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff() or exists (
    select 1 from public.projects p
    join public.client_members cm on cm.client_id = p.client_id
    where p.id = pid and cm.user_id = (select auth.uid()));
$$;

create or replace function private.can_view_profile(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid = (select auth.uid())
      or private.is_staff()
      or exists (select 1 from public.profiles where id = uid and role = 'staff')
      or exists (select 1 from public.client_members a join public.client_members b on a.client_id = b.client_id
                 where a.user_id = (select auth.uid()) and b.user_id = uid);
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
revoke execute on all functions in schema private from anon, public;

-- ============ row-level security ============
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.projects enable row level security;
alter table public.phases enable row level security;
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.meetings enable row level security;
alter table public.comments enable row level security;

-- profiles: users edit only safe columns of their own row; role changes go through set_user_role()
create policy profiles_select on public.profiles for select to authenticated using (private.can_view_profile(id));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (full_name, title, avatar_color) on public.profiles to authenticated;

create policy clients_select on public.clients for select to authenticated using (private.can_view_client(id));
create policy clients_insert on public.clients for insert to authenticated with check (private.is_staff());
create policy clients_update on public.clients for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy clients_delete on public.clients for delete to authenticated using (private.is_staff());

create policy members_select on public.client_members for select to authenticated using (user_id = (select auth.uid()) or private.is_staff());
create policy members_insert on public.client_members for insert to authenticated with check (private.is_staff());
create policy members_delete on public.client_members for delete to authenticated using (private.is_staff());

create policy projects_select on public.projects for select to authenticated using (private.can_view_project(id));
create policy projects_insert on public.projects for insert to authenticated with check (private.is_staff());
create policy projects_update on public.projects for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy projects_delete on public.projects for delete to authenticated using (private.is_staff());

create policy phases_select on public.phases for select to authenticated using (private.can_view_project(project_id));
create policy phases_insert on public.phases for insert to authenticated with check (private.is_staff());
create policy phases_update on public.phases for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy phases_delete on public.phases for delete to authenticated using (private.is_staff());

create policy tasks_select on public.tasks for select to authenticated using (private.is_staff() or (not internal and private.can_view_project(project_id)));
create policy tasks_insert on public.tasks for insert to authenticated with check (private.is_staff());
create policy tasks_update on public.tasks for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy tasks_delete on public.tasks for delete to authenticated using (private.is_staff());

create policy events_select on public.task_events for select to authenticated using (private.is_staff() or (not internal and private.can_view_project(project_id)));

create policy meetings_select on public.meetings for select to authenticated using (private.can_view_project(project_id));
create policy meetings_insert on public.meetings for insert to authenticated with check (private.is_staff());
create policy meetings_update on public.meetings for update to authenticated using (private.is_staff()) with check (private.is_staff());
create policy meetings_delete on public.meetings for delete to authenticated using (private.is_staff());

-- comments: anyone who can see the task can comment (clients included)
create policy comments_select on public.comments for select to authenticated using (exists (select 1 from public.tasks t where t.id = task_id));
create policy comments_insert on public.comments for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_id));
create policy comments_delete on public.comments for delete to authenticated using (author_id = (select auth.uid()) or private.is_staff());

revoke all on all tables in schema public from anon;

-- ============ triggers ============
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare colors text[] := array['#C42531','#0F4C5C','#7B61FF','#E2643F','#1E9E63','#2747E8','#B08A3E','#5B5B66'];
begin
  insert into public.profiles (id, full_name, email, avatar_color)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
          new.email,
          colors[1 + floor(random()*array_length(colors,1))::int]);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.tasks_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at := now(); new.progress := 100;
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  if not new.is_blocked then new.blocked_reason := null; end if;
  return new;
end $$;
create trigger tasks_before_write before insert or update on public.tasks for each row execute function private.tasks_before_write();

create or replace function private.log_task_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.task_events (task_id, project_id, actor_id, kind, to_value, task_title, internal)
    values (new.id, new.project_id, actor, 'created', new.status, new.title, new.internal);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.task_events (task_id, project_id, actor_id, kind, from_value, to_value, task_title, internal)
    values (new.id, new.project_id, actor, 'status', old.status, new.status, new.title, new.internal);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.task_events (task_id, project_id, actor_id, kind, from_value, to_value, task_title, internal)
    values (new.id, new.project_id, actor, 'due_date', old.due_date::text, new.due_date::text, new.title, new.internal);
  end if;
  if new.is_blocked is distinct from old.is_blocked then
    insert into public.task_events (task_id, project_id, actor_id, kind, from_value, to_value, task_title, internal)
    values (new.id, new.project_id, actor, case when new.is_blocked then 'blocked' else 'unblocked' end, null, new.blocked_reason, new.title, new.internal);
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.task_events (task_id, project_id, actor_id, kind, from_value, to_value, task_title, internal)
    values (new.id, new.project_id, actor, 'assignee', old.assignee_id::text, new.assignee_id::text, new.title, new.internal);
  end if;
  if new.progress is distinct from old.progress and new.status = old.status then
    insert into public.task_events (task_id, project_id, actor_id, kind, from_value, to_value, task_title, internal)
    values (new.id, new.project_id, actor, 'progress', old.progress::text, new.progress::text, new.title, new.internal);
  end if;
  return new;
end $$;
create trigger tasks_log_event after insert or update on public.tasks for each row execute function private.log_task_event();

-- staff-only role management (callable from the app; refuses non-staff)
create or replace function public.set_user_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'Only staff can change roles'; end if;
  if new_role not in ('staff','client') then raise exception 'Invalid role'; end if;
  if target = (select auth.uid()) and new_role <> 'staff' then raise exception 'You cannot remove your own staff access'; end if;
  update public.profiles set role = new_role where id = target;
end $$;
revoke execute on function public.set_user_role(uuid, text) from anon, public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ============ realtime ============
alter publication supabase_realtime add table public.tasks, public.task_events, public.comments, public.meetings, public.phases;
alter table public.tasks replica identity full;
alter table public.meetings replica identity full;
alter table public.phases replica identity full;

-- ============ first staff account ============
-- New sign-ups are clients by default. Promote yourself once, in the SQL editor:
--   update public.profiles set role = 'staff' where email = 'you@codesync.my';
