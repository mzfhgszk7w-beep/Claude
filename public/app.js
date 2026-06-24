// CyberArk Health Check dashboard — frontend.
// Pulls the normalised view-model from /api/health and renders it.

const state = { data: null, selectedId: null, tab: "components", search: "", status: "all" };

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const STATUS_LABEL = { healthy: "Healthy", warning: "Warning", critical: "Critical" };
const svcAbbr = (name) =>
  name.replace(/proxy/i, "").trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3) ||
  name.slice(0, 3).toUpperCase();

async function load() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    state.data = data;
    if (!state.selectedId && data.clients.length) state.selectedId = data.clients[0].id;
    render();
  } catch (err) {
    $("#tiles").innerHTML = `<div class="tile red"><div class="label">Error</div><div class="value" style="font-size:15px">${err.message}</div></div>`;
  }
}

function render() {
  const d = state.data;
  // source badge + refresh
  const badge = $("#source-badge");
  badge.textContent = d.source.toUpperCase();
  badge.className = "badge " + (d.source === "live" ? "badge-live" : "badge-mock");
  $("#last-refresh").textContent = "Last refresh: " + new Date().toLocaleTimeString();

  renderTiles(d.summary);
  renderServiceHead(d.serviceColumns);
  renderTable();
  renderDetail();
}

function renderTiles(s) {
  const tiles = [
    { label: "PSM Clients", value: s.total, cls: "blue", ico: "🖥" },
    { label: "Healthy", value: s.healthy, cls: "green", ico: "✓" },
    { label: "Warning", value: s.warning, cls: "amber", ico: "!" },
    { label: "Critical", value: s.critical, cls: "red", ico: "✕" },
    { label: "Connected Components", value: s.connectedComponents, cls: "blue", ico: "🔌" },
    { label: "Services Down", value: s.servicesDown, cls: s.servicesDown ? "red" : "green", ico: "⚙" },
  ];
  $("#tiles").innerHTML = tiles
    .map(
      (t) =>
        `<div class="tile ${t.cls}"><div class="ico">${t.ico}</div><div class="label">${t.label}</div><div class="value">${t.value}</div></div>`
    )
    .join("");
}

function renderServiceHead(cols) {
  $("#svc-head").textContent = "Services";
  $("#svc-head").title = cols.join(", ");
}

function filteredClients() {
  return state.data.clients.filter((c) => {
    const okSearch = c.name.toLowerCase().includes(state.search.toLowerCase());
    const okStatus = state.status === "all" || c.status === state.status;
    return okSearch && okStatus;
  });
}

function renderTable() {
  const body = $("#clients-body");
  body.innerHTML = "";
  for (const c of filteredClients()) {
    const tr = el("tr");
    if (c.id === state.selectedId) tr.classList.add("selected");
    tr.onclick = () => {
      state.selectedId = c.id;
      renderTable();
      renderDetail();
    };
    const cc = c.components;
    const svc = c.services
      .map((s) => `<span class="svc ${s.status}" title="${s.name}: ${s.status}">${svcAbbr(s.name)}</span>`)
      .join("");
    tr.innerHTML = `
      <td><div class="client-cell"><span class="status-dot s-${c.status}"></span><div><div class="name">${c.name}</div><div class="sub">${c.ip}</div></div></div></td>
      <td><span class="status-pill s-${c.status}"><span class="status-dot s-${c.status}"></span>${STATUS_LABEL[c.status]}</span></td>
      <td class="num">${cc.total}</td>
      <td class="num">${cc.active}</td>
      <td class="num ${cc.stopped ? "warn" : ""}">${cc.stopped}</td>
      <td class="num ${cc.dropped ? "bad" : ""}">${cc.dropped}</td>
      <td><div class="svc-row">${svc}</div></td>
      <td class="num">${c.sessions}</td>
      <td class="muted">${c.lastCheck}</td>`;
    body.appendChild(tr);
  }
  if (!body.children.length) {
    body.innerHTML = `<tr><td colspan="9" class="muted" style="text-align:center;padding:28px">No PSM clients match the filter.</td></tr>`;
  }
}

function renderDetail() {
  const c = state.data.clients.find((x) => x.id === state.selectedId);
  if (!c) return;
  $("#detail-title").textContent = `Detailed Health Information · ${c.name}`;
  const st = $("#detail-status");
  st.className = "status-pill s-" + c.status;
  st.innerHTML = `<span class="status-dot s-${c.status}"></span>${STATUS_LABEL[c.status]}`;

  // tabs
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === state.tab));

  const main = $("#tab-content");
  if (state.tab === "components") {
    const cc = c.components;
    main.innerHTML = table(
      ["Metric", "Count"],
      [
        ["Total", cc.total],
        ["Active", cc.active],
        ["Stopped", cc.stopped],
        ["Dropped", cc.dropped],
      ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")
    );
  } else if (state.tab === "services") {
    main.innerHTML = table(
      ["Service", "Status"],
      c.services
        .map((s) => `<tr><td>${s.name}</td><td class="res-${s.status === "up" ? "OK" : s.status === "warn" ? "WARN" : "FAIL"}">${s.status.toUpperCase()}</td></tr>`)
        .join("")
    );
  } else if (state.tab === "hc") {
    main.innerHTML = table(
      ["Check", "Result", "Info"],
      (c.healthDetails || []).map((h) => `<tr><td>${h.name}</td><td class="res-${h.result}">${h.result}</td><td class="muted">${h.info || ""}</td></tr>`).join("") ||
        emptyRow(3)
    );
  } else {
    main.innerHTML = table(
      ["Timestamp", "Level", "Message"],
      (c.logs || []).map((l) => `<tr><td class="muted">${l.ts}</td><td class="lvl-${l.level}">${l.level}</td><td>${l.msg}</td></tr>`).join("") ||
        emptyRow(3)
    );
  }

  $("#detail-meta").innerHTML = `
    <h3>System Health Information</h3>
    ${metaRow("PSM Client", c.name)}
    ${metaRow("IP Address", c.ip)}
    ${metaRow("Operating System", c.os)}
    ${metaRow("PSM Version", c.version)}
    ${metaRow("Active Sessions", c.sessions)}
    ${metaRow("Last Health Check", c.lastCheck)}`;
}

const table = (cols, rows) =>
  `<table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
const emptyRow = (n) => `<tr><td colspan="${n}" class="muted">No data.</td></tr>`;
const metaRow = (k, v) => `<div class="meta-row"><span class="k">${k}</span><span>${v}</span></div>`;

// Events
$("#search").addEventListener("input", (e) => { state.search = e.target.value; renderTable(); });
$("#status-filter").addEventListener("change", (e) => { state.status = e.target.value; renderTable(); });
$("#refresh-btn").addEventListener("click", load);
$("#run-hc").addEventListener("click", () => { $("#run-hc").textContent = "Running…"; setTimeout(() => { $("#run-hc").textContent = "Run Health Check"; load(); }, 700); });
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { state.tab = t.dataset.tab; renderDetail(); }));

load();
setInterval(load, 30000); // auto refresh every 30s
