import * as Sentry from '@sentry/electron/renderer';

export function initRendererSentry(): void {
  const dsn = (window as any).electronAPI?.getSentryDsn?.();
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}
