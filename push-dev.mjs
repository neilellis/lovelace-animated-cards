#!/usr/bin/env node
// push-dev.mjs — push dist/animated-cards.js straight to the house HA for fast iteration,
// bypassing GitHub/HACS. Uses the same Downloader trick as the floorplan builder (the HA
// box has no SSH/Samba): serve the file on an ephemeral HTTP server, downloader.download_file
// into /config/www/animated-cards/, poll /local until the bytes match, then upsert a
// Lovelace resource with a content-hash cache-buster.
//
// Once the HACS install is live this is only for development; remove the dev resource
// (/local/animated-cards/…) if both end up registered — the bundle guards its
// customElements.define calls, so double-loading is harmless but pointless.
//
// Connection comes from the claude-home-assistant workspace .env (HA_URL/HA_TOKEN).
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { networkInterfaces } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns/promises";

const root = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = process.env.HA_ENV_FILE || join(root, "../claude-home-assistant/.env");
const env = {};
for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  if (line.trim().startsWith("#")) continue;
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const BASE = env.HA_URL_IP || env.HA_URL;
const TOKEN = env.HA_TOKEN;
const PORT = 8932;
const FILE = "animated-cards.js";
const body = readFileSync(join(root, "dist", FILE));
const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);

const rest = async (method, path, payload) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return text; }
};

const localServeIp = async () => {
  const haHost = new URL(BASE).hostname;
  const haIp = /^\d+\.\d+\.\d+\.\d+$/.test(haHost) ? haHost : (await dns.lookup(haHost, 4)).address;
  const prefix = haIp.split(".").slice(0, 3).join(".") + ".";
  const all = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal);
  return (all.find((i) => i.address.startsWith(prefix)) || all[0]).address;
};

const ensureDownloader = async () => {
  const entries = await rest("GET", "/api/config/config_entries/entry?domain=downloader");
  if (Array.isArray(entries) && entries.length) return;
  let flow = await rest("POST", "/api/config/config_entries/flow", { handler: "downloader" });
  if (flow.type === "form") flow = await rest("POST", `/api/config/config_entries/flow/${flow.flow_id}`, { download_dir: "www" });
  if (flow.type !== "create_entry" && flow.reason !== "already_configured" && flow.reason !== "single_instance_allowed") {
    throw new Error("downloader config flow failed: " + JSON.stringify(flow).slice(0, 400));
  }
};

const push = async () => {
  const ip = await localServeIp();
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(body);
  });
  await new Promise((r) => server.listen(PORT, "0.0.0.0", r));
  try {
    const svc = { url: `http://${ip}:${PORT}/${FILE}`, subdir: "animated-cards", filename: FILE, overwrite: true };
    try { await rest("POST", "/api/services/downloader/download_file", svc); }
    catch (e) {
      if (!/overwrite/.test(String(e))) throw e;
      delete svc.overwrite;
      await rest("POST", "/api/services/downloader/download_file", svc);
    }
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`${BASE}/local/animated-cards/${FILE}?nocache=${hash}-${i}`);
        if (res.ok) ok = Buffer.from(await res.arrayBuffer()).equals(body);
      } catch { /* retry */ }
    }
    if (!ok) throw new Error(`/local/animated-cards/${FILE} never matched the served file`);
    console.log(`pushed /config/www/animated-cards/${FILE} (${body.length} bytes, verified)`);
  } finally { server.close(); }
};

const upsertResource = async () => {
  const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/api/websocket");
  let id = 1;
  const pending = new Map();
  const send = (msg) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, ...msg }));
  });
  await new Promise((resolve, reject) => {
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "auth_required") return ws.send(JSON.stringify({ type: "auth", access_token: TOKEN }));
      if (m.type === "auth_ok") return resolve();
      if (m.type === "auth_invalid") return reject(new Error("auth failed"));
      if (m.type === "result") {
        const p = pending.get(m.id);
        if (p) m.success ? p.res(m.result) : p.rej(new Error(JSON.stringify(m.error)));
      }
    };
    ws.onerror = reject;
  });
  const url = `/local/animated-cards/${FILE}?v=${hash}`;
  const resources = await send({ type: "lovelace/resources" });
  const existing = resources.find((r) => r.url.startsWith(`/local/animated-cards/${FILE}`));
  if (existing) {
    await send({ type: "lovelace/resources/update", resource_id: existing.id, res_type: "module", url });
    console.log(`resource updated: ${url}`);
  } else {
    await send({ type: "lovelace/resources/create", res_type: "module", url });
    console.log(`resource created: ${url}`);
  }
  ws.close();
};

await ensureDownloader();
await push();
await upsertResource();
console.log("done — hard-refresh the browser (resource changes need it)");
