import { useState, useEffect } from 'react';

interface AdItem {
  id: string;
  type: 'popup' | 'corner' | 'text';
  title: string;
  htmlContent: string;
  textContent: string;
  width: number;
  height: number;
  enabled: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  popup: '弹窗广告',
  corner: '角标广告',
  text: '文字广告',
};

export function AdsManager() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await (window as any).electronAPI.listAds();
      setAds(list);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const cleanup = (window as any).electronAPI.onAdsChanged(() => {
      load();
    });
    return cleanup;
  }, []);

  if (loading) return <div className="text-text-secondary">加载中...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">广告管理</h2>
        <p className="text-sm text-text-secondary mt-1">广告由后台统一管理，桌面端仅展示</p>
      </div>

      {ads.length === 0 ? (
        <div className="card card-bordered p-12 text-center">
          <p className="text-lg font-medium text-text-secondary">暂无广告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="card card-bordered p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ad.type === 'popup' ? 'bg-accent/10 text-accent' :
                      ad.type === 'corner' ? 'bg-success/10 text-success' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {TYPE_LABELS[ad.type] || ad.type}
                    </span>
                    <span className="font-medium">{ad.title}</span>
                    <span className={`inline-block w-2 h-2 rounded-full ${ad.enabled ? 'bg-success' : 'bg-text-tertiary'}`} />
                  </div>
                  {ad.type === 'text' && ad.textContent && (
                    <p className="text-sm text-text-secondary truncate max-w-md">{ad.textContent}</p>
                  )}
                  {ad.type !== 'text' && (
                    <p className="text-xs text-text-tertiary">{ad.width} × {ad.height}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
