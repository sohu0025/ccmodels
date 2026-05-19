import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessions } from '../hooks/useSessions';
import type { Session } from '@ccswitch/shared';

export function Sessions() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { sessions, total, loading, refresh } = useSessions({ page, pageSize: 20 });

  const handleSearch = () => {
    refresh({ searchQuery: search, page: 1 });
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    refresh({ searchQuery: search, page: newPage });
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search sessions..."
          className="input flex-1"
        />
        <button onClick={handleSearch} className="btn-primary">搜索</button>
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium mb-1">暂无会话</p>
          <p className="text-sm text-text-secondary">API 请求经过代理时会自动记录会话</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {sessions.map((s: Session) => (
              <div
                key={s.id}
                onClick={() => navigate(`/sessions/${s.id}`)}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-accent/5 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="badge">{s.cliTool}</span>
                    <span className="text-sm font-medium truncate">
                      {s.summary || s.modelId || s.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    {s.providerName} · {new Date(s.startedAt).toLocaleString()} · {s.messageCount} 条消息
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-mono">${s.totalCost.toFixed(4)}</p>
                  <p className="text-xs text-text-tertiary">{(s.totalTokens / 1000).toFixed(1)}K tokens</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="btn-ghost disabled:opacity-40"
          >
            上一页
          </button>
          <span className="px-3 py-2 text-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="btn-ghost disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
