import { useState as _useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionDetail } from '../hooks/useSessions';
import { useI18n } from '../hooks/useI18n';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { session, messages, loading } = useSessionDetail(id);

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;
  if (!session) return <div className="text-text-secondary">{t('sessionDetail.notFound')}</div>;

  return (
    <div className="space-y-4">
      {/* Back button + title */}
      <button onClick={() => navigate('/sessions')} className="text-sm text-accent hover:underline">
        {t('sessionDetail.back')}
      </button>

      <div>
        <h2 className="text-xl font-bold tracking-tight">{session.summary || session.modelId || t('sessionDetail.title')}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="badge">{session.cliTool}</span>
          <span className="text-xs text-text-tertiary">{session.providerName}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">{t('sessionDetail.statsMessages')}</p>
          <p className="stat-value">{session.messageCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('sessionDetail.statsTokens')}</p>
          <p className="stat-value">{session.totalTokens > 0 ? `${(session.totalTokens / 1000).toFixed(1)}K` : '-'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('sessionDetail.statsDate')}</p>
          <p className="stat-value text-lg">{new Date(session.startedAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="card card-bordered p-4">
        <h3 className="text-base font-semibold mb-5">{t('sessionDetail.conversation')}</h3>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-4 rounded-xl border max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-accent/5 border-accent/20'
                    : 'bg-bg-secondary border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-xs font-semibold uppercase ${
                    msg.role === 'user' ? 'text-accent' : 'text-text-secondary'
                  }`}>
                    {msg.role === 'user' ? '我' : 'AI'}
                  </span>
                  <span className="text-xs text-text-tertiary">{new Date(msg.timestamp).toLocaleString()}</span>
                  <span className="text-xs text-text-tertiary">{msg.tokens} tokens</span>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans text-text-primary">{msg.content}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
