import { addDays, parseDate, today, toISO } from './dates';

/** Builds the meeting windows: one per logged meeting plus "Next review" (since the last one, up to now). */
export function meetingWindows(meetings, project) {
  const asc = [...meetings].sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
  // A kick-off on (or before) the project start date covers everything up to that meeting.
  const start = project.start_date && project.start_date < asc[0]?.meeting_date ? project.start_date : null;
  const windows = asc.map((m, i) => ({
    id: m.id,
    meeting: m,
    title: m.title,
    from: asc[i - 1]?.meeting_date || start,
    to: m.meeting_date,
    upcoming: false,
  }));
  const last = asc[asc.length - 1];
  windows.push({
    id: 'next',
    meeting: null,
    title: 'Next review',
    from: last?.meeting_date || project.start_date || null,
    to: toISO(today()),
    upcoming: true,
  });
  return windows.reverse();
}

/** Groups task events inside (from, to] into report sections. */
export function buildReport(win, events, tasks) {
  const start = win.from ? addDays(parseDate(win.from), 1).getTime() : 0;
  const end = win.upcoming ? Date.now() + 1 : addDays(parseDate(win.to), 1).getTime();
  const inWindow = events.filter((e) => {
    const t = new Date(e.created_at).getTime();
    return t >= start && t < end;
  });
  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const latestPerTask = (list) => {
    const seen = new Map();
    for (const e of [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
      const key = e.task_id || `x-${e.id}`;
      if (!seen.has(key)) seen.set(key, e);
    }
    return [...seen.values()];
  };
  const withTask = (e) => ({ ...e, task: taskById[e.task_id] || null, title: taskById[e.task_id]?.title || e.task_title });

  const completed = latestPerTask(inWindow.filter((e) => e.kind === 'status' && e.to_value === 'done')).map(withTask);
  const doneIds = new Set(completed.map((e) => e.task_id));
  const started = latestPerTask(inWindow.filter((e) => e.kind === 'status' && (e.to_value === 'in_progress' || e.to_value === 'review')))
    .filter((e) => !doneIds.has(e.task_id))
    .map(withTask);
  const dateChanges = latestPerTask(inWindow.filter((e) => e.kind === 'due_date' && e.from_value && e.to_value)).map((e) => ({
    ...withTask(e),
    slipped: e.to_value > e.from_value,
  }));
  const blocked = latestPerTask(inWindow.filter((e) => e.kind === 'blocked' || e.kind === 'unblocked')).map(withTask);
  const added = inWindow.filter((e) => e.kind === 'created').map(withTask);

  return {
    completed,
    started,
    slipped: dateChanges.filter((e) => e.slipped),
    pulledIn: dateChanges.filter((e) => !e.slipped),
    blocked,
    added,
    total: inWindow.length,
  };
}
