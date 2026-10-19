# CodeSync Client Portal — Phase 1

A progress portal for CodeSync clients: overview, kanban board, Gantt timeline and bi-weekly meeting reports.
The team updates work as it happens; clients sign in to view progress and leave comments.

**Stack:** React 18 + Vite · Supabase (Postgres, Auth, Realtime, row-level security) · @dnd-kit · hosted on GitHub Pages.

## What's in Phase 1

| Area | Team (staff) | Client |
|---|---|---|
| Overview — progress, phases, milestones, blockers, "since last meeting" | ✓ | ✓ |
| Board — drag between Backlog / In progress / In review / Done, quick-add, filters | edit | view |
| Timeline — phases + tasks, milestones, today line, week/month/quarter zoom | ✓ | ✓ |
| Meetings — auto report of what changed since the last review, notes & decisions, print/PDF | edit | view |
| Task drawer — status, owner, dates, progress, milestone, blocked, description | edit | view |
| Comments & activity on every task | ✓ | ✓ |
| Internal tasks (hidden from clients) | ✓ | — |
| Project settings & phases, Clients & people admin | ✓ | — |

Access is enforced in the database (row-level security), not just the UI: a client can only ever read
projects belonging to their client workspace, never sees internal tasks, and can only write comments.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL + publishable key
npm run dev
```

No Supabase handy? Run on built-in sample data: `VITE_DEMO=true npm run dev`, or add `?demo` to any portal URL.

## Deploy to GitHub Pages

1. **Settings → Pages →** Source: **GitHub Actions** (one-time).
2. Every push to `main` builds and deploys automatically (or run the workflow manually from the Actions tab).
   The site is at `https://ilzm03.github.io/codesync-client-portal/`.

The Supabase URL and publishable key live in `.env.production`. To point at a different Supabase project, edit that file.

Free GitHub plans only publish Pages from **public** repos. That's fine here: no secrets or client data
live in the repo — the publishable key is meant to be public, and all data sits behind Supabase auth.

## Managing people

1. **Supabase → Authentication → Users → Add user** (tick *Auto confirm*). Send them the portal link and password.
2. In the portal, **Clients & people**: switch CodeSync staff to *Team*; for clients, give them access to their client workspace.
3. Everyone can change their own password from the menu at the bottom-left.

The first staff account must be promoted once in the SQL editor:
`update public.profiles set role = 'staff' where email = 'you@codesync.my';`

## Project structure

```
src/
  lib/api/        supabase.js (real backend) · mock.js + seed.js (demo mode)
  lib/            dates, metrics, meeting report builder, project data hook
  pages/          Login, Projects, Overview, Board, Timeline, Meetings, ProjectSettings, Admin
  components/     AppShell, TaskDrawer, ui primitives, icons
supabase/migrations/001_portal_schema.sql   full schema, RLS, triggers
```

## Ideas for Phase 2

Email digest before each review · drag-to-reschedule on the timeline · task dependencies · file attachments ·
client sign-off buttons on milestones · dark mode.
