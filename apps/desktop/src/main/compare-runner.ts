import https from 'node:https';
import http from 'node:http';
import { getAllProviders } from '../database/providers';
import { createCompareTest, updateCompareResponse } from '../database/compare-tests';
import type { CompareResponse } from '@ccswitch/shared';

/**
 * Run a compare test: send the same prompt to multiple models concurrently.
 * Models are matched against active providers by checking their model lists.
 */
export async function runCompareTest(
  prompt: string,
  modelIds: string[],
): Promise<string> {
  const test = createCompareTest(prompt, modelIds);
  console.log(`[Compare] Created test ${test.id} with models: ${modelIds.join(', ')}`);

  // Find providers that host the requested models
  const providers = getAllProviders().filter((p) => p.isActive);
  if (providers.length === 0) {
    updateCompareResponse(test.id, {
      modelId: 'error',
      content: '',
      error: 'No active provider configured',
      latencyMs: 0,
      tokens: 0,
      cost: 0,
    });
    return test.id;
  }

  // Build a map: modelId -> provider
  const modelProviderMap = new Map<string, typeof providers[0]>();
  for (const model of modelIds) {
    // Check if any active provider explicitly lists this model
    let matched = providers.find((p) => p.models.includes(model));
    if (!matched && providers.length > 0) {
      // Fallback: use the first active provider
      matched = providers[0];
    }
    if (matched) {
      modelProviderMap.set(model, matched);
    }
  }

  // Fire concurrent requests
  const promises = modelIds.map(async (modelId) => {
    const provider = modelProviderMap.get(modelId);
    if (!provider) {
      return {
        modelId,
        content: '',
        error: `No provider found for model ${modelId}`,
        latencyMs: 0,
        tokens: 0,
        cost: 0,
      };
    }

    return callModelAPI(provider, modelId, prompt);
  });

  // Collect results as they complete
  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      updateCompareResponse(test.id, result.value);
    } else {
      updateCompareResponse(test.id, {
        modelId: 'unknown',
        content: '',
        error: result.reason?.message ?? 'Unknown error',
        latencyMs: 0,
        tokens: 0,
        cost: 0,
      });
    }
  }

  console.log(`[Compare] Test ${test.id} completed`);
  return test.id;
}

/**
 * Call a single model API via OpenAI-compatible chat completions endpoint.
 */
async function callModelAPI(
  provider: { id: string; name: string; apiBase: string; apiKey: string; models: string[] },
  modelId: string,
  prompt: string,
): Promise<CompareResponse> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const url = new URL(`${provider.apiBase}/v1/chat/completions`);
    const body = JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    });

    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const latencyMs = Date.now() - startTime;
          const responseBody = Buffer.concat(chunks).toString('utf-8');

          if (res.statusCode && res.statusCode >= 400) {
            resolve({
              modelId,
              content: '',
              error: `HTTP ${res.statusCode}: ${responseBody.substring(0, 200)}`,
              latencyMs,
              tokens: 0,
              cost: 0,
            });
            return;
          }

          try {
            const json = JSON.parse(responseBody);
            const content = json.choices?.[0]?.message?.content ?? '';
            const promptTokens = json.usage?.prompt_tokens ?? 0;
            const completionTokens = json.usage?.completion_tokens ?? 0;
            const cost = estimateCost(promptTokens, completionTokens, modelId);

            resolve({
              modelId,
              content,
              error: null,
              latencyMs,
              tokens: promptTokens + completionTokens,
              cost,
            });
          } catch {
            resolve({
              modelId,
              content: '',
              error: `Failed to parse response: ${responseBody.substring(0, 200)}`,
              latencyMs,
              tokens: 0,
              cost: 0,
            });
          }
        });
      },
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(body);
    req.end();
  });
}

function estimateCost(promptTokens: number, completionTokens: number, _modelId: string): number {
  const inputPrice = 3 / 1_000_000;
  const outputPrice = 15 / 1_000_000;
  return promptTokens * inputPrice + completionTokens * outputPrice;
}
