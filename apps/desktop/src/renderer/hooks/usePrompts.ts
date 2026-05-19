import { useState, useEffect, useCallback } from 'react';
import type { PromptConfig, PromptFormData } from '@ccswitch/shared';

const api = (window as any).electronAPI;

export function usePrompts() {
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setPrompts(await api.listPrompts());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: PromptFormData) => { await api.createPrompt(data); refresh(); };
  const update = async (id: string, data: Partial<PromptFormData>) => { await api.updatePrompt(id, data); refresh(); };
  const remove = async (id: string) => { await api.deletePrompt(id); refresh(); };
  const toggleActive = async (id: string, active: boolean) => { await api.setPromptActive(id, active); refresh(); };

  return { prompts, loading, refresh, create, update, remove, toggleActive };
}
