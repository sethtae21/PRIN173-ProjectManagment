import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const frontendDirectory = resolve(
  process.env.FITFUSION_FRONTEND_DIST ?? resolve(scriptDirectory, '../../frontend/dist'),
);
const certificatePath = process.env.FITFUSION_TLS_CERT;
const privateKeyPath = process.env.FITFUSION_TLS_KEY;
const backend = new URL(process.env.FITFUSION_BACKEND_URL ?? 'http://127.0.0.1:8000');
const port = Number(process.env.FITFUSION_HTTPS_PORT ?? 8443);

if (!certificatePath || !privateKeyPath) {
  throw new Error('Set FITFUSION_TLS_CERT and FITFUSION_TLS_KEY to the local mkcert files.');
}
if (!existsSync(certificatePath) || !existsSync(privateKeyPath) || !existsSync(frontendDirectory)) {
  throw new Error('TLS files or frontend build directory are missing.');
}

const proxyPrefixes = [
  '/admin/', '/api/', '/auth/', '/cart/', '/catalog/', '/checkout/', '/health/',
  '/login/', '/logout/', '/media/', '/orders/', '/outfits/', '/presets/',
  '/profile/', '/ratings/', '/register/',
];
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function shouldProxy(pathname) {
  return proxyPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function proxyRequest(request, response) {
  const upstream = httpRequest({
    hostname: backend.hostname,
    port: backend.port || 80,
    path: request.url,
    method: request.method,
    headers: {
      ...request.headers,
      host: backend.host,
      'x-forwarded-host': request.headers.host ?? 'localhost',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': request.socket.remoteAddress ?? '',
    },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    }
    response.end('Backend unavailable');
  });
  request.pipe(upstream);
}

function serveStatic(request, response, pathname) {
  let requestedPath;
  try {
    requestedPath = resolve(frontendDirectory, `.${decodeURIComponent(pathname)}`);
  } catch {
    response.writeHead(400).end();
    return;
  }

  if (requestedPath !== frontendDirectory && !requestedPath.startsWith(`${frontendDirectory}${sep}`)) {
    response.writeHead(403).end();
    return;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isDirectory()) {
    requestedPath = resolve(requestedPath, 'index.html');
  }
  if (!existsSync(requestedPath) || !statSync(requestedPath).isFile()) {
    requestedPath = resolve(frontendDirectory, 'index.html');
  }
  if (!existsSync(requestedPath)) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    'content-type': contentTypes[extname(requestedPath)] ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(requestedPath).pipe(response);
}

createServer({
  cert: readFileSync(certificatePath),
  key: readFileSync(privateKeyPath),
}, (request, response) => {
  const pathname = new URL(request.url ?? '/', 'https://localhost').pathname;
  if (shouldProxy(pathname)) {
    proxyRequest(request, response);
    return;
  }
  serveStatic(request, response, pathname);
}).listen(port, '127.0.0.1', () => {
  console.log(`FitFusion local staging: https://localhost:${port}`);
});