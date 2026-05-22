import http from 'node:http';

let server: http.Server | null = null;

export function startPort80Proxy(): void {
  if (server) return;
  server = http.createServer((req, res) => {
    const opts = { hostname: '127.0.0.1', port: 3000, path: req.url, method: req.method, headers: req.headers };
    const proxy = http.request(opts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('Bad Gateway'); });
    req.pipe(proxy);
  });
  server.on('error', (err: any) => { console.error('[80→3000]', err.message); server = null; });
  server.listen(80, '0.0.0.0');
}

export function stopPort80Proxy(): void {
  if (server) { server.close(); server = null; }
}
