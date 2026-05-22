import https from 'node:https';
import http from 'node:http';
import { getProviderById } from './database/providers';
import { createCompareTest, updateCompareResponse } from './database/compare-tests';
import type { CompareResponse } from '@ccmodels/shared';

interface ProviderInfo {
  id: string;
  name: string;
  apiBase: string;
  apiKey: string;
  apiType: string;
  models: string[];
}

/**
 * Run a compare test: send the same prompt to two providers concurrently.
 * Uses the provided model IDs for each provider.
 */
export async function runCompareTest(
  prompt: string,
  providerIds: string[],
  modelIds: string[],
): Promise<string> {
  // Resolve providers
  const providers = providerIds.map(id => getProviderById(id)).filter(Boolean) as ProviderInfo[];
  const test = createCompareTest(prompt, modelIds);

  if (providers.length === 0) {
    updateCompareResponse(test.id, {
      modelId: 'error',
      providerId: '',
      content: '',
      error: 'No provider selected',
      latencyMs: 0,
      tokens: 0,
      cost: 0,
    });
    return test.id;
  }

  // Fire concurrent requests
  const promises = providers.map(async (provider, i) => {
    const modelId = modelIds[i] || provider.models[0] || 'unknown';
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
        providerId: '',
        content: '',
        error: result.reason?.message ?? 'Unknown error',
        latencyMs: 0,
        tokens: 0,
        cost: 0,
      });
    }
  }

  return test.id;
}

/**
 * Call a model API using the appropriate endpoint and format based on apiType.
 */
async function callModelAPI(
  provider: ProviderInfo,
  modelId: string,
  prompt: string,
): Promise<CompareResponse> {
  const startTime = Date.now();

  try {
    const apiType = provider.apiType || 'openai';
    let url: URL;
    let body: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiType === 'anthropic') {
      url = new URL(`${provider.apiBase}/v1/messages`);
      headers['x-api-key'] = provider.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: modelId,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
    } else {
      // OpenAI-compatible (openai, google, etc.)
      url = new URL(`${provider.apiBase}/v1/chat/completions`);
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
      body = JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.7,
      });
    }

    return new Promise((resolve) => {
      const transport = url.protocol === 'https:' ? https : http;
      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            ...headers,
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
                providerId: provider.id,
                content: '',
                error: `HTTP ${res.statusCode}: ${responseBody.substring(0, 300)}`,
                latencyMs,
                tokens: 0,
                cost: 0,
              });
              return;
            }

            try {
              const json = JSON.parse(responseBody);
              let content = '';
              let promptTokens = 0;
              let completionTokens = 0;

              if (apiType === 'anthropic') {
                // Anthropic Messages API: { content: [{ type: 'text', text: '...' }], usage: { input_tokens, output_tokens } }
                content = json.content?.map((b: Record<string, unknown>) => (b.text as string) || '').join('\n') ?? '';
                promptTokens = json.usage?.input_tokens ?? 0;
                completionTokens = json.usage?.output_tokens ?? 0;
              } else {
                // OpenAI Chat Completions: { choices: [{ message: { content } }], usage: { prompt_tokens, completion_tokens } }
                content = json.choices?.[0]?.message?.content ?? '';
                promptTokens = json.usage?.prompt_tokens ?? 0;
                completionTokens = json.usage?.completion_tokens ?? 0;
              }

              const cost = estimateCost(promptTokens, completionTokens, modelId);
              resolve({
                modelId,
                providerId: provider.id,
                content,
                error: undefined,
                latencyMs,
                tokens: promptTokens + completionTokens,
                cost,
              });
            } catch {
              resolve({
                modelId,
                providerId: provider.id,
                content: '',
                error: `Failed to parse response: ${responseBody.substring(0, 300)}`,
                latencyMs,
                tokens: 0,
                cost: 0,
              });
            }
          });
        },
      );

      req.on('error', (err) => {
        resolve({
          modelId,
          providerId: provider.id,
          content: '',
          error: err.message,
          latencyMs: Date.now() - startTime,
          tokens: 0,
          cost: 0,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          modelId,
          providerId: provider.id,
          content: '',
          error: 'Request timeout',
          latencyMs: Date.now() - startTime,
          tokens: 0,
          cost: 0,
        });
      });

      req.write(body);
      req.end();
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      modelId,
      providerId: provider.id,
      content: '',
      error: msg,
      latencyMs: Date.now() - startTime,
      tokens: 0,
      cost: 0,
    };
  }
}

function estimateCost(promptTokens: number, completionTokens: number, _modelId: string): number {
  const inputPrice = 3 / 1_000_000;
  const outputPrice = 15 / 1_000_000;
  return promptTokens * inputPrice + completionTokens * outputPrice;
}
