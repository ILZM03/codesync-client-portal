import { parseDate, today, isOverdue, addDays } from './dates';

const work = (tasks) => tasks.filter((t) => !t.is_milestone);
const taskProgress = (t) => (t.status === 'done' ? 100 : t.progress || 0);

export function projectStats(tasks) {
  const w = work(tasks);
  const total = w.length;
  const done = w.filter((t) => t.status === 'done').length;
  const progress = total ? Math.round(w.reduce((s, t) => s + taskProgress(t), 0) / total) : 0;
  const open = tasks.filter((t) => t.status !== 'done');
  const milestones = tasks
    .filter((t) => t.is_milestone && t.status !== 'done' && t.due_date)
    .sort((a, b) => parseDate(a.due_date) - parseDate(b.due_date));
  return {
    total,
    done,
    progress,
    inProgress: w.filter((t) => t.status === 'in_progress').length,
    review: w.filter((t) => t.status === 'review').length,
    blocked: open.filter((t) => t.is_blocked),
    overdue: open.filter(isOverdue),
    nextMilestone: milestones[0] || null,
  };
}

export function phaseStats(phase, tasks) {
  const pt = work(tasks.filter((t) => t.phase_id === phase.id));
  const total = pt.length;
  const progress = total ? Math.round(pt.reduce((s, t) => s + taskProgress(t), 0) / total) : 0;
  const done = pt.filter((t) => t.status === 'done').length;
  const start = parseDate(phase.start_date);
  const end = parseDate(phase.end_date);
  const now = today();
  let state = 'upcoming';
  if (total && done === total) state = 'complete';
  else if (start && end && now >= start && now <= end) state = 'current';
  else if (end && now > end) state = 'late';
  else if (start && now >= start) state = 'current';
  return { total, done, progress, state };
}

export function phaseBounds(phase, tasks) {
  let s = parseDate(phase.start_date);
  let e = parseDate(phase.end_date);
  for (const t of tasks.filter((x) => x.phase_id === phase.id)) {
    const ts = parseDate(t.start_date || t.due_date);
    const te = parseDate(t.due_date || t.start_date);
    if (ts && (!s || ts < s)) s = ts;
    if (te && (!e || te > e)) e = te;
  }
  return { start: s, end: e };
}

export function dueSoon(tasks, days = 14) {
  const now = today();
  const limit = addDays(now, days);
  return tasks
    .filter((t) => t.status !== 'done' && t.due_date)
    .filter((t) => {
      const d = parseDate(t.due_date);
      return d >= now && d <= limit;
    })
    .sort((a, b) => parseDate(a.due_date) - parseDate(b.due_date));
}
