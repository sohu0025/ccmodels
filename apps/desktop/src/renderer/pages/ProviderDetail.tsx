import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Provider } from '@ccmodels/shared';
import { useI18n } from '../hooks/useI18n';

const api = (window as any).electronAPI;

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [cliUrls, setCliUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    api.getProvider(id).then((p: Provider | null) => {
      setProvider(p);
      setCliUrls(p?.cliUrls ?? {});
    });
  }, [id]);

  const handleSaveCliUrls = async () => {
    if (!provider) return;
    await api.updateProvider(provider.id, { cliUrls });
    navigate('/providers');
  };

  if (!provider) return <div className="p-8 text-text-secondary">{t('common.loading')}</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/providers')} className="text-sm text-accent mb-4 block">
        {t('providerDetail.back')}
      </button>
      <h2 className="text-xl font-bold mb-6">{provider.name}{t('providerDetail.title')}</h2>
      <p className="text-sm text-text-secondary mb-6">
        {t('providerDetail.desc')}{provider.apiBase}
      </p>

      <div className="space-y-4 max-w-lg">
        {['claude-code', 'codex', 'gemini-cli', 'opencode', 'openclaw', 'hermes'].map((tool) => (
          <div key={tool}>
            <label className="text-sm font-semibold block mb-1">{tool}</label>
            <input
              value={cliUrls[tool] ?? ''}
              onChange={(e) => setCliUrls({ ...cliUrls, [tool]: e.target.value })}
              placeholder={provider.apiBase}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveCliUrls}
        className="mt-6 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
      >
        {t('providerDetail.save')}
      </button>
    </div>
  );
}
