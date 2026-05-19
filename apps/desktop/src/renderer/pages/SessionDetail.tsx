import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionDetail } from '../hooks/useSessions';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, messages, loading } = useSessionDetail(id);

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!session) return <div className="text-text-secondary">Session not found</div>;

  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <button onClick={() => navigate('/sessions')} className="text-sm text-accent hover:underline">
        ← 返回会话列表
      </button>

      <div>
        <h2 className="text-xl font-bold tracking-tight">{session.summary || session.modelId || '会话详情'}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="badge">{session.cliTool}</span>
          <span className="text-xs text-text-tertiary">{session.providerName}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="stat-label">消息数</p>
          <p className="stat-value">{session.messageCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Token 总量</p>
          <p className="stat-value">{(session.totalTokens / 1000).toFixed(1)}K</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">总费用</p>
          <p className="stat-value">${session.totalCost.toFixed(4)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">日期</p>
          <p className="stat-value text-lg">{new Date(session.startedAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="card p-6">
        <h3 className="text-base font-semibold mb-5">对话记录</h3>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl border ${
                msg.role === 'user'
                  ? 'bg-accent/5 border-accent/20'
                  : 'bg-bg-secondary border-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`text-xs font-semibold uppercase ${
                  msg.role === 'user' ? 'text-accent' : 'text-text-secondary'
                }`}>
                  {msg.role}
                </span>
                <span className="text-xs text-text-tertiary">{msg.tokens} tokens</span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans text-text-primary">{msg.content}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
