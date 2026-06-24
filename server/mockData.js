// Mock data that mirrors the CyberArk "PSM Clients Health" dashboard layout.
// Used when CYBERARK_MOCK=true (default) so the dashboard runs without a live Vault.
// The shape is normalised by server/normalize.js into the same view-model the real
// PVWA System Health REST API (ComponentsMonitoringSummary / ...Details) produces.

const SERVICES = ["CPM Proxy", "WEB Proxy", "PSM Proxy", "ADB Proxy", "PSM RDP", "PSM Web"];

function svc(states) {
  // states: array of "up" | "down" | "warn" matching SERVICES order
  return SERVICES.map((name, i) => ({ name, status: states[i] || "up" }));
}

// Each client: connection components + per-service health + metadata.
export const psmClients = [
  {
    id: "PSM-CLT-01",
    name: "PSM-CLT-01",
    status: "healthy",
    ip: "10.42.10.21",
    os: "Windows Server 2022",
    version: "14.2.0",
    components: { total: 5, active: 5, stopped: 0, dropped: 0 },
    services: svc(["up", "up", "up", "up", "up", "up"]),
    lastCheck: "2026-06-24 09:58:12",
    sessions: 4,
    healthDetails: [
      { name: "PSM Service", result: "OK", info: "Running" },
      { name: "Disk Space (C:)", result: "OK", info: "62% free" },
      { name: "Vault Connectivity", result: "OK", info: "1 ms" },
      { name: "Certificate", result: "OK", info: "Valid until 2027-03-01" },
    ],
    logs: [
      { ts: "2026-06-24 09:58:12", level: "INFO", msg: "Health check completed successfully" },
      { ts: "2026-06-24 09:43:11", level: "INFO", msg: "All 5 connection components active" },
    ],
  },
  {
    id: "PSM-CLT-02",
    name: "PSM-CLT-02",
    status: "healthy",
    ip: "10.42.10.22",
    os: "Windows Server 2022",
    version: "14.2.0",
    components: { total: 4, active: 4, stopped: 0, dropped: 0 },
    services: svc(["up", "up", "up", "up", "up", "up"]),
    lastCheck: "2026-06-24 09:58:09",
    sessions: 2,
    healthDetails: [
      { name: "PSM Service", result: "OK", info: "Running" },
      { name: "Disk Space (C:)", result: "OK", info: "54% free" },
      { name: "Vault Connectivity", result: "OK", info: "2 ms" },
    ],
    logs: [{ ts: "2026-06-24 09:58:09", level: "INFO", msg: "Health check completed successfully" }],
  },
  {
    id: "PSM-CLT-03",
    name: "PSM-CLT-03",
    status: "warning",
    ip: "10.42.10.23",
    os: "Windows Server 2019",
    version: "14.1.0",
    components: { total: 5, active: 4, stopped: 1, dropped: 0 },
    services: svc(["up", "warn", "up", "up", "up", "up"]),
    lastCheck: "2026-06-24 09:57:55",
    sessions: 3,
    healthDetails: [
      { name: "PSM Service", result: "OK", info: "Running" },
      { name: "WEB Proxy", result: "WARN", info: "High latency (820 ms)" },
      { name: "Disk Space (C:)", result: "WARN", info: "14% free" },
    ],
    logs: [
      { ts: "2026-06-24 09:57:55", level: "WARN", msg: "WEB Proxy latency above threshold" },
      { ts: "2026-06-24 09:57:55", level: "WARN", msg: "1 connection component stopped" },
    ],
  },
  {
    id: "PSM-CLT-04",
    name: "PSM-CLT-04",
    status: "healthy",
    ip: "10.42.10.24",
    os: "Windows Server 2022",
    version: "14.2.0",
    components: { total: 4, active: 4, stopped: 0, dropped: 0 },
    services: svc(["up", "up", "up", "up", "up", "up"]),
    lastCheck: "2026-06-24 09:58:01",
    sessions: 1,
    healthDetails: [
      { name: "PSM Service", result: "OK", info: "Running" },
      { name: "Vault Connectivity", result: "OK", info: "1 ms" },
    ],
    logs: [{ ts: "2026-06-24 09:58:01", level: "INFO", msg: "Health check completed successfully" }],
  },
  {
    id: "PSM-CLT-05",
    name: "PSM-CLT-05",
    status: "critical",
    ip: "10.42.10.25",
    os: "Windows Server 2019",
    version: "14.1.0",
    components: { total: 5, active: 2, stopped: 1, dropped: 2 },
    services: svc(["up", "down", "down", "up", "up", "warn"]),
    lastCheck: "2026-06-24 09:51:40",
    sessions: 0,
    healthDetails: [
      { name: "PSM Service", result: "FAIL", info: "Stopped" },
      { name: "WEB Proxy", result: "FAIL", info: "Not responding" },
      { name: "PSM Proxy", result: "FAIL", info: "Not responding" },
      { name: "Vault Connectivity", result: "WARN", info: "Reconnecting" },
    ],
    logs: [
      { ts: "2026-06-24 09:51:40", level: "ERROR", msg: "PSM service is down" },
      { ts: "2026-06-24 09:51:40", level: "ERROR", msg: "2 connection components dropped" },
    ],
  },
  {
    id: "PSM-CLT-06",
    name: "PSM-CLT-06",
    status: "healthy",
    ip: "10.42.10.26",
    os: "Windows Server 2022",
    version: "14.2.0",
    components: { total: 1, active: 1, stopped: 0, dropped: 0 },
    services: svc(["up", "up", "up", "up", "up", "up"]),
    lastCheck: "2026-06-24 09:58:14",
    sessions: 0,
    healthDetails: [{ name: "PSM Service", result: "OK", info: "Running" }],
    logs: [{ ts: "2026-06-24 09:58:14", level: "INFO", msg: "Health check completed successfully" }],
  },
];

export const serviceColumns = SERVICES;
