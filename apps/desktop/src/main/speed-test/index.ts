import http from 'node:http';
import https from 'node:https';
import { getActiveProvider, getAllProviders, getToolProvidersRaw } from '../database/providers';
import { recordSpeedTest } from '../database/speed-tests';

export function startSpeedTesting(): void {
  // Speed tests are now triggered manually from the UI.
}

export function stopSpeedTesting(): void {
}

export async function runSpeedTests(): Promise<void> {
  // Collect all providers that are either global active or assigned to a tool
  const providerIds = new Set<string>();

  const globalActive = getActiveProvider();
  if (globalActive) providerIds.add(globalActive.id);

  // Also test providers assigned to any tool
  const toolProviders = getToolProvidersRaw();
  for (const value of Object.values(toolProviders)) {
    const ids = Array.isArray(value) ? value : (value ? [value] : []);
    for (const id of ids) {
      providerIds.add(id);
    }
  }

  if (providerIds.size === 0) return;

  const allProviders = getAllProviders();
  const providersToTest = allProviders.filter(p => providerIds.has(p.id));

  for (const provider of providersToTest) {
    const model = provider.models[0] ?? '';
    const startTime = Date.now();
    try {
      await pingProvider(provider.apiBase, provider.apiKey);
      const latencyMs = Date.now() - startTime;
      recordSpeedTest(provider.id, latencyMs, true, model);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      recordSpeedTest(provider.id, latencyMs, false, model, err.message);
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
