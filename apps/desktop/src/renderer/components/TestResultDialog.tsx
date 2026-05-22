import { useEffect, useState, useRef } from 'react';
import { useI18n } from '../hooks/useI18n';

interface Props {
  open: boolean;
  providerName: string;
  result: { success: boolean; latencyMs: number; error?: string } | null;
  onClose: () => void;
}

export function TestResultDialog({ open, providerName, result, onClose }: Props) {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState(3);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          onCloseRef.current();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  if (!open || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white text-text-primary rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-black/5 transition-colors text-lg leading-none">&times;</button>
        {result.success ? (
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
        <h3 className="text-lg font-bold mb-1">{providerName}</h3>
        <p className="text-sm text-text-secondary mb-3">
          {result.success ? t('provider.testResult.success', { latencyMs: result.latencyMs }) : t('provider.testResult.failure', { error: result.error ?? '' })}
        </p>
        <button onClick={onClose} className="btn btn-primary">
          {t('provider.testResult.close', { countdown })}
        </button>
      </div>
    </div>
  );
}
