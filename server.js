import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const COMPRESSIBLE_EXTS = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.xml',
]);

const API_PREFIXES = [
  '/auth/',
  '/me/',
  '/users/',
  '/landing-categories/',
  '/referral/',
  '/role/',
  '/permission/',
  '/event/',
  '/dashboard/',
  '/resources/',
  '/camps/',
  '/media/',
  '/api/',
];

function isApiRoute(pathname, req) {
  if (pathname.startsWith('/media/') || pathname.startsWith('/api/')) {
    return true;
  }
  for (const prefix of API_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      if (
        pathname.endsWith('/') ||
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        req.headers['sec-fetch-dest'] === 'empty' ||
        (req.method !== 'GET' && req.method !== 'HEAD')
      ) {
        return true;
      }
    }
  }
  return false;
}

function proxyRequest(req, res, targetBaseUrl, targetPath) {
  let upstreamUrl;
  try {
    upstreamUrl = new URL(targetPath, targetBaseUrl);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Bad Request', message: err.message }));
  }

  const transport = upstreamUrl.protocol === 'https:' ? https : http;
  const headers = { ...req.headers };
  headers.host = upstreamUrl.host;

  const remoteIp = req.socket.remoteAddress;
  if (remoteIp) {
    headers['x-forwarded-for'] = headers['x-forwarded-for']
      ? `${headers['x-forwarded-for']}, ${remoteIp}`
      : remoteIp;
  }
  headers['x-forwarded-proto'] = req.socket.encrypted ? 'https' : 'http';

  const clientReq = transport.request(
    upstreamUrl,
    {
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  clientReq.setTimeout(15000, () => {
    clientReq.destroy(new Error('Gateway Timeout'));
  });

  clientReq.on('error', (err) => {
    if (!res.headersSent) {
      const isTimeout = err.message === 'Gateway Timeout';
      res.writeHead(isTimeout ? 504 : 502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: isTimeout ? 'Gateway Timeout' : 'Bad Gateway', message: err.message }));
    }
  });

  req.pipe(clientReq);
}

export function createServer(options = {}) {
  const publicDir = path.resolve(options.publicDir || PUBLIC_DIR);
  const apiTarget = options.apiTarget || process.env.API_TARGET || 'https://api.fncp.uz';

  return http.createServer((req, res) => {
    // Parse URL and strip query strings / hashes
    let parsedUrl;
    try {
      parsedUrl = new URL(req.url, 'http://localhost');
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Bad Request');
    }

    const decodedPath = decodeURIComponent(parsedUrl.pathname);

    // Proxy API and media requests to upstream
    if (isApiRoute(decodedPath, req)) {
      return proxyRequest(req, res, apiTarget, req.url);
    }

    // Only accept GET and HEAD for static / SPA content
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      return res.end('Method Not Allowed');
    }

    const safePath = path.resolve(publicDir, '.' + decodedPath);

    // Prevent directory traversal
    const rel = path.relative(publicDir, safePath);
    if (decodedPath.includes('..') || rel.startsWith('..') || path.isAbsolute(rel)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

    let filePath = safePath;

    // Check if target exists
    let stats;
    try {
      stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stats = fs.statSync(filePath);
      }
    } catch {
      // Path does not exist
      const ext = path.extname(decodedPath).toLowerCase();
      // If it's a known static asset extension, return 404
      if (ext && ext !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }

      // SPA fallback to index.html for page routes
      filePath = path.join(publicDir, 'index.html');
      try {
        stats = fs.statSync(filePath);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('index.html not found');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    };

    // Cache headers
    if (decodedPath.startsWith('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      return res.end();
    }

    // Compression support
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const canGzip = COMPRESSIBLE_EXTS.has(ext) && acceptEncoding.includes('gzip');

    if (canGzip) {
      headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      const rawStream = fs.createReadStream(filePath);
      const gzipStream = zlib.createGzip();
      rawStream.pipe(gzipStream).pipe(res);
    } else {
      headers['Content-Length'] = stats.size;
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

// Start server if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Financopedia server running at http://localhost:${PORT}`);
  });
}
