import { useState, useEffect } from 'react';
import { useProviders } from '../hooks/useProviders';
import { useToolContext } from '../components/Layout';
import { useI18n } from '../hooks/useI18n';
import { ProviderFormDialog } from '../components/ProviderFormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TestResultDialog } from '../components/TestResultDialog';
import type { Provider, ProviderFormData } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function Providers() {
  const { providers, loading, create, update, remove, addProviderToTool, removeProviderFromTool, setToolActiveProvider, externalVersion } = useProviders();
  const { selectedTool, getToolInfo } = useToolContext();
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);

  // Confirm dialog state
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Test dialog state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; error?: string } | null>(null);
  const [testProviderName, setTestProviderName] = useState('');

  const toolInfo = getToolInfo(selectedTool);

  // Per-tool provider IDs and active provider
  const [toolProviderIds, setToolProviderIds] = useState<string[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);

  useEffect(() => {
    api.getToolProviderList(selectedTool).then(setToolProviderIds);
    api.getToolActiveProvider(selectedTool).then(setActiveProviderId);
  }, [selectedTool, externalVersion]);

  const refreshToolState = () => {
    api.getToolProviderList(selectedTool).then(setToolProviderIds);
    api.getToolActiveProvider(selectedTool).then(setActiveProviderId);
  };

  // Providers mapped to this tool, sorted: active first
  const toolProviders = toolProviderIds
    .map((id) => providers.find((p) => p.id === id))
    .filter(Boolean) as Provider[];

  const sortedProviders = [...toolProviders].sort((a, b) => {
    if (a.id === activeProviderId) return -1;
    if (b.id === activeProviderId) return 1;
    return 0;
  });

  const activeProvider = providers.find((p) => p.id === activeProviderId) ?? toolProviders[0] ?? null;

  const handleSave = async (data: ProviderFormData) => {
    if (editing) {
      await update(editing.id, data);
    } else {
      const newProvider = await create(data);
      await addProviderToTool(selectedTool, newProvider.id);
      if (toolProviderIds.length === 0) {
        await setToolActiveProvider(selectedTool, newProvider.id);
      }
    }
    setDialogOpen(false);
    setEditing(null);
    refreshToolState();
  };

  const handleSetActive = async (providerId: string) => {
    await setToolActiveProvider(selectedTool, providerId);
    setActiveProviderId(providerId);
  };

  const handleRemoveConfirm = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete);
    await removeProviderFromTool(selectedTool, confirmDelete);
    if (activeProviderId === confirmDelete) {
      setActiveProviderId(null);
    }
    setConfirmDelete(null);
    refreshToolState();
  };

  const handleTest = async (provider: Provider) => {
    setTestingId(provider.id);
    setTestProviderName(provider.name);
    setTestResult(null);
    const result = await api.testProvider(provider.id);
    setTestResult(result);
    setTestingId(null);
  };

  if (loading) return <div className="p-6 text-text-secondary">{t('common.loading')}</div>;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">{toolInfo?.displayName ?? selectedTool}</h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            {t('provider.apiTypeLabel')}: {toolInfo ? t(`provider.apiType.${toolInfo.apiType}`) : '-'}
          </p>
          {selectedTool === 'gemini-cli' && (
            <p className="text-xs text-accent mt-1">💡 Gemini CLI 已支持 OpenAI 兼容格式供应商</p>
          )}
        </div>
        {sortedProviders.length > 0 && (
          <button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="btn btn-primary"
          >
            + {t('provider.add')}
          </button>
        )}
      </div>

      {/* Provider list */}
      {sortedProviders.length > 0 ? (
        <div className="space-y-3">
          {sortedProviders.map((provider) => {
            const isActive = provider.id === activeProviderId;
            return (
              <div
                key={provider.id}
                className={`group rounded-2xl border-2 p-4 transition-all ${
                  isActive
                    ? 'border-accent bg-accent/5 shadow-sm'
                    : 'border-border bg-white/80 backdrop-blur-xl hover:border-accent/30'
                }`}
              >
                {/* Line 1: name | actions */}
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm text-text-primary pt-1">{provider.name}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTest(provider); }}
                      disabled={testingId === provider.id}
                      className="btn btn-outline btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {testingId === provider.id ? t('provider.testing') : t('provider.test')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(provider); setDialogOpen(true); }}
                      className="btn btn-outline btn-sm"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(provider.id); }}
                      className="btn btn-outline btn-error btn-sm"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>

                {/* Line 2: status + type badges + website */}
                <div className="flex items-center gap-2 mb-1">
                  {isActive ? (
                    <span className="inline-flex items-center rounded-full bg-transparent text-text-secondary border border-border px-2.5 py-0.5 text-xs font-medium">
                      {t('provider.current')}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetActive(provider.id); }}
                      className="inline-flex items-center rounded-full bg-accent/10 text-accent border border-accent/30 px-2.5 py-0.5 text-xs font-medium hover:bg-accent/20 cursor-pointer transition-colors"
                    >
                      {t('provider.enable')}
                    </button>
                  )}
                  <span className="badge badge-ghost badge-sm">
                    {t(`provider.apiType.${provider.apiType}`)}
                  </span>
                  {provider.type !== 'official' && (
                    <span className="badge badge-soft badge-sm">
                      {t(`provider.providerType.${provider.type}`)}
                    </span>
                  )}
                  {provider.website && (
                    <a
                      href={provider.website}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); api.openExternal(provider.website); }}
                      className="ml-auto text-xs text-accent hover:underline truncate max-w-[200px] cursor-pointer"
                    >
                      {provider.website}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm text-text-tertiary mb-3">{t('provider.empty.tool')}</p>
          <p className="text-xs text-text-tertiary/60 mb-4">
            {t('provider.empty.toolHint')}
          </p>
          <button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="btn btn-primary"
          >
            + {t('provider.empty.addNew')}
          </button>
        </div>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={t('provider.delete')}
        message={t('provider.confirmDelete')}
        confirmLabel={t('common.delete')}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Test result dialog */}
      <TestResultDialog
        open={testResult !== null}
        providerName={testProviderName}
        result={testResult}
        onClose={() => setTestResult(null)}
      />

      {/* Provider form dialog */}
      <ProviderFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
        initialData={editing}
        toolName={selectedTool}
      />
    </div>
  );
}
