import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { validatePayload, createAgentHandler } from './gemini-api.mjs';
function request(body, method = 'POST') { const req = Readable.from([Buffer.from(JSON.stringify(body))]); req.method = method; req.socket = { remoteAddress: '127.0.0.1' }; return req; }
function response() { return { headers: {}, setHeader(k,v){this.headers[k]=v;}, end(v){this.body=v;}, statusCode:200 }; }
const valid = { history: [{ sender: 'USER', text: 'hello' }], systemInstruction: 'Be concise', agentPrompt: 'Answer now' };
test('validates the public request contract', () => { assert.deepEqual(validatePayload(valid), valid); });
test('rejects client-supplied credentials and oversized history', () => { assert.throws(() => validatePayload({ ...valid, apiKey: 'secret' }), /unsupported request field/); assert.throws(() => validatePayload({ ...valid, history: Array(101).fill({ sender: 'USER', text: 'x' }) }), /at most 100/); });
test('forwards only validated conversation data to the server-side Gemini client', async () => {
 let captured; const ai = { models: { async generateContent(args) { captured = args; return { text: 'server response' }; } } };
 const handler = createAgentHandler({ ai, apiKey: 'server-only-test-key' }); const res = response(); await handler(request(valid), res);
 assert.equal(res.statusCode, 200); assert.deepEqual(JSON.parse(res.body), { text: 'server response' }); assert.equal(captured.model, 'gemini-2.5-flash'); assert.equal(captured.contents.at(-1).parts[0].text, 'Answer now'); assert.equal(JSON.stringify(captured).includes('server-only-test-key'), false);
});
test('returns unavailable without a server-side credential', async () => { const handler = createAgentHandler({ ai: null, apiKey: '' }); const res = response(); await handler(request(valid), res); assert.equal(res.statusCode, 503); assert.equal(JSON.parse(res.body).error, 'server_provider_not_configured'); });
test('enforces method and rate limits', async () => { let now = 1000; const handler = createAgentHandler({ ai: { models: { async generateContent(){return {text:'ok'};} } }, apiKey: 'test', clock: () => now, rateLimit: 1 }); const wrong = response(); await handler(request(valid, 'GET'), wrong); assert.equal(wrong.statusCode, 405); const first = response(); await handler(request(valid), first); assert.equal(first.statusCode, 200); const second = response(); await handler(request(valid), second); assert.equal(second.statusCode, 429); now += 60001; const third = response(); await handler(request(valid), third); assert.equal(third.statusCode, 200); });
