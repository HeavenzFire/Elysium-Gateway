'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_HISTORY_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 20000;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tsx': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function assertLoopbackHost(host) {
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('Elysium Gateway binds to loopback only; use an authenticated reverse proxy for remote access.');
  }
}

function isAllowedOrigin(origin, hostHeader) {
  if (!origin) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) return false;
  return origin === 'http://' + hostHeader;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('Invalid JSON body'), { status: 400 }); }
}

function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Request body must be an object'), { status: 400 });
  if (typeof body.systemInstruction !== 'string' || !body.systemInstruction.trim() || body.systemInstruction.length > MAX_MESSAGE_CHARS) {
    throw Object.assign(new Error('systemInstruction must contain 1-20000 characters'), { status: 400 });
  }
  if (typeof body.agentPrompt !== 'string' || !body.agentPrompt.trim() || body.agentPrompt.length > MAX_MESSAGE_CHARS) {
    throw Object.assign(new Error('agentPrompt must contain 1-20000 characters'), { status: 400 });
  }
  if (!Array.isArray(body.history) || body.history.length > MAX_HISTORY_MESSAGES) {
    throw Object.assign(new Error('history must be an array with at most 40 messages'), { status: 400 });
  }
  for (const message of body.history) {
    if (!message || typeof message !== 'object' || Array.isArray(message) ||
        typeof message.text !== 'string' || message.text.length > MAX_MESSAGE_CHARS ||
        typeof message.sender !== 'string' || message.sender.length > 80) {
      throw Object.assign(new Error('Each history message requires a sender and text of at most 20000 characters'), { status: 400 });
    }
  }
  return body;
}

async function generateWithGemini({ apiKey, history, systemInstruction, agentPrompt }) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const contents = history.map(message => ({
    role: message.sender.toLowerCase() === 'user' ? 'user' : 'model',
    parts: [{ text: message.text }]
  }));
  contents.push({ role: 'user', parts: [{ text: agentPrompt }] });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      systemInstruction
    }
  });
  return typeof response.text === 'string' ? response.text : '';
}

function serveStatic(res, staticRoot, pathname) {
  const root = path.resolve(staticRoot);
  let requested;
  try { requested = decodeURIComponent(pathname); }
  catch { return sendJson(res, 400, { ok: false, error: 'invalid_path' }); }
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    return sendJson(res, 400, { ok: false, error: 'invalid_path' });
  }
  const file = fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(root, 'index.html');
  if (!fs.existsSync(file)) return sendJson(res, 503, { ok: false, error: 'production_build_missing' });
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': path.basename(file) === 'index.html' ? 'no-store' : 'public, max-age=300'
  });
  fs.createReadStream(file).pipe(res);
}

function createElysiumServer({
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  apiKey = process.env.GEMINI_API_KEY,
  generateContent = generateWithGemini,
  mode = 'test',
  staticRoot = path.join(__dirname, 'dist'),
  viteMiddleware
} = {}) {
  assertLoopbackHost(host);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new RangeError('port must be an integer from 0 to 65535');

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://' + (req.headers.host || host));
      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true, service: 'elysium-gateway', host, mode });
      }
      if (url.pathname === '/api/agent-response') {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
        const origin = req.headers.origin;
        if (!isAllowedOrigin(origin, req.headers.host)) {
          return sendJson(res, 403, { ok: false, error: 'origin_not_allowed' });
        }
        if (!apiKey) return sendJson(res, 503, { ok: false, error: 'gemini_api_key_not_configured' });
        const input = validateRequest(await readJsonBody(req));
        const text = await generateContent({
          apiKey,
          history: input.history,
          systemInstruction: input.systemInstruction,
          agentPrompt: input.agentPrompt
        });
        if (typeof text !== 'string') return sendJson(res, 502, { ok: false, error: 'invalid_provider_response' });
        return sendJson(res, 200, { ok: true, text });
      }
      if (viteMiddleware) return viteMiddleware(req, res, () => sendJson(res, 404, { ok: false, error: 'not_found' }));
      if (mode === 'production') return serveStatic(res, staticRoot, url.pathname);
      return sendJson(res, 404, { ok: false, error: 'not_found' });
    } catch (error) {
      return sendJson(res, error.status || 500, { ok: false, error: error.status ? error.message : 'provider_request_failed' });
    }
  });
  server.requestTimeout = 125000;
  return server;
}

async function main() {
  const host = process.env.ELYSIUM_HOST || DEFAULT_HOST;
  assertLoopbackHost(host);
  const port = Number(process.env.PORT || DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be an integer from 1024 to 65535');
  const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
  const { createServer, loadEnv } = await import('vite');
  const env = loadEnv(production ? 'production' : 'development', __dirname, '');
  let vite;
  let viteMiddleware;
  if (!production) {
    vite = await createServer({
      configFile: path.join(__dirname, 'vite.config.ts'),
      server: { middlewareMode: true, host },
      appType: 'spa'
    });
    viteMiddleware = vite.middlewares;
  }
  const server = createElysiumServer({
    host, port, apiKey: process.env.GEMINI_API_KEY || env.GEMINI_API_KEY,
    mode: production ? 'production' : 'development',
    staticRoot: path.join(__dirname, 'dist'),
    viteMiddleware
  });
  server.listen(port, host, () => process.stdout.write('Elysium Gateway listening at http://' + host + ':' + port + '\n'));
  const shutdown = async () => {
    server.close();
    if (vite) await vite.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write('Elysium Gateway startup failed: ' + error.message + '\n');
    process.exitCode = 1;
  });
}

module.exports = { createElysiumServer, validateRequest, readJsonBody, assertLoopbackHost, isAllowedOrigin, MAX_BODY_BYTES };
