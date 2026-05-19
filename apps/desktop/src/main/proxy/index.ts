import http from 'node:http';
import https from 'node:https';
import { resolveRoute } from './router';
import { logRequest, logRequestWithUsage, parseUsageFromResponse } from './logger';
import { getSettings } from '../database/settings';
import { recordFailure, recordSuccess } from './failover';

let server: http.Server | null = null;
let requestCount = 0;

export function startProxy(): void {
  const settings = getSettings();
  const port = settings.proxyPort;

  server = http.createServer((req, res) => {
    requestCount++;
    const startTime = Date.now();

    // Read request body (with size limit)
    const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB
    let body = '';
    let bodySize = 0;

    req.on('data', (chunk) => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      handleRequest(req, res, body, startTime);
    });
    req.on('error', (err) => {
      console.error('[CC Switch] Client request error:', err.message);
      if (!res.headersSent) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[CC Switch] Port ${port} is already in use`);
    } else {
      console.error('[CC Switch] Proxy server error:', err.message);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[CC Switch] Proxy server running on http://127.0.0.1:${port}`);
  });
}

function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: string,
  startTime: number,
): void {
  try {
    // Detect which CLI tool sent the request
    const cliTool = detectCliTool(req);

    const route = resolveRoute(
      req.url ?? '/',
      req.headers as Record<string, string>,
      cliTool,
    );

    if (!route) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active provider configured. Open CC Switch to set one.' }));
      return;
    }

    // Extract model name from request body
    const modelId = extractModel(body);

    // Parse the target URL for http.request
    const targetUrl = new URL(route.targetUrl);

    // Determine transport based on target URL protocol
    const transport = targetUrl.protocol === 'https:' ? https : http;

    // Forward the request
    const proxyReq = transport.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: {
          ...route.headers,
          host: targetUrl.hostname,
        },
        rejectUnauthorized: true, // Verify TLS certificates
      },
      (proxyRes) => {
        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          const latencyMs = Date.now() - startTime;

          const usage = parseUsageFromResponse(responseBody, modelId);

          if (usage) {
            logRequestWithUsage({
              providerId: route.providerId,
              modelId,
              method: req.method ?? 'GET',
              path: req.url ?? '/',
              statusCode: proxyRes.statusCode ?? 200,
              latencyMs,
              cliTool: cliTool ?? 'unknown',
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              cacheHitTokens: usage.cacheHitTokens,
              cost: usage.cost,
            });
          } else {
            logRequest({
              providerId: route.providerId,
              modelId,
              method: req.method ?? 'GET',
              path: req.url ?? '/',
              statusCode: proxyRes.statusCode ?? 200,
              latencyMs,
              cliTool: cliTool ?? 'unknown',
            });
          }

          // Record success/failure for circuit breaker
          const statusCode = proxyRes.statusCode ?? 200;
          if (statusCode >= 500) {
            recordFailure(route.providerId);
          } else {
            recordSuccess(route.providerId);
          }

          res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
          res.end(responseBody);
        });
      },
    );

    proxyReq.on('error', (err) => {
      console.error('[CC Switch] Proxy request failed:', err.message);
      recordFailure(route.providerId);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy request failed', message: err.message }));
      }
    });

    // Set timeout
    proxyReq.setTimeout(120000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway timeout' }));
      }
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  } catch (err: any) {
    console.error('[CC Switch] Proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal proxy error', message: err.message }));
    }
  }
}

export function stopProxy(): void {
  if (server) {
    server.close();
    server = null;
    console.log('[CC Switch] Proxy server stopped');
  }
}

export function getProxyStatus(): { running: boolean; port: number; requests: number } {
  return {
    running: server !== null,
    port: getSettings().proxyPort,
    requests: requestCount,
  };
}

function detectCliTool(req: http.IncomingMessage): string | null {
  const ua = (req.headers['user-agent'] ?? '').toLowerCase();
  const toolHeader = req.headers['x-cli-tool'] as string | undefined;

  if (toolHeader) return toolHeader;
  if (ua.includes('claude-code') || ua.includes('claude')) return 'claude-code';
  if (ua.includes('codex') || ua.includes('openai')) return 'codex';
  if (ua.includes('gemini')) return 'gemini-cli';
  if (ua.includes('opencode')) return 'opencode';

  return null;
}

function extractModel(body: string): string {
  if (!body) return 'unknown';
  try {
    const json = JSON.parse(body);
    return json.model ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
