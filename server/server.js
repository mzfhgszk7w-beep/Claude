import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { buildMockViewModel, buildLiveViewModel } from "./normalize.js";
import { getComponentsSummary, getComponentDetails } from "./cyberark.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const MOCK = (process.env.CYBERARK_MOCK ?? "true").toLowerCase() !== "false";

app.use(express.static(join(__dirname, "..", "public")));

// Health view-model consumed by the frontend.
app.get("/api/health", async (_req, res) => {
  try {
    if (MOCK) return res.json({ source: "mock", ...buildMockViewModel() });

    const summary = await getComponentsSummary();
    // Pull per-instance details for each PSM instance.
    const psm =
      (summary?.Components || []).find((c) => /PSM/i.test(c.ComponentID || c.ComponentName)) || {};
    const detailsById = {};
    await Promise.all(
      (psm.ComponentsDetails || []).map(async (inst) => {
        try {
          detailsById[inst.ComponentIP] = await getComponentDetails(psm.ComponentID);
        } catch {
          /* leave undefined -> normalize falls back to summary fields */
        }
      })
    );
    res.json({ source: "live", ...buildLiveViewModel(summary, detailsById) });
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(
    `CyberArk Health Dashboard on http://localhost:${PORT}  (mode: ${MOCK ? "MOCK" : "LIVE"})`
  );
});
