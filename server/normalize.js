// Builds the dashboard view-model.
//
// In mock mode it returns the curated mock data. In live mode it maps the PVWA
// ComponentsMonitoringSummary / ...Details payloads into the same shape so the
// frontend never needs to know which source it is talking to.

import { psmClients as mockClients, serviceColumns } from "./mockData.js";

function summarize(clients) {
  const total = clients.length;
  const healthy = clients.filter((c) => c.status === "healthy").length;
  const warning = clients.filter((c) => c.status === "warning").length;
  const critical = clients.filter((c) => c.status === "critical").length;
  const connectedComponents = clients.reduce((n, c) => n + c.components.active, 0);
  const servicesDown = clients.reduce(
    (n, c) => n + c.services.filter((s) => s.status === "down").length,
    0
  );
  return { total, healthy, warning, critical, connectedComponents, servicesDown };
}

export function buildMockViewModel() {
  return { serviceColumns, clients: mockClients, summary: summarize(mockClients) };
}

// Map live PVWA payloads -> view model. The PSM component in the summary exposes
// per-instance "ConnectionComponents"; details add component/session breakdowns.
export function buildLiveViewModel(summary, detailsById) {
  const psm =
    (summary?.Components || []).find((c) => /PSM/i.test(c.ComponentID || c.ComponentName)) || {};
  const instances = psm.ComponentsDetails || [];

  const clients = instances.map((inst) => {
    const det = detailsById[inst.ComponentIP] || {};
    const cc = det.ConnectionComponents || {};
    const components = {
      total: cc.Total ?? inst.ConnectionComponents ?? 0,
      active: cc.Active ?? (inst.Connected ? inst.ConnectionComponents : 0) ?? 0,
      stopped: cc.Stopped ?? 0,
      dropped: cc.Dropped ?? 0,
    };
    const services = (det.Services || []).map((s) => ({
      name: s.Name,
      status: s.Status === 1 || /running|up/i.test(s.Status) ? "up" : "down",
    }));
    const status = !inst.Connected
      ? "critical"
      : components.stopped + components.dropped > 0
      ? "warning"
      : "healthy";
    return {
      id: inst.ComponentIP,
      name: inst.ComponentUserName || inst.ComponentIP,
      status,
      ip: inst.ComponentIP,
      os: det.OS || "—",
      version: det.Version || inst.ComponentVersion || "—",
      components,
      services,
      lastCheck: inst.LastConnectionDateTime
        ? new Date(inst.LastConnectionDateTime * 1000).toISOString().replace("T", " ").slice(0, 19)
        : "—",
      sessions: det.ActiveSessions ?? 0,
      healthDetails: det.HealthChecks || [],
      logs: det.Logs || [],
    };
  });

  return { serviceColumns, clients, summary: summarize(clients) };
}
