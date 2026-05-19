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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-5">{initialData ? '编辑供应商' : '添加供应商'}</h3>

        {/* Preset providers */}
        {!initialData && (
          <div className="mb-5">
            <label className="text-xs font-semibold text-text-secondary uppercase mb-2 block">
              从预设导入
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROVIDERS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handlePresetSelect(p)}
                  className="badge badge-ghost cursor-pointer hover:bg-accent/10 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">名称 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：DeepSeek"
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">API 地址 *</label>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.deepseek.com"
              className="input w-full font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">API Key *</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              type="password"
              className="input w-full font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              模型列表（逗号分隔）
            </label>
            <input
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="deepseek-chat, deepseek-reasoner"
              className="input w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 mt-6">
          <button onClick={onClose} className="btn-ghost">取消</button>
          <button
            onClick={handleSave}
            disabled={!name || !apiBase || saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
