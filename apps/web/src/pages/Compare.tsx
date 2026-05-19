import { useEffect, useState } from 'react';
import { api } from '../api';

export function Compare() {
  const [tests, setTests] = useState<any[]>([]);
  const [prompt, setPrompt] = useState('');
  const [modelsInput, setModelsInput] = useState('');
  const [loading, setLoading] = useState(true);

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
    await api.compare.create({ prompt: trimmed, models });
    const updated = await api.compare.list();
    setTests(updated || []);
    setPrompt('');
    setModelsInput('');
  };

  if (loading) return <div className="p-8"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Model Comparison</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt to test..." rows={4}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-3" />
        <input value={modelsInput} onChange={(e) => setModelsInput(e.target.value)}
          placeholder="Model IDs (comma separated)"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-3" />
        <button onClick={handleRun}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Run Comparison</button>
      </div>

      <div className="space-y-3">
        {tests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comparison tests yet.</p>
        ) : tests.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="font-medium text-sm">{t.prompt.substring(0, 80)}{t.prompt.length > 80 ? '...' : ''}</span>
              <span className="text-xs text-gray-500">{Array.isArray(t.models) ? t.models.join(', ') : t.models}</span>
            </div>
            {Array.isArray(t.responses) && t.responses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {t.responses.map((r: any, i: number) => (
                  <div key={r.modelId} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium mb-1">{r.modelId}</div>
                    {r.error ? (
                      <p className="text-xs text-red-500">{r.error}</p>
                    ) : (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">{r.content}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-gray-500">
                      <span>{r.latencyMs}ms</span>
                      <span>{r.tokens} tokens</span>
                      <span>${r.cost?.toFixed(6) ?? '0'}</span>
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
