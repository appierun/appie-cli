#!/usr/bin/env node
'use strict';

const VERSION = '0.1.0';

// command table: [group, action, method, pathFn, flags, bodyFn, queryFn]
const COMMANDS = {
  'links create': {
    method: 'POST', path: () => '/api/v1/links',
    flags: ['--long-url URL (required)', '--code CODE'],
    required: ['long-url'],
    body: f => pick({ long_url: f['long-url'], code: f.code }),
  },
  'links stats': {
    method: 'GET',
    path: f => f.id ? `/api/v1/links/${enc(f.id)}` : `/api/v1/links?code=${enc(f.code)}`,
    flags: ['--id ID', '--code CODE (one of --id or --code)'],
    check: f => (f.id || f.code) ? null : 'links stats needs --id or --code',
  },
  'authors list': { method: 'GET', path: () => '/api/v1/authors', flags: [] },
  'authors create': {
    method: 'POST', path: () => '/api/v1/authors',
    flags: ['--name NAME (required)', '--bio TEXT (required, 50+ chars)', '--active true|false', '--sample-title TITLE', '--sample-content TEXT (100+ chars)'],
    required: ['name', 'bio'],
    body: f => pick({ author_name: f.name, bio: f.bio, is_active: bool(f.active), sample_title: f['sample-title'], sample_content: f['sample-content'] }),
  },
  'authors add-sample': {
    method: 'POST', path: f => `/api/v1/authors/${enc(f.id)}/samples`,
    flags: ['--id AUTHOR_ID (required)', '--content TEXT', '--blog-url URL (one of --content or --blog-url)', '--title TITLE'],
    required: ['id'],
    check: f => (f.content || f['blog-url']) ? null : 'authors add-sample needs --content or --blog-url',
    body: f => pick({ content: f.content, blog_url: f['blog-url'], title: f.title }),
  },
  'articles create': {
    method: 'POST', path: () => '/api/v1/articles',
    flags: ['--topic TOPIC (required)', '--type light|deeply_researched', '--author-id ID'],
    required: ['topic'],
    body: f => pick({ topic: f.topic, article_type: f.type, author_id: num(f['author-id']) }),
  },
  'articles status': { method: 'GET', path: f => `/api/v1/articles/${enc(f.id)}`, flags: ['--id ARTICLE_ID (required)'], required: ['id'] },
  'brain get': { method: 'GET', path: () => '/api/v1/brain', flags: [] },
  'brain update': {
    method: 'PATCH', path: () => '/api/v1/brain',
    flags: ["--json '{...}' (required)"], required: ['json'], body: f => json(f.json),
  },
  'chatbots list': { method: 'GET', path: () => '/api/v1/chatbots', flags: [] },
  'chatbots create': {
    method: 'POST', path: () => '/api/v1/chatbots',
    flags: ['--name NAME (required)', '--prompt SYSTEM_PROMPT', '--model gpt-4o-mini|gpt-4o|gpt-3.5-turbo', '--temperature 0..1'],
    required: ['name'],
    body: f => pick({ name: f.name, system_prompt: f.prompt, openai_model: f.model, temperature: num(f.temperature) }),
  },
  'chatbots add-content': {
    method: 'POST', path: f => `/api/v1/chatbots/${enc(f.id)}/content`,
    flags: ['--id CHATBOT_ID (required)', '--type text|url|sitemap|article (required)', '--title TITLE', '--content TEXT', '--url URL', '--article-id ID'],
    required: ['id', 'type'],
    body: f => pick({ content_type: f.type, title: f.title, content: f.content, url: f.url, article_id: num(f['article-id']) }),
  },
  'chatbots status': { method: 'GET', path: f => `/api/v1/chatbots/${enc(f.id)}`, flags: ['--id CHATBOT_ID (required)'], required: ['id'] },
  'chatbots ask': {
    method: 'POST', path: f => `/api/v1/chatbots/${enc(f.id)}/messages`,
    flags: ['--id CHATBOT_ID (required)', '--message TEXT (required)', '--session-id ID'],
    required: ['id', 'message'],
    body: f => pick({ message: f.message, session_id: f['session-id'] }),
  },
  'reddit settings': { method: 'GET', path: () => '/api/v1/reddit/settings', flags: [] },
  'reddit update': {
    method: 'PATCH', path: () => '/api/v1/reddit/settings',
    flags: ["--json '{\"keywords\":[...],\"competitors\":[...],\"custom_prompt\":\"...\"}' (required)"],
    required: ['json'], body: f => json(f.json),
  },
  'reddit mentions': {
    method: 'GET', path: f => '/api/v1/reddit/mentions' + qs({ limit: f.limit }),
    flags: ['--limit N (default 20, max 50)'],
  },
  'reddit reply': { method: 'POST', path: f => `/api/v1/reddit/mentions/${enc(f.id)}/reply`, flags: ['--id MENTION_ID (required)'], required: ['id'] },
  'linkedin profiles': { method: 'GET', path: () => '/api/v1/linkedin/profiles', flags: [] },
  'linkedin set-profile': {
    method: 'PUT', path: () => '/api/v1/linkedin/profiles',
    flags: ['--url PROFILE_URL (required)', '--name NAME', '--tracking true|false (default true)'],
    required: ['url'],
    body: f => pick({ profile_url: f.url, name: f.name, tracking_enabled: bool(f.tracking) }),
  },
  'linkedin leads': {
    method: 'GET', path: f => '/api/v1/linkedin/leads' + qs({ limit: f.limit, tracked_profile_id: f['profile-id'] }),
    flags: ['--limit N (default 20, max 50)', '--profile-id TRACKED_PROFILE_ID'],
  },
  'events create': {
    method: 'POST', path: () => '/event_store/api/v1/events',
    flags: ['--name EVENT_NAME (required)', '--user-key KEY (required)', "--metadata '{...}'"],
    required: ['name', 'user-key'],
    body: f => pick({ event_name: f.name, user_key: f['user-key'], metadata: f.metadata === undefined ? undefined : json(f.metadata) }),
  },
};

function enc(v) { return encodeURIComponent(String(v)); }
function pick(o) { const r = {}; for (const [k, v] of Object.entries(o)) if (v !== undefined) r[k] = v; return r; }
function num(v) { if (v === undefined) return undefined; const n = Number(v); return Number.isNaN(n) ? v : n; }
function bool(v) { if (v === undefined) return undefined; if (v === true || v === 'true') return true; if (v === 'false') return false; return v; }
function qs(o) { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== undefined) p.set(k, String(v)); const s = p.toString(); return s ? '?' + s : ''; }
function json(s) { try { return JSON.parse(s); } catch (e) { die(`Invalid JSON: ${e.message}`); } }
function die(msg) { process.stderr.write(`appie: ${msg}\n`); process.exit(1); }

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) die(`unexpected argument: ${a}`);
    let key = a.slice(2), val;
    const eq = key.indexOf('=');
    if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq); }
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) val = argv[++i];
    else val = true;
    f[key] = val;
  }
  return f;
}

function help() {
  const lines = [
    `appie ${VERSION} - command-line client for the Appie.run HTTP API`,
    '',
    'Usage: appie <group> <command> [flags]',
    '',
    'Environment:',
    '  APPIE_API_KEY   your project esk_ key (required; sent as Authorization: Bearer)',
    '  APPIE_API_BASE  API base URL (default https://appie.run)',
    '',
    'Commands:',
  ];
  for (const [name, c] of Object.entries(COMMANDS)) {
    lines.push(`  ${name.padEnd(22)} ${c.method} ${c.path({ id: ':id', code: ':code' }).replace(/%3A/g, ':').replace(/\?.*$/, '')}`);
    for (const fl of c.flags) lines.push(`      ${fl}`);
  }
  lines.push('', 'Docs: https://appie.run/docs/api');
  process.stdout.write(lines.join('\n') + '\n');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || ['help', '--help', '-h'].includes(argv[0])) return help();
  if (argv[0] === '--version' || argv[0] === '-v') return void process.stdout.write(VERSION + '\n');
  const name = `${argv[0]} ${argv[1] || ''}`.trim();
  const cmd = COMMANDS[name];
  if (!cmd) { process.stderr.write(`appie: unknown command "${name}"\n\n`); help(); process.exit(1); }
  const flags = parseFlags(argv.slice(2));
  if (flags.help) return help();
  for (const r of cmd.required || []) if (flags[r] === undefined || flags[r] === true) die(`${name} needs --${r}`);
  if (cmd.check) { const err = cmd.check(flags); if (err) die(err); }

  const key = process.env.APPIE_API_KEY;
  if (!key) die('APPIE_API_KEY is not set. Get an esk_ key in Appie: open your project, then API.');
  const base = (process.env.APPIE_API_BASE || 'https://appie.run').replace(/\/+$/, '');

  const opts = { method: cmd.method, headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } };
  if (cmd.body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(cmd.body(flags)); }

  let res;
  try { res = await fetch(base + cmd.path(flags), opts); }
  catch (e) { die(`request failed: ${e.message}`); }
  const text = await res.text();
  let out = text;
  try { out = JSON.stringify(JSON.parse(text), null, 2); } catch (_) {}
  if (!res.ok) { process.stderr.write(`HTTP ${res.status}\n${out}\n`); process.exit(1); }
  process.stdout.write(out + '\n');
}

main();
