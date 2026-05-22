export type ApiType = 'openai' | 'anthropic' | 'google';

/** API 类型对应的兼容 CLI 工具 */
export const API_TYPE_TOOLS: Record<ApiType, string[]> = {
  openai: ['codex', 'opencode', 'openclaw', 'hermes', 'gemini-cli'],
  anthropic: ['claude-code'],
  google: ['gemini-cli'],
};

export interface Provider {
  id: string;
  name: string;
  type: 'official' | 'third-party' | 'custom';
  apiType: ApiType;
  apiBase: string;
  apiKey: string;
  /** 官网地址 */
  website: string;
  /** 按 CLI 工具区分端点，key 为 CLI 工具名，value 为覆盖的 base URL */
  cliUrls: Record<string, string>;
  headers: Record<string, string>;
  models: string[];
  isActive: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderFormData {
  name: string;
  type: Provider['type'];
  apiType: ApiType;
  apiBase: string;
  apiKey: string;
  website: string;
  /** Icon identifier for UI display, matches @lobehub/icons component names */
  icon?: string;
  cliUrls: Record<string, string>;
  headers: Record<string, string>;
  models: string[];
}
