import type { Provider } from '@ccmodels/shared';
import { useI18n } from '../hooks/useI18n';

interface Props {
  provider: Provider;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProviderCard({ provider, isActive, onSetActive, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  return (
    <div
      className={`rounded-2xl p-5 border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-accent bg-accent/5 shadow-sm'
          : 'border-border hover:border-accent/40 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{provider.name}</h3>
        <div className="flex gap-1.5">
          {isActive && (
            <span className="badge badge-success">{t('provider.current')}</span>
          )}
          <span className="badge badge-ghost">
            {t(`provider.providerType.${provider.type}`)}
          </span>
          <span className={`badge text-[11px] ${
            provider.apiType === 'anthropic' ? 'badge-warning' :
            provider.apiType === 'google' ? 'badge-info' :
            'badge-ghost'
          }`}>
            {t(`provider.apiType.${provider.apiType}`)}
          </span>
        </div>
      </div>
      <p className="text-xs text-text-tertiary mb-4 truncate font-mono">{provider.apiBase}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {provider.models.slice(0, 3).map((m) => (
          <span key={m} className="badge badge-ghost">{m}</span>
        ))}
        {provider.models.length > 3 && (
          <span className="badge badge-ghost text-text-tertiary">+{provider.models.length - 3}</span>
        )}
      </div>
      <div className="flex gap-2">
        {!isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetActive(); }}
            className="btn btn-primary btn-xs"
          >
            {t('provider.setActive')}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="btn btn-ghost btn-xs"
        >
          {t('common.edit')}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="btn btn-ghost btn-xs text-error"
        >
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}
