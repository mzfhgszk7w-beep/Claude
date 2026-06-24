# CyberArk Health Check Dashboard

Internal web dashboard that surfaces the health of CyberArk components — modelled
on the built-in **PSM Clients Health** view — so operations can see status from a
normal client browser instead of logging into each server.

It reads from the **PVWA System Health REST API**
(`ComponentsMonitoringSummary` / `ComponentsMonitoringDetails`) — the same data
source as the native System Health dashboard — and renders it with status tiles,
a PSM-clients grid (connection components + per-service health) and a drill-down
detail panel.

## Where to run it

Host this on a **separate internal admin/management host**, **not** on the PVWA,
PSM or CPM servers (those are hardened production components — adding a web app
breaks hardening and supportability). The dashboard is a read-only REST client
that only needs HTTPS (443) to the PVWA.

```
Client browser ──HTTP──> this dashboard (admin host) ──HTTPS 443──> PVWA ──> Vault
```

## Quick start (mock mode — no Vault needed)

```bash
npm install
npm start
# open http://localhost:3000
```

Runs in **MOCK** mode by default with realistic sample data so you can review the
UI immediately.

## Connect to a real PVWA

```bash
cp .env.example .env
# edit .env: CYBERARK_MOCK=false, PVWA_BASE_URL, and a read-only service account
npm start
```

Use a **dedicated read-only monitoring account** (Auditor role is enough).
Credentials are read from env vars and never written to disk; ideally fetch them
at runtime from CCP/AAM instead of storing them.

## Layout

```
server/
  server.js      Express server + /api/health endpoint
  cyberark.js    PVWA REST client (logon, summary, details)
  normalize.js   Maps mock OR live payloads into one view-model
  mockData.js    Sample PSM clients
public/
  index.html, styles.css, app.js   Dashboard UI
```

## API endpoints used (PAM Self-Hosted)

| Method | Path | Purpose |
|---|---|---|
| POST | `/PasswordVault/API/Auth/{method}/Logon` | session token |
| GET | `/PasswordVault/API/ComponentsMonitoringSummary` | all components |
| GET | `/PasswordVault/API/ComponentsMonitoringDetails/{id}` | per-instance details |
| POST | `/PasswordVault/API/Auth/Logoff` | end session |

Docs: <https://docs.cyberark.com/pam-self-hosted/latest/en/content/webservices/systemdetails.htm>
