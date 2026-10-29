# Redaktionsanleitung Nachrichtenlage – Version 2 (Themen + Länder)

> Gilt seit 29.10.2026 für das tägliche Tagesbriefing (16:00). `news/EDITOR.md` bleibt als Referenz für Version 1.

Diese Anleitung steuert die geplanten Claude-Läufe, die aus den gesammelten Rohmeldungen
eine Ausgabe bauen. Sprache der Ausgabe: **Deutsch**. Zeitzone für Termine und Dokument-IDs: **Europe/Berlin**
(deutsche Zeit). Rohdaten-Dateinamen bleiben im Dubai-Datum.

## Leser

Deutscher, lebt in Dubai. Will wissen: was in **Deutschland** passiert, was in den **VAE/Golfregion**
passiert, die wichtigsten **Weltereignisse**, **Fed/Zinsen/Märkte** und **Krypto** (Bitcoin,
Shiba Inu, Regulierung und Krypto-Gesetze weltweit). Senior Security/IT-Berater, also auch
Cybersecurity- und Tech-Meldungen von Gewicht.

## Eingaben

- Rohmeldungen: `data/news/YYYY-MM-DD.jsonl` (Dateiname = Kalenderdatum Dubai), eine JSON-Zeile pro Meldung:
  `{source, cat, feed, title, link, summary, published, image, collected}`.
  `cat` ist die Feed-Kategorie: `de`, `uae`, `world`, `markets`, `business`, `crypto`.
  Gesammelt alle 15 Minuten per GitHub Action (`.github/workflows/news-collect.yml`), rund 40 Feeds.
- Feed-Zustand: `data/news/status.json` (welche Feeds zuletzt fehlschlugen).
- Bilder: Branch `news-images` (Bilder der letzten 25 Stunden, höchstens 700, 640px JPEG).
  `index.json` dort: `{ "<Artikel-Link>": { "file": "<hash>.jpg", "source": "...", "title": "..." } }`.
- Vorher immer `git pull` auf dem Default-Branch, damit die neuesten Daten da sind, und die Bilder holen:
  `git fetch --depth=1 origin news-images && rm -rf .news-img && mkdir .news-img && git --work-tree=.news-img checkout FETCH_HEAD -- . && git reset -q`
  (im Repo-Verzeichnis ausführen; `.news-img/` ist in `.gitignore`. Das Artifact-Tool lädt nur Dateien aus dem
  Arbeitsverzeichnis hoch, nicht aus `/tmp`.)

## Ausgabeziel

Artifact-Datenbank der Seite `https://claude.ai/artifact/RWKMSmyA63Z6uRavNQnqkK`,
Collection `editions`, geschrieben mit dem `ArtifactData`-Tool (`set`).
Die Seite selbst wird **nicht** neu veröffentlicht.

- `date`: Kalenderdatum in deutscher Zeit (Europe/Berlin).
- Dokument-ID: `<date>-mittag`; `kind`: `afternoon`; `hour`: `16:00` (ein Tagesbriefing pro Tag).

```json
{
  "kind": "morning | afternoon | evening",
  "date": "2026-10-29",
  "hour": "08:00",
  "createdAt": "<ISO-Zeitstempel UTC>",
  "stats": { "stories": 45, "confirmed": 41, "countries": 28 },
  "lead": { "title": "...", "summary": "...", "status": "bestätigt", "topic": "pol", "country": "DE",
            "image": { "url": "<Asset-URL>", "credit": "BBC" }, "sources": [{ "name": "BBC", "url": "https://..." }] },
  "stories": [
    { "title": "...", "summary": "...", "status": "bestätigt|unbestätigt|widersprüchlich", "topic": "fin",
      "country": "US", "top": true, "update": false, "image": { "url": "...", "credit": "..." },
      "sources": [ { "name": "...", "url": "..." } ] }
  ],
  "intro": "nur Abend: 3–5 Sätze, der Tag in Kürze",
  "outlook": ["nur Abend: konkrete Termine von morgen"]
}
```

- `topic`: `pol` (Politik & Konflikte), `wirt` (Wirtschaft & Unternehmen), `fin` (Finanzen & Märkte: Notenbanken,
  Zinsen, Börsen, Rohstoffe, Währungen), `krypto`, `tech` (Technologie & Cyber), `wiss` (Wissenschaft & Gesundheit),
  `umwelt` (Klima & Umwelt), `ges` (Gesellschaft & Panorama: Unglücke, Justiz, Kultur), `sport`.
- `country`: ISO-Code des Landes, um das es hauptsächlich geht (Liste in `news/countries.mjs`, `EU` für die EU).
  Leer nur bei wirklich globalen Themen (z. B. Bitcoin-Kurs, Ölpreis).
- `top: true` für die 8–10 wichtigsten Meldungen (Seite „Top Stories“).
- `why` nur, wenn berichtete Hintergrundfakten nötig sind. Keine eigene Bewertung, keine Prognose.

Ressorts aus Version 1 entfallen; stattdessen `topic` und `country` je Meldung. Inhaltliche Schwerpunkte:
1. **Deutschland**: Politik, Wirtschaft, Gesellschaft
2. **VAE & Golf**: Dubai, Abu Dhabi, Saudi-Arabien, Katar, Iran, Gesetze/Visa/Regeln, die Einwohner betreffen
3. **Welt**
4. **Fed, Zinsen & Märkte**: Fed, EZB, Inflation, Dollar, Öl, Gold, Aktienindizes
5. **Krypto**: Bitcoin, Shiba Inu, große Altcoins, ETFs, **Regulierung und Gesetze nach Ländern**
6. **Unternehmen**
7. **Technologie & Sicherheit**: Cyberangriffe, Datenlecks, KI, Big Tech
8. **Weitere Meldungen**

Jedes der Ressorts 1–5 soll in jeder Ausgabe mindestens 2 Meldungen haben. Gibt der Feed in der
Stunde zu wenig her, per `WebSearch` aktiv nachsuchen (z. B. "Dubai news today", "Bundesregierung
heute", "Fed rate", "Bitcoin price news", "Shiba Inu news", "crypto regulation law <Land>").

## Anerkannte Medien

Nur diese zählen als Quelle für „bestätigt“ (plus offizielle Primärquellen: Regierungen, Ministerien,
Zentralbanken, Börsenpflichtmitteilungen, Unternehmen selbst, WAM, Gerichte):
Reuters, AP, AFP, dpa, Bloomberg, Financial Times, Wall Street Journal, New York Times, Washington Post,
BBC, Guardian, The Economist, Sky News, CNN, CNBC, NPR, Tagesschau/ARD, ZDF, Deutschlandfunk, Spiegel, FAZ,
Süddeutsche, Zeit, Handelsblatt, Welt, n-tv, DW, NZZ, ORF, Le Monde, France 24, Al Jazeera, Al Arabiya,
The National, Gulf News, Khaleej Times, Arab News, Times of Israel, Haaretz, NHK, Kyodo, SCMP, Yonhap,
Times of India, The Hindu, ABC Australia, CoinDesk, The Block (nur Krypto).
Nicht als Bestätigung zählen: Pressemitteilungs-Portale (openPR u. ä.), Kurs-Prognose- und Presale-Seiten,
Blogs, Aggregatoren ohne eigene Recherche, anonyme Social-Media-Posts.

## Faktencheck (streng)

Ziel: so wenig `unbestätigt` wie möglich, ohne etwas zu erfinden. Jede Meldung bekommt einen Status:

- `bestätigt`, wenn mindestens eins davon zutrifft:
  - Mindestens zwei **unabhängige anerkannte** Medien (Liste oben) berichten den Kern übereinstimmend. Handelsblatt + Tagesschau = 2,
    BBC + Al Jazeera = 2. Mehrere Medien, die nur dieselbe Agenturmeldung (Reuters/AP/dpa/AFP) übernehmen,
    zählen als **eine** Quelle.
  - Die **Primärquelle** bestätigt selbst: Pressemitteilung des Unternehmens, Regierung, Ministerium,
    Zentralbank (Fed, EZB), WAM (VAE-Staatsagentur), Gerichtsdokument, offizieller Social-Media-Account.
  - **Reaktionen Dritter**, über die ein **anderes** Medium berichtet (z. B. Politiker oder Gewerkschaft
    reagieren öffentlich auf die Meldung). Beispiel: Audi-Werk in den USA. Trump verkündet es öffentlich mit
    dem Audi-Chef auf der Bühne, SPD und IG Metall reagieren, Tagesschau/Spiegel berichten → `bestätigt`.
- `widersprüchlich`: Quellen nennen abweichende Kernfakten (Zahlen, Täter, Ort, Ursache).
  Im `summary` benennen, wer was sagt.
- `unbestätigt`: nur, wenn nach der Suche unten wirklich nur eine Quelle existiert.

**Pflicht-Vergleich** für jede Meldung, die nach den Feeds nur eine Quelle hat:
1. Zuerst die Rohdaten aller ~40 Feeds nach demselben Ereignis durchsuchen (Stichworte auf Deutsch und Englisch,
   Namen, Firmen, Orte).
2. Dann mindestens **zwei** `WebSearch`-Abfragen: eine deutsch, eine englisch. Bei wichtigen Meldungen
   (Aufmacher, Politik, Märkte, Gesetze) `mode: "extended"` verwenden, weil die Standard-Suche
   ganz neue Meldungen oft noch nicht kennt.
3. Gefundene Bestätigungen als zusätzliche Quellen eintragen.

Zahlen (Kurse, Opferzahlen, Beträge) immer mit Stand-Zeit angeben, wenn sie sich schnell ändern.
Krypto-Kurse nur nennen, wenn eine aktuelle Quelle den Wert nennt, nie schätzen.

## Bilder

- Jede Meldung mit Bild, wenn möglich, der Aufmacher immer.
- Bild finden: Für jede Quelle einer Meldung im `index.json` nach dem Artikel-Link suchen. Hat das eigene Medium
  kein Bild, das Bild eines **anderen Mediums zum selben Ereignis** nehmen (über die Rohdaten den passenden
  Link finden). Das Bild muss inhaltlich zur Meldung passen. Kein Bild ist besser als ein falsches.
- Spam meiden: Google-News-Treffer von openPR, Presale-Werbung, "price prediction", Gewinnspiel-/Code-Seiten
  (Coin Gabbar u. ä.) sind keine Nachrichten und keine Quellen.
- Hochladen: zuerst einmal `Artifact` `action: "read"` mit der Artifact-URL (nötig, bevor auf das Artifact
  geschrieben werden darf), dann `Artifact` publish mit `url`, `asset: true` und
  `file_paths: ["<repo>/.news-img/<hash>.jpg", ...]` (absolute Pfade) (bis 25 pro Aufruf). Die zurückgegebene `url` jedes Bildes
  exakt so in `image.url` eintragen, `image.credit` = Name des Mediums.
- Die Seite NIE neu veröffentlichen (kein publish ohne `asset: true`).

## Tagesbriefing (täglich 16:00 deutscher Zeit)

Eine Ausgabe am Tag. Sie deckt **die letzten 24 Stunden** ab (seit 16:00 Uhr des Vortags) und **die ganze Welt**.
„Voriges Briefing“ = das jüngste vorhandene Dokument in `editions`.

1. Meldungen laden, deren `collected` in den letzten 24 Stunden liegt (heutige und gestrige Datei prüfen).
2. Gleiche Ereignisse über Quellen hinweg zusammenführen.
3. Faktencheck wie oben. Keine Annahmen, keine Vermutungen, keine Prognosen: nur, was Quellen berichten.
4. **Paywall/kurzer Text** (v. a. Handelsblatt, FAZ+, Spiegel+): Nur Titel/Teaser vorhanden → Inhalt per
   `WebSearch` und aus den anderen Feeds füllen und diese als Quellen angeben.
   Nie Inhalte erfinden oder aus dem Titel extrapolieren.
5. **Ganze Welt, Breite statt Wiederholung:** 50–80 Meldungen aus **mindestens 40 Ländern und allen Kontinenten**
   (Europa, Naher Osten & Golf, Asien, Afrika, Nord- und Südamerika, Ozeanien), über alle Themen.
   - Deutschland: ausführlich (10–20 Meldungen: Politik, Wirtschaft, Gesellschaft, Sport).
   - Golfregion: ausführlich, alle Golfstaaten im Blick (VAE, Saudi-Arabien, Katar, Kuwait, Bahrain, Oman),
     dazu Iran, Irak, Israel, Jordanien, Libanon, Ägypten. Regeln/Gesetze für Einwohner der VAE immer aufnehmen.
   - Übrige Länder: nur ihre wichtigsten 1–2 Meldungen (Top-Stories). Jeder Kontinent mit mindestens 5 Ländern,
     auch Afrika, Zentralasien, Südamerika und Ozeanien (z. B. Afghanistan, Nigeria, Kenia, Brasilien, Indonesien).
   - Findet sich für eine Region nichts in den Feeds: per `WebSearch` gezielt nachsuchen
     (z. B. „Africa news today Reuters“, „Latin America news AP“).
   Das vorige Briefing mit `ArtifactData` `get` laden: Höchstens ein Viertel der Meldungen darf dort schon
   gestanden haben, und nur mit **neuem Stand**; dann `"update": true` setzen und das Neue im Text nennen.
   Unveränderte Themen nicht wiederholen.
6. `lead` = wichtigste Meldung seit dem vorigen Briefing, bevorzugt mit Bezug zu Deutschland oder den VAE,
   wenn gleich wichtig.
7. `summary`: 2–4 sachliche Sätze mit den Kernfakten (wer, was, wann, wie viel). `why` nur, wenn es
   berichtete Fakten zum Hintergrund gibt, keine eigene Bewertung. Wertende Sprache der Quellen nicht übernehmen.
8. Bilder wie oben.
9. Dokument mit `ArtifactData` `set` schreiben. Existiert die Dokument-ID schon (Wiederholungslauf),
   vorher `get` und mit `if_version` überschreiben. `stats` muss zu den tatsächlich geschriebenen
   Meldungen passen (`stories` = lead + alle Ressort-Meldungen).

Zusätzlich `outlook` (konkrete Termine der nächsten 24 Stunden: Notenbanken, Datenveröffentlichungen, Wahlen,
Gesetze, die in Kraft treten). Statusangaben aus dem vorigen Briefing neu prüfen: was inzwischen bestätigt ist, wird hochgestuft.

## Länderseiten (alle Länder, auf Deutsch)

Zusätzlich zu den geprüften Meldungen bekommt jedes Land kurze Meldungen (Schlagzeile, Anreißer-Text des Mediums,
Medium, Link) aus `data/news/laender/` (Google News und Bing News je Land, gesammelt von `news/laender-collect.mjs`). Die Auswahl und der Status
(✅ mind. 2 anerkannte oder 3 verschiedene Medien, sonst ⚠️) kommen aus dem Skript, NICHT aus eigener Recherche. Deine Aufgabe ist nur übersetzen und aussortieren:

1. `node news/laender.mjs pick 24 /tmp/laender.json` → schreibt die Kandidaten (mit Links) nach `/tmp/laender.json` und
   gibt eine kompakte Liste aus: `id | Land | Sprache | Anzahl Medien | Titel || Text`. Nur diese Liste lesen, nicht die JSON-Datei.
2. Die Liste durchgehen und `/tmp/laender-de.json` schreiben: `{ "<id>": ["deutscher Titel", "deutscher Text"], ... }`
   mit **jedem Eintrag, der bleiben soll** (fehlende ids fallen weg). Hat ein Eintrag keinen Text (kein `||`), nur
   `"<id>": "deutscher Titel"`. Dabei:
   - Titel und Text (der Anreißer des Mediums nach `||`) ins Deutsche übersetzen: sachlich, vollständig, nichts
     hinzufügen, nichts weglassen, keine eigene Bewertung. Deutsche Titel/Texte unverändert übernehmen (nur Zusätze wie
     „(S+)“, „- Panorama - SZ“ oder abgeschnittenes „…“ am Ende bereinigen). Kein Text erfinden, wo keiner ist.
   - Pro Land jedes Ereignis nur einmal: mehrere Einträge zum selben Ereignis → den mit Text und den meisten Quellen behalten.
   - Weglassen: Clickbait, Werbung, Börsen-Tipps, Meinungsbeiträge ohne Nachricht, Meldungen, in denen das Land nur
     nebenbei vorkommt.
   - Möglichst viele verschiedene Themen je Land (Politik, Wirtschaft, Gesellschaft, Sport, Kultur, Unglücke, Justiz).
     Kleinere oder regionale Medien sind in Ordnung. Einträge mit Text bevorzugen. Behalten: bis zu 8 je Land,
     Deutschland und VAE bis 25, Zypern bis 20 (Reihenfolge der Liste beibehalten).
   Die Datei in Teilen schreiben (z. B. je Kontinent eine Datei) und am Ende zusammenführen; kompakt, eine Zeile pro Eintrag.
3. Nach dem Schreiben der Ausgabe-JSON: `node news/laender.mjs merge /tmp/ausgabe.json /tmp/laender.json /tmp/laender-de.json`
   (fügt `briefs` hinzu; Einträge ohne deutschen Titel fallen weg). Erst danach `html-v2.mjs` aufrufen.
   `briefs` NICHT in die Artifact-Datenbank schreiben (zu groß), nur in die HTML-Datei.

In der gesamten Ausgabe steht nichts auf Englisch: Titel, Zusammenfassungen und Länder-Schlagzeilen sind deutsch.

## Telegram-Bericht

Jeder Bericht ist EINE Telegram-Nachricht an Kanal und Privatchat: die HTML-Datei (Zeitungsdesign) als Dokument, darunter der
Kurztext mit Top-Story und Telegraph-Link. Ablauf nach dem Schreiben der Ausgabe:

1. Die geschriebene Ausgabe als JSON-Datei speichern (dasselbe Objekt wie beim `set`), z. B. `/tmp/ausgabe.json`.
2. Telegraph-Seite: `node news/telegraph.mjs /tmp/ausgabe.json` → gibt die URL aus (Instant View in Telegram).
3. HTML-Datei: `node news/html-v2.mjs /tmp/ausgabe.json /tmp/Nachrichtenlage-Tagesbriefing.html .news-img`
   (bettet die Bilder aus `.news-img/` ein).
4. Senden an Kanal und Privatchat:

```bash
TELEGRAM_CHAT_ID=-1003977342508,7077870551 TELEGRAM_DOCUMENT=/tmp/Nachrichtenlage-Tagesbriefing.html bash news/telegram.sh <<'MSG'
🌍 Tagesbriefing · Mittwoch, 29. Oktober

⭐ Top-Story: <Titel des Aufmachers>
<1–2 Sätze Kern des Aufmachers> ✅

Außerdem:
1. <Schlagzeile> ✅
2. <Schlagzeile> ✅
3. <Schlagzeile> ⚠️
4. <Schlagzeile> ✅
5. <Schlagzeile> ✅

22 Meldungen, 19 bestätigt
⚡ Schnell lesen: <Telegraph-URL>
📎 Datei oben: ganze Ausgabe im Zeitungsdesign
MSG
```

- Der Text ist eine Bildunterschrift und darf höchstens 1024 Zeichen lang sein. Top-Story-Text kurz halten.
- Titel: „🌍 Tagesbriefing“, dazu Wochentag und Datum. Zeile vor „X Meldungen“: „🌍 N Länder“.
- „Außerdem“: die 5 nächstwichtigen Meldungen, Deutschland/VAE bevorzugt, aus verschiedenen Ländern/Themen.
- Status-Zeichen: ✅ bestätigt, ⚠️ unbestätigt, ❗ widersprüchlich.
- Den claude.ai-Link NICHT in Telegram posten (Mitglieder können ihn nicht öffnen).
- Schlägt Telegraph fehl: Zeile „⚡ Schnell lesen“ weglassen. Schlägt HTML fehl: ohne `TELEGRAM_DOCUMENT`
  senden. Fehler im Abschlussbericht nennen.
- Das Skript sendet nur, wenn `TELEGRAM_BOT_TOKEN` gesetzt ist. Seine Ausgabe im Abschlussbericht nennen.

## Grenzen

- Nichts committen oder pushen. Die Ausgabe landet nur in der Artifact-Datenbank und ihrem Bilderspeicher.
- Fehlschlagende Feeds aus `status.json` als Lücke behandeln und per `WebSearch` abdecken.
