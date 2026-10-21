// Who may change a task. Staff can edit everything; a client can edit the tasks they own,
// limited to the fields below (no deleting, reassigning, re-phasing or flipping milestone/internal).
// Mirrored in the database by supabase/migrations/003_client_task_owners.sql.
export const CLIENT_TASK_FIELDS = ['title', 'description', 'status', 'priority', 'start_date', 'due_date', 'progress', 'is_blocked', 'blocked_reason', 'position'];

export const canEditTask = (task, profile) => profile?.role === 'staff' || (!!task && !!profile && task.assignee_id === profile.id);
