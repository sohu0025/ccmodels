import { useEffect, useState } from 'react';
import { api } from '../api';

export function Compare() {
  const [tests, setTests] = useState<any[]>([]);
  const [prompt, setPrompt] = useState('');
  const [modelsInput, setModelsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.compare.list()
      .then(res => setTests(res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRun = async () => {
    const models = modelsInput.split(',').map((s: string) => s.trim()).filter(Boolean);
    const trimmed = prompt.trim();
    if (!trimmed || models.length === 0) return;
    setSubmitting(true);
    try {
      await api.compare.create({ prompt: trimmed, models });
      const updated = await api.compare.list();
      setTests(updated || []);
      setPrompt('');
      setModelsInput('');
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">模型对比</h2>
        <p className="text-sm text-text-secondary mt-1">用相同 prompt 对比多个模型</p>
      </div>

      <div className="card p-5">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入要测试的 prompt..." rows={4}
          className="input w-full resize-y mb-3" />
        <input value={modelsInput} onChange={(e) => setModelsInput(e.target.value)}
          placeholder="模型 ID（逗号分隔）"
          className="input w-full mb-4" />
        <button onClick={handleRun} disabled={submitting}
          className="btn-primary disabled:opacity-50">
          {submitting ? '提交中...' : '开始对比'}
        </button>
      </div>

      <div className="space-y-4">
        {tests.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg font-medium mb-1">暂无对比测试</p>
            <p className="text-sm text-text-secondary">输入 prompt 和模型 ID 开始对比</p>
          </div>
        ) : tests.map(t => (
          <div key={t.id} className="card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className={`indicator ${t.status === 'completed' ? 'indicator-success' : 'indicator-warning'}`} />
              <span className="text-sm font-medium">{t.prompt.substring(0, 80)}{t.prompt.length > 80 ? '...' : ''}</span>
              <span className="text-xs text-text-tertiary">{Array.isArray(t.models) ? t.models.join(', ') : t.models}</span>
            </div>
            {Array.isArray(t.responses) && t.responses.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {t.responses.map((r: any) => (
                  <div key={r.modelId} className="bg-bg-secondary rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">{r.modelId}</span>
                      <div className="flex gap-3 text-xs text-text-tertiary">
                        <span>{r.latencyMs}ms</span>
                        <span>{r.tokens} tokens</span>
                        <span>${r.cost?.toFixed(6) ?? '0'}</span>
                      </div>
                    </div>
                    {r.error ? (
                      <p className="text-xs text-danger">{r.error}</p>
                    ) : (
                      <p className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-6 leading-relaxed">{r.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
