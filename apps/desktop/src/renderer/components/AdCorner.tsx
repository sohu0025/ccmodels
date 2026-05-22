import { useState, useEffect, useCallback, useRef } from 'react';

interface AdData {
  id: string;
  htmlContent: string;
  linkUrl: string;
  width: number;
  height: number;
}

export function AdCorner() {
  const [ad, setAd] = useState<AdData | null>(null);
  const dismissedIds = useRef<string[]>([]);

  const loadAd = useCallback(() => {
    (window as any).electronAPI.getAdsByType('corner').then((list: any[]) => {
      const available = list.filter((a: any) => a.enabled && a.htmlContent);
      const unseen = available.find((a: any) => !dismissedIds.current.includes(a.id));
      if (unseen) {
        setAd({ id: unseen.id, htmlContent: unseen.htmlContent, linkUrl: unseen.linkUrl || '', width: unseen.width || 200, height: unseen.height || 200 });
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
    <div
      className="fixed bottom-0 right-0 z-[9990]"
      style={{ width: ad.width, height: ad.height }}
    >
      <button
        onClick={handleClose}
        className="absolute -top-2 -left-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white shadow border border-border text-text-tertiary text-xs hover:text-text-primary hover:bg-bg-secondary transition-colors"
      >
        ✕
      </button>
      <div
        className={`w-full h-full overflow-hidden ${ad.linkUrl ? 'cursor-pointer' : ''}`}
        onClick={handleAdClick}
        dangerouslySetInnerHTML={{ __html: ad.htmlContent }}
      />
    </div>
  );
}
