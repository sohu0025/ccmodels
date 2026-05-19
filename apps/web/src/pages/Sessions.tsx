import { useEffect, useState } from 'react';
import { api } from '../api';

export function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.sessions.list()
      .then(res => {
        setSessions(res.sessions || []);
        if (res.message) setMessage(res.message);
      })
      .catch(() => setMessage('Failed to load sessions.'));
  }, []);

  return (
    <div className="space-y-6">
      {message && <p className="text-sm text-text-secondary">{message}</p>}

      {sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium mb-1">暂无会话</p>
          <p className="text-sm text-text-secondary">桌面端会话数据会自动同步到云端</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {sessions.map(s => (
              <a
                key={s.id}
                href={`/sessions/${s.id}`}
                className="block px-5 py-3.5 flex items-center justify-between hover:bg-accent/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium truncate">{s.summary || s.title || 'Untitled Session'}</p>
                  <p className="text-xs text-text-tertiary">
                    {s.providerName ?? ''} {s.providerName && '·'} {s.messageCount || 0} messages
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-mono">${(s.totalCost ?? 0).toFixed(4)}</p>
                  <p className="text-xs text-text-tertiary">{new Date(s.startedAt || s.createdAt).toLocaleDateString()}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
