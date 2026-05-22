import { useState, useEffect, useCallback } from 'react';
import type { Session, SessionMessage, SessionFilter, SessionListResult } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useSessions(initialFilter?: Partial<SessionFilter>) {
  const [result, setResult] = useState<SessionListResult | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (filter?: Partial<SessionFilter>) => {
    setLoading(true);
    const defaultFilter: SessionFilter = { page: 1, pageSize: 20, ...initialFilter, ...filter };
    const r = await api.listSessions(defaultFilter);
    setResult(r);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { sessions: result?.sessions ?? [], total: result?.total ?? 0, loading, refresh };
}

export function useSessionDetail(id: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getSession(id), api.getSessionMessages(id)]).then(([s, m]) => {
      setSession(s);
      setMessages(m);
      setLoading(false);
    });
  }, [id]);

  return { session, messages, loading };
}
