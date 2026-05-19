import { useParams, useNavigate } from 'react-router-dom';
import { useSessionDetail } from '../hooks/useSessions';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, messages, loading } = useSessionDetail(id);

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;
  if (!session) return <div className="p-8 text-text-secondary">Session not found</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/sessions')} className="text-sm text-accent mb-4 block">
        &larr; Back to sessions
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">{session.summary || session.modelId || 'Session Detail'}</h2>
        <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary">{session.cliTool}</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">Messages</p>
          <p className="text-lg font-bold">{session.messageCount}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">Total Tokens</p>
          <p className="text-lg font-bold">{(session.totalTokens / 1000).toFixed(1)}K</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">Total Cost</p>
          <p className="text-lg font-bold">${session.totalCost.toFixed(4)}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">Date</p>
          <p className="text-sm font-medium">{new Date(session.startedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-xl ${
              msg.role === 'user'
                ? 'bg-accent/5 border border-accent/20'
                : 'bg-bg-secondary border border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase">{msg.role}</span>
              <span className="text-xs text-text-secondary">{msg.tokens} tokens</span>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-sans">{msg.content}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
