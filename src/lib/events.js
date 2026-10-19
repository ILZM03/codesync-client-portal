import { STATUS } from './constants';
import { fmtDate } from './dates';

export function describeEvent(e, profileById = {}) {
  switch (e.kind) {
    case 'created':
      return 'created this task';
    case 'status':
      return `moved it to ${STATUS[e.to_value]?.label || e.to_value}`;
    case 'due_date':
      if (!e.from_value) return `set the due date to ${fmtDate(e.to_value)}`;
      if (!e.to_value) return 'removed the due date';
      return `changed the due date ${fmtDate(e.from_value)} → ${fmtDate(e.to_value)}`;
    case 'blocked':
      return e.to_value ? `marked it blocked — “${e.to_value}”` : 'marked it blocked';
    case 'unblocked':
      return 'unblocked it';
    case 'assignee':
      return e.to_value ? `assigned it to ${profileById[e.to_value]?.full_name || 'someone'}` : 'unassigned it';
    case 'progress':
      return `updated progress to ${e.to_value}%`;
    default:
      return 'updated it';
  }
}
