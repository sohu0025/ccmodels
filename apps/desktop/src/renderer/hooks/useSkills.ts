import { useState, useEffect, useCallback } from 'react';
import type { Skill, SkillFormData } from '@ccswitch/shared';

const api = (window as any).electronAPI;

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSkills(await api.listSkills());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: SkillFormData) => { await api.createSkill(data); refresh(); };
  const update = async (id: string, data: Partial<SkillFormData>) => { await api.updateSkill(id, data); refresh(); };
  const remove = async (id: string) => { await api.deleteSkill(id); refresh(); };
  const toggleActive = async (id: string, active: boolean) => { await api.setSkillActive(id, active); refresh(); };
  const checkConflict = (name: string, excludeId?: string) => api.checkSkillConflict(name, excludeId);

  return { skills, loading, refresh, create, update, remove, toggleActive, checkConflict };
}
