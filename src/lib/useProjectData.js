import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { useToast } from '../context/ToastContext';

const EMPTY = { loading: true, error: null, project: null, phases: [], tasks: [], profiles: [], meetings: [], events: [] };

/** Loads everything for one project, keeps it fresh (realtime + after edits) and exposes optimistic actions. */
export function useProjectData(projectId) {
  const [state, setState] = useState(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toast = useToast();
  const timer = useRef();

  const load = useCallback(async () => {
    try {
      const d = await api.loadProject(projectId);
      setState({ loading: false, error: null, ...d });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [projectId]);

  const refresh = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, 350);
  }, [load]);

  useEffect(() => {
    setState(EMPTY);
    load();
  }, [load]);

  useEffect(() => {
    const off = api.subscribe(projectId, refresh);
    return () => {
      clearTimeout(timer.current);
      off();
    };
  }, [projectId, refresh]);

  const set = (key, fn) => setState((s) => ({ ...s, [key]: fn(s[key]) }));

  const actions = useMemo(() => {
    const guard = async (fn, rollback) => {
      try {
        const r = await fn();
        refresh();
        return r;
      } catch (e) {
        rollback?.();
        toast.error(e.message);
        return null;
      }
    };
    return {
      reload: load,
      async createTask(fields) {
        const row = await guard(() => api.createTask({ project_id: projectId, ...fields }));
        if (row) set('tasks', (ts) => [...ts, row]);
        return row;
      },
      async updateTask(id, patch) {
        const prev = stateRef.current.tasks.find((t) => t.id === id);
        set('tasks', (ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        const row = await guard(
          () => api.updateTask(id, patch),
          () => set('tasks', (ts) => ts.map((t) => (t.id === id ? prev : t))),
        );
        if (row) set('tasks', (ts) => ts.map((t) => (t.id === id ? row : t)));
        return row;
      },
      async deleteTask(id) {
        const prev = stateRef.current.tasks;
        set('tasks', (ts) => ts.filter((t) => t.id !== id));
        return guard(() => api.deleteTask(id), () => set('tasks', () => prev));
      },
      async createMeeting(fields) {
        const row = await guard(() => api.createMeeting({ project_id: projectId, ...fields }));
        if (row) set('meetings', (ms) => [...ms, row]);
        return row;
      },
      async updateMeeting(id, patch) {
        set('meetings', (ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
        return guard(() => api.updateMeeting(id, patch));
      },
      async deleteMeeting(id) {
        set('meetings', (ms) => ms.filter((m) => m.id !== id));
        return guard(() => api.deleteMeeting(id));
      },
      async createPhase(fields) {
        const row = await guard(() => api.createPhase({ project_id: projectId, ...fields }));
        if (row) set('phases', (ps) => [...ps, row]);
        return row;
      },
      async updatePhase(id, patch) {
        set('phases', (ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)).sort((a, b) => a.position - b.position));
        return guard(() => api.updatePhase(id, patch));
      },
      async deletePhase(id) {
        set('phases', (ps) => ps.filter((p) => p.id !== id));
        return guard(() => api.deletePhase(id));
      },
      async updateProject(patch) {
        const row = await guard(() => api.updateProject(projectId, patch));
        if (row) setState((s) => ({ ...s, project: row }));
        return row;
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, load, refresh, toast]);

  const profileById = useMemo(() => Object.fromEntries(state.profiles.map((p) => [p.id, p])), [state.profiles]);
  const phaseById = useMemo(() => Object.fromEntries(state.phases.map((p) => [p.id, p])), [state.phases]);

  return { ...state, profileById, phaseById, actions };
}
