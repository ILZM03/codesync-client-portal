-- Clients can own tasks (work on their side) and edit the tasks they own.
-- Staff keep full control. A client may update a task only while it is assigned to them, and
-- only its working fields (see CLIENT_TASK_FIELDS in src/lib/permissions.js). They cannot
-- delete tasks, reassign them, move them to another phase/project or flip milestone/internal.

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (private.is_staff() or (assignee_id = (select auth.uid()) and not internal and private.can_view_project(project_id)))
  with check (private.is_staff() or (assignee_id = (select auth.uid()) and not internal));

create or replace function private.tasks_guard_client_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_staff() then return new; end if;
  if new.project_id is distinct from old.project_id
     or new.phase_id is distinct from old.phase_id
     or new.assignee_id is distinct from old.assignee_id
     or new.is_milestone is distinct from old.is_milestone
     or new.internal is distinct from old.internal
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'You can only change the status, dates, progress and details of tasks assigned to you.';
  end if;
  return new;
end $$;
create trigger tasks_guard_client_update before update on public.tasks
  for each row execute function private.tasks_guard_client_update();
