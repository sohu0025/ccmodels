import { useState } from 'react';
import { useCompare } from '../hooks/useCompare';

export function Compare() {
  const { tests, loading, create } = useCompare();
  const [prompt, setPrompt] = useState('');
  const [modelsInput, setModelsInput] = useState('');

  const handleRun = async () => {
    const models = modelsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (!prompt || models.length === 0) return;
    await create(prompt, models);
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold">模型对比测试</h2>
        <p className="text-sm text-text-secondary mt-1">用相同 prompt 对比多个模型的响应效果</p>
      </div>

      <div className="rounded-xl border border-border p-4 mb-6">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入要测试的 prompt..." rows={4}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm mb-3" />
        <input value={modelsInput} onChange={(e) => setModelsInput(e.target.value)}
          placeholder="模型 ID（逗号分隔，如 gpt-4, claude-3-opus）"
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm mb-3" />
        <button onClick={handleRun}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm">开始对比</button>
      </div>

      <div className="space-y-3">
        {tests.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">还没有对比测试记录</p>
        ) : tests.map((t) => (
          <div key={t.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-success' : 'bg-warning'}`} />
              <span className="font-medium text-sm">{t.prompt.substring(0, 80)}{t.prompt.length > 80 ? '...' : ''}</span>
              <span className="text-xs text-text-secondary">{t.models.join(', ')}</span>
            </div>
            {t.responses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {t.responses.map((r, i) => (
                  <div key={i} className="bg-bg-secondary rounded-lg p-3">
                    <div className="text-xs font-medium mb-1">{r.modelId}</div>
                    <p className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-6">{r.content}</p>
                    <div className="flex gap-2 mt-2 text-xs text-text-secondary">
                      <span>{r.latencyMs}ms</span>
                      <span>{r.tokens} tokens</span>
                      <span>${r.cost.toFixed(6)}</span>
                    </div>
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
