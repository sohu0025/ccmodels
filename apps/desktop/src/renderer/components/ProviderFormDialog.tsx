import { useState } from 'react';
import type { Provider, ProviderFormData } from '@ccswitch/shared';
import { PRESET_PROVIDERS } from '@ccswitch/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProviderFormData) => Promise<void>;
  initialData: Provider | null;
}

export function ProviderFormDialog({ open, onClose, onSave, initialData }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [type, setType] = useState<'official' | 'third-party' | 'custom'>(initialData?.type ?? 'custom');
  const [apiBase, setApiBase] = useState(initialData?.apiBase ?? '');
  const [apiKey, setApiKey] = useState(initialData?.apiKey ?? '');
  const [models, setModels] = useState(initialData?.models.join(', ') ?? '');
  const [saving, setSaving] = useState(false);

  const handlePresetSelect = (preset: (typeof PRESET_PROVIDERS)[0]) => {
    setName(preset.name);
    setType(preset.type);
    setApiBase(preset.apiBase);
    setModels(preset.models.join(', '));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name,
      type,
      apiBase,
      apiKey,
      cliUrls: initialData?.cliUrls ?? {},
      headers: initialData?.headers ?? {},
      models: models.split(',').map((m) => m.trim()).filter(Boolean),
    });
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-primary rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-bold mb-4">{initialData ? '编辑供应商' : '添加供应商'}</h3>

        {!initialData && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-text-secondary uppercase mb-2 block">
              从预设导入
            </label>
            <div className="flex flex-wrap gap-1">
              {PRESET_PROVIDERS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handlePresetSelect(p)}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-accent/10"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">名称 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：DeepSeek"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">API 地址 *</label>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.deepseek.com"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">API Key *</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              type="password"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">
              模型列表（逗号分隔）
            </label>
            <input
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="deepseek-chat, deepseek-reasoner"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !apiBase || saving}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
