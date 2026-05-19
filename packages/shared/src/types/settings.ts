export type Theme = 'light' | 'dark' | 'system';
export type Locale = 'zh-CN' | 'en-US';

export interface AppSettings {
  theme: Theme;
  locale: Locale;
  autoStart: boolean;
  lightweightMode: boolean;
  proxyPort: number;
  autoConfigCli: boolean;
  syncEnabled: boolean;
  syncInterval: number;
  monthlyBudgetLimit: number;
  budgetNotifyThreshold: number;
  speedTestInterval: number;
}
