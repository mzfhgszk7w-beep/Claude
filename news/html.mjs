// Baut aus einer Ausgabe (JSON wie in `editions`) eine eigenständige HTML-Datei im Zeitungsdesign
// für den Versand als Telegram-Dokument. Keine Skripte, keine externen Dateien: Bilder werden als
// data:-URI eingebettet (aus dem Bilder-Checkout `.news-img/`), damit die Datei offline aufgeht.
// Aufruf: node news/html.mjs <ausgabe.json> <ausgabe.html> [bilder-verzeichnis]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [, , inFile, outFile, imgDirArg] = process.argv;
const IMG_DIR = imgDirArg || join(ROOT, '.news-img');

const raw = JSON.parse(readFileSync(inFile, 'utf8'));
const ed = raw.data && raw.data.kind ? raw.data : raw;

const norm = (u) => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/$/, ''); } catch { return u; } };
const index = new Map();
const idxFile = join(IMG_DIR, 'index.json');
if (existsSync(idxFile)) {
  for (const [link, v] of Object.entries(JSON.parse(readFileSync(idxFile, 'utf8')))) index.set(norm(link), v);
}
// Max. 18 Bilder einbetten, damit die Datei unter ~1,5 MB bleibt.
let embedded = 0;
function imageFor(story) {
  if (embedded >= 18) return null;
  for (const s of story.sources || []) {
    const hit = index.get(norm(s.url));
    if (hit && existsSync(join(IMG_DIR, hit.file))) {
      embedded++;
      return { src: 'data:image/jpeg;base64,' + readFileSync(join(IMG_DIR, hit.file)).toString('base64'), credit: hit.source };
    }
  }
  return null;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STATUS = { 'bestätigt': ['ok', 'Bestätigt'], 'unbestätigt': ['warn', 'Unbestätigt'], 'widersprüchlich': ['bad', 'Widersprüchlich'] };
const fmtDay = (d) => new Date(d + 'T12:00:00+04:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '');

function story(s, lead) {
  const [cls, label] = STATUS[s.status] || STATUS['unbestätigt'];
  const img = imageFor(s);
  const src = (s.sources || []).filter((x) => /^https?:/.test(x.url))
    .map((x) => `<a href="${esc(x.url)}">${esc(x.name)}</a>`).join(' · ');
  return `<article class="${lead ? 'lead' : 'story'}">
${img ? `<figure><img src="${img.src}" alt=""><figcaption>${esc(img.credit)}</figcaption></figure>` : ''}
<div class="kicker">${lead ? '<span class="lead-tag">Aufmacher</span>' : ''}<span class="st ${cls}">● ${label}</span></div>
<h${lead ? 2 : 3}>${esc(s.title)}</h${lead ? 2 : 3}>
${s.summary ? `<p class="sum">${esc(s.summary)}</p>` : ''}
${s.why ? `<p class="why"><b>Einordnung:</b> ${esc(s.why)}</p>` : ''}
${src ? `<p class="src">Quellen: ${src}</p>` : ''}
</article>`;
}

const sections = (ed.sections || []).filter((x) => x.stories && x.stories.length);
const st = ed.stats || {};
const heading = ed.kind === 'evening' ? 'Abendausgabe' : `Ausgabe ${esc(ed.hour)} Uhr`;

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Nachrichtenlage ${ed.kind === 'evening' ? 'Abendausgabe' : esc(ed.hour)} · ${esc(fmtDay(ed.date))}</title>
<style>
:root{--bg:#121212;--fg:#f2f0eb;--mute:#a8a49c;--rule:#2c2c2c;--acc:#f0a020;--ok:#3ec27a;--warn:#e8b33a;--bad:#ef6a62;--card:#1b1b1b;color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#faf8f4;--fg:#161616;--mute:#5d5a55;--rule:#e2ded6;--acc:#c27400;--ok:#1d8a4e;--warn:#9a6a00;--bad:#b3261e;--card:#fff;color-scheme:light}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:780px;margin:0 auto;padding:0 max(18px,env(safe-area-inset-left)) 48px max(18px,env(safe-area-inset-right))}
header{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:22px 0 14px}
h1{margin:0;font:700 34px/1 Georgia,"Times New Roman",serif;color:var(--acc)}
.date{color:var(--mute);font-size:13px;letter-spacing:.08em;text-transform:uppercase;text-align:right}
nav{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--rule);display:flex;gap:22px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
nav a{color:var(--fg);text-decoration:none;font-weight:600;padding:12px 0;border-bottom:3px solid transparent}
nav a:first-child{color:var(--acc);border-color:var(--acc)}
.meta{color:var(--mute);font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding:16px 0;display:flex;flex-wrap:wrap;gap:6px 22px;border-bottom:1px solid var(--rule)}
.meta b{color:var(--fg)}
.intro{font:19px/1.5 Georgia,serif;padding:16px 18px;background:var(--card);border-left:3px solid var(--acc);margin:18px 0}
figure{margin:0;position:relative}
figure img{display:block;width:100%;height:auto;max-height:420px;object-fit:cover;border-radius:4px}
figcaption{position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;padding:2px 8px;border-radius:3px}
.lead{padding:18px 0 24px;border-bottom:1px solid var(--rule)}
.lead figure{margin:0 -18px 14px}
.lead figure img{border-radius:0}
.kicker{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;display:flex;gap:14px;margin:6px 0}
.lead-tag{color:var(--acc)}
.st.ok{color:var(--ok)}.st.warn{color:var(--warn)}.st.bad{color:var(--bad)}
h2{font:700 32px/1.15 Georgia,"Times New Roman",serif;margin:6px 0 12px}
h3{font:700 21px/1.25 Georgia,"Times New Roman",serif;margin:4px 0 8px}
.sum{margin:0 0 10px;color:var(--fg)}
.lead .sum{font-size:18px;color:var(--mute)}
.why{margin:0 0 8px;font-size:15px;color:var(--mute)}
.why b{color:var(--fg)}
.src{margin:0;font-size:13px;color:var(--mute)}
.src a{color:var(--mute)}
section{scroll-margin-top:52px}
section>h4{margin:28px 0 4px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);border-bottom:2px solid var(--acc);padding-bottom:6px}
.story{padding:16px 0;border-bottom:1px solid var(--rule)}
.story figure{margin-bottom:10px}
.story figure img{max-height:240px}
.outlook{background:var(--card);border-radius:6px;padding:14px 18px;margin-top:26px}
.outlook ul{margin:6px 0 0;padding-left:20px}
footer{color:var(--mute);font-size:13px;margin-top:30px;line-height:1.6}
</style></head>
<body><div class="wrap">
<header><h1>Nachrichtenlage</h1><div class="date">${esc(fmtDay(ed.date))}</div></header>
<nav><a href="#top">Top Stories</a>${sections.map((x) => `<a href="#${slug(x.name)}">${esc(x.name)}</a>`).join('')}</nav>
<div class="meta" id="top"><span>${heading}</span><span><b>${st.stories ?? '?'}</b> Meldungen</span><span><b>${st.confirmed ?? '?'}</b> bestätigt</span></div>
${ed.kind === 'evening' && ed.intro ? `<div class="intro">${esc(ed.intro)}</div>` : ''}
${ed.lead ? story(ed.lead, true) : ''}
${sections.map((x) => `<section id="${slug(x.name)}"><h4>${esc(x.name)}</h4>${x.stories.map((s) => story(s, false)).join('\n')}</section>`).join('\n')}
${ed.outlook && ed.outlook.length ? `<div class="outlook"><h3>Was morgen wichtig wird</h3><ul>${ed.outlook.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
<footer>● Bestätigt: mind. 2 unabhängige Quellen · ● Unbestätigt: nur eine Quelle · ● Widersprüchlich: Quellen weichen ab.<br>
Rund 45 Quellen aus Deutschland, den VAE und weltweit. Stündlich 11–02 Uhr, Abendausgabe 23 Uhr (Dubai). Bilder: jeweilige Medien.</footer>
</div></body></html>`;

writeFileSync(outFile, html);
console.log(`${outFile} ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${embedded} Bilder`);
