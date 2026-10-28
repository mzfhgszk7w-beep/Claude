// Layout Version 2 (Tagesbriefing): Themen-Tabs und Länder-Menü.
// Baut aus einer Ausgabe (JSON wie in `editions`) eine eigenständige HTML-Datei im Zeitungsdesign
// für den Versand als Telegram-Dokument. Kein JavaScript: Tabs, Länder-Menü und Länderseiten laufen über
// CSS `:target`, damit es auch in der Telegram-Vorschau auf dem iPhone funktioniert.
//
// Ausgabe-Format (neu): { kind, date, hour, stats, lead, stories: [ { title, summary, status, sources,
//   topic, country, top } ] }. topic = Schlüssel aus TOPICS, country = ISO-Code aus countries.mjs oder "".
// Altes Format mit `sections` wird weiter gelesen (Ressortname wird zum Thema).
// Optional `briefs: { "<ISO>": [ { title, source, url, sources, status } ] }` aus news/laender.mjs: kurze
// Ländermeldungen (nur Schlagzeile + Quelle) unter den ausführlichen Meldungen jedes Landes.
//
// Bilder: bevorzugt eingebettet aus dem Bilder-Checkout `.news-img/` (letzte 3 Stunden), sonst als Link auf
// das Originalbild der Nachrichtenseite (lädt nur mit Internet).
// Aufruf: node news/html.mjs <ausgabe.json> <ausgabe.html> [bilder-verzeichnis]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, CONTINENTS } from './countries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data', 'news');
const [, , inFile, outFile, imgDirArg] = process.argv;
const IMG_DIR = imgDirArg || join(ROOT, '.news-img');

const TOPICS = {
  pol: 'Politik & Konflikte', wirt: 'Wirtschaft & Unternehmen', fin: 'Finanzen & Märkte', krypto: 'Krypto',
  tech: 'Technologie & Cyber', wiss: 'Wissenschaft & Gesundheit', umwelt: 'Klima & Umwelt',
  ges: 'Gesellschaft & Panorama', sport: 'Sport',
};
const TOPIC_SHORT = {
  pol: 'Politik', wirt: 'Wirtschaft', fin: 'Finanzen', krypto: 'Krypto', tech: 'Tech & Cyber',
  wiss: 'Wissenschaft', umwelt: 'Klima', ges: 'Panorama', sport: 'Sport',
};
const GULF = 'Naher Osten & Golf';

const raw = JSON.parse(readFileSync(inFile, 'utf8'));
const ed = raw.data && raw.data.kind ? raw.data : raw;

// Altes Format in das neue überführen.
const LEGACY = { 'Deutschland': ['pol', 'DE'], 'VAE & Golf': ['pol', 'AE'], 'Welt': ['pol', ''], 'Fed, Zinsen & Märkte': ['fin', ''],
  'Krypto': ['krypto', ''], 'Unternehmen': ['wirt', ''], 'Technologie & Sicherheit': ['tech', ''], 'Weitere Meldungen': ['ges', ''] };
let stories = ed.stories;
if (!stories) {
  stories = [];
  for (const sec of ed.sections || []) {
    const [topic, country] = LEGACY[sec.name] || ['ges', ''];
    sec.stories.forEach((s, k) => stories.push({ topic, country, top: k === 0, ...s }));
  }
}
const lead = ed.lead ? { topic: ed.lead.topic || 'pol', country: ed.lead.country || '', ...ed.lead } : null;

// --- Bilder ---
const norm = (u) => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/$/, ''); } catch { return u; } };
const local = new Map();
const idxFile = join(IMG_DIR, 'index.json');
if (existsSync(idxFile)) {
  for (const [link, v] of Object.entries(JSON.parse(readFileSync(idxFile, 'utf8')))) local.set(norm(link), v);
}
const remote = new Map();
if (existsSync(DATA_DIR)) {
  for (const f of readdirSync(DATA_DIR).filter((n) => n.endsWith('.jsonl')).sort().slice(-3)) {
    for (const line of readFileSync(join(DATA_DIR, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const i = JSON.parse(line); if (i.image) remote.set(norm(i.link), { src: i.image, credit: i.source }); } catch {}
    }
  }
}
// Jedes Bild steckt genau einmal als CSS-Klasse in der Datei, auch wenn die Meldung auf mehreren Seiten steht.
// Höchstens 24 eingebettete Bilder, damit die Datei unter ~2 MB bleibt.
const imgCss = [];
const imgByStory = new Map();
let embedded = 0;
function imageFor(story) {
  if (imgByStory.has(story)) return imgByStory.get(story);
  let found = null;
  const urls = (story.sources || []).map((s) => norm(s.url));
  const hitLocal = urls.map((u) => local.get(u)).find((h) => h && existsSync(join(IMG_DIR, h.file)));
  const cls = 'i' + imgCss.length;
  if (hitLocal && embedded < 24) {
    embedded++;
    imgCss.push(`.${cls}{background-image:url(data:image/jpeg;base64,${readFileSync(join(IMG_DIR, hitLocal.file)).toString('base64')})}`);
    found = { cls, credit: hitLocal.source };
  } else {
    const hitRemote = urls.map((u) => remote.get(u)).find(Boolean);
    if (hitRemote && /^https:\/\/[^"'()\s]+$/.test(hitRemote.src)) {
      imgCss.push(`.${cls}{background-image:url("${hitRemote.src}")}`);
      found = { cls, credit: hitRemote.credit };
    }
  }
  imgByStory.set(story, found);
  return found;
}

// --- Bausteine ---
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STATUS = { 'bestätigt': ['ok', 'Bestätigt'], 'unbestätigt': ['warn', 'Unbestätigt'], 'widersprüchlich': ['bad', 'Widersprüchlich'] };
const fmtDay = (d) => new Date(d + 'T12:00:00+04:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
const cid = (code) => 'c-' + code.toLowerCase();

function card(s, { isLead = false, showTopic = true, showCountry = true } = {}) {
  const [cls, label] = STATUS[s.status] || STATUS['unbestätigt'];
  const img = imageFor(s);
  const links = (s.sources || []).filter((x) => /^https?:/.test(x.url));
  const src = links.map((x) => `<a href="${esc(x.url)}">${esc(x.name)}</a>`).join(' · ');
  const c = s.country && COUNTRIES[s.country];
  const tags = [
    isLead ? '<span class="tag acc">Aufmacher</span>' : '',
    showTopic && s.topic && TOPIC_SHORT[s.topic] ? `<span class="tag acc">${esc(TOPIC_SHORT[s.topic])}</span>` : '',
    showCountry && c ? `<a class="tag ctry" href="#${cid(s.country)}">${c.flag} ${esc(c.name)}</a>` : '',
    `<span class="st ${cls}">● ${label}${links.length ? ` · ${links.length} ${links.length === 1 ? 'Quelle' : 'Quellen'}` : ''}</span>`,
  ].join('');
  return `<article class="${isLead ? 'lead' : 'story'}">
${img ? `<figure><div class="ph ${img.cls}" role="img"></div><figcaption>${esc(img.credit)}</figcaption></figure>` : ''}
<div class="kicker">${tags}</div>
<h${isLead ? 2 : 3}>${s.update ? '<span class="upd">Update</span> ' : ''}${esc(s.title)}</h${isLead ? 2 : 3}>
${s.summary ? `<p class="sum">${esc(s.summary)}</p>` : ''}
${s.why ? `<p class="why"><b>Hintergrund:</b> ${esc(s.why)}</p>` : ''}
${src ? `<p class="src">Quellen: ${src}</p>` : ''}
</article>`;
}

// --- Seiten ---
const all = lead ? [lead, ...stories] : stories;
const st = ed.stats || {};
const heading = { morning: 'Morgenbriefing', afternoon: 'Tagesbriefing', evening: 'Abendbriefing' }[ed.kind] || `Ausgabe ${esc(ed.hour)} Uhr`;
const topicIds = Object.keys(TOPICS).filter((t) => stories.some((s) => s.topic === t));
const outlook = ed.outlook && ed.outlook.length
  ? `<div class="outlook"><h3>${ed.kind === 'afternoon' ? 'Was als Nächstes wichtig wird' : 'Was morgen wichtig wird'}</h3><ul>${ed.outlook.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : '';

const topStories = stories.filter((s) => s.top);
const pages = [
  { id: 'top', body: (ed.kind === 'evening' && ed.intro ? `<div class="intro">${esc(ed.intro)}</div>` : '')
    + (lead ? card(lead, { isLead: true }) : '') + (topStories.length ? topStories : stories.slice(0, 8)).map((s) => card(s)).join('\n') + outlook },
  ...topicIds.map((t) => ({ id: t, body: `<h2 class="ph-title">${esc(TOPICS[t])}</h2>`
    + all.filter((s) => s.topic === t).map((s) => card(s, { showTopic: false })).join('\n') })),
];

// Länder: alle Meldungen des Landes. Die Redaktion liefert außerhalb von Europa und Golf nur Top-Stories.
const byCountry = new Map();
for (const s of all) {
  if (!s.country || !COUNTRIES[s.country]) continue;
  if (!byCountry.has(s.country)) byCountry.set(s.country, []);
  byCountry.get(s.country).push(s);
}
const briefs = ed.briefs || {};
for (const code of Object.keys(briefs)) {
  if (!COUNTRIES[code] || !briefs[code].length) continue;
  if (!byCountry.has(code)) byCountry.set(code, []);
}
const countOf = (code) => byCountry.get(code).length + (briefs[code] || []).length;
function brief(b) {
  const [cls, label] = STATUS[b.status] || STATUS['unbestätigt'];
  const more = (b.sources || []).filter((x) => x.name !== b.source).map((x) => `<a href="${esc(x.url)}">${esc(x.name)}</a>`);
  return `<li><span class="st ${cls}" title="${label}">●</span> <a class="bt" href="${esc(b.url)}">${esc(b.title)}</a>
<span class="bs">${esc(b.source)}${more.length ? ` · auch: ${more.join(', ')}` : ''}</span></li>`;
}
for (const [code, list] of byCountry) {
  const c = COUNTRIES[code];
  const extra = briefs[code] || [];
  pages.push({ id: cid(code), body: `<div class="crumb"><a href="#laender">‹ Länder</a> · ${esc(c.continent)}</div>
<h2 class="ph-title">${c.flag} ${esc(c.name)}</h2>${list.map((s) => card(s, { showCountry: false })).join('\n')}${
  extra.length ? `<h3 class="bh">${list.length ? 'Weitere Meldungen' : 'Meldungen der letzten 24 Stunden'}</h3><ul class="briefs">${extra.map(brief).join('')}</ul>` : ''}` });
}

const drawer = CONTINENTS.map((cont) => {
  const codes = Object.keys(COUNTRIES).filter((k) => COUNTRIES[k].continent === cont);
  const withNews = codes.filter((k) => byCountry.has(k))
    .sort((a, b) => countOf(b) - countOf(a) || COUNTRIES[a].name.localeCompare(COUNTRIES[b].name, 'de'));
  const without = codes.filter((k) => !byCountry.has(k)).sort((a, b) => COUNTRIES[a].name.localeCompare(COUNTRIES[b].name, 'de'));
  const n = withNews.reduce((a, k) => a + countOf(k), 0);
  const open = cont === 'Europa' || cont === GULF ? ' open' : '';
  return `<details${open}><summary><span>${esc(cont)}</span><span class="n">${n ? `${n} Meldungen · ` : ''}${codes.length} Länder</span></summary><ul>${
    withNews.map((k) => `<li><a href="#${cid(k)}">${COUNTRIES[k].flag} ${esc(COUNTRIES[k].name)} <span class="n">${countOf(k)}</span></a></li>`).join('')
  }${without.map((k) => `<li><span class="none">${COUNTRIES[k].flag} ${esc(COUNTRIES[k].name)} <span class="n">–</span></span></li>`).join('')}</ul></details>`;
}).join('');

// :target zeigt die gewählte Seite. Die Sprungmarken liegen ganz oben, damit nichts nach unten scrollt.
const hideTop = '.anchor:target:not(#top):not(#laender)';
const pageCss = ['.page{display:none}', '.p-top{display:block}', `body:has(${hideTop}) .p-top{display:none}`,
  `body:has(${hideTop}) nav a.t-top{color:var(--fg);border-color:transparent}`,
  'body:has(#laender:target) .drawer{transform:none}', 'body:has(#laender:target) .scrim{opacity:1;pointer-events:auto}',
  'body:has(#laender:target) nav a.t-laender{color:var(--acc);border-color:var(--acc)}',
  ...pages.slice(1).map((x) => `body:has(#${x.id}:target) .p-${x.id}{display:block}`),
  ...topicIds.map((t) => `body:has(#${t}:target) nav a.t-${t}{color:var(--acc);border-color:var(--acc)}`),
  ...[...byCountry.keys()].map((k) => `body:has(#${cid(k)}:target) nav a.t-laender{color:var(--acc);border-color:var(--acc)}`),
].join('\n');

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Nachrichtenlage ${ed.kind === 'evening' ? 'Abendausgabe' : esc(ed.hour)} · ${esc(fmtDay(ed.date))}</title>
<style>
:root{--bg:#121212;--fg:#f2f0eb;--mute:#a8a49c;--rule:#2c2c2c;--acc:#f0a020;--ok:#3ec27a;--warn:#e8b33a;--bad:#ef6a62;--card:#1b1b1b;color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#faf8f4;--fg:#161616;--mute:#5d5a55;--rule:#e2ded6;--acc:#c27400;--ok:#1d8a4e;--warn:#9a6a00;--bad:#b3261e;--card:#fff;color-scheme:light}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
a{color:inherit}
.anchor{position:absolute;top:0;left:0}
.wrap{max-width:780px;margin:0 auto;padding:0 max(18px,env(safe-area-inset-left)) 48px max(18px,env(safe-area-inset-right))}
header{padding:18px 0 14px;text-align:center;border-bottom:3px double var(--rule)}
.dateline{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;color:var(--mute);font-size:12px;letter-spacing:.1em;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid var(--rule);margin-bottom:12px}
.tagline{color:var(--mute);font:italic 15px/1.4 Georgia,serif;margin-top:6px}
h1{margin:0;font:700 clamp(34px,10vw,52px)/1 Georgia,"Times New Roman",serif;color:var(--acc);letter-spacing:-.01em}
nav{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--rule);display:flex;gap:20px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
nav::-webkit-scrollbar{display:none}
nav a{text-decoration:none;font-weight:600;padding:12px 0;border-bottom:3px solid transparent}
nav a.t-top{color:var(--acc);border-color:var(--acc)}
.meta{color:var(--mute);font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding:16px 0;display:flex;flex-wrap:wrap;gap:6px 22px;border-bottom:1px solid var(--rule)}
.meta b{color:var(--fg)}
.intro{font:19px/1.5 Georgia,serif;padding:16px 18px;background:var(--card);border-left:3px solid var(--acc);margin:18px 0}
.ph-title{font:700 26px/1.2 Georgia,serif;margin:18px 0 4px}
.bh{font:700 18px/1.3 Georgia,serif;margin:22px 0 4px;color:var(--mute)}
.briefs{list-style:none;margin:0;padding:0}
.briefs li{padding:12px 0;border-bottom:1px solid var(--rule)}
.briefs .bt{font-weight:600;text-decoration:none}
.briefs .bs{display:block;font-size:13px;color:var(--mute);margin-top:2px;padding-left:18px}
.briefs .bs a{color:var(--mute)}
.crumb{margin-top:16px;font-size:14px;color:var(--mute)}
.crumb a{color:var(--acc);text-decoration:none;font-weight:600}
figure{margin:0;position:relative}
.ph{width:100%;aspect-ratio:16/9;background:var(--rule) center/cover no-repeat;border-radius:4px}
figcaption{position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;padding:2px 8px;border-radius:3px}
.lead{padding:18px 0 24px;border-bottom:1px solid var(--rule)}
.lead figure{margin:0 -18px 14px}
.lead .ph{border-radius:0;aspect-ratio:4/3}
.kicker{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;display:flex;flex-wrap:wrap;gap:6px 12px;margin:8px 0 6px;align-items:center}
.tag{text-decoration:none}.tag.acc{color:var(--acc)}.tag.ctry{color:var(--fg);letter-spacing:.04em}
.st.ok{color:var(--ok)}.st.warn{color:var(--warn)}.st.bad{color:var(--bad)}
.upd{font:700 12px/1 -apple-system,sans-serif;letter-spacing:.1em;text-transform:uppercase;background:var(--acc);color:#111;padding:3px 6px;border-radius:3px;vertical-align:middle}
h2{font:700 30px/1.15 Georgia,"Times New Roman",serif;margin:4px 0 12px}
h3{font:700 21px/1.25 Georgia,"Times New Roman",serif;margin:2px 0 8px}
.sum{margin:0 0 10px}
.lead .sum{font-size:18px;color:var(--mute)}
.why{margin:0 0 8px;font-size:15px;color:var(--mute)}.why b{color:var(--fg)}
.src{margin:0;font-size:13px;color:var(--mute)}.src a{color:var(--mute)}
.story{padding:20px 0;border-bottom:1px solid var(--rule)}
.story figure{margin-bottom:10px}
.outlook{background:var(--card);border-radius:6px;padding:14px 18px;margin-top:26px}
.outlook ul{margin:6px 0 0;padding-left:20px}
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .25s;z-index:5}
.drawer{position:fixed;top:0;bottom:0;left:0;width:min(86vw,360px);z-index:6;background:var(--card);border-right:1px solid var(--rule);
  transform:translateX(-105%);transition:transform .28s ease;overflow-y:auto;padding:max(18px,env(safe-area-inset-top)) 0 32px max(0px,env(safe-area-inset-left))}
.drawer .dh{display:flex;justify-content:space-between;align-items:center;padding:0 18px 12px;border-bottom:1px solid var(--rule)}
.drawer .dh b{font:700 22px Georgia,serif}
.drawer .x{text-decoration:none;font-size:22px;color:var(--mute);padding:4px 8px}
.drawer p{margin:10px 18px 4px;font-size:13px;color:var(--mute)}
details{border-bottom:1px solid var(--rule)}
summary{list-style:none;cursor:pointer;padding:14px 18px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:10px}
summary::-webkit-details-marker{display:none}
summary::after{content:"›";color:var(--mute);font-size:20px;margin-left:12px;transition:transform .2s}
details[open] summary::after{transform:rotate(90deg)}
details ul{list-style:none;margin:0;padding:0 0 8px}
details li a,details li .none{display:flex;justify-content:space-between;text-decoration:none;padding:9px 18px 9px 30px}
details li .none{color:var(--mute);opacity:.55}
.n{color:var(--mute);font-weight:600;font-size:13px;margin-left:auto;padding-left:10px}
footer{color:var(--mute);font-size:13px;margin-top:30px;line-height:1.6}
@media (prefers-reduced-motion:reduce){.drawer,.scrim{transition:none}}
${pageCss}
${imgCss.join('\n')}
</style></head>
<body>${['top', 'laender', ...pages.slice(1).map((x) => x.id)].map((id) => `<span class="anchor" id="${id}"></span>`).join('')}
<a class="scrim" href="#top" aria-label="Menü schließen"></a>
<aside class="drawer"><div class="dh"><b>🌍 Länder</b><a class="x" href="#top" aria-label="Schließen">✕</a></div>
<p>Kontinent antippen, dann Land wählen. Länder mit Meldungen stehen oben, die Zahl zeigt die Meldungen der letzten 24 Stunden. ● grün: mind. 2 anerkannte Medien, ● gelb: eine Quelle.</p>${drawer}</aside>
<div class="wrap">
<header><div class="dateline"><span>${esc(fmtDay(ed.date))}</span><span>${heading}</span></div>
<h1>Nachrichtenlage</h1><div class="tagline">Geprüfte Nachrichten aus aller Welt</div></header>
<nav><a href="#laender" class="t-laender">🌍 Länder</a><a href="#top" class="t-top">Top Stories</a>${topicIds.map((t) => `<a href="#${t}" class="t-${t}">${esc(TOPIC_SHORT[t])}</a>`).join('')}</nav>
<div class="meta"><span><b>${st.stories ?? all.length}</b> Meldungen</span><span><b>${st.confirmed ?? all.filter((s) => s.status === 'bestätigt').length}</b> bestätigt</span><span><b>${byCountry.size}</b> Länder</span></div>
${pages.map((x) => `<section class="page p-${x.id}">${x.body}</section>`).join('\n')}
<footer>● Bestätigt: mind. 2 unabhängige, anerkannte Medien berichten übereinstimmend · ● Unbestätigt: nur eine anerkannte Quelle · ● Widersprüchlich: Quellen weichen in Kernfakten ab.<br>
Keine Vermutungen, nur berichtete Fakten. Briefing täglich um 16:00 Uhr (deutsche Zeit). Bilder: jeweilige Medien.</footer>
</div></body></html>`;

writeFileSync(outFile, html);
console.log(`${outFile} ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${all.length} Meldungen, ${byCountry.size} Länder, ${embedded} Bilder eingebettet, ${imgCss.length - embedded} verlinkt`);
