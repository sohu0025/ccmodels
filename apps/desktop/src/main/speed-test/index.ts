import http from 'node:http';
import https from 'node:https';
import { getActiveProvider } from '../database/providers';
import { recordSpeedTest } from '../database/speed-tests';
import { getSettings } from '../database/settings';
import { showNotification } from '../tray';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startSpeedTesting(): void {
  stopSpeedTesting();

  const intervalMinutes = getSettings().speedTestInterval;
  if (intervalMinutes <= 0) return;

  intervalHandle = setInterval(() => {
    runSpeedTests();
  }, intervalMinutes * 60 * 1000);

  // Run immediately on start
  runSpeedTests();
}

export function stopSpeedTesting(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export async function runSpeedTests(): Promise<void> {
  const provider = getActiveProvider();
  if (!provider) return;

  for (const _model of provider.models.slice(0, 1)) {
    const startTime = Date.now();
    try {
      await pingProvider(provider.apiBase, provider.apiKey);
      const latencyMs = Date.now() - startTime;
      recordSpeedTest(provider.id, latencyMs, true);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      recordSpeedTest(provider.id, latencyMs, false, err.message);
    }
  }
}

async function pingProvider(apiBase: string, apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(apiBase);
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/v1/models',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.resume();
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}
