import { useState, useEffect, useCallback } from 'react';
import type { MCPServer, MCPServerFormData } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useMcp() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await api.listMcpServers();
    setServers(list);
    const stats: Record<string, string> = {};
    for (const s of list) stats[s.id] = await api.getMcpStatus(s.id);
    setStatuses(stats);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: MCPServerFormData) => { await api.createMcpServer(data); refresh(); };
  const update = async (id: string, data: Partial<MCPServerFormData>) => { await api.updateMcpServer(id, data); refresh(); };
  const remove = async (id: string) => { await api.deleteMcpServer(id); refresh(); };
  const toggleEnabled = async (id: string, enabled: boolean) => { await api.setMcpEnabled(id, enabled); refresh(); };
  const startStop = async (id: string, start: boolean) => {
    if (start) await api.startMcpServer(id); else await api.stopMcpServer(id);
    refresh();
  };

  return { servers, statuses, loading, refresh, create, update, remove, toggleEnabled, startStop };
}
