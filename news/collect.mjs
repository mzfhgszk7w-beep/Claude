// News collector: pulls RSS feeds and appends new items to data/news/YYYY-MM-DD.jsonl
// (date in Asia/Dubai). No dependencies; runs on Node >= 18 via GitHub Actions.
import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data', 'news');
const TZ = 'Asia/Dubai';

// cat: de | uae | world | markets | crypto | business — hilft der Redaktion beim Einordnen.
const FEEDS = [
  // Deutschland
  { source: 'Handelsblatt', cat: 'de', url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen' },
  { source: 'Handelsblatt', cat: 'de', url: 'https://www.handelsblatt.com/contentexport/feed/top-themen' },
  { source: 'Handelsblatt', cat: 'markets', url: 'https://www.handelsblatt.com/contentexport/feed/finanzen' },
  { source: 'Handelsblatt', cat: 'business', url: 'https://www.handelsblatt.com/contentexport/feed/unternehmen' },
  { source: 'Handelsblatt', cat: 'de', url: 'https://www.handelsblatt.com/contentexport/feed/politik' },
  { source: 'Tagesschau', cat: 'de', url: 'https://www.tagesschau.de/index~rss2.xml' },
  { source: 'Tagesschau', cat: 'business', url: 'https://www.tagesschau.de/wirtschaft/index~rss2.xml' },
  { source: 'Spiegel', cat: 'de', url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
  { source: 'FAZ', cat: 'de', url: 'https://www.faz.net/rss/aktuell/' },
  { source: 'Zeit', cat: 'de', url: 'https://newsfeed.zeit.de/index' },
  { source: 'n-tv', cat: 'de', url: 'https://www.n-tv.de/rss' },
  { source: 'DW', cat: 'de', url: 'https://rss.dw.com/xml/rss-de-all' },
  // VAE & Golf
  { source: 'The National', cat: 'uae', url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml' },
  { source: 'Gulf News', cat: 'uae', url: 'https://gulfnews.com/feed' },
  // Google News: Titel enden mit " - <Medium>", das Medium steht in <source>.
  { source: 'Google News', cat: 'uae', url: 'https://news.google.com/rss/search?q=Dubai+OR+%22Abu+Dhabi%22+OR+UAE+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'uae', url: 'https://news.google.com/rss/search?q=UAE+law+OR+visa+OR+%22new+rule%22+OR+residents+when:2d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'uae', url: 'https://news.google.com/rss/search?q=Dubai+OR+VAE+OR+Emirate+when:1d&hl=de&gl=DE&ceid=DE:de' },
  { source: 'Al Jazeera', cat: 'world', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  // Welt
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'BBC', cat: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'Sky News', cat: 'world', url: 'https://feeds.skynews.com/feeds/rss/home.xml' },
  { source: 'Sky News', cat: 'world', url: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { source: 'Fox News', cat: 'world', url: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
  { source: 'Fox News', cat: 'world', url: 'https://moxie.foxnews.com/google-publisher/world.xml' },
  { source: 'Guardian', cat: 'world', url: 'https://www.theguardian.com/world/rss' },
  { source: 'France 24', cat: 'world', url: 'https://www.france24.com/en/rss' },
  { source: 'DW', cat: 'world', url: 'https://rss.dw.com/rdf/rss-en-all' },
  // Weltregionen: BBC und France 24 je Region, Reuters/AP über Google News.
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml' },
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml' },
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml' },
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml' },
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml' },
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml' },
  { source: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/australia/rss.xml' },
  { source: 'France 24', cat: 'world', url: 'https://www.france24.com/en/africa/rss' },
  { source: 'France 24', cat: 'world', url: 'https://www.france24.com/en/asia-pacific/rss' },
  { source: 'France 24', cat: 'world', url: 'https://www.france24.com/en/americas/rss' },
  { source: 'France 24', cat: 'world', url: 'https://www.france24.com/en/middle-east/rss' },
  { source: 'Google News', cat: 'world', url: 'https://news.google.com/rss/search?q=site:reuters.com+world+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'world', url: 'https://news.google.com/rss/search?q=site:apnews.com+world+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  // Golfstaaten einzeln (The National/Gulf News decken vor allem die VAE ab).
  { source: 'Google News', cat: 'uae', url: 'https://news.google.com/rss/search?q=%22Saudi+Arabia%22+OR+Riyadh+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'uae', url: 'https://news.google.com/rss/search?q=Qatar+OR+Doha+OR+Kuwait+OR+Bahrain+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'uae', url: 'https://news.google.com/rss/search?q=Oman+OR+Muscat+OR+Iraq+OR+Jordan+OR+Lebanon+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'uae', url: 'https://news.google.com/rss/search?q=Egypt+OR+Cairo+OR+Yemen+OR+Syria+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  // Märkte & Fed
  { source: 'Federal Reserve', cat: 'markets', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { source: 'CNBC', cat: 'markets', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html' },
  { source: 'CNBC', cat: 'markets', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
  { source: 'MarketWatch', cat: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  // Krypto
  { source: 'CoinDesk', cat: 'crypto', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', cat: 'crypto', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', cat: 'crypto', url: 'https://decrypt.co/feed' },
  { source: 'The Block', cat: 'crypto', url: 'https://www.theblock.co/rss.xml' },
  { source: 'Bitcoin Magazine', cat: 'crypto', url: 'https://bitcoinmagazine.com/.rss/full/' },
  { source: 'U.Today', cat: 'crypto', url: 'https://u.today/rss' },
  { source: 'Google News', cat: 'crypto', url: 'https://news.google.com/rss/search?q=%22Shiba+Inu%22+OR+SHIB+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'crypto', url: 'https://news.google.com/rss/search?q=crypto+regulation+OR+law+OR+bill+OR+ban+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
  { source: 'Google News', cat: 'crypto', url: 'https://news.google.com/rss/search?q=Krypto+OR+Bitcoin+Gesetz+OR+Regulierung+OR+BaFin+when:2d&hl=de&gl=DE&ceid=DE:de' },
  { source: 'Google News', cat: 'markets', url: 'https://news.google.com/rss/search?q=%22Federal+Reserve%22+OR+FOMC+OR+%22Fed+chair%22+OR+Warsh+when:1d&hl=en-AE&gl=AE&ceid=AE:en' },
];

const dayInTz = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

const unent = (u) => u.replace(/&amp;/g, '&').trim();

// Bild aus dem Feed-Eintrag: media:content/thumbnail, enclosure oder erstes <img> im Text.
function feedImage(b) {
  const pats = [
    /<media:content[^>]*url="([^"]+)"[^>]*(?:medium="image"|type="image)/i,
    /<media:content[^>]*(?:medium="image"|type="image)[^>]*url="([^"]+)"/i,
    /<media:thumbnail[^>]*url="([^"]+)"/i,
    /<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/i,
    /<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i,
    /<media:content[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i,
    /<img[^>]*src="(https?:[^"]+)"/i,
  ];
  const x = b.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  for (const p of pats) { const m = x.match(p); if (m) return unent(m[1]); }
  return null;
}

// BBC liefert 240px-Vorschauen; größere Variante anfordern.
const upscale = (u) => (u ? u.replace(/ichef\.bbci\.co\.uk\/(ace\/standard|news)\/240\//, 'ichef.bbci.co.uk/$1/800/') : u);

async function ogImage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 300000);
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    return m ? unent(m[1]) : null;
  } catch { return null; }
}

function parseFeed(xml) {
  const items = [];
  for (const m of xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)) {
    const b = m[0];
    let link = tag(b, 'link');
    if (!link) link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const title = tag(b, 'title');
    if (!title || !link) continue;
    const pub = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
    const date = pub && !isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : null;
    items.push({
      title,
      link: link.split('#')[0],
      summary: (tag(b, 'description') || tag(b, 'summary')).slice(0, 600),
      published: date,
      image: upscale(feedImage(b)),
      publisher: tag(b, 'source') || null,
    });
  }
  return items;
}

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchFeed({ source, cat, url }) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text()).map(({ publisher, ...i }) => ({ source: publisher || source, via: publisher ? source : undefined, cat, feed: url, ...i }));
}

async function loadSeen(days) {
  const seen = new Set();
  for (const d of days) {
    const f = join(DATA_DIR, `${d}.jsonl`);
    if (!existsSync(f)) continue;
    for (const line of (await readFile(f, 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      try { seen.add(JSON.parse(line).link); } catch {}
    }
  }
  return seen;
}

const now = new Date();
const today = dayInTz(now);
const yesterday = dayInTz(new Date(now.getTime() - 86400000));
await mkdir(DATA_DIR, { recursive: true });
const seen = await loadSeen([today, yesterday]);

const status = [];
const fresh = [];
const results = await Promise.allSettled(FEEDS.map(fetchFeed));
results.forEach((r, i) => {
  const { source, url } = FEEDS[i];
  if (r.status === 'rejected') {
    status.push({ source, url, ok: false, error: String(r.reason?.message || r.reason) });
    return;
  }
  let added = 0;
  for (const item of r.value) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    fresh.push({ ...item, collected: now.toISOString() });
    added++;
  }
  status.push({ source, url, ok: true, items: r.value.length, added });
});

// Fehlende Bilder über og:image der Artikelseite nachladen (begrenzt, parallel).
const missing = fresh.filter((i) => !i.image).slice(0, 80);
for (let k = 0; k < missing.length; k += 10) {
  await Promise.all(missing.slice(k, k + 10).map(async (i) => { i.image = await ogImage(i.link); }));
}

if (fresh.length) {
  await appendFile(join(DATA_DIR, `${today}.jsonl`), fresh.map((i) => JSON.stringify(i)).join('\n') + '\n');
}
await writeFile(join(DATA_DIR, 'status.json'), JSON.stringify({ run: now.toISOString(), feeds: status }, null, 2) + '\n');

for (const s of status) console.log(s.ok ? `ok   ${s.source} ${s.url} items=${s.items} new=${s.added}` : `FAIL ${s.source} ${s.url} ${s.error}`);
console.log(`total new: ${fresh.length} (with image: ${fresh.filter((i) => i.image).length}) -> ${today}.jsonl`);
