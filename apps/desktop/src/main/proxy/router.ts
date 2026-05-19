import { getActiveProvider, getFallbackProvider } from '../database/providers';
import { isCircuitOpen } from './failover';

export interface RouteResult {
  targetUrl: string;
  headers: Record<string, string>;
  providerId: string;
}

/**
 * Resolve which provider and URL to forward a request to.
 * @param path — the request path (may be relative like /v1/chat/completions or absolute)
 * @param originalHeaders — incoming request headers
 * @param cliTool — which CLI tool originated the request (claude-code, codex, etc.)
 */
export function resolveRoute(
  path: string,
  originalHeaders: Record<string, string>,
  cliTool: string | null,
): RouteResult | null {
  let provider = getActiveProvider();
  if (!provider) return null;

  // Check circuit breaker — auto-failover to a healthy fallback provider
  if (isCircuitOpen(provider.id)) {
    let fallback: typeof provider | null = null;
    let currentId = provider.id;
    while (isCircuitOpen(currentId)) {
      fallback = getFallbackProvider(currentId);
      if (!fallback || fallback.id === currentId) { fallback = null; break; }
      currentId = fallback.id;
    }
    if (fallback) {
      console.log(`[CC Switch] Failover: ${provider.name} -> ${fallback.name}`);
      provider = fallback;
    }
  }

  // Use CLI-tool-specific endpoint if configured
  let baseUrl = provider.apiBase;
  if (cliTool && provider.cliUrls[cliTool]) {
    baseUrl = provider.cliUrls[cliTool];
  }

  // Build target URL: handle both full URLs and relative paths
  let targetUrl: string;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Full URL passthrough
    targetUrl = path;
  } else {
    // Relative path — append to base URL
    targetUrl = baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  }

  // Forward auth and custom headers
  const headers: Record<string, string> = {
    'Content-Type': originalHeaders['content-type'] ?? 'application/json',
  };

  if (provider.apiKey) {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  // Merge provider-specific headers
  Object.assign(headers, provider.headers);

  return {
    targetUrl,
    headers,
    providerId: provider.id,
  };
}
