import { useState } from 'react';
import { useProviders } from '../hooks/useProviders';
import { ProviderCard } from '../components/ProviderCard';
import { ProviderFormDialog } from '../components/ProviderFormDialog';
import type { Provider, ProviderFormData } from '@ccswitch/shared';

export function Providers() {
  const { providers, loading, create, update, remove, setActive } = useProviders();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);

  const handleSave = async (data: ProviderFormData) => {
    if (editing) {
      await update(editing.id, data);
    } else {
      await create(data);
    }
    setDialogOpen(false);
    setEditing(null);
  };

  if (loading) return <div className="p-8 text-text-secondary">加载中...</div>;

  const activeProvider = providers.find((p) => p.isActive);
  const otherProviders = providers.filter((p) => !p.isActive);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">供应商管理</h2>
          <p className="text-sm text-text-secondary mt-1">管理所有 AI CLI 工具的 API 供应商</p>
        </div>
        <button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
        >
          + 添加供应商
        </button>
      </div>

      {activeProvider && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase">当前使用</h3>
          <div className="grid grid-cols-2 gap-4">
            <ProviderCard
              provider={activeProvider}
              isActive={true}
              onSetActive={() => {}}
              onEdit={() => { setEditing(activeProvider); setDialogOpen(true); }}
              onDelete={() => remove(activeProvider.id)}
            />
          </div>
        </div>
      )}

      {otherProviders.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase">
            {activeProvider ? '其他供应商' : '所有供应商'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {otherProviders.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                isActive={false}
                onSetActive={() => setActive(p.id)}
                onEdit={() => { setEditing(p); setDialogOpen(true); }}
                onDelete={() => remove(p.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        !activeProvider && (
          <div className="text-center py-16 text-text-secondary">
            <p className="text-lg mb-2">暂无供应商</p>
            <p className="text-sm">点击上方按钮添加你的第一个 API 供应商</p>
          </div>
        )
      )}

      <ProviderFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
        initialData={editing}
      />
    </div>
  );
}
