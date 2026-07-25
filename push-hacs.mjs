// push-hacs.mjs — overwrite the HACS-INSTALLED bundle in place (emergency/override path; the
// normal route is a commit + HACS Redownload). Writes BOTH animated-cards.js and its .gz sibling.
// HACS gzips every plugin file it downloads; HA's static handler serves the .gz to any client
// that sends Accept-Encoding: gzip (i.e. every browser). Pushing only the .js therefore updates
// what curl sees and NOTHING that the frontend sees — the file looks pushed but the tablet keeps
// running the old bundle. Always push the pair.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { networkInterfaces } from "node:os";
import dns from "node:dns/promises";

const ENV_FILE = process.env.HA_ENV_FILE || new URL("../claude-home-assistant/.env", import.meta.url).pathname;
const env = {};
for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  if (line.trim().startsWith("#")) continue;
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const BASE = env.HA_URL_IP || env.HA_URL;
const TOKEN = env.HA_TOKEN;
const PORT = 8934;
const SUBDIR = "community/lovelace-animated-cards";
const js = readFileSync(new URL("./dist/animated-cards.js", import.meta.url).pathname);
const gz = gzipSync(js, { level: 9 });
const bodies = { "animated-cards.js": js, "animated-cards.js.gz": gz };

const rest = async (method, path, payload) => {
  const res = await fetch(BASE + path, { method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text;
};

const haHost = new URL(BASE).hostname;
const haIp = /^\d+\.\d+\.\d+\.\d+$/.test(haHost) ? haHost : (await dns.lookup(haHost, 4)).address;
const prefix = haIp.split(".").slice(0, 3).join(".") + ".";
const all = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal);
const ip = (all.find((i) => i.address.startsWith(prefix)) || all[0]).address;

const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.slice(1).split("?")[0]);
  const body = bodies[name];
  if (!body) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": body.length });
  res.end(body);
});
await new Promise((r) => server.listen(PORT, "0.0.0.0", r));
try {
  for (const name of Object.keys(bodies)) {
    await rest("POST", "/api/services/downloader/download_file",
      { url: `http://${ip}:${PORT}/${name}`, subdir: SUBDIR, filename: name, overwrite: true });
    console.log(`queued ${name} (${bodies[name].length} bytes)`);
  }
  // verify what a BROWSER would get (gzip) and what curl gets (plain)
  const want = (js.toString().match(/ANIM_CARDS_VERSION = "([^"]+)"/) || [])[1];
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 750));
    const g = await fetch(`${BASE}/hacsfiles/lovelace-animated-cards/animated-cards.js?p=${i}`,
      { headers: { "Accept-Encoding": "gzip" } }).then((r) => r.text()).catch(() => "");
    const v = (g.match(/ANIM_CARDS_VERSION = "([^"]+)"/) || [])[1];
    if (v === want) { console.log(`browsers now get v${v}`); process.exit(0); }
  }
  console.log("gz still stale after 30s — check the Downloader");
  process.exit(1);
} finally { server.close(); }
