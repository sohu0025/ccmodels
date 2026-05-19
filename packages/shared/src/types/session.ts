export interface Session {
  id: string;
  cliTool: string;
  providerId: string;
  providerName: string;
  modelId: string;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  summary: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  timestamp: string;
  metadata: string;
}

export interface SessionFilter {
  cliTool?: string;
  providerId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  page: number;
  pageSize: number;
}

export interface SessionListResult {
  sessions: Session[];
  total: number;
  page: number;
  pageSize: number;
}
