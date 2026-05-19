export type PromptTarget = 'claude' | 'gemini' | 'codex' | 'all';

export interface PromptConfig {
  id: string;
  name: string;
  content: string;
  target: PromptTarget;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptFormData {
  name: string;
  content: string;
  target: PromptTarget;
  tags: string[];
}
