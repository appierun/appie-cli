'use strict';
const http = require('http');
const { execFile } = require('child_process');
const path = require('path');
const BIN = path.join(__dirname, '..', 'bin', 'appie.js');
const KEY = 'esk_test_dummy';
let last;
const server = http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    last = { method: req.method, url: req.url, auth: req.headers.authorization, body: b ? JSON.parse(b) : null };
    if (req.url.includes('fail')) { res.writeHead(422, { 'content-type': 'application/json' }); return res.end('{"error":"invalid_arguments","message":"bad"}'); }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}');
  });
});
const run = (args, env = {}) => new Promise(r => execFile('node', [BIN, ...args], { env: { ...process.env, APPIE_API_KEY: KEY, APPIE_API_BASE: base, ...env } }, (e, so, se) => r({ code: e ? e.code : 0, so, se })));
let base;
const cases = [
  [['links','create','--long-url','https://example.com/pricing','--code','spring'], 'POST','/api/v1/links',{long_url:'https://example.com/pricing',code:'spring'}],
  [['links','stats','--id','42'],'GET','/api/v1/links/42',null],
  [['links','stats','--code','spring'],'GET','/api/v1/links?code=spring',null],
  [['authors','list'],'GET','/api/v1/authors',null],
  [['authors','create','--name','Ada','--bio','B'],'POST','/api/v1/authors',{author_name:'Ada',bio:'B'}],
  [['authors','add-sample','--id','3','--content','C'],'POST','/api/v1/authors/3/samples',{content:'C'}],
  [['articles','create','--topic','How to brew tea','--type','light'],'POST','/api/v1/articles',{topic:'How to brew tea',article_type:'light'}],
  [['articles','status','--id','10'],'GET','/api/v1/articles/10',null],
  [['brain','get'],'GET','/api/v1/brain',null],
  [['brain','update','--json','{"category":"ecommerce"}'],'PATCH','/api/v1/brain',{category:'ecommerce'}],
  [['chatbots','list'],'GET','/api/v1/chatbots',null],
  [['chatbots','create','--name','Help','--prompt','P'],'POST','/api/v1/chatbots',{name:'Help',system_prompt:'P'}],
  [['chatbots','add-content','--id','4','--type','text','--title','FAQ','--content','X'],'POST','/api/v1/chatbots/4/content',{content_type:'text',title:'FAQ',content:'X'}],
  [['chatbots','status','--id','4'],'GET','/api/v1/chatbots/4',null],
  [['chatbots','ask','--id','4','--message','Where?'],'POST','/api/v1/chatbots/4/messages',{message:'Where?'}],
  [['reddit','settings'],'GET','/api/v1/reddit/settings',null],
  [['reddit','update','--json','{"keywords":["green tea"]}'],'PATCH','/api/v1/reddit/settings',{keywords:['green tea']}],
  [['reddit','mentions','--limit','20'],'GET','/api/v1/reddit/mentions?limit=20',null],
  [['reddit','reply','--id','88'],'POST','/api/v1/reddit/mentions/88/reply',null],
  [['linkedin','profiles'],'GET','/api/v1/linkedin/profiles',null],
  [['linkedin','set-profile','--url','https://www.linkedin.com/in/example'],'PUT','/api/v1/linkedin/profiles',{profile_url:'https://www.linkedin.com/in/example'}],
  [['linkedin','leads','--limit','20'],'GET','/api/v1/linkedin/leads?limit=20',null],
  [['events','create','--name','signup','--user-key','user_123','--metadata','{"plan":"starter"}'],'POST','/event_store/api/v1/events',{event_name:'signup',user_key:'user_123',metadata:{plan:'starter'}}],
];
server.listen(0, async () => {
  base = `http://127.0.0.1:${server.address().port}`;
  let fail = 0, pass = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
  for (const [args, m, p, body] of cases) {
    last = null; const r = await run(args);
    ok(r.code === 0 && last && last.method === m && last.url === p && last.auth === `Bearer ${KEY}` && JSON.stringify(last.body) === JSON.stringify(body) && JSON.parse(r.so).ok, args.join(' ') + ' ' + JSON.stringify({ r, last }));
  }
  let r = await run(['links','stats','--code','fail']); ok(r.code === 1 && r.se.includes('invalid_arguments') && r.so === '', '4xx exit');
  r = await run(['authors','list'], { APPIE_API_KEY: '' }); ok(r.code === 1 && r.se.includes('APPIE_API_KEY'), 'missing key');
  r = await run([]); ok(r.code === 0 && Object.keys(cases).length && r.so.includes('events create') && r.so.includes('--user-key'), 'help');
  console.log(`${pass} passed, ${fail} failed`); server.close(); process.exit(fail ? 1 : 0);
});
