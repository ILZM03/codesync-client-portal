# CodeSync Client Portal — Phase 1

A progress portal for CodeSync clients: overview, kanban board, Gantt timeline and bi-weekly meeting reports.
The team updates work as it happens; clients sign in to view progress and leave comments.

**Stack:** React 18 + Vite · Supabase (Postgres, Auth, Realtime, row-level security) · @dnd-kit · hosted on GitHub Pages.

## What's in Phase 1

| Area | Team (staff) | Client |
|---|---|---|
| Overview — progress, phases, milestones, blockers, "since last meeting" | ✓ | ✓ |
| Board — drag between Backlog / In progress / In review / Done, quick-add, filters, sort by deadline | edit | view; edit own tasks |
| Timeline — phases + tasks, milestones, today line, week/month/quarter zoom | ✓ | ✓ |
| Meetings — auto report of what changed since the last review, notes & decisions, print/PDF | edit | view |
| Task drawer — status, owner (team or client), dates, progress, milestone, blocked, description | edit | view; edit own tasks¹ |
| Comments & activity on every task | ✓ | ✓ |
| Internal tasks (hidden from clients) | ✓ | — |
| Project settings & phases, Clients & people admin | ✓ | — |

Access is enforced in the database (row-level security), not just the UI: a client can only ever read
projects belonging to their client workspace, never sees internal tasks, and otherwise only writes comments.

¹ A task can be owned by a client member (client-side work). That client can update its title, description,
status, priority, dates, progress and blocked state, but cannot delete it, reassign it, change its phase or flip
milestone/internal. Needs `supabase/migrations/003_client_task_owners.sql` run once in the SQL editor.

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

Each project is shared with one client, or with none (team only). On **Clients & people**, *Remove* takes a project away
from a client and *Add existing project…* shares a team-only project with one. This needs
`supabase/migrations/002_projects_without_client.sql` run once in the SQL editor.

The first staff account must be promoted once in the SQL editor:
`update public.profiles set role = 'staff' where email = 'you@codesync.my';`

## Loading the TCG Marketplace plan

`supabase/seed/tcg_marketplace_plan.sql` loads the 26-week delivery plan (19 Oct 2026 to 16 Apr 2027) into
the live portal: phases, work packages, stage gates, the kick-off meeting, and a separate on-hold
"TCG Marketplace · Next phase" project for work moved after the first launch (card scanning, auctions and the rest).
It **deletes the project's Backlog tasks** and their comments; tasks In progress, In review or Done are kept as they are
and move into the matching new phase. Every task is assigned to the shared Admin account. Run it once in the Supabase SQL editor.
Demo mode uses the same data from `src/lib/api/seed.js`.

## Project structure

```
src/
  lib/api/        supabase.js (real backend) · mock.js + seed.js (demo mode)
  lib/            dates, metrics, meeting report builder, project data hook
  pages/          Login, Projects, Overview, Board, Timeline, Meetings, ProjectSettings, Admin
  components/     AppShell, TaskDrawer, ui primitives, icons
supabase/migrations/001_portal_schema.sql   full schema, RLS, triggers
supabase/seed/tcg_marketplace_plan.sql      TCG Marketplace delivery plan (see above)
```

## Ideas for Phase 2

Email digest before each review · drag-to-reschedule on the timeline · task dependencies · file attachments ·
client sign-off buttons on milestones · dark mode.
