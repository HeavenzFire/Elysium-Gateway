const MAX_BODY_BYTES = 64 * 1024;
const MAX_HISTORY_ITEMS = 100;
const MAX_TEXT_LENGTH = 20000;

export function validatePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('request body must be an object');
  const allowed = new Set(['history', 'systemInstruction', 'agentPrompt']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw Error('unsupported request field: ' + key);
  if (!Array.isArray(value.history) || value.history.length > MAX_HISTORY_ITEMS) throw Error('history must contain at most 100 messages');
  const history = value.history.map((message, index) => {
    if (!message || typeof message !== 'object' || typeof message.text !== 'string' || message.text.length > MAX_TEXT_LENGTH || typeof message.sender !== 'string' || message.sender.length > 64) throw Error('history message ' + index + ' is invalid');
    return { sender: message.sender, text: message.text };
  });
  if (typeof value.systemInstruction !== 'string' || !value.systemInstruction.trim() || value.systemInstruction.length > 12000) throw Error('systemInstruction is invalid');
  if (typeof value.agentPrompt !== 'string' || !value.agentPrompt.trim() || value.agentPrompt.length > 12000) throw Error('agentPrompt is invalid');
  return { history, systemInstruction: value.systemInstruction, agentPrompt: value.agentPrompt };
}
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(Error('request body too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(Error('request body must be valid JSON'), { statusCode: 400 }); }
}
export function createAgentHandler({ ai, apiKey, clock = () => Date.now(), rateLimit = 20, windowMs = 60000 } = {}) {
  const buckets = new Map();
  return async function handleAgentRequest(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    if (!apiKey || !ai) return json(res, 503, { error: 'server_provider_not_configured' });
    const ip = req.socket?.remoteAddress || 'unknown';
    const now = clock();
    const bucket = buckets.get(ip);
    if (bucket && now - bucket.startedAt < windowMs && bucket.count >= rateLimit) return json(res, 429, { error: 'rate_limit_exceeded' });
    if (!bucket || now - bucket.startedAt >= windowMs) buckets.set(ip, { startedAt: now, count: 1 });
    else bucket.count++;
    try {
      const input = validatePayload(await readBody(req));
      const contents = input.history.map(message => ({ role: message.sender === 'USER' ? 'user' : 'model', parts: [{ text: message.text }] }));
      contents.push({ role: 'user', parts: [{ text: input.agentPrompt }] });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { temperature: 0.7, topP: 0.95, topK: 64, maxOutputTokens: 8192, systemInstruction: input.systemInstruction }
      });
      return json(res, 200, { text: typeof response.text === 'string' ? response.text : '' });
    } catch (error) {
      const status = Number.isInteger(error.statusCode) ? error.statusCode : 502;
      return json(res, status, { error: status === 502 ? 'provider_request_failed' : error.message });
    }
  };
}
