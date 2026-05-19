export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  sourceUrl: string;
  installPath: string;
  isActive: boolean;
  config: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
}

export interface SkillFormData {
  name: string;
  sourceUrl: string;
  config?: Record<string, unknown>;
}
