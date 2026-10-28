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
- **Zeitplan (Asia/Dubai):** stündlich :05 von 11 bis 02 Uhr, Abendausgabe 23:00.
- **Telegram-Format (eine Nachricht pro Ausgabe):** HTML-Datei im Zeitungsdesign als Dokument, darunter
  Kurztext mit ⭐ Top-Story (1–2 Sätze), „Außerdem:“ mit nummerierten Schlagzeilen (stündlich 3, abends 5),
  Status-Zeichen ✅ ⚠️ ❗, „X Meldungen, Y bestätigt“, ⚡ Telegraph-Link. Vorlage in `news/EDITOR.md`.
- **HTML-Datei (`news/html.mjs`):** dunkles Zeitungsdesign, Tabs oben. Jeder Tab ist eine eigene „Seite“
  (CSS `:target`, kein JavaScript), Antippen darf NICHT nach unten scrollen. „Top Stories“ = Aufmacher +
  wichtigste Meldung je Ressort. Bilder als data:-URI eingebettet. Vom Nutzer auf dem iPhone abgenommen.
- **Telegraph (`news/telegraph.mjs`):** zusätzlich zur HTML-Datei, für Instant View ohne Konto.
- **Empfänger:** immer BEIDE: Kanal „Nexor News“ `-1003977342508` und Privatchat `7077870551`
  (`TELEGRAM_CHAT_ID=-1003977342508,7077870551`). Bot: `@Nexornewsbot`.
- **Tests nur an den Privatchat `7077870551`**, nie an den Kanal.
- Den claude.ai-Artifact-Link nicht in Telegram posten: Die Seite ist privat, Kanal-Mitglieder können sie
  nicht öffnen. Sie bleibt das Archiv des Nutzers: https://claude.ai/artifact/RWKMSmyA63Z6uRavNQnqkK

## Aufbau

- `news/loop.sh` + GitHub Action: sammelt alle 15 Min Feeds nach `data/news/YYYY-MM-DD.jsonl`, Bilder der
  letzten 3 h auf den Branch `news-images`. Ein Action-Lauf dauert ~6 h, der stündliche Cron startet nur
  den nächsten.
- Geplante Aufgaben (claude-code-remote Trigger): „Nachrichtenlage stündlich“ `trig_01UBZwzBLNHgoVkisNNGUb6o`,
  „Nachrichtenlage Abendausgabe“ `trig_01W5931tfnpH5qHesTX7qito`. Beide mit Push-Benachrichtigung.
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

## Offene Punkte / Ideen

- Kosten ~1–1,40 USD pro Lauf (≈17 Läufe/Tag). Option: jede zweite Stunde.
- Bestätigungsquote schwankt (10/20 bis 17/19). Option: stärkeres Modell für die Trigger, nur auf Wunsch.
- Kanal ist privat (Einladungslink). Öffentlich machen wäre eine Kanal-Einstellung in Telegram.
