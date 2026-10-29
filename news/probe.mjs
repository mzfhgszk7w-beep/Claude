// Einmaliger Test (GitHub Action „News probe“): Bing-News-RSS mit Anreißer, Google-News-Link auflösen, og:description.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = async (u, o = {}) => { const r = await fetch(u, { headers: { 'User-Agent': UA, ...(o.headers || {}) }, ...o, signal: AbortSignal.timeout(20000) }); return [r.status, await r.text(), r.url]; };
for (const q of ['Afghanistan', 'Zypern']) {
  const [st, x] = await get(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=de&cc=DE&mkt=de-DE`);
  console.log('BING', q, st, x.length);
  for (const m of [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 4)) console.log('  ', m[1].replace(/\s+/g, ' ').slice(0, 700));
}
const [st2, g] = await get('https://news.google.com/rss/search?q=%22Afghanistan%22+when:1d&hl=en-US&gl=US&ceid=US:en');
const link = (g.match(/<item>[\s\S]*?<link>([^<]+)<\/link>/) || [])[1];
console.log('GOOGLE', st2, link);
try {
  const id = link.split('/articles/')[1].split('?')[0];
  const [st3, page] = await get(`https://news.google.com/articles/${id}`);
  const sg = (page.match(/data-n-a-sg="([^"]+)"/) || [])[1], ts = (page.match(/data-n-a-ts="([^"]+)"/) || [])[1];
  console.log('GPAGE', st3, !!sg, !!ts);
  const req = [[['Fbv4je', `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`, null, 'generic']]];
  const [st4, body] = await get('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'f.req=' + encodeURIComponent(JSON.stringify(req)) });
  const url = (body.match(/garturlres\\",\\"(.*?)\\"/) || [])[1];
  console.log('GDECODE', st4, url);
  if (url) { const [st5, art] = await get(url); console.log('ARTICLE', st5, (art.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]*content=["']([^"']+)/i) || [])[1]); }
} catch (e) { console.log('GERR', e.message); }
