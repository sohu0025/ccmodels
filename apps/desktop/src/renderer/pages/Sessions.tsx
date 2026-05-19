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

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Session History</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search sessions..."
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
        >
          Search
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-lg mb-2">No sessions yet</p>
          <p className="text-sm">Sessions are automatically recorded when API requests pass through the proxy.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s: Session) => (
            <div
              key={s.id}
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary">{s.cliTool}</span>
                  <span className="text-sm font-medium truncate">
                    {s.summary || s.modelId || s.id.slice(0, 8)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  {s.providerName} &middot; {new Date(s.startedAt).toLocaleString()} &middot; {s.messageCount} messages
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-mono">${s.totalCost.toFixed(4)}</p>
                <p className="text-xs text-text-secondary">{(s.totalTokens / 1000).toFixed(1)}K tokens</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
