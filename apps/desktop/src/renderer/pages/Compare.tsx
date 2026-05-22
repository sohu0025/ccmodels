import { useState } from 'react';
import { useCompare } from '../hooks/useCompare';
import { useProviders } from '../hooks/useProviders';
import { useI18n } from '../hooks/useI18n';

export function Compare() {
  const { tests, loading, error, create } = useCompare();
  const { providers } = useProviders();
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [leftProviderId, setLeftProviderId] = useState<string | null>(null);
  const [leftModelId, setLeftModelId] = useState('');
  const [rightProviderId, setRightProviderId] = useState<string | null>(null);
  const [rightModelId, setRightModelId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const latestTest = tests[0];

  const handleRun = async () => {
    if (!prompt.trim() || !leftProviderId || !rightProviderId || !leftModelId || !rightModelId) return;
    setSubmitting(true);
    try {
      await create(prompt.trim(), [leftProviderId, rightProviderId], [leftModelId, rightModelId]);
      setPrompt('');
    } catch {
      // error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  const apiTypeLabel: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
  };

  // Filter for dropdown: exclude already-selected on the other side
  const leftOptions = providers.filter(p => p.id !== rightProviderId);
  const rightOptions = providers.filter(p => p.id !== leftProviderId);

  const selectedLeft = providers.find(p => p.id === leftProviderId);
  const selectedRight = providers.find(p => p.id === rightProviderId);

  const handleLeftProviderChange = (id: string) => {
    setLeftProviderId(id || null);
    const p = providers.find(pp => pp.id === id);
    if (p && p.models.length > 0) setLeftModelId(p.models[0]);
    else setLeftModelId('');
  };
  const handleRightProviderChange = (id: string) => {
    setRightProviderId(id || null);
    const p = providers.find(pp => pp.id === id);
    if (p && p.models.length > 0) setRightModelId(p.models[0]);
    else setRightModelId('');
  };

  const testResponses = latestTest?.responses ?? [];
  const leftResponse = testResponses.find(r => r.providerId === leftProviderId);
  const rightResponse = testResponses.find(r => r.providerId === rightProviderId);
  const hasResults = testResponses.length > 0 && latestTest?.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('compare.title')}</h2>
        <p className="text-sm text-text-secondary mt-1">{t('compare.desc')}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
      )}

      {/* Prompt */}
      <div className="card card-bordered p-5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('compare.promptPlaceholder')}
          rows={3}
          className="input input-bordered w-full resize-y mb-4"
        />

        {/* Provider selection */}
        {providers.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">请先配置供应商</p>
        ) : (
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-text-secondary">左侧供应商</p>
              <select
                value={leftProviderId ?? ''}
                onChange={e => handleLeftProviderChange(e.target.value)}
                className="select select-bordered w-full text-sm"
              >
                <option value="">请选择</option>
                {leftOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{apiTypeLabel[p.apiType] ?? p.apiType}）
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={leftModelId}
                onChange={e => setLeftModelId(e.target.value)}
                placeholder="模型 ID"
                className="input input-bordered w-full text-sm"
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-text-secondary">右侧供应商</p>
              <select
                value={rightProviderId ?? ''}
                onChange={e => handleRightProviderChange(e.target.value)}
                className="select select-bordered w-full text-sm"
              >
                <option value="">请选择</option>
                {rightOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{apiTypeLabel[p.apiType] ?? p.apiType}）
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={rightModelId}
                onChange={e => setRightModelId(e.target.value)}
                placeholder="模型 ID"
                className="input input-bordered w-full text-sm"
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={handleRun}
            disabled={submitting || !leftProviderId || !rightProviderId || !prompt.trim()}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? '对比中…' : '开始对比'}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasResults && (
        <div className="card card-bordered overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-bg-secondary/30">
            <p className="text-sm font-medium truncate">{latestTest.prompt.substring(0, 100)}</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Left column */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm font-semibold">
                  {providers.find(p => p.id === leftProviderId)?.name ?? '左侧'}
                </span>
                <span className="text-xs text-text-tertiary">
                  {leftResponse?.modelId ?? ''}
                </span>
              </div>
              {leftResponse ? (
                <>
                  <div className="flex gap-3 text-xs text-text-tertiary mb-3">
                    <span>{leftResponse.latencyMs}ms</span>
                    <span>{leftResponse.tokens} tokens</span>
                    <span>${leftResponse.cost.toFixed(6)}</span>
                  </div>
                  {leftResponse.error ? (
                    <p className="text-xs text-danger whitespace-pre-wrap break-words">{leftResponse.error}</p>
                  ) : (
                    <p className="text-xs text-text-secondary whitespace-pre-wrap break-words leading-relaxed max-h-[400px] overflow-y-auto">
                      {leftResponse.content}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-text-tertiary">等待响应…</p>
              )}
            </div>

            {/* Right column */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm font-semibold">
                  {providers.find(p => p.id === rightProviderId)?.name ?? '右侧'}
                </span>
                <span className="text-xs text-text-tertiary">
                  {rightResponse?.modelId ?? ''}
                </span>
              </div>
              {rightResponse ? (
                <>
                  <div className="flex gap-3 text-xs text-text-tertiary mb-3">
                    <span>{rightResponse.latencyMs}ms</span>
                    <span>{rightResponse.tokens} tokens</span>
                    <span>${rightResponse.cost.toFixed(6)}</span>
                  </div>
                  {rightResponse.error ? (
                    <p className="text-xs text-danger whitespace-pre-wrap break-words">{rightResponse.error}</p>
                  ) : (
                    <p className="text-xs text-text-secondary whitespace-pre-wrap break-words leading-relaxed max-h-[400px] overflow-y-auto">
                      {rightResponse.content}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-text-tertiary">等待响应…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
