// kinds/speedtest.js — Animated Internet Speed (SpeedTest).
//
// Built for the SpeedTest integration's device (sensor.speedtest_download / _upload / _ping):
// bind the DOWNLOAD sensor; upload/ping are derived by name (or overridden). The whole card
// is a live picture of the measurement — DESIGN.md's unbounded-magnitude family, speed driving
// motion rate:
//   · the icon disc is a speedo gauge: a 270° arc filling to download ÷ max_download, the
//     measured Mbps printed in the middle, colour-banded (red = crawling, amber, green = fast)
//   · "data rain" falls down the card at a rate scaled to the download speed, and a second,
//     sparser stream rises for the upload — faster line, faster rain
//   · the gauge pulses at a heartbeat paced by the ping (45 ms = snappy ~1s beat, a laggy
//     200 ms line slouches at ~4s)
// Always-on ambient motion is sanctioned here (like the clock/radar): the internet is always
// on, and the motion IS the reading. `unavailable` goes grey and still — a dead readout must
// never cosplay as a slow line.

// The gauge, drawn identically into BOTH icon structures (DESIGN.md rule 2; sizes !important
// because Mushroom's tile CSS arrives via adoptedStyleSheets and wins ties).
const stGauge = (root, size) => `
      ${root} {
        ${size}
        border-radius: 9999px;
        position: relative;
        background:
          radial-gradient(circle at 50% 50%, #10151a 0 57%, transparent 58%),
          conic-gradient(from 225deg,
            rgb(var(--st-rgb, 120, 130, 140)) calc(var(--st-frac, 0) * 270deg),
            rgba(120, 130, 140, 0.22) calc(var(--st-frac, 0) * 270deg) 270deg,
            transparent 270deg) !important;
        opacity: var(--st-op, 1);
        animation: var(--st-pulse, none);
        transition: background 0.8s ease;
      }
      ${root}::after {
        content: var(--st-gauge, "--");
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 19px;
        font-weight: 800;
        color: rgb(var(--st-rgb, 120, 130, 140));
        text-shadow: 0 0 8px rgba(var(--st-rgb, 120, 130, 140), 0.8);
      }
      @keyframes st-beat {
        0%, 100% { box-shadow: 0 0 6px 1px rgba(var(--st-rgb, 120, 130, 140), 0.35); }
        14%      { box-shadow: 0 0 18px 6px rgba(var(--st-rgb, 120, 130, 140), 0.85); }
        28%      { box-shadow: 0 0 8px 2px rgba(var(--st-rgb, 120, 130, 140), 0.45); }
      }`;

registerKind("speedtest", {
  label: "Animated Internet Speed",
  desc: "SpeedTest panel — a live gauge with data-rain falling at your measured download rate (and rising for upload), heartbeat paced by ping",
  domains: ["sensor"],
  schema: [
    { name: "upload_entity", selector: { entity: { domain: "sensor" } } },
    { name: "ping_entity", selector: { entity: { domain: "sensor" } } },
    { name: "max_download", selector: { number: { min: 1, step: 1, mode: "box", unit_of_measurement: "Mbps" } } },
  ],
  help: {
    entity: "The DOWNLOAD speed sensor (Mbps) — upload/ping are found by swapping 'download' in its id, or set below",
    upload_entity: "Upload speed sensor (Mbps)",
    ping_entity: "Ping sensor (ms)",
    max_download: "Download speed that reads as a full gauge (default 100)",
  },
  docs: `Bind \`sensor.speedtest_download\`; \`_upload\` and \`_ping\` are derived from its id.
The gauge fills to download ÷ max_download and colour-bands red/amber/green; the data-rain's
fall rate tracks download, the rising stream tracks upload, and the gauge's heartbeat is paced
by ping. The second line reads "▼ 50.4 ▲ 36.3 Mbps · 45 ms · tested 12 min ago".`,
  make: (c) => {
    const dl = c.entity;
    const up = c.upload_entity || dl.replace("download", "upload");
    const ping = c.ping_entity || dl.replace("download", "ping");
    const maxDl = c.max_download > 0 ? c.max_download : 100;
    return {
      type: "custom:mushroom-template-card",
      entity: dl,
      primary: c.name || "Internet Speed",
      secondary:
        `{% set d = states('${dl}') | float(-1) %}` +
        `{% set u = states('${up}') | float(-1) %}` +
        `{% set p = states('${ping}') | float(-1) %}` +
        `{% if d < 0 %}No measurement — check the SpeedTest integration` +
        `{% else %}▼ {{ d | round(1) }} ▲ {{ u | round(1) if u >= 0 else '?' }} Mbps · {{ p | round(0) | int if p >= 0 else '?' }} ms` +
        `{% set mins = ((now() - states['${dl}'].last_updated).total_seconds() / 60) | int %}` +
        `\n{{ 'tested just now' if mins < 1 else 'tested ' ~ (mins ~ ' min' if mins < 60 else (mins // 60) ~ ' h ' ~ (mins % 60) ~ ' min') ~ ' ago' }}{% endif %}`,
      multiline_secondary: true,
      icon: "mdi:speedometer",
      icon_color: "cyan",
      tap_action: { action: "more-info" },
      card_mod: { style: {
        "mushroom-shape-icon$": stGauge(".shape", "--icon-size: 74px !important; width: var(--icon-size) !important; height: var(--icon-size) !important;"),
        "ha-tile-icon$": stGauge(".container", "width: 74px !important; height: 74px !important;"),
        ".": `
        mushroom-shape-icon { --icon-size: 74px; display: flex; margin: 0 !important; }
        ha-tile-icon { --tile-icon-size: 74px; width: 74px; height: 74px; }
        /* the gauge IS the dial — the mdi glyph would sit on the printed number */
        ha-state-icon, ha-icon { display: none; }
        ha-card {
          {% set d = states('${dl}') | float(-1) %}
          {% set u = states('${up}') | float(-1) %}
          {% set p = states('${ping}') | float(-1) %}
          {% if d < 0 %}
            {% set rgb = '120, 124, 130' %}{% set frac = 0 %}{% set gauge = '--' %}{% set op = '0.5' %}
            {% set pulse = 'none' %}{% set dldur = '0s' %}{% set updur = '0s' %}{% set rainop = 0 %}
          {% else %}
            {% set frac = [[d / ${maxDl}, 0] | max, 1] | min %}
            {% if frac < 0.2 %}{% set rgb = '244, 67, 54' %}
            {% elif frac < 0.5 %}{% set rgb = '255, 167, 38' %}
            {% else %}{% set rgb = '61, 220, 132' %}{% endif %}
            {% set gauge = d | round(0) | int %}
            {% set op = '1' %}{% set rainop = 1 %}
            {% set beat = [[(p / 50), 0.6] | max, 4] | min if p > 0 else 1.2 %}
            {% set pulse = 'st-beat ' ~ (beat | round(2)) ~ 's ease-out infinite' %}
            {% set dldur = ([[300 / d, 1] | max, 20] | min | round(1)) ~ 's' if d > 0 else '0s' %}
            {% set updur = ([[300 / u, 1] | max, 25] | min | round(1)) ~ 's' if u > 0 else '0s' %}
          {% endif %}
          --st-rgb: {{ rgb }};
          --st-frac: {{ frac | round(3) }};
          --st-gauge: "{{ gauge }}";
          --st-op: {{ op }};
          --st-pulse: {{ pulse }};
          --st-dl-dur: {{ dldur }};
          --st-up-dur: {{ updur }};
          --st-rain-op: {{ rainop }};
          position: relative;
          overflow: hidden;
          clip-path: inset(0 0 0 0 round var(--ha-card-border-radius, 12px));
          --card-primary-font-size: 1.15rem;
        }
        /* keep the reading above the rain */
        ha-tile-icon, mushroom-shape-icon, ha-tile-info, mushroom-state-info { position: relative; z-index: 3; }
        /* download data-rain: columns of cyan packets falling at the measured rate. The layer
           is 200% tall and slides half its height, so the loop is seamless; transform-only. */
        ha-card::before {
          content: '';
          position: absolute;
          left: 0; right: 0; top: -100%;
          height: 200%;
          background-image:
            radial-gradient(2.5px 6px at 20px 14px, rgba(0, 200, 255, 0.5), transparent),
            radial-gradient(2px 5px at 58px 40px, rgba(0, 200, 255, 0.35), transparent),
            radial-gradient(2.5px 6px at 96px 26px, rgba(0, 200, 255, 0.45), transparent);
          background-size: 120px 60px;
          background-repeat: repeat;
          opacity: var(--st-rain-op, 0);
          animation: st-fall var(--st-dl-dur, 8s) linear infinite;
          animation-play-state: {{ 'running' if states('${dl}') | float(0) > 0 else 'paused' }};
          z-index: 1;
          pointer-events: none;
        }
        /* upload stream: sparser amber packets rising */
        ha-card::after {
          content: '';
          position: absolute;
          left: 0; right: 0; top: -100%;
          height: 200%;
          background-image:
            radial-gradient(2px 5px at 40px 30px, rgba(255, 179, 0, 0.4), transparent),
            radial-gradient(1.8px 4px at 84px 52px, rgba(255, 179, 0, 0.3), transparent);
          background-size: 120px 60px;
          background-repeat: repeat;
          opacity: var(--st-rain-op, 0);
          animation: st-rise var(--st-up-dur, 10s) linear infinite;
          animation-play-state: {{ 'running' if states('${up}') | float(0) > 0 else 'paused' }};
          z-index: 1;
          pointer-events: none;
        }
        @keyframes st-fall { from { transform: translateY(0); } to { transform: translateY(50%); } }
        @keyframes st-rise { from { transform: translateY(0); } to { transform: translateY(-50%); } }`,
      } },
      grid_options: { columns: 12, rows: 2 },
    };
  },
});
