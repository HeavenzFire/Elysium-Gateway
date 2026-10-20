'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createElysiumServer } = require('./server.cjs');

async function withServer(t, options = {}) {
  const server = createElysiumServer({ host: '127.0.0.1', port: 0, mode: 'test', ...options });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

const validBody = {
  history: [{ sender: 'user', text: 'hello' }],
  systemInstruction: 'Be accurate and identify uncertainty.',
  agentPrompt: 'Return a short greeting.'
};

test('provider key is server-side only and frontend uses the same-origin proxy', () => {
  const service = fs.readFileSync(path.join(__dirname, 'services', 'geminiService.ts'), 'utf8');
  const vite = fs.readFileSync(path.join(__dirname, 'vite.config.ts'), 'utf8');
  assert.doesNotMatch(service, /GoogleGenAI|process\.env\.(API_KEY|GEMINI_API_KEY)/);
  assert.match(service, /fetch\('\/api\/agent-response'/);
  assert.doesNotMatch(vite, /define:\s*\{|GEMINI_API_KEY|process\.env\.API_KEY/);
  assert.match(vite, /host:\s*['"]127\.0\.0\.1['"]/);
});

test('valid same-origin request returns generated text without exposing provider key', async t => {
  let captured;
  const baseUrl = await withServer(t, {
    apiKey: 'server-only-test-key',
    generateContent: async input => { captured = input; return 'mocked response'; }
  });
  const response = await fetch(baseUrl + '/api/agent-response', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validBody)
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.text, 'mocked response');
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'apiKey'), false);
  assert.equal(captured.apiKey, 'server-only-test-key');
  assert.equal(captured.history[0].text, 'hello');
});

test('missing key, foreign origin, and malformed payload fail closed', async t => {
  const baseUrl = await withServer(t, { apiKey: '' });
  const missingKey = await fetch(baseUrl + '/api/agent-response', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validBody)
  });
  assert.equal(missingKey.status, 503);
  assert.equal((await missingKey.json()).error, 'gemini_api_key_not_configured');

  const foreignOrigin = await fetch(baseUrl + '/api/agent-response', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://attacker.invalid' },
    body: JSON.stringify(validBody)
  });
  assert.equal(foreignOrigin.status, 403);

  const invalid = await fetch(baseUrl + '/api/agent-response', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...validBody, history: 'not-an-array' })
  });
  assert.equal(invalid.status, 400);
});

test('oversized and invalid JSON bodies are rejected', async t => {
  const baseUrl = await withServer(t, { apiKey: 'server-only-test-key' });
  const invalidJson = await fetch(baseUrl + '/api/agent-response', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{'
  });
  assert.equal(invalidJson.status, 400);
  const oversized = await fetch(baseUrl + '/api/agent-response', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 1) })
  });
  assert.equal(oversized.status, 413);
});

test('non-loopback host configuration is rejected', () => {
  assert.throws(() => createElysiumServer({ host: '0.0.0.0', port: 0 }), /loopback only/);
});
