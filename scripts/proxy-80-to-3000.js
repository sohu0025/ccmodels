/** Reverse proxy: port 80 → 3000 */
const http = require('http');
http.createServer((req, res) => {
  const opts = { hostname: '127.0.0.1', port: 3000, path: req.url, method: req.method, headers: req.headers };
  const proxy = http.request(opts, (proxyRes) => { res.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(res); });
  proxy.on('error', () => { res.writeHead(502); res.end('Bad Gateway'); });
  req.pipe(proxy);
}).listen(80, '0.0.0.0', () => console.log('[Proxy] 80 → 3000'));
