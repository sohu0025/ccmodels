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
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Sessions</h2>
      {message && <p className="text-gray-500 mb-4">{message}</p>}
      {sessions.length === 0 ? (
        <p className="text-gray-500">No synced sessions available. Sessions are stored locally on your desktop and synced to the cloud when configured.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <a key={s.id} href={`/sessions/${s.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm">
              <p className="font-medium text-sm">{s.title || 'Untitled Session'}</p>
              <p className="text-xs text-gray-500">{s.messageCount || 0} messages · {new Date(s.createdAt).toLocaleDateString()}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
