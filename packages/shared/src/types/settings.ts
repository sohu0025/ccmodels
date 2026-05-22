export type Theme = 'light' | 'dark' | 'system';
export type Locale = 'zh-CN' | 'en-US';

export interface AppSettings {
  theme: Theme;
  locale: Locale;
  autoStart: boolean;
  lightweightMode: boolean;
  proxyPort: number;
  autoConfigCli: boolean;
  /** Server API URL (sync, system providers, ads, etc.) */
  serverUrl: string;
  syncEnabled: boolean;
  syncInterval: number;
  syncServerUrl: string;
  syncAuthToken: string;
  monthlyBudgetLimit: number;
  budgetNotifyThreshold: number;
  speedTestInterval: number;
}
