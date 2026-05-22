import { useI18n } from '../hooks/useI18n';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel: confirmLabelProp, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const confirmLabel = confirmLabelProp ?? t('common.confirm');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white text-text-primary rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-black/5 transition-colors text-lg leading-none">&times;</button>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-6">{message}</p>
        <div className="flex justify-end gap-2.5">
          <button onClick={onCancel} className="btn btn-ghost">{t('common.cancel')}</button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className="btn btn-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
