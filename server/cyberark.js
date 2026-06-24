// Thin client for the CyberArk PVWA System Health REST API.
//
// Endpoints used (PAM Self-Hosted):
//   POST /PasswordVault/API/Auth/CyberArk/Logon                -> session token
//   GET  /PasswordVault/API/ComponentsMonitoringSummary        -> all components summary
//   GET  /PasswordVault/API/ComponentsMonitoringDetails/{id}   -> per-instance details
//   POST /PasswordVault/API/Auth/Logoff
//
// Docs: https://docs.cyberark.com/pam-self-hosted/latest/en/content/webservices/systemdetails.htm
//
// This module is only exercised when CYBERARK_MOCK is not "true". It deliberately
// uses a read-only service account and never stores credentials on disk.

const {
  PVWA_BASE_URL,
  CYBERARK_AUTH_METHOD = "CyberArk", // CyberArk | LDAP | RADIUS | Windows
  CYBERARK_USERNAME,
  CYBERARK_PASSWORD,
} = process.env;

let sessionToken = null;

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && sessionToken) headers.Authorization = sessionToken;
  const res = await fetch(`${PVWA_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PVWA ${method} ${path} -> ${res.status} ${res.statusText} ${text}`.trim());
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function logon() {
  if (!PVWA_BASE_URL || !CYBERARK_USERNAME || !CYBERARK_PASSWORD) {
    throw new Error("Missing PVWA_BASE_URL / CYBERARK_USERNAME / CYBERARK_PASSWORD env vars");
  }
  const token = await api(`/PasswordVault/API/Auth/${CYBERARK_AUTH_METHOD}/Logon`, {
    method: "POST",
    auth: false,
    body: { username: CYBERARK_USERNAME, password: CYBERARK_PASSWORD, concurrentSession: true },
  });
  // CyberArk returns the token as a raw JSON string.
  sessionToken = typeof token === "string" ? token.replace(/^"|"$/g, "") : token;
  return sessionToken;
}

export async function logoff() {
  if (!sessionToken) return;
  try {
    await api(`/PasswordVault/API/Auth/Logoff`, { method: "POST" });
  } finally {
    sessionToken = null;
  }
}

export async function getComponentsSummary() {
  if (!sessionToken) await logon();
  return api(`/PasswordVault/API/ComponentsMonitoringSummary`);
}

export async function getComponentDetails(componentId) {
  if (!sessionToken) await logon();
  return api(`/PasswordVault/API/ComponentsMonitoringDetails/${encodeURIComponent(componentId)}`);
}
