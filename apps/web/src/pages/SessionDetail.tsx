import { useEffect, useState } from 'react';
import { api } from '../api';

export function SessionDetail({ id }: { id: string }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sessions.get(id)
      .then(res => setSession(res.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="p-8">
      <a href="/sessions" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to Sessions</a>
      <h2 className="text-xl font-bold mb-6">Session: {session?.title || id}</h2>
      {!session ? (
        <p className="text-gray-500">Session not found. This session may not be synced to the cloud.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{session.messageCount || 0} messages · Created: {new Date(session.createdAt).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}
