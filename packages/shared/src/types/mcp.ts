export type MCPTransport = 'stdio' | 'http' | 'sse';

export interface MCPServer {
  id: string;
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MCPServerFormData {
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
}
