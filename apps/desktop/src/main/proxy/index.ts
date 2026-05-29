// @ts-nocheck — this file was reconstructed from compiled JS and lacks type annotations
import * as http from "node:http";
import * as https from "node:https";
import { getSettings } from "../database/settings";
import { getProviderForTool, getProviderById } from "../database/providers";
import { resolveRoute } from "./router";
import { getDb } from "../database";
import { recordFailure, recordSuccess } from "./failover";
import { addSessionMessage } from "../database/sessions";
import { getOrCreateSession, logRequestWithUsage, logRequest, parseUsageFromResponse } from "./logger";
let server = null;
let _requestCount = 0;
function requestCountTodayKey() {
    return new Date().toISOString().slice(0, 10);
}
function incrementRequestCount() {
    try {
        const db = getDb();
        const today = requestCountTodayKey();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('proxy_request_count');
        if (row) {
            const data = JSON.parse(row.value);
            if (data.date === today) {
                data.count++;
                db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(data), 'proxy_request_count');
                return data.count;
            }
        }
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('proxy_request_count', JSON.stringify({ date: today, count: 1 }));
        return 1;
    }
    catch {
        return 0;
    }
}
export function getTodayRequestCount() {
    try {
        const db = getDb();
        const today = requestCountTodayKey();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('proxy_request_count');
        if (row) {
            const data = JSON.parse(row.value);
            if (data.date === today)
                return data.count;
        }
    }
    catch { /* ignore */ }
    return 0;
}
export function startProxy() {
    const settings = getSettings();
    const port = settings.proxyPort;
    server = http.createServer((req, res) => {
        _requestCount++;
        incrementRequestCount();
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
            console.error('[CC Models] Client request error:', err.message);
            if (!res.headersSent) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Bad request' }));
            }
        });
    });
    return new Promise((resolve, reject) => {
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`[CC Models] Port ${port} is already in use`);
                reject(new Error(`Port ${port} is already in use`));
            }
            else {
                console.error('[CC Models] Proxy server error:', err.message);
                reject(err);
            }
        });
        server.listen(port, '127.0.0.1', () => {
            console.log(`[CC Models] Proxy server running on http://127.0.0.1:${port}`);
            resolve();
        });
    });
}
function handleRequest(req: any, res: any, body: string, startTime: number): void {
    try {
        // Detect which CLI tool sent the request
        const cliTool = detectCliTool(req);
        // Claude Desktop gateway protocol: rewrite /claude-desktop/ prefix so routing works
        const requestPath = (req.url ?? '/').includes('/claude-desktop/v1')
            ? (req.url ?? '/').replace('/claude-desktop', '')
            : (req.url ?? '/');
        // Claude Desktop model listing: respond with provider's models directly
        if (requestPath.includes('/v1/models') && (req.url ?? '/').includes('/claude-desktop')) {
            const provider = getProviderForTool('claude-code');
            if (provider && provider.models.length > 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    data: provider.models.map((id) => ({
                        type: 'model',
                        id,
                        display_name: id,
                        created_at: new Date().toISOString(),
                    })),
                    has_more: false,
                    first_id: provider.models[0] || null,
                    last_id: provider.models[provider.models.length - 1] || null,
                }));
                return;
            }
        }
        // Google Gemini model listing: respond with provider's models in Google format.
        // Also include standard Google model names so gemini-cli's model validation passes
        // (gemini-cli checks the configured GEMINI_MODEL against this list).
        if (requestPath === '/v1beta/models' && req.method === 'GET') {
            const provider = getProviderForTool('gemini-cli');
            if (provider && provider.models.length > 0) {
                const standardModels = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
                const allModelNames = new Set([...provider.models, ...standardModels]);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    models: Array.from(allModelNames).map((id) => ({
                        name: `models/${id}`,
                        displayName: id,
                        supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
                    })),
                }));
                return;
            }
        }
        // Detect Google Gemini API → Chat Completions conversion needed (BEFORE resolveRoute).
        // gemini-cli sends /v1beta/models/xxx:generateContent or :streamGenerateContent.
        let needsGoogleConversion = false;
        if (cliTool === 'gemini-cli' && requestPath.toLowerCase().includes('generatecontent') && requestPath.startsWith('/v1beta/')) {
            needsGoogleConversion = true;
        }
        const route = resolveRoute(requestPath, req.headers, cliTool);
        if (!route) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No active provider configured. Open CC Models to set one.' }));
            return;
        }
        console.log(`[CC Models] route: tool=${cliTool}, providerId=${route.providerId}, target=${route.targetUrl.substring(0, 120)}`);
        // Extract model name from request body (or URL path for Google API)
        const modelId = extractModel(body, requestPath);
        // Override model only if client's model isn't in provider's list
        let actualModelId = modelId;
        let omitModel = false;
        let providerSupportsSystem = true;
        {
            const provider = getProviderById(route.providerId);
            if (provider) {
                if (provider.models.length > 0) {
                    if (modelId === 'unknown' || !provider.models.includes(modelId)) {
                        actualModelId = provider.models[0];
                    }
                } else if (needsGoogleConversion) {
                    // Model names from Gemini/Claude won't work with OpenAI providers.
                    // If the provider has no models configured, omit the model field
                    // so the provider uses its default model.
                    omitModel = true;
                }
                // DeepSeek and similar providers don't support the 'system' role in OpenAI format
                providerSupportsSystem = !provider.name.toLowerCase().includes('deepseek') &&
                    !provider.apiBase.toLowerCase().includes('deepseek');
            }
        }
        // Transform Codex Responses API request → Chat Completions API
        let requestBody = body;
        let isResponsesApi = false;
        let isStreaming = false;
        if (cliTool === 'codex' && (req.url ?? '/').includes('/responses')) {
            try {
                const json = JSON.parse(body);
                isResponsesApi = true;
                isStreaming = !!json.stream;
                json.messages = responsesToChatMessages(json, providerSupportsSystem);
                delete json.input;
                delete json.instructions;
                if (json.max_output_tokens != null) {
                    json.max_tokens = json.max_output_tokens;
                    delete json.max_output_tokens;
                }
                // Convert Responses API flat tools to Chat Completions { type, function: {...} } format
                if (Array.isArray(json.tools)) {
                    json.tools = json.tools.map((t) => {
                        if (t.function)
                            return t; // already in Chat Completions format
                        return {
                            type: 'function',
                            function: {
                                name: t.name || t.type || 'unknown',
                                description: t.description,
                                parameters: t.parameters,
                            },
                        };
                    });
                }
                requestBody = JSON.stringify(json);
            }
            catch (e) {
                console.error('[CC Models] Failed to transform Responses API request:', e);
            }
        }
        // Detect Anthropic Messages API → Chat Completions conversion needed.
        // When a client sends /v1/messages (Anthropic format) to a provider that
        // doesn't have a native Anthropic endpoint, rewrite the path and body.
        let needsAnthropicConversion = false;
        if (!isResponsesApi && (req.url ?? '/').includes('/v1/messages')) {
            const provider = getProviderById(route.providerId);
            // Skip only if the provider has a native /anthropic endpoint (e.g. DeepSeek).
            // Providers with path-prefixed URLs (/v4, /api/paas/v4, etc.) still need conversion.
            if (provider && provider.apiType !== 'google' && !route.baseUrl.includes('/anthropic')) {
                needsAnthropicConversion = true;
                isStreaming = false;
                try {
                    const json = JSON.parse(requestBody);
                    isStreaming = !!json.stream;
                    requestBody = anthropicToChat(json, providerSupportsSystem);
                }
                catch (e) {
                    console.error('[CC Models] Failed to transform Anthropic request:', e);
                }
            }
        }
        // Apply Google Gemini → Chat Completions conversion if detected pre-route.
        // Only convert for non-Google providers (Google-type providers handle it natively).
        if (needsGoogleConversion) {
            const provider = getProviderById(route.providerId);
            if (provider && provider.apiType !== 'google') {
                isStreaming = requestPath.includes('streamGenerateContent');
                try {
                    const json = JSON.parse(requestBody);
                    requestBody = googleToChat(json, actualModelId, isStreaming, omitModel, providerSupportsSystem);
                }
                catch (e) {
                    console.error('[CC Models] Failed to transform Google request:', e);
                    needsGoogleConversion = false; // disable on failure
                }
            } else {
                // provider is google-type or unknown — no conversion needed
                needsGoogleConversion = false;
            }
        }
        // Generic streaming detection for plain Chat Completions
        if (!isResponsesApi && !needsAnthropicConversion && !needsGoogleConversion && !isStreaming && requestBody) {
            try {
                const json = JSON.parse(requestBody);
                isStreaming = !!json.stream;
            } catch {}
        }
        // Replace model name in request body if overridden
        if (omitModel) {
            // Remove model field entirely so the provider uses its default
            try {
                const json = JSON.parse(requestBody);
                delete json.model;
                requestBody = JSON.stringify(json);
            } catch (e) {
                console.error('[CC Models] Failed to remove model:', e);
            }
        } else if (actualModelId !== modelId) {
            try {
                const json = JSON.parse(requestBody);
                json.model = actualModelId;
                requestBody = JSON.stringify(json);
            }
            catch (e) {
                console.error('[CC Models] Failed to override model:', e);
            }
        }
// When converting Anthropic Messages → Chat Completions, also fix auth header
        if (needsAnthropicConversion && route.headers['x-api-key']) {
            route.headers['Authorization'] = `Bearer ${route.headers['x-api-key']}`;
            delete route.headers['x-api-key'];
        }
        // When converting Google Gemini → Chat Completions, fix auth header
        if (needsGoogleConversion && route.headers['x-goog-api-key']) {
            route.headers['Authorization'] = `Bearer ${route.headers['x-goog-api-key']}`;
            delete route.headers['x-goog-api-key'];
        }
        // Get session and store user message before forwarding
        const sessionId = getOrCreateSession({
            providerId: route.providerId,
            modelId,
            cliTool: cliTool ?? 'unknown',
        });
        // Strip system-level tags from stored content
        const userMsgRaw = body ? extractUserMessage(body, isResponsesApi) : '';
        const userMsg = stripSystemTags(userMsgRaw);
        if (userMsg) {
            // Deduplicate: skip if the last user message has identical content (avoids retry duplicates)
            const lastMsg = getDb().prepare(`SELECT content FROM session_messages WHERE session_id = ? AND role = 'user' ORDER BY timestamp DESC LIMIT 1`).get(sessionId);
            if (!lastMsg || lastMsg.content !== userMsg) {
                addSessionMessage(sessionId, 'user', userMsg.slice(0, 10000), Math.max(1, Math.round(userMsg.length / 4)));
            }
        }
        // Parse the target URL, rewriting paths for Codex, Anthropic, or Google API.
        // Use the base URL from the route to avoid path duplication when the base
        // URL already includes a path prefix (e.g. /v1, /v4).
        const baseUrlObj = new URL(route.baseUrl);
        const baseHasPath = baseUrlObj.pathname !== '/' && baseUrlObj.pathname !== '';
        // When the base URL already has a path (e.g. /v1), the API endpoint is
        // relative (chat/completions). Otherwise, use v1/chat/completions.
        const apiEndpoint = baseHasPath ? 'chat/completions' : 'v1/chat/completions';
        const targetUrlStr = isResponsesApi || needsAnthropicConversion || needsGoogleConversion
            ? route.baseUrl.replace(/\/$/, '') + '/' + apiEndpoint
            : route.targetUrl;
        const targetUrl = new URL(targetUrlStr);
        // Google API: model is in URL path, rewrite if overridden
        if (actualModelId !== modelId && targetUrl.pathname.includes('/models/')) {
            targetUrl.pathname = targetUrl.pathname.replace(/\/models\/[^:\/]+/, `/models/${actualModelId}`);
        }
        // Determine transport based on target URL protocol
        const transport = targetUrl.protocol === 'https:' ? https : http;
        // Forward the request
        const proxyReq = transport.request({
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: targetUrl.pathname + targetUrl.search,
            method: req.method,
            headers: {
                ...route.headers,
                host: targetUrl.hostname,
            },
            rejectUnauthorized: true, // Verify TLS certificates
        }, (proxyRes) => {
            if (isResponsesApi && isStreaming) {
                // Streaming mode: transform SSE chunks in real-time
                handleStreamingResponse(proxyRes, res, route, modelId, cliTool, startTime, sessionId);
            }
            else if (needsAnthropicConversion && isStreaming) {
                handleAnthropicSSEStream(proxyRes, res, route, actualModelId, startTime, sessionId);
            }
            else if (needsGoogleConversion && isStreaming) {
                handleGoogleSSEStream(proxyRes, res, route, actualModelId, startTime, sessionId);
            }
            else if (isStreaming) {
                handleChatSSEStream(proxyRes, res, route, actualModelId, startTime, sessionId, cliTool ?? 'unknown');
            }
            else {
                const chunks = [];
                proxyRes.on('data', (chunk) => chunks.push(chunk));
                proxyRes.on('end', () => {
                    const responseBody = Buffer.concat(chunks).toString('utf-8');
                    const latencyMs = Date.now() - startTime;
                    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                        console.error(`[CC Models] Provider error ${proxyRes.statusCode}: ${responseBody.substring(0, 300)}`);
                    }
                    // Check if response is Anthropic SSE format (Claude Code streaming)
                    const isAnthropicSSE = responseBody.trimStart().startsWith('event:');
                    let sseResult = null;
                    if (isAnthropicSSE) {
                        sseResult = extractFromAnthropicSSE(responseBody);
                    }
                    const usage = isAnthropicSSE && sseResult?.usage
                        ? { promptTokens: sseResult.usage.inputTokens, completionTokens: sseResult.usage.outputTokens, cacheHitTokens: 0, cost: (sseResult.usage.inputTokens * 0.000003 + sseResult.usage.outputTokens * 0.000015) }
                        : parseUsageFromResponse(responseBody, modelId);
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
                    }
                    else if (proxyRes.statusCode && proxyRes.statusCode < 400) {
                        const estTokens = Math.max(1, Math.round(responseBody.length / 4));
                        logRequestWithUsage({
                            providerId: route.providerId,
                            modelId,
                            method: req.method ?? 'GET',
                            path: req.url ?? '/',
                            statusCode: proxyRes.statusCode ?? 200,
                            latencyMs,
                            cliTool: cliTool ?? 'unknown',
                            promptTokens: 0,
                            completionTokens: estTokens,
                            cacheHitTokens: 0,
                            cost: estTokens * 0.000015,
                        });
                    }
                    else {
                        logRequest({
                            providerId: route.providerId,
                            modelId,
                            method: req.method ?? 'GET',
                            path: req.url ?? '/',
                            statusCode: proxyRes.statusCode ?? 200,
                            latencyMs,
                            cliTool: cliTool ?? 'unknown',
                        }, sessionId);
                    }
                    // Record success/failure for circuit breaker
                    const statusCode = proxyRes.statusCode ?? 200;
                    if (statusCode >= 500 || statusCode === 429) {
                        recordFailure(route.providerId);
                    }
                    else if (statusCode < 400) {
                        recordSuccess(route.providerId);
                    }
                    // Transform Chat Completions response back to Responses API format for Codex
                    let finalBody = responseBody;
                    if (isResponsesApi && !isStreaming && proxyRes.statusCode && proxyRes.statusCode < 400) {
                        try {
                            finalBody = chatResponseToResponses(responseBody);
                        }
                        catch (e) {
                            console.error('[CC Models] Failed to transform response:', e);
                        }
                    }
                    // Transform Chat Completions response back to Anthropic Messages API format
                    if (needsAnthropicConversion && !isStreaming && proxyRes.statusCode && proxyRes.statusCode < 400) {
                        try {
                            finalBody = chatToAnthropic(responseBody, actualModelId);
                        }
                        catch (e) {
                            console.error('[CC Models] Failed to transform Anthropic response:', e);
                        }
                    }
                    // Transform Chat Completions response back to Google Gemini format (success or error)
                    if (needsGoogleConversion && !isStreaming && proxyRes.statusCode) {
                        try {
                            finalBody = chatToGoogle(responseBody, actualModelId);
                        }
                        catch (e) {
                            console.error('[CC Models] Failed to transform Google response:', e);
                        }
                    }
                    // Store assistant message
                    if (proxyRes.statusCode && proxyRes.statusCode < 400) {
                        const assistantMsg = isAnthropicSSE ? (sseResult?.text ?? '') : extractAssistantMessage(responseBody, isResponsesApi);
                        const cleanAssistantMsg = stripSystemTags(assistantMsg);
                        if (cleanAssistantMsg) {
                            const estTokens = Math.max(1, Math.round(cleanAssistantMsg.length / 4));
                            addSessionMessage(sessionId, 'assistant', cleanAssistantMsg.slice(0, 100000), estTokens);
                        }
                    }
                    res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
                    res.end(finalBody);
                });
            }
        });
        proxyReq.on('error', (err) => {
            console.error('[CC Models] Proxy request failed:', err.message);
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
        // Filter request body for DeepSeek compatibility before sending
        let finalRequestBody = requestBody;
        const provider = getProviderById(route.providerId);
        if (provider && (provider.name.toLowerCase().includes('deepseek') || provider.apiBase.toLowerCase().includes('deepseek'))) {
            finalRequestBody = filterRequestForDeepSeek(requestBody || '');
        }
        if (finalRequestBody) {
            proxyReq.write(finalRequestBody);
        }
        proxyReq.end();
    }
    catch (err) {
        console.error('[CC Models] Proxy error:', err.message);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal proxy error', message: err.message }));
        }
    }
}
/**
 * Filter request body for DeepSeek compatibility
 * DeepSeek doesn't support some OpenAI fields like top_k, presence_penalty, etc.
 */
function filterRequestForDeepSeek(body) {
    try {
        const json = JSON.parse(body);
        // Remove unsupported fields
        delete json.top_k;
        delete json.presence_penalty;
        delete json.frequency_penalty;
        // DeepSeek only supports certain parameter values
        if (json.top_p != null && json.top_p < 0 || json.top_p > 1) {
            delete json.top_p;
        }
        if (json.temperature != null && (json.temperature < 0 || json.temperature > 2)) {
            delete json.temperature;
        }
        return JSON.stringify(json);
    } catch {
        return body;
    }
}
export function stopProxy() {
    if (server) {
        server.close();
        server = null;
        console.log('[CC Models] Proxy server stopped');
    }
}
export function getTodayTokenCount() {
    try {
        const db = getDb();
        const today = requestCountTodayKey();
        const row = db.prepare(`
      SELECT COALESCE(SUM(prompt_tokens + completion_tokens + cache_hit_tokens), 0) as total
      FROM usage_records WHERE date(timestamp) = ?
    `).get(today);
        return row?.total ?? 0;
    }
    catch {
        return 0;
    }
}
export function getTotalRequestCount() {
    try {
        const db = getDb();
        const row = db.prepare('SELECT COUNT(*) as count FROM usage_records').get();
        return row?.count ?? 0;
    }
    catch {
        return 0;
    }
}
export function getProxyStatus() {
    return {
        running: server !== null,
        port: getSettings().proxyPort,
        requests: getTotalRequestCount(),
        todayRequests: getTodayRequestCount(),
        todayTokens: getTodayTokenCount(),
    };
}
function handleStreamingResponse(proxyRes, res, route, modelId, cliTool, startTime, sessionId) {
    const respId = `resp_${Date.now().toString(36)}`;
    const createdAt = Math.floor(Date.now() / 1000);
    let buffer = '';
    let started = false;
    const msgItemId = `msg_${Date.now().toString(36)}`;
    let accumulatedText = '';
    let finalUsage = null;
    const writeSSE = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    // Error response from upstream — pass through as-is without SSE transformation
    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(body);
            // Still log the failed request for session tracking
            logRequest({ providerId: route.providerId, modelId, method: 'POST', path: '/v1/responses', statusCode: proxyRes.statusCode, latencyMs: Date.now() - startTime, cliTool: cliTool ?? 'unknown' }, sessionId);
            recordFailure(route.providerId);
        });
        return;
    }
    res.writeHead(proxyRes.statusCode ?? 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    proxyRes.on('data', (chunk) => {
        const raw = chunk.toString('utf-8');
        buffer += raw;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data:'))
                continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
                finishStream();
                return;
            }
            try {
                const parsed = JSON.parse(payload);
                // Capture usage from the final streaming chunk (if provider includes it)
                if (parsed.usage) {
                    finalUsage = {
                        promptTokens: parsed.usage.prompt_tokens ?? parsed.usage.promptTokens ?? 0,
                        completionTokens: parsed.usage.completion_tokens ?? parsed.usage.completionTokens ?? 0,
                        cacheHitTokens: parsed.usage.cache_hit_tokens ?? parsed.usage.cacheReadTokens ?? 0,
                        cost: (parsed.usage.prompt_tokens ?? parsed.usage.promptTokens ?? 0) * 0.000003
                            + (parsed.usage.completion_tokens ?? parsed.usage.completionTokens ?? 0) * 0.000015,
                    };
                }
                if (!parsed.choices || !parsed.choices[0])
                    continue;
                const delta = parsed.choices[0].delta;
                if (!delta) {
                    continue;
                }
                if (!started) {
                    started = true;
                    // response.created
                    writeSSE('response.created', {
                        type: 'response.created',
                        response: {
                            id: respId,
                            object: 'response',
                            created_at: createdAt,
                            status: 'in_progress',
                            model: parsed.model || modelId,
                            output: [],
                            usage: null,
                        },
                    });
                    // response.in_progress
                    writeSSE('response.in_progress', {
                        type: 'response.in_progress',
                        response: {
                            id: respId,
                            object: 'response',
                            created_at: createdAt,
                            status: 'in_progress',
                            model: parsed.model || modelId,
                            output: [],
                            usage: null,
                        },
                    });
                    // response.output_item.added
                    writeSSE('response.output_item.added', {
                        type: 'response.output_item.added',
                        output_index: 0,
                        item: {
                            id: msgItemId,
                            type: 'message',
                            status: 'in_progress',
                            role: 'assistant',
                            content: [],
                        },
                    });
                    // response.content_part.added
                    writeSSE('response.content_part.added', {
                        type: 'response.content_part.added',
                        item_id: msgItemId,
                        output_index: 0,
                        content_index: 0,
                        part: { type: 'output_text', text: '', annotations: [] },
                    });
                }
                if (delta.content) {
                    accumulatedText += delta.content;
                    writeSSE('response.output_text.delta', {
                        type: 'response.output_text.delta',
                        item_id: msgItemId,
                        output_index: 0,
                        content_index: 0,
                        delta: delta.content,
                    });
                }
                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        if (tc.function) {
                            writeSSE('response.function_call_arguments.delta', {
                                type: 'response.function_call_arguments.delta',
                                call_id: tc.id || tc.index,
                                delta: tc.function.arguments || '',
                            });
                        }
                    }
                }
            }
            catch {
                // skip malformed JSON
            }
        }
    });
    function finishStream() {
        // response.output_text.done
        writeSSE('response.output_text.done', {
            type: 'response.output_text.done',
            item_id: msgItemId,
            output_index: 0,
            content_index: 0,
            text: accumulatedText,
        });
        // response.content_part.done
        writeSSE('response.content_part.done', {
            type: 'response.content_part.done',
            item_id: msgItemId,
            output_index: 0,
            content_index: 0,
            part: {
                type: 'output_text',
                text: accumulatedText,
                annotations: [],
            },
        });
        // response.output_item.done
        writeSSE('response.output_item.done', {
            type: 'response.output_item.done',
            output_index: 0,
            item: {
                id: msgItemId,
                type: 'message',
                status: 'completed',
                role: 'assistant',
                content: [{ type: 'output_text', text: accumulatedText, annotations: [] }],
            },
        });
        // response.completed
        writeSSE('response.completed', {
            type: 'response.completed',
            response: {
                id: respId,
                object: 'response',
                created_at: createdAt,
                status: 'completed',
                model: modelId,
                output: [{
                        id: msgItemId,
                        type: 'message',
                        status: 'completed',
                        role: 'assistant',
                        content: [{ type: 'output_text', text: accumulatedText, annotations: [] }],
                    }],
                usage: {
                    input_tokens: 0,
                    output_tokens: 0,
                    total_tokens: 0,
                },
            },
        });
        // Store assistant message with estimated tokens
        const estTokens = Math.max(1, Math.round(accumulatedText.length / 4));
        const cleanAccumulated = stripSystemTags(accumulatedText);
        if (cleanAccumulated) {
            addSessionMessage(sessionId, 'assistant', cleanAccumulated.slice(0, 100000), estTokens);
        }
        const latencyMs = Date.now() - startTime;
        const usage = finalUsage || { promptTokens: 0, completionTokens: estTokens, cacheHitTokens: 0, cost: estTokens * 0.000015 };
        logRequestWithUsage({
            providerId: route.providerId,
            modelId,
            method: 'POST',
            path: '/v1/responses',
            statusCode: proxyRes.statusCode ?? 200,
            latencyMs,
            cliTool: cliTool ?? 'unknown',
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            cacheHitTokens: usage.cacheHitTokens,
            cost: usage.cost,
        });
        recordSuccess(route.providerId);
        res.end();
    }
    proxyRes.on('end', () => {
        if (!res.writableEnded)
            finishStream();
    });
    proxyRes.on('error', (err) => {
        console.error('[CC Models] Streaming proxy error:', err.message);
        if (!res.writableEnded)
            res.end();
    });
}
function detectCliTool(req) {
    const ua = (req.headers['user-agent'] ?? '').toLowerCase();
    const toolHeader = req.headers['x-cli-tool'];
    const path = req.url ?? '';
    if (toolHeader) return toolHeader;
    // Claude Desktop cowork mode: requests come with /claude-desktop/ path prefix
    if (path.includes('/claude-desktop/'))
        return 'claude-desktop';
    if (ua.includes('claude-code') || ua.includes('claude'))
        return 'claude-code';
    if (ua.includes('hermes'))
        return 'hermes';
    if (ua.includes('gemini'))
        return 'gemini-cli';
    if (ua.includes('opencode')) return 'opencode';
    // OpenAI SDK-based tools: differentiate by SDK language and request path.
    //   OpenAI/JS  → OpenClaw (JavaScript SDK)
    //   OpenAI/Python → Hermes (Python SDK)
    //   Codex uses Responses API (/responses, detected below).
    if (ua.includes('openai') || ua.includes('openclaw')) {
        if (path.includes('/responses')) return 'codex';
        if (ua.includes('openai/js')) return 'openclaw';
        if (path.includes('/chat/completions')) {
            if (ua.includes('openai/python')) return 'hermes';
            return 'hermes';
        }
        return 'codex';
    }
    if (ua.includes('codex'))
        return 'codex';
    // Detect by request path for Google Gemini API format
    if (path.startsWith('/v1beta/') || path.includes('googleapis.com'))
        return 'gemini-cli';
    return null;
}
function extractModel(body, path) {
    // Try request body first (OpenAI / Anthropic format)
    if (body) {
        try {
            const json = JSON.parse(body);
            if (json.model)
                return json.model;
        }
        catch { /* ignore */ }
    }
    // Google API format: model is in URL path like /v1beta/models/gemini-2.0-flash:generateContent
    if (path) {
        const match = path.match(/\/models\/([^:\/?]+)/);
        if (match)
            return match[1];
    }
    return 'unknown';
}
/** Convert Responses API "input" field to Chat Completions "messages" array */
function responsesToChatMessages(json, providerSupportsSystem = true) {
    const messages = [];
    let systemContent = null;
    if (json.instructions && typeof json.instructions === 'string') {
        systemContent = json.instructions;
    }
    const input = json.input;
    // Normalize role: Responses API uses "developer" which maps to "system" in Chat Completions
    const normalizeRole = (r) => {
        if (r === 'developer')
            return 'system';
        return r;
    };
    // Normalize content parts: input_text/output_text → text, always keep as array for non-system roles
    const normalizeContent = (c) => {
        if (Array.isArray(c)) {
            return c.map((part) => {
                if (part && typeof part === 'object') {
                    const p = { ...part };
                    if (p.type === 'input_text' || p.type === 'output_text')
                        p.type = 'text';
                    if (p.type === 'input_image')
                        p.type = 'image_url';
                    return p;
                }
                return part;
            });
        }
        return c;
    };
    const asContentArray = (text) => [{ type: 'text', text }];
    if (typeof input === 'string') {
        // If provider doesn't support system role, prepend system content to first user message
        const userContent = (!providerSupportsSystem && systemContent) ? `${systemContent}\n\n${input}` : input;
        messages.push({ role: 'user', content: asContentArray(userContent) });
    }
    else if (Array.isArray(input)) {
        for (const item of input) {
            if (typeof item === 'string') {
                messages.push({ role: 'user', content: asContentArray(item) });
            }
            else if (item && typeof item === 'object') {
                if (item.role) {
                    const role = normalizeRole(item.role);
                    let content = normalizeContent(item.content || item.text);
                    // System role accepts string content; other roles need array format
                    if (role !== 'system' && typeof content === 'string') {
                        content = asContentArray(content);
                    }
                    // If provider doesn't support system role and this is the first user message, prepend system content
                    if (!providerSupportsSystem && systemContent && role === 'user' && messages.length === 0) {
                        const userText = typeof content === 'string' ? content : content.map((c) => c.text || '').join('\n');
                        content = asContentArray(`${systemContent}\n\n${userText}`);
                        systemContent = null;
                    }
                    messages.push({ role, content });
                }
                else if (item.type === 'input_text') {
                    messages.push({ role: 'user', content: asContentArray(item.text) });
                }
                else if (item.type === 'message') {
                    const role = normalizeRole(item.role || 'user');
                    let content = normalizeContent(item.content);
                    if (role !== 'system' && typeof content === 'string') {
                        content = asContentArray(content);
                    }
                    messages.push({ role, content });
                }
            }
        }
    }
    return messages;
}
/** Convert Chat Completions response to OpenAI Responses API format */
function chatResponseToResponses(body) {
    const chat = JSON.parse(body);
    if (chat.error)
        return body;
    const output = [];
    if (chat.choices && Array.isArray(chat.choices)) {
        for (const choice of chat.choices) {
            const msg = choice.message;
            if (!msg)
                continue;
            const contentParts = [];
            if (msg.content) {
                contentParts.push({ type: 'output_text', text: msg.content });
            }
            if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
                for (const tc of msg.tool_calls) {
                    output.push({
                        type: 'function_call',
                        id: tc.id,
                        call_id: tc.id,
                        name: tc.function?.name || '',
                        arguments: tc.function?.arguments || '',
                    });
                }
            }
            if (contentParts.length > 0 || (msg.role === 'assistant' && !msg.tool_calls)) {
                output.push({
                    type: 'message',
                    role: msg.role || 'assistant',
                    content: contentParts,
                });
            }
        }
    }
    const usage = chat.usage ? {
        input_tokens: chat.usage.prompt_tokens ?? 0,
        output_tokens: chat.usage.completion_tokens ?? 0,
        total_tokens: chat.usage.total_tokens ?? 0,
    } : undefined;
    const resp = {
        id: chat.id || `resp_${Date.now()}`,
        object: 'response',
        model: chat.model || 'unknown',
        output,
    };
    if (usage)
        resp.usage = usage;
    return JSON.stringify(resp);
}
/**
 * Convert Anthropic Messages API request body to Chat Completions format.
 * Handles: system → prepended system message, content blocks → text, model/stream/etc passthrough.
 */
function anthropicToChat(json, providerSupportsSystem = true) {
    const chat = {};
    chat.model = json.model;
    chat.stream = json.stream;
    chat.max_tokens = json.max_tokens;
    chat.temperature = json.temperature;
    if (json.top_p != null)
        chat.top_p = json.top_p;
    // Only copy Anthropic-specific fields if the provider supports them.
    // Most OpenAI-compatible providers reject top_k and metadata.
    if (json.stop_sequences)
        chat.stop = json.stop_sequences;
    else if (json.stop_sequence)
        chat.stop = [json.stop_sequence];
    const messages = [];
    // Anthropic system prompt is a top-level field → prepend as system message (if supported)
    let systemText = null;
    if (json.system) {
        systemText = typeof json.system === 'string'
            ? json.system
            : Array.isArray(json.system)
                ? json.system.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
                : '';
        if (systemText && providerSupportsSystem) {
            messages.push({ role: 'system', content: systemText });
            systemText = null;
        }
    }
    // Copy conversation messages — Anthropic and Chat Completions share the same
    // { role, content } structure. Convert content blocks to plain text.
    if (Array.isArray(json.messages)) {
        for (const msg of json.messages) {
            // Anthropic "assistant" messages may contain tool_use blocks → convert to OpenAI tool_calls
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
                const textParts = msg.content.filter((b) => b.type === 'text').map((b) => b.text);
                const toolUseBlocks = msg.content.filter((b) => b.type === 'tool_use');
                if (toolUseBlocks.length > 0) {
                    const m = { role: 'assistant', content: textParts.join('\n') || null };
                    m.tool_calls = toolUseBlocks.map((block, i) => ({
                        index: i,
                        id: block.id || `call_${i}`,
                        type: 'function',
                        function: {
                            name: block.name,
                            arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input || {}),
                        },
                    }));
                    messages.push(m);
                } else if (textParts.length > 0) {
                    messages.push({ role: 'assistant', content: textParts.join('\n') });
                }
                continue;
            }
            // Anthropic "user" messages may contain tool_result blocks → convert to OpenAI "tool" role
            if (msg.role === 'user' && Array.isArray(msg.content)) {
                const textParts = msg.content.filter((b) => b.type === 'text').map((b) => b.text);
                const toolResults = msg.content.filter((b) => b.type === 'tool_result');
                for (const tr of toolResults) {
                    const trContent = typeof tr.content === 'string'
                        ? tr.content
                        : Array.isArray(tr.content)
                            ? tr.content.map((b) => b.text || '').join('\n')
                            : JSON.stringify(tr.content);
                    messages.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: trContent });
                }
                if (textParts.length > 0) {
                    messages.push({ role: 'user', content: textParts.join('\n') });
                }
                continue;
            }
            // Normal text/content messages
            const m = { role: msg.role };
            if (typeof msg.content === 'string') {
                m.content = msg.content;
            }
            else if (Array.isArray(msg.content)) {
                const blocks = msg.content.map((block) => {
                    if (block.type === 'text')
                        return { type: 'text', text: block.text };
                    if (block.type === 'image' || block.type === 'image_url') {
                        return { type: 'image_url', image_url: { url: block.source?.data || block.url || '' } };
                    }
                    // Unknown types: convert to text representation
                    const name = block.name || block.id || block.type || 'unknown';
                    return { type: 'text', text: block.text || `[${name}: ${JSON.stringify(block.input || block)}]` };
                });
                m.content = blocks.length === 1 && blocks[0].type === 'text' ? blocks[0].text : blocks;
            }
            // If provider doesn't support system role and this is the first user message, prepend system content
            if (!providerSupportsSystem && systemText && msg.role === 'user' && messages.length === 0 && typeof m.content === 'string') {
                m.content = `${systemText}\n\n${m.content}`;
                systemText = null;
            }
            messages.push(m);
        }
    }
    chat.messages = messages;
    // Convert Anthropic tools format to OpenAI tools format
    if (Array.isArray(json.tools)) {
        chat.tools = json.tools.map((tool) => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description || '',
                parameters: tool.input_schema,
            },
        }));
    }
    return JSON.stringify(chat);
}
/**
 * Convert Google Gemini API request body to Chat Completions format.
 * Google format uses contents[] + parts[], system_instruction, and generationConfig.
 */
function googleToChat(json, modelId, stream, omitModel, providerSupportsSystem = true) {
    const chat = {};
    if (!omitModel && modelId) {
        chat.model = modelId;
    }
    chat.stream = stream;
    const messages = [];
    let systemText = null;
    // Convert system_instruction → system message at the start (if supported)
    const sysInstr = json.system_instruction;
    if (sysInstr?.parts && Array.isArray(sysInstr.parts)) {
        systemText = sysInstr.parts
            .filter((p) => p.text)
            .map((p) => p.text)
            .join('\n');
        if (systemText && providerSupportsSystem) {
            messages.push({ role: 'system', content: systemText });
            systemText = null;
        }
    }
    // Convert contents[] → messages[]
    // Google roles: "user", "model" → OpenAI roles: "user", "assistant"
    const contents = json.contents;
    if (Array.isArray(contents)) {
        for (const entry of contents) {
            const role = entry.role === 'model' ? 'assistant' : entry.role || 'user';
            const parts = entry.parts;
            let content = '';
            if (Array.isArray(parts)) {
                const texts = parts.filter((p) => p.text).map((p) => p.text);
                content = texts.join('\n');
            }
            // If provider doesn't support system role and this is the first user message, prepend system content
            if (!providerSupportsSystem && systemText && role === 'user' && messages.length === 0 && content) {
                content = `${systemText}\n\n${content}`;
                systemText = null;
            }
            messages.push({ role, content });
        }
    }
    chat.messages = messages;
    // Convert generationConfig fields
    const genConfig = json.generationConfig;
    if (genConfig) {
        if (genConfig.temperature != null)
            chat.temperature = genConfig.temperature;
        if (genConfig.maxOutputTokens != null)
            chat.max_tokens = genConfig.maxOutputTokens;
        if (genConfig.topP != null)
            chat.top_p = genConfig.topP;
        if (genConfig.topK != null)
            chat.top_k = genConfig.topK;
        if (genConfig.stopSequences && Array.isArray(genConfig.stopSequences)) {
            chat.stop = genConfig.stopSequences;
        }
    }
    return JSON.stringify(chat);
}
/**
 * Convert Chat Completions response body to Anthropic Messages API format.
 * Used when the upstream provider is OpenAI-compatible but the client expects Anthropic format.
 */
function chatToAnthropic(body, modelId) {
    const chat = JSON.parse(body);
    const content = [];
    let stopReason = null;
    if (chat.choices && Array.isArray(chat.choices)) {
        for (const choice of chat.choices) {
            if (choice.message?.content) {
                content.push({ type: 'text', text: choice.message.content });
            }
            if (choice.finish_reason === 'stop')
                stopReason = 'end_turn';
            else if (choice.finish_reason === 'length')
                stopReason = 'max_tokens';
            else if (choice.finish_reason === 'tool_calls')
                stopReason = 'tool_use';
            else
                stopReason = choice.finish_reason || null;
        }
    }
    const resp = {
        id: `msg_${Date.now().toString(36)}`,
        type: 'message',
        role: 'assistant',
        content,
        model: modelId,
        stop_reason: stopReason,
        stop_sequence: null,
    };
    if (chat.usage) {
        resp.usage = {
            input_tokens: chat.usage.prompt_tokens ?? 0,
            output_tokens: chat.usage.completion_tokens ?? 0,
        };
    }
    return JSON.stringify(resp);
}
/**
 * Convert Chat Completions response body to Google Gemini format.
 * Used when gemini-cli sends a Google-format request to an OpenAI-compatible provider.
 */
function chatToGoogle(body, modelId) {
    const chat = JSON.parse(body);
    // Convert OpenAI error format to Google Gemini error format
    if (chat.error) {
        const errMsg = chat.error.message || (typeof chat.error === 'string' ? chat.error : JSON.stringify(chat.error)) || 'Unknown error';
        const googleError = {
            error: {
                code: chat.error.code || 400,
                message: errMsg,
                status: chat.error.type || 'INVALID_ARGUMENT',
            },
        };
        return JSON.stringify(googleError);
    }
    const candidates = [];
    if (chat.choices && Array.isArray(chat.choices)) {
        for (const choice of chat.choices) {
            const msg = choice.message;
            if (!msg)
                continue;
            const parts = [];
            if (msg.content) {
                parts.push({ text: msg.content });
            }
            // Map finish_reason to Google format (uppercase)
            let finishReason = null;
            if (choice.finish_reason === 'stop')
                finishReason = 'STOP';
            else if (choice.finish_reason === 'length')
                finishReason = 'MAX_TOKENS';
            else if (choice.finish_reason === 'content_filter')
                finishReason = 'SAFETY';
            else if (choice.finish_reason === 'tool_calls')
                finishReason = 'TOOL_CALLS';
            else
                finishReason = choice.finish_reason || null;
            const candidate = {
                content: {
                    role: 'model',
                    parts,
                },
                finishReason,
                index: choice.index ?? 0,
            };
            // Include safety ratings if available (default to empty)
            candidate.safetyRatings = [];
            candidates.push(candidate);
        }
    }
    const resp = {
        candidates,
        modelVersion: modelId,
    };
    // Convert usage to Google format
    if (chat.usage) {
        resp.usageMetadata = {
            promptTokenCount: chat.usage.prompt_tokens ?? 0,
            candidatesTokenCount: chat.usage.completion_tokens ?? 0,
            totalTokenCount: chat.usage.total_tokens ?? 0,
        };
    }
    return JSON.stringify(resp);
}
/**
 * Forward Chat Completions SSE stream to client as Anthropic Messages API SSE stream.
 * Used when Claude Desktop (cowork mode) sends a streaming request to an OpenAI-compatible provider.
 */
function handleAnthropicSSEStream(proxyRes, res, route, modelId, startTime, sessionId) {
    const msgId = `msg_${Date.now().toString(36)}`;
    let accumulatedText = '';
    let usage = null;
    let contentBlockStarted = false;
    let buffer = '';
    // Error from upstream — convert to Anthropic format and pass through
    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(body);
        });
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    const writeEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    let finishReason = null;
    let deltaCount = 0;
    let toolCallIndex = 0;
    let toolCallAccumulated = {};
    proxyRes.on('data', (chunk) => {
        const raw = chunk.toString('utf-8');
        if (raw.length < 400 && deltaCount === 0) console.log("[CC Models] SSE raw chunk:", raw.slice(0, 300));
        buffer += raw;
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer for next chunk
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('data:'))
                continue;
            const payload = trimmedLine.slice(5).trim();
            if (payload === '[DONE]')
                continue;
            // Zhipu/BigModel may send progress events between content chunks
            if (payload === '') continue;
            try {
                const parsed = JSON.parse(payload);
                // Capture usage if present (some providers include it mid-stream)
                if (parsed.usage) {
                    usage = {
                        inputTokens: parsed.usage.prompt_tokens ?? parsed.usage.input_tokens ?? 0,
                        outputTokens: parsed.usage.completion_tokens ?? parsed.usage.output_tokens ?? 0,
                    };
                }
                if (!parsed.choices || !parsed.choices[0]) continue;
                const delta = parsed.choices[0].delta;
                if (!delta)
                    continue;
                if (!contentBlockStarted) {
                    contentBlockStarted = true;
                    writeEvent('message_start', {
                        type: 'message_start',
                        message: {
                            id: msgId,
                            type: 'message',
                            role: 'assistant',
                            content: [],
                            model: modelId,
                            stop_reason: null,
                            stop_sequence: null,
                            usage: { input_tokens: usage?.inputTokens ?? 0, output_tokens: 0 },
                        },
                    });
                    writeEvent('content_block_start', {
                        type: 'content_block_start',
                        index: 0,
                        content_block: { type: 'text', text: '' },
                    });
                }
                if (delta.content) {
                    accumulatedText += delta.content;
                    deltaCount++;
                    writeEvent('content_block_delta', {
                        type: 'content_block_delta',
                        index: 0,
                        delta: { type: 'text_delta', text: delta.content },
                    });
                }
                // Handle tool_calls from OpenAI-compatible providers
                if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                    for (const tc of delta.tool_calls) {
                        const tcIdx = tc.index ?? 0;
                        if (!toolCallAccumulated[tcIdx]) {
                            toolCallAccumulated[tcIdx] = { id: tc.id, name: tc.function?.name, args: '' };
                            if (tc.id && tc.function?.name) {
                                // Close text block and start tool_use block
                                writeEvent('content_block_stop', { type: 'content_block_stop', index: toolCallIndex });
                                toolCallIndex++;
                                writeEvent('content_block_start', {
                                    type: 'content_block_start',
                                    index: toolCallIndex,
                                    content_block: { type: 'tool_use', id: tc.id, name: tc.function.name, input: {} },
                                });
                            }
                        }
                        if (tc.function?.arguments) {
                            toolCallAccumulated[tcIdx].args += tc.function.arguments;
                            if (toolCallAccumulated[tcIdx].id) {
                                writeEvent('content_block_delta', {
                                    type: 'content_block_delta',
                                    index: toolCallIndex,
                                    delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
                                });
                            }
                        }
                    }
                }
                if (parsed.choices[0].finish_reason) {
                    finishReason = parsed.choices[0].finish_reason;
                }
            }
            catch {
                // skip malformed JSON
            }
        }
    });
    proxyRes.on('end', () => {
        if (contentBlockStarted) {
            // Close all open content blocks (text block 0 + any tool_use blocks)
            for (let i = 0; i <= toolCallIndex; i++) {
                writeEvent('content_block_stop', { type: 'content_block_stop', index: i });
            }
        }
        const outTokens = usage?.outputTokens ?? Math.max(1, Math.round(accumulatedText.length / 4));
        const inTokens = usage?.inputTokens ?? 0;
        let stopReason = 'end_turn';
        if (finishReason === 'stop') stopReason = 'end_turn';
        else if (finishReason === 'length') stopReason = 'max_tokens';
        else if (finishReason === 'tool_calls') stopReason = 'tool_use';
        writeEvent('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: stopReason, stop_sequence: null },
            usage: { output_tokens: outTokens },
        });
        writeEvent('message_stop', { type: 'message_stop' });
        // Log usage
        const latencyMs = Date.now() - startTime;
        logRequestWithUsage({
            providerId: route.providerId,
            modelId,
            method: 'POST',
            path: '/v1/messages',
            statusCode: 200,
            latencyMs,
            cliTool: 'claude-code',
            promptTokens: inTokens,
            completionTokens: outTokens,
            cacheHitTokens: 0,
            cost: inTokens * 0.000003 + outTokens * 0.000015,
        });
        const cleanAccumulated = stripSystemTags(accumulatedText);
        if (cleanAccumulated) {
            addSessionMessage(sessionId, 'assistant', cleanAccumulated.slice(0, 100000), outTokens);
        }
        recordSuccess(route.providerId);
        res.end();
    });
    proxyRes.on('error', (err) => {
        console.error('[CC Models] Anthropic SSE stream error:', err.message);
        if (!res.writableEnded)
            res.end();
    });
    // Detect if client disconnects before stream ends (potential cause of truncation)
    res.on('close', () => {
        if (deltaCount > 0) console.log("[CC Models] Anthropic SSE: client closed, deltaCount=" + deltaCount + " textLen=" + accumulatedText.length);
    });
}
/**
 * Forward Chat Completions SSE stream to client as Google Gemini SSE stream.
 * Used when gemini-cli sends a streaming request to an OpenAI-compatible provider.
 * Google streamGenerateContent returns SSE with candidates[].content.parts[].text format.
 */
function handleGoogleSSEStream(proxyRes, res, route, modelId, startTime, sessionId) {
    let accumulatedText = '';
    let buffer = '';
    let finalUsage = null;
    // Error from upstream — convert to Google format and pass through
    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            const googleError = chatToGoogle(body, modelId);
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(googleError);
        });
        return;
    }
    res.writeHead(proxyRes.statusCode ?? 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    proxyRes.on('data', (chunk) => {
        const raw = chunk.toString('utf-8');
        buffer += raw;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data:'))
                continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]')
                continue;
            try {
                const parsed = JSON.parse(payload);
                // Capture usage from final chunk
                if (parsed.usage) {
                    finalUsage = {
                        promptTokens: parsed.usage.prompt_tokens ?? parsed.usage.promptTokens ?? 0,
                        completionTokens: parsed.usage.completion_tokens ?? parsed.usage.completionTokens ?? 0,
                    };
                }
                if (!parsed.choices || !parsed.choices[0])
                    continue;
                const delta = parsed.choices[0].delta;
                if (!delta)
                    continue;
                // Build Google-format SSE chunk
                const googleChunk = {
                    candidates: [{
                            index: 0,
                            content: {
                                role: 'model',
                                parts: [],
                            },
                        }],
                };
                if (delta.content) {
                    accumulatedText += delta.content;
                    const googleChunkCandidates = googleChunk.candidates;
                    const parts = googleChunkCandidates[0].content.parts;
                    parts.push({ text: delta.content });
                }
                res.write(`data: ${JSON.stringify(googleChunk)}\n\n`);
            }
            catch {
                // skip malformed JSON
            }
        }
    });
    proxyRes.on('end', () => {
        // Send final chunk with finish reason
        const finalChunk = {
            candidates: [{
                    index: 0,
                    content: {
                        role: 'model',
                        parts: accumulatedText ? [{ text: accumulatedText }] : [],
                    },
                    finishReason: 'STOP',
                }],
        };
        // Google streaming responses include usageMetadata in the final chunk
        if (finalUsage) {
            finalChunk.usageMetadata = {
                promptTokenCount: finalUsage.promptTokens,
                candidatesTokenCount: finalUsage.completionTokens,
                totalTokenCount: finalUsage.promptTokens + finalUsage.completionTokens,
            };
        }
        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        // Store assistant message
        if (accumulatedText) {
            addSessionMessage(sessionId, 'assistant', accumulatedText.slice(0, 100000), Math.max(1, Math.round(accumulatedText.length / 4)));
        }
        // Log usage
        const latencyMs = Date.now() - startTime;
        const outTokens = finalUsage?.completionTokens ?? Math.max(1, Math.round(accumulatedText.length / 4));
        const inTokens = finalUsage?.promptTokens ?? 0;
        logRequestWithUsage({
            providerId: route.providerId,
            modelId,
            method: 'POST',
            path: '/v1beta/models',
            statusCode: 200,
            latencyMs,
            cliTool: 'gemini-cli',
            promptTokens: inTokens,
            completionTokens: outTokens,
            cacheHitTokens: 0,
            cost: inTokens * 0.000003 + outTokens * 0.000015,
        });
        recordSuccess(route.providerId);
        res.end();
    });
    proxyRes.on('error', (err) => {
        console.error('[CC Models] Google SSE stream error:', err.message);
        if (!res.writableEnded)
            res.end();
    });
}
/**
 * Forward Chat Completions SSE stream in real-time. Used when a client sends
 * stream: true to an OpenAI-compatible provider — pipes SSE chunks through
 * as-is while also logging usage and storing the assistant message.
 */
function handleChatSSEStream(proxyRes, res, route, modelId, startTime, sessionId, cliTool) {
    let accumulatedText = '';
    let buffer = '';
    let finalUsage = null;
    let streamEnded = false;
    // Error from upstream — pass through as-is
    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        const chunks = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(body);
        });
        return;
    }
    res.writeHead(proxyRes.statusCode ?? 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    function finishStream() {
        if (streamEnded) return;
        streamEnded = true;
        if (accumulatedText) {
            addSessionMessage(sessionId, 'assistant', accumulatedText.slice(0, 100000), Math.max(1, Math.round(accumulatedText.length / 4)));
        }
        const latencyMs = Date.now() - startTime;
        const outTokens = finalUsage?.completionTokens ?? Math.max(1, Math.round(accumulatedText.length / 4));
        const inTokens = finalUsage?.promptTokens ?? 0;
        logRequestWithUsage({
            providerId: route.providerId,
            modelId,
            method: 'POST',
            path: '/v1/chat/completions',
            statusCode: 200,
            latencyMs,
            cliTool,
            promptTokens: inTokens,
            completionTokens: outTokens,
            cacheHitTokens: 0,
            cost: inTokens * 0.000003 + outTokens * 0.000015,
        });
        recordSuccess(route.providerId);
        if (!res.writableEnded) res.end();
    }
    proxyRes.on('data', (chunk) => {
        const raw = chunk.toString('utf-8');
        buffer += raw;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') { finishStream(); continue; }
            try {
                const parsed = JSON.parse(payload);
                if (parsed.usage) {
                    finalUsage = {
                        promptTokens: parsed.usage.prompt_tokens ?? parsed.usage.promptTokens ?? 0,
                        completionTokens: parsed.usage.completion_tokens ?? parsed.usage.completionTokens ?? 0,
                    };
                }
                if (!parsed.choices || !parsed.choices[0]) {
                    // Handle Anthropic SSE format events
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                        accumulatedText += parsed.delta.text;
                    } else if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'text' && parsed.content_block.text) {
                        accumulatedText += parsed.content_block.text;
                    } else if (parsed.type === 'message_start' && parsed.message?.content?.[0]?.text) {
                        accumulatedText += parsed.message.content[0].text;
                    }
                    // Anthropic usage from message_delta
                    if (parsed.type === 'message_delta' && parsed.usage) {
                        finalUsage = {
                            promptTokens: parsed.usage.input_tokens ?? 0,
                            completionTokens: parsed.usage.output_tokens ?? 0,
                        };
                    }
                    continue;
                }
                const delta = parsed.choices[0].delta;
                if (delta?.content) {
                    accumulatedText += delta.content;
                }
            } catch {}
        }
        if (!streamEnded) res.write(raw);
    });
    proxyRes.on('end', () => {
        finishStream();
    });
    proxyRes.on('error', (err) => {
        console.error('[CC Models] Chat SSE stream error:', err.message);
        finishStream();
    });
}
/** Parse Anthropic SSE response body to extract assistant text and usage */
function extractFromAnthropicSSE(body) {
    let text = '';
    let usage = null;
    const events = body.split('\n\n');
    for (const event of events) {
        const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
        if (!dataLine)
            continue;
        try {
            const data = JSON.parse(dataLine.slice(5).trim());
            if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                text += data.delta.text || '';
            }
            if (data.type === 'content_block_start' && data.content_block?.type === 'text' && data.content_block.text) {
                text += data.content_block.text || '';
            }
            if (data.type === 'message_start' && data.message?.content?.[0]?.text) {
                text += data.message.content[0].text;
            }
            if (data.type === 'message_stop' || data.type === 'message_delta') {
                if (data.usage) {
                    usage = { inputTokens: data.usage.input_tokens ?? 0, outputTokens: data.usage.output_tokens ?? 0 };
                }
                if (data.delta?.usage) {
                    usage = { inputTokens: data.delta.usage.input_tokens ?? 0, outputTokens: data.delta.usage.output_tokens ?? 0 };
                }
            }
        }
        catch { /* ignore */ }
    }
    return { text, usage };
}
/** Extract the last user message text from a Chat Completions or Responses API request body */
function extractUserMessage(body, isResponses) {
    try {
        const json = JSON.parse(body);
        if (isResponses) {
            const input = json.input;
            if (typeof input === 'string')
                return input;
            if (Array.isArray(input)) {
                // First, find the last item with explicit role === 'user'
                for (let i = input.length - 1; i >= 0; i--) {
                    const item = input[i];
                    if (typeof item === 'string')
                        return item;
                    if (item?.content && item.role === 'user') {
                        const c = item.content;
                        if (typeof c === 'string')
                            return c;
                        if (Array.isArray(c)) {
                            const texts = c.filter((p) => p.type === 'text' || p.type === 'input_text').map((p) => p.text || '');
                            if (texts.length > 0)
                                return texts.join(' ');
                        }
                    }
                }
                // Fallback: role-less items (e.g. if the input array uses positional items)
                for (let i = input.length - 1; i >= 0; i--) {
                    const item = input[i];
                    if (item?.content && !item.role) {
                        const c = item.content;
                        if (typeof c === 'string')
                            return c;
                        if (Array.isArray(c)) {
                            const texts = c.filter((p) => p.type === 'text' || p.type === 'input_text').map((p) => p.text || '');
                            if (texts.length > 0)
                                return texts.join(' ');
                        }
                    }
                }
            }
        }
        else {
            const msgs = json.messages;
            if (Array.isArray(msgs)) {
                for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i]?.role === 'user') {
                        const c = msgs[i].content;
                        if (typeof c === 'string')
                            return c;
                        if (Array.isArray(c)) {
                            const texts = c.filter((p) => p.type === 'text').map((p) => p.text || '');
                            if (texts.length > 0)
                                return texts.join(' ');
                        }
                        return '';
                    }
                }
            }
        }
        // Google Gemini format: contents array with parts instead of messages
        if (json.contents && Array.isArray(json.contents)) {
            for (let i = json.contents.length - 1; i >= 0; i--) {
                if (json.contents[i]?.role === 'user') {
                    const parts = json.contents[i].parts;
                    if (Array.isArray(parts)) {
                        const texts = parts.filter((p) => p.text).map((p) => p.text);
                        if (texts.length > 0)
                            return texts.join(' ');
                    }
                }
            }
        }
    }
    catch { /* ignore */ }
    return '';
}
/** Strip <system-reminder> and other system-level tags from stored message content */
function stripSystemTags(text) {
    return text
        .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
        .replace(/<user-prompt-submit-hook>[\s\S]*?<\/user-prompt-submit-hook>/g, '')
        .trim();
}
/** Extract assistant response text from a Chat Completions, Responses API, or Anthropic Messages API response body */
function extractAssistantMessage(body, isResponses) {
    try {
        // Try direct JSON parse (non-streaming response)
        if (body.trimStart().startsWith('{')) {
            const json = JSON.parse(body);
            if (isResponses) {
                const output = json.output;
                if (Array.isArray(output)) {
                    const parts = [];
                    for (const item of output) {
                        if (item.content && Array.isArray(item.content)) {
                            for (const part of item.content) {
                                if (part.type === 'output_text' && part.text)
                                    parts.push(part.text);
                            }
                        }
                    }
                    if (parts.length > 0)
                        return parts.join('\n');
                }
            }
            else if (json.choices && Array.isArray(json.choices)) {
                if (json.choices[0]?.message?.content) {
                    return json.choices[0].message.content;
                }
            }
            else if (json.content) {
                if (typeof json.content === 'string')
                    return json.content;
                if (Array.isArray(json.content)) {
                    const texts = json.content
                        .filter((p) => p.type === 'text' && p.text)
                        .map((p) => p.text);
                    if (texts.length > 0)
                        return texts.join('\n');
                }
            }
            else if (json.candidates && Array.isArray(json.candidates)) {
                const texts = [];
                for (const candidate of json.candidates) {
                    if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
                        for (const part of candidate.content.parts) {
                            if (part.text)
                                texts.push(part.text);
                        }
                    }
                }
                if (texts.length > 0)
                    return texts.join('\n');
            }
        }
    }
    catch { /* ignore */ }
    // Try SSE format (streaming response): accumulate delta.content from data: lines
    try {
        const lines = body.split('\n');
        let accumulated = '';
        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
                const parsed = JSON.parse(payload);
                // Handle both object format and array format
                const choices = Array.isArray(parsed) ? parsed[0]?.choices : parsed.choices;
                if (choices && choices[0]) {
                    const delta = choices[0].delta || choices[0];
                    if (delta && delta.content) {
                        accumulated += delta.content;
                    }
                }
            } catch { /* skip malformed SSE payloads */ }
        }
        return accumulated;
    } catch { }
    return '';
}
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map