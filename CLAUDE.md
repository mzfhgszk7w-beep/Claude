# Projekt-Notizen für Claude

Dieses Repo enthält zwei Projekte: das CyberArk-Health-Dashboard (`server/`, `public/`) und den
News-Assistenten „Nachrichtenlage“ (`news/`, `data/news/`, `.github/workflows/news-collect.yml`).
Die Regeln für den Inhalt jeder Ausgabe stehen in `news/EDITOR.md`. Diese Datei hier hält fest, was mit
dem Nutzer vereinbart wurde und welche Fallstricke es gibt.

## Nutzer

- Deutsch, lebt in Dubai, kommt aus Deutschland. Senior CyberArk/PAM-Consultant.
- Will kurze, direkte Antworten auf Deutsch, klare Empfehlung mit Risiken.
- Bedient alles vom iPhone (Claude-App, Telegram). Einstellungen der Cloud-Umgebung gehen nur im Browser
  (claude.ai/code → rechts „Umgebung“ → Zahnrad neben „iPhone Claude“), nicht in der iPhone-App.

## Nachrichtenlage: was vereinbart ist

- **Themen:** Deutschland, VAE/Golf, Welt, Fed/Zinsen/Märkte, Krypto (Bitcoin, Shiba Inu, Krypto-Gesetze
  weltweit), Unternehmen, Technologie & Sicherheit. Rund 45 Feeds, siehe `news/collect.mjs`.
- **Faktencheck streng:** mehrere Quellen vergleichen, bei nur einer Quelle WebSearch deutsch + englisch,
  wichtige mit `mode: "extended"`. Primärquelle oder Reaktionen Dritter zählen als Bestätigung
  (Lehre aus dem Audi-US-Werk: zuerst fälschlich „unbestätigt“, war längst bestätigt).
- **GESTOPPT (28.10.2026, Wunsch des Nutzers):** beide Trigger deaktiviert, GitHub-Cron entfernt. Nichts senden, nichts sammeln, bis der Nutzer es ausdrücklich wieder will. Budget-Vorgabe: max. 5 USD/Monat.
- **Zeitplan (deutsche Zeit, Europe/Berlin):** drei Briefings: 8:00 Morgen, 16:30 Nachmittag, 21:00 Abend
  (Start jeweils 10 Min vorher). Früher stündlich, auf Wunsch des Nutzers umgestellt (zu viele Wiederholungen).
- **Keine Wiederholungen:** jedes Briefing deckt die Zeit seit dem vorigen ab, höchstens ein Viertel aus dem
  vorigen Briefing und nur mit neuem Stand ("update": true). 30–50 Meldungen, viele Länder und Themen.
- **Telegram-Format (eine Nachricht pro Ausgabe):** HTML-Datei im Zeitungsdesign als Dokument, darunter
  Kurztext mit ⭐ Top-Story (1–2 Sätze), „Außerdem:“ mit 5 nummerierten Schlagzeilen,
  Status-Zeichen ✅ ⚠️ ❗, „X Meldungen, Y bestätigt“, ⚡ Telegraph-Link. Vorlage in `news/EDITOR.md`.
- **HTML-Datei (`news/html.mjs`):** dunkles Zeitungsdesign, Tabs oben. Jeder Tab ist eine eigene „Seite“
  (CSS `:target`, kein JavaScript), Antippen darf NICHT nach unten scrollen. „Top Stories“ = Aufmacher +
  wichtigste Meldung je Ressort. Bilder als data:-URI eingebettet. Vom Nutzer auf dem iPhone abgenommen.
- **Entwurf v2 (`news/html-v2.mjs`, `news/countries.mjs`), noch NICHT freigegeben:** Themen-Tabs (Politik,
  Wirtschaft, Finanzen, Krypto, Tech, Panorama, Sport …) und ein Länder-Menü, das von links hereinfährt
  (Kontinent → Land → Top-Stories; Europa/Deutschland und Golf ausführlich). Erst nach Freigabe des Nutzers
  nach `news/html.mjs` übernehmen und Ausgabe-Format auf `stories` mit `topic`/`country`/`top` umstellen.
- **Vorschauen** immer per Telegram an den Privatchat schicken: Die Claude-App zeigt HTML-Dateien nur als Code.
- **Telegraph (`news/telegraph.mjs`):** zusätzlich zur HTML-Datei, für Instant View ohne Konto.
- **Empfänger:** immer BEIDE: Kanal „Nexor News“ `-1003977342508` und Privatchat `7077870551`
  (`TELEGRAM_CHAT_ID=-1003977342508,7077870551`). Bot: `@Nexornewsbot`.
- **Tests nur an den Privatchat `7077870551`**, nie an den Kanal.
- Den claude.ai-Artifact-Link nicht in Telegram posten: Die Seite ist privat, Kanal-Mitglieder können sie
  nicht öffnen. Sie bleibt das Archiv des Nutzers: https://claude.ai/artifact/RWKMSmyA63Z6uRavNQnqkK

## Aufbau

- `news/loop.sh` + GitHub Action: sammelt alle 15 Min Feeds nach `data/news/YYYY-MM-DD.jsonl`, Bilder der
  letzten 13 h (max. 700) auf den Branch `news-images`. Ein Action-Lauf dauert ~6 h, der stündliche Cron startet nur
  den nächsten.
- Geplante Aufgaben (claude-code-remote Trigger): „Morgen- & Abendbriefing“ `trig_01UBZwzBLNHgoVkisNNGUb6o`
  (07:50 und 20:50 Berlin), „Nachmittagsbriefing“ `trig_01W5931tfnpH5qHesTX7qito` (16:20 Berlin).
  Beide mit Push-Benachrichtigung und gleichem Auftrag; das Briefing ergibt sich aus der Uhrzeit.
  Sie schreiben die Ausgabe in die Artifact-Datenbank (Collection `editions`) und senden an Telegram.
- `news/telegram.sh`: sendet an mehrere Chat-IDs; mit `TELEGRAM_DOCUMENT=<datei>` als Dokument mit
  Bildunterschrift (max. 1024 Zeichen).

## Fallstricke (schon einmal passiert)

- **GitHub-Cron ist unzuverlässig:** `*/20` lief stundenlang nicht. Deshalb der lange Loop-Lauf.
- **Netzwerk der Cloud-Umgebung:** Nachrichtenseiten sind im Container gesperrt (deshalb sammelt GitHub).
  Freigegeben sind `api.telegram.org` und `api.telegra.ph`. Node-`fetch` nutzt den Proxy nicht, curl schon:
  in Skripten, die im Container laufen, curl verwenden.
- **`TELEGRAM_BOT_TOKEN`** ist eine Umgebungsvariable der Umgebung „iPhone Claude“ (kein Network-Secret:
  Telegram will den Token in der URL, nicht im Header). Neue Variablen sieht erst eine NEUE Session, daher
  für Versand-Tests eine kurze Hilfs-Session starten. Den Token nie ausgeben.
- **`fire_trigger` ohne `text` aufrufen.** Mit Zusatztext läuft ein zweiter Durchgang und die Nachricht
  kommt doppelt.
- Artifact-Bilder-Upload geht nur aus dem Arbeits- oder Scratchpad-Verzeichnis, nicht aus `/tmp`
  (deshalb `.news-img/` im Repo, steht in `.gitignore`).
- Telegraph nimmt keine eigenen Bild-Uploads mehr; Bilder werden per Original-URL eingebunden.
- Telegram zeigt bei Nachrichten mit Datei keine Link-Vorschau; der Telegraph-Link ist trotzdem anklickbar.
- Löschen von Remote-Branches bricht über den Git-Proxy ab (`news-test` liegt deshalb noch auf GitHub).
- Hilfs-Sessions für Telegram-Tests verweigern manchmal den Versand ("nur nach direkter Bestätigung");
  im Auftrag ausdrücklich sagen, dass der Nutzer es angefordert hat und es sein eigener Chat ist.

## Offene Punkte / Ideen

- Kosten: bisher ~1–1,40 USD pro stündlichem Lauf; Briefings sind größer, dafür nur 3 pro Tag.
- Bestätigungsquote schwankt (10/20 bis 17/19). Option: stärkeres Modell für die Trigger, nur auf Wunsch.
- Kanal ist privat (Einladungslink). Öffentlich machen wäre eine Kanal-Einstellung in Telegram.
