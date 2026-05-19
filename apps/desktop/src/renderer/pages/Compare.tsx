import { useState } from 'react';
import { useCompare } from '../hooks/useCompare';

export function Compare() {
  const { tests, loading, error, create } = useCompare();
  const [prompt, setPrompt] = useState('');
  const [modelsInput, setModelsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRun = async () => {
    const trimmed = prompt.trim();
    const models = modelsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (!trimmed || models.length === 0) return;
    setSubmitting(true);
    try {
      await create(trimmed, models);
      setPrompt('');
      setModelsInput('');
    } catch {
      // error state handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">模型对比测试</h2>
        <p className="text-sm text-text-secondary mt-1">用相同 prompt 对比多个模型的响应效果</p>
      </div>

      {/* Create test form */}
      <div className="card p-5">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
        )}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入要测试的 prompt..."
          rows={4}
          className="input w-full resize-y mb-3"
        />
        <input
          value={modelsInput}
          onChange={(e) => setModelsInput(e.target.value)}
          placeholder="模型 ID（逗号分隔，如 gpt-4, claude-3-opus）"
          className="input w-full mb-4"
        />
        <button onClick={handleRun} disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? '提交中...' : '开始对比'}
        </button>
      </div>

      {/* Test results */}
      <div className="space-y-4">
        {tests.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg font-medium mb-1">暂无对比测试</p>
            <p className="text-sm text-text-secondary">输入 prompt 和模型 ID 开始对比</p>
          </div>
        ) : (
          tests.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className={`indicator ${t.status === 'completed' ? 'indicator-success' : 'indicator-warning'}`} />
                <span className="text-sm font-medium">{t.prompt.substring(0, 80)}{t.prompt.length > 80 ? '...' : ''}</span>
                <span className="text-xs text-text-tertiary">{t.models.join(', ')}</span>
              </div>
              {t.responses.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {t.responses.map((r, i) => (
                    <div key={r.modelId} className="bg-bg-secondary rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">{r.modelId}</span>
                        <div className="flex gap-3 text-xs text-text-tertiary">
                          <span>{r.latencyMs}ms</span>
                          <span>{r.tokens} tokens</span>
                          <span>${r.cost.toFixed(6)}</span>
                        </div>
                      </div>
                      {r.error ? (
                        <p className="text-xs text-danger">{r.error}</p>
                      ) : (
                        <p className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-6 leading-relaxed">
                          {r.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
