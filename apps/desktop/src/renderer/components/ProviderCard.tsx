import type { Provider } from '@ccswitch/shared';

interface Props {
  provider: Provider;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProviderCard({ provider, isActive, onSetActive, onEdit, onDelete }: Props) {
  return (
    <div
      className={`rounded-xl p-4 border-2 transition-colors cursor-pointer ${
        isActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{provider.name}</h3>
        <div className="flex gap-1">
          {isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white font-medium">
              当前
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
            {provider.type === 'official' ? '官方' : provider.type === 'third-party' ? '中转' : '自定义'}
          </span>
        </div>
      </div>
      <p className="text-xs text-text-secondary mb-3 truncate">{provider.apiBase}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {provider.models.slice(0, 3).map((m) => (
          <span key={m} className="text-xs px-2 py-0.5 rounded bg-bg-tertiary">
            {m}
          </span>
        ))}
        {provider.models.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary">
            +{provider.models.length - 3}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {!isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetActive(); }}
            className="text-xs px-3 py-1 rounded-lg bg-accent text-white hover:bg-accent-hover"
          >
            切换
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-xs px-3 py-1 rounded-lg border border-border hover:bg-bg-tertiary"
        >
          编辑
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-xs px-3 py-1 rounded-lg border border-border text-danger hover:bg-danger/10"
        >
          删除
        </button>
      </div>
    </div>
  );
}
