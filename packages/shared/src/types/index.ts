import type { Provider, ProviderFormData } from './provider';
import type { AppSettings } from './settings';

export * from './provider';
export * from './model';
export * from './settings';
export * from './session';
export * from './usage';
export * from './mcp';
export * from './skill';
export * from './prompt';
export * from './sync';
export * from './compare';

export interface IPCChannels {
  'provider:list': { args: void; result: Provider[] };
  'provider:get': { args: string; result: Provider | null };
  'provider:create': { args: ProviderFormData; result: Provider };
  'provider:update': { args: { id: string; data: Partial<ProviderFormData> }; result: Provider };
  'provider:delete': { args: string; result: void };
  'provider:setActive': { args: string; result: void };
  'settings:get': { args: void; result: AppSettings };
  'settings:update': { args: Partial<AppSettings>; result: AppSettings };
  'proxy:status': { args: void; result: { running: boolean; port: number } };
  'config:scan': { args: void; result: CliToolStatus[] };
  'config:apply': { args: string; result: { success: boolean; message: string } };
  'config:restore': { args: string; result: { success: boolean; message: string } };
}

export interface CliToolStatus {
  name: string;
  installed: boolean;
  configured: boolean;
  configPath: string;
  backupPath: string | null;
}
