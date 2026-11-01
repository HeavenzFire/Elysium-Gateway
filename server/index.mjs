import { createServer as createHttpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createAgentHandler } from './gemini-api.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const production = process.argv.includes('--production');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw Error('Remote binding is disabled until authenticated device enrollment is implemented. Use HOST=127.0.0.1.');
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const agentHandler = createAgentHandler({ ai, apiKey });
const vite = production ? null : await createViteServer({ configFile: path.join(root, 'vite.config.ts'), root, server: { middlewareMode: true }, appType: 'spa' });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = createHttpServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/api/agent') return agentHandler(req, res);
  if (vite) return vite.middlewares(req, res, () => { res.statusCode = 404; res.end('Not found'); });
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end('Method not allowed'); }
  let requested;
  try { requested = decodeURIComponent(pathname); } catch { res.statusCode = 400; return res.end('Bad path'); }
  let file = path.resolve(dist, '.' + requested);
  if (file !== dist && !file.startsWith(dist + path.sep)) { res.statusCode = 403; return res.end('Forbidden'); }
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
  catch { file = path.join(dist, 'index.html'); }
  try {
    const body = await readFile(file);
    res.statusCode = 200; res.setHeader('content-type', mime[path.extname(file)] || 'application/octet-stream'); res.setHeader('x-content-type-options', 'nosniff');
    return req.method === 'HEAD' ? res.end() : res.end(body);
  } catch { res.statusCode = 404; return res.end('Not found'); }
});
server.listen(port, host, () => process.stdout.write('Elysium Gateway listening on http://' + host + ':' + port + (apiKey ? ' (Gemini configured)' : ' (Gemini not configured)') + '\n'));
async function shutdown() { server.close(); if (vite) await vite.close(); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
