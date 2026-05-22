import * as Sentry from '@sentry/electron/main';

const DSN = process.env.SENTRY_DSN || '';

export function initSentry(): void {
  if (!DSN) {
    console.log('[Sentry] DSN not configured — skipping');
    return;
  }
  Sentry.init({ dsn: DSN, tracesSampleRate: 0.1 });
}

export function getSentryDsn(): string {
  return DSN;
}
