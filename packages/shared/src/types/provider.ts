export interface Provider {
  id: string;
  name: string;
  type: 'official' | 'third-party' | 'custom';
  apiBase: string;
  apiKey: string;
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
  apiBase: string;
  apiKey: string;
  cliUrls: Record<string, string>;
  headers: Record<string, string>;
  models: string[];
}
