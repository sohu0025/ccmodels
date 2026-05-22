import { useState, useEffect, useCallback, useRef } from 'react';

interface AdData {
  id: string;
  htmlContent: string;
  linkUrl: string;
  width: number;
  height: number;
}

export function AdPopup() {
  const [ad, setAd] = useState<AdData | null>(null);
  const dismissedIds = useRef<string[]>([]);

  const loadAd = useCallback(() => {
    (window as any).electronAPI.getAdsByType('popup').then((list: any[]) => {
      const available = list.filter((a: any) => a.enabled && a.htmlContent);
      const unseen = available.find((a: any) => !dismissedIds.current.includes(a.id));
      if (unseen) {
        setAd({ id: unseen.id, htmlContent: unseen.htmlContent, linkUrl: unseen.linkUrl || '', width: unseen.width || 400, height: unseen.height || 300 });
      } else {
        setAd(null);
      }
    });
  }, []);

  useEffect(() => {
    loadAd();
    const cleanup = (window as any).electronAPI.onAdsChanged(() => {
      loadAd();
    });
    return cleanup;
  }, [loadAd]);

  const handleClose = useCallback(() => {
    if (ad) {
      dismissedIds.current = [...dismissedIds.current, ad.id];
      setAd(null);
    }
  }, [ad]);

  const handleAdClick = useCallback(() => {
    if (ad?.linkUrl) {
      (window as any).electronAPI.openExternal(ad.linkUrl);
    }
  }, [ad]);

  if (!ad) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="relative" style={{ width: ad.width, height: ad.height }}>
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-lg border border-border text-text-primary text-sm hover:bg-bg-secondary transition-colors"
        >
          ✕
        </button>
        <div
          className={`w-full h-full overflow-hidden rounded-xl ${ad.linkUrl ? 'cursor-pointer' : ''}`}
          onClick={handleAdClick}
          dangerouslySetInnerHTML={{ __html: ad.htmlContent }}
        />
      </div>
    </div>
  );
}
