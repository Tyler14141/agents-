// ---------------------------------------------------------------------------
// Minimal zero-dependency proxy for the TRIO Assistant.
//
// Holds ANTHROPIC_API_KEY server-side (never exposed to the browser) and
// forwards chat requests to the Claude API. The Vite dev server proxies
// /api -> http://localhost:8787 (see vite.config.ts).
//
//   ANTHROPIC_API_KEY=sk-ant-... npm run server
//   # or put the key in .env and run:  npm run server
// ---------------------------------------------------------------------------

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// --- tiny .env loader (no dependency) ---
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  /* ignore */
}

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  if (req.url === '/api/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, configured: Boolean(API_KEY), model: MODEL });
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    if (!API_KEY) {
      return send(res, 503, { error: 'Assistant not configured: set ANTHROPIC_API_KEY and restart the server.' });
    }
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const system = typeof body.system === 'string' ? body.system : undefined;
      const maxTokens = Math.min(Number(body.max_tokens) || 1024, 2048);
      if (messages.length === 0) return send(res, 400, { error: 'No messages provided.' });

      const upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
      });

      if (!upstream.ok) {
        const detail = await upstream.text();
        console.error('Anthropic error', upstream.status, detail);
        return send(res, 502, { error: `Claude API error (${upstream.status}).` });
      }

      const data = await upstream.json();
      const text = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return send(res, 200, { text, model: data.model });
    } catch (e) {
      console.error('Proxy error', e);
      return send(res, 500, { error: 'Assistant proxy error.' });
    }
  }

  return send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`TRIO Assistant proxy on http://localhost:${PORT}  (model: ${MODEL}, key: ${API_KEY ? 'set' : 'MISSING'})`);
});
