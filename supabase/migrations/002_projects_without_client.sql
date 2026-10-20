-- Lets a project exist without a client, so staff can take a project away from a client
-- (or keep one internal) and share it later from Clients & people.
-- A project with no client is visible to staff only: private.can_view_project() finds no
-- client_members for it, so the existing row-level security already hides it from clients.
alter table public.projects alter column client_id drop not null;
