import { useState, useEffect, type ReactNode } from 'react';
import type { Provider, ProviderFormData, ApiType } from '@ccmodels/shared';
import { API_TYPE_TOOLS } from '@ccmodels/shared';
import {
  DeepSeek, Zhipu, Kimi, Minimax, Qwen, Doubao, Baichuan,
  Spark, Hunyuan, SiliconCloud, OpenRouter, Anthropic, OpenAI, Google,
} from '@lobehub/icons';
import { useI18n } from '../hooks/useI18n';

const api = (window as any).electronAPI;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProviderFormData) => Promise<void>;
  initialData: Provider | null;
  toolName?: string;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  'gemini-cli': 'Gemini CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  hermes: 'Hermes Agent',
};

const PROVIDER_ICONS: Record<string, ReactNode> = {
  'DeepSeek': <DeepSeek size={16} />,
  '智谱 GLM': <Zhipu size={16} />,
  'Kimi (Moonshot)': <Kimi size={16} />,
  'MiniMax': <Minimax size={16} />,
  '通义千问 (DashScope)': <Qwen size={16} />,
  '字节豆包': <Doubao size={16} />,
  '百川 (Baichuan)': <Baichuan size={16} />,
  '讯飞星火': <Spark size={16} />,
  '腾讯混元': <Hunyuan size={16} />,
  'SiliconFlow': <SiliconCloud size={16} />,
  'OpenRouter': <OpenRouter size={16} />,
  'Anthropic Official': <Anthropic size={16} />,
  'OpenAI Official': <OpenAI size={16} />,
  'Google Gemini': <Google size={16} />,
};

const PROVIDER_COLORS: Record<string, string> = {
  'DeepSeek': '#4F6BED',
  '智谱 GLM': '#1E80FF',
  'Kimi (Moonshot)': '#FF6B8A',
  'MiniMax': '#FF6B35',
  '通义千问 (DashScope)': '#1677FF',
  '字节豆包': '#0057FF',
  '百川 (Baichuan)': '#1677FF',
  '讯飞星火': '#1677FF',
  '腾讯混元': '#0052D9',
  'SiliconFlow': '#5E5CE6',
  'OpenRouter': '#802BF5',
  'Anthropic Official': '#D97757',
  'OpenAI Official': '#10A37F',
  'Google Gemini': '#4285F4',
};

const KNOWN_WEBSITES: Record<string, string> = {
  DeepSeek: 'https://www.deepseek.com',
  智谱: 'https://open.bigmodel.cn',
  Kimi: 'https://kimi.moonshot.cn',
  MiniMax: 'https://www.minimax.io',
  '通义千问': 'https://tongyi.aliyun.com',
  '字节豆包': 'https://www.volcengine.com/product/doubao',
  百川: 'https://www.baichuan-ai.com',
  讯飞星火: 'https://xinghuo.xfyun.cn',
  腾讯混元: 'https://hunyuan.tencent.com',
  SiliconFlow: 'https://siliconflow.cn',
  OpenRouter: 'https://openrouter.ai',
  Anthropic: 'https://www.anthropic.com',
  OpenAI: 'https://platform.openai.com',
  Google: 'https://ai.google.dev',
};

function getApiTypeForTool(toolName: string): ApiType | null {
  for (const [apiType, tools] of Object.entries(API_TYPE_TOOLS)) {
    if (tools.includes(toolName)) return apiType as ApiType;
  }
  return null;
}

function inferWebsite(name: string): string {
  for (const [key, url] of Object.entries(KNOWN_WEBSITES)) {
    if (name.includes(key)) return url;
  }
  return '';
}

function convertServerList(raw: any[]): ProviderFormData[] {
  return raw.flatMap((sp: any) => {
    const type = sp.type === 'custom' ? 'custom' : 'official';
    const entries: ProviderFormData[] = [];
    if (sp.openaiApiBase) entries.push({ icon: sp.icon || '', name: sp.name, type, apiType: 'openai', apiBase: sp.openaiApiBase, apiKey: '', website: sp.website || '', cliUrls: {}, headers: {}, models: [] });
    if (sp.anthropicApiBase) entries.push({ icon: sp.icon || '', name: sp.name, type, apiType: 'anthropic', apiBase: sp.anthropicApiBase, apiKey: '', website: sp.website || '', cliUrls: {}, headers: {}, models: [] });
    if (sp.googleApiBase) entries.push({ icon: sp.icon || '', name: sp.name, type, apiType: 'google', apiBase: sp.googleApiBase, apiKey: '', website: sp.website || '', cliUrls: {}, headers: {}, models: [] });
    return entries;
  });
}

const API_TYPE_COLORS: Record<string, string> = {
  openai: '#10A37F',
  anthropic: '#D97757',
  google: '#4285F4',
};

export function ProviderFormDialog({ open, onClose, onSave, initialData, toolName }: Props) {
  const { t } = useI18n();
  const toolDisplayName = toolName ? TOOL_DISPLAY_NAMES[toolName] || toolName : '';
  const toolApiType = toolName ? getApiTypeForTool(toolName) : null;

  const [name, setName] = useState(initialData?.name ?? '');
  const [type, setType] = useState<'official' | 'third-party' | 'custom'>(initialData?.type ?? 'custom');
  const [apiType, setApiType] = useState<ApiType>(initialData?.apiType ?? toolApiType ?? 'openai');
  const [apiBase, setApiBase] = useState(initialData?.apiBase ?? '');
  const [apiKey, setApiKey] = useState(initialData?.apiKey ?? '');
  const [website, setWebsite] = useState(initialData?.website ?? '');
  const [model, setModel] = useState(initialData?.models[0] ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [touched, setTouched] = useState(false);
  const [systemPresets, setSystemPresets] = useState<ProviderFormData[]>([]);
  const [fetchError, setFetchError] = useState(false);

  // Fetch system providers from server when dialog opens
  useEffect(() => {
    if (!open) return;
    setFetchError(false);
    const fetchPresets = async () => {
      // Try IPC first (uses configured server URL), fallback to direct HTTP
      try {
        if (api?.getSystemProviders) {
          const list = await api.getSystemProviders();
          if (Array.isArray(list) && list.length > 0) {
            setSystemPresets(list);
            return;
          }
        }
      } catch {}
      // Fallback: direct HTTP with configured server URL
      try {
        const settings = await api.getSettings();
        const serverUrl = settings?.serverUrl || 'http://localhost:3000';
        const res = await fetch(`${serverUrl}/api/system-providers`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const raw = await res.json();
          setSystemPresets(convertServerList(raw));
          return;
        }
      } catch {}
      setSystemPresets([]);
      setFetchError(true);
    };
    fetchPresets();
  }, [open]);

  // Sync form fields when dialog opens (edit or add)
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setTouched(false);
    setName(initialData?.name ?? '');
    setType(initialData?.type ?? 'custom');
    setApiType(initialData?.apiType ?? toolApiType ?? 'openai');
    setApiBase(initialData?.apiBase ?? '');
    setApiKey(initialData?.apiKey ?? '');
    setWebsite(initialData?.website ?? '');
    setModel(initialData?.models[0] ?? '');
  }, [open, initialData, toolApiType]);

  const handlePresetSelect = (preset: ProviderFormData) => {
    setName(preset.name);
    setType(preset.type);
    if (preset.apiType) setApiType(preset.apiType);
    setApiBase(preset.apiBase);
    setWebsite(preset.website || inferWebsite(preset.name));
    setModel(preset.models[0] ?? '');
    setErrors({});
  };

  const openUrl = (url: string) => {
    if (api?.openExternal) api.openExternal(url);
    else window.open(url, '_blank');
  };

  const handleSave = async () => {
    setTouched(true);
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('provider.form.validationName');
    if (!apiBase.trim()) newErrors.apiBase = t('provider.form.validationApiBase');
    if (!apiKey.trim()) newErrors.apiKey = t('provider.form.validationApiKey');
    if (!model.trim()) newErrors.model = t('provider.form.validationModel');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    await onSave({
      name,
      type,
      apiType,
      apiBase,
      apiKey,
      website: website || inferWebsite(name),
      cliUrls: initialData?.cliUrls ?? {},
      headers: initialData?.headers ?? {},
      models: model ? [model] : [],
    });
    setSaving(false);
  };

  const handleClose = () => {
    onClose();
  };

  if (!open) return null;

  // Filter presets: hide when editing; when tool is specified, only show matching API types
  const toolSupportedApiTypes: ApiType[] = toolName
    ? (Object.entries(API_TYPE_TOOLS).filter(([, tools]) => tools.includes(toolName)).map(([t]) => t as ApiType))
    : [];
  const filteredPresets = initialData
    ? []
    : (toolSupportedApiTypes.length > 0
        ? systemPresets.filter((p) => toolSupportedApiTypes.includes(p.apiType))
        : systemPresets);

  // Deduplicate: if same name appears with multiple API types, keep the one most
  // relevant to the current tool. For gemini-cli (which supports both openai and
  // google), prefer openai since most non-Google providers are OpenAI-compatible.
  const dedupedPresets: typeof filteredPresets = [];
  const seen = new Set<string>();
  for (const p of filteredPresets) {
    const existing = dedupedPresets.find((x) => x.name === p.name);
    if (existing) {
      // Keep the more suitable API type: prefer openai > anthropic > google
      const rank: Record<string, number> = { openai: 0, anthropic: 1, google: 2 };
      if ((rank[p.apiType] ?? 99) < (rank[existing.apiType] ?? 99)) {
        dedupedPresets[dedupedPresets.indexOf(existing)] = p;
      }
    } else {
      dedupedPresets.push(p);
    }
  }

  // Current selected preset (with website)
  const selectedPreset = dedupedPresets.find((p) => p.name === name);

  const apiTypeOptions = [
    { value: 'openai' as ApiType, label: t('provider.apiType.openai'), desc: t('provider.form.apiTypeDescOpenai') },
    { value: 'anthropic' as ApiType, label: t('provider.apiType.anthropic'), desc: t('provider.form.apiTypeDescAnthropic') },
    { value: 'google' as ApiType, label: t('provider.apiType.google'), desc: t('provider.form.apiTypeDescGoogle') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white text-text-primary rounded-2xl shadow-xl w-full max-w-lg mx-4 p-0 max-h-[460px] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-black/5 transition-colors text-lg leading-none">&times;</button>
        <div className="p-6">
          {/* Title + API type badge */}
          {initialData ? (
            <h3 className="text-lg font-bold mb-1">{t('provider.form.editTitle')}</h3>
          ) : toolDisplayName ? (
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              {t('provider.form.configFor', { tool: toolDisplayName })}
              {toolApiType && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-normal"
                  style={{ background: API_TYPE_COLORS[toolApiType] + '20', color: API_TYPE_COLORS[toolApiType] }}
                >
                  {t(`provider.apiType.${toolApiType}`)}
                </span>
              )}
            </h3>
          ) : (
            <h3 className="text-lg font-bold mb-1">{t('provider.form.addTitle')}</h3>
          )}
          {!initialData && toolDisplayName && (
            <p className="text-xs text-text-tertiary mb-5">{t('provider.form.presetHint')}</p>
          )}
          {toolName === 'gemini-cli' && (
            <p className="text-xs text-accent mb-4 flex items-center gap-1">
              <span>💡</span>
              <span>Gemini CLI 现在也支持 OpenAI 兼容格式的供应商了</span>
            </p>
          )}

          {/* Preset providers */}
          {!initialData && (
            <>
              {dedupedPresets.length > 0 ? (
                <div className="mb-5">
                  <label className="text-xs font-semibold text-text-secondary uppercase mb-2 block">
                    {t('provider.form.presetImport')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {dedupedPresets.map((p) => {
                      const isSelected = name === p.name;
                      const brandColor = PROVIDER_COLORS[p.name] || '#0071e3';
                      return (
                        <button
                          key={p.name + '|' + p.apiType}
                          onClick={() => handlePresetSelect(p)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-white/20'
                              : 'border-border bg-white text-text-secondary hover:border-accent/40 hover:text-text-primary'
                          }`}
                          style={{
                            borderColor: isSelected ? brandColor : undefined,
                            color: isSelected ? brandColor : undefined,
                          }}
                        >
                          <span className={isSelected ? '' : 'grayscale brightness-50'}>{PROVIDER_ICONS[p.icon || p.name]}</span>
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Selected preset website link */}
                  {selectedPreset?.website && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <svg className="w-3 h-3 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      <button onClick={() => openUrl(selectedPreset.website!)} className="text-accent hover:underline truncate max-w-[320px]">
                        {selectedPreset.website}
                      </button>
                      <span className="text-text-tertiary">{t('provider.form.websiteHint')}</span>
                    </div>
                  )}
                </div>
              ) : fetchError && (
                <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-xs">
                  无法加载系统供应商，请确认服务端 (localhost:3000) 已启动
                </div>
              )}
            </>
          )}

          {/* Form fields — no website, no API type selector */}
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">{t('provider.form.nameLabel')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('provider.form.namePlaceholder')}
                className={`input input-bordered w-full ${errors.name && touched ? 'border-danger' : ''}`}
              />
              {errors.name && touched && <p className="text-xs text-danger mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                {t('provider.form.apiBaseLabel')}
                {toolApiType && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-normal ml-1.5"
                    style={{ background: API_TYPE_COLORS[toolApiType] + '20', color: API_TYPE_COLORS[toolApiType] }}
                  >
                    {t('provider.form.apiBaseHint', { apiType: t(`provider.apiType.${toolApiType}`) })}
                  </span>
                )}
              </label>
              <input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                placeholder={t('provider.form.apiBasePlaceholder')}
                className={`input input-bordered w-full font-mono ${errors.apiBase && touched ? 'border-danger' : ''}`}
              />
              {errors.apiBase && touched && <p className="text-xs text-danger mt-1">{errors.apiBase}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">{t('provider.form.apiKeyLabel')}</label>
              <div className="relative">
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('provider.form.apiKeyPlaceholder')}
                  type={showApiKey ? 'text' : 'password'}
                  className={`input input-bordered w-full pr-9 font-mono ${errors.apiKey && touched ? 'border-danger' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!showApiKey && apiKey) {
                      navigator.clipboard.writeText(apiKey);
                    }
                    setShowApiKey(!showApiKey);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
                  title={showApiKey ? t('common.hide') : t('provider.form.viewAndCopy')}
                >
                  {showApiKey ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {errors.apiKey && touched && <p className="text-xs text-danger mt-1">{errors.apiKey}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                {t('provider.form.modelLabel')}
              </label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t('provider.form.modelPlaceholder')}
                className={`input input-bordered w-full ${errors.model && touched ? 'border-danger' : ''}`}
              />
              {errors.model && touched && <p className="text-xs text-danger mt-1">{errors.model}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 mt-6">
            <button onClick={handleClose} className="btn btn-ghost">{t('common.cancel')}</button>
            <button
              onClick={handleSave}
              disabled={!name || !apiBase || saving}
              className="btn btn-primary"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
