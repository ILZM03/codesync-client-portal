export const STATUSES = [
  { id: 'backlog', label: 'Backlog', color: 'var(--s-backlog)' },
  { id: 'in_progress', label: 'In progress', color: 'var(--s-progress)' },
  { id: 'review', label: 'In review', color: 'var(--s-review)' },
  { id: 'done', label: 'Done', color: 'var(--s-done)' },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export const PROJECT_STATUSES = [
  { id: 'active', label: 'Active' },
  { id: 'on_hold', label: 'On hold' },
  { id: 'completed', label: 'Completed' },
];

export const ACCENTS = ['#C42531', '#0F4C5C', '#2747E8', '#7B61FF', '#1E9E63', '#E2643F', '#B08A3E', '#0D0D0D'];
