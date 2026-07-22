// upstream: README #24 - Living Room Speaker
//
// Media-player card whose icon disc thumps to the beat while playing: a scale pulse on the
// disc, three "EQ bar" offset shadows shuffling around it, and a bass shockwave whose swell
// tracks the player's own volume_level. Powered-on-but-paused = coloured and still; off = grey.
//
// Upstream interpolates the volume straight into the @keyframes body (entity state inside a
// keyframe → the whole block re-renders and the animation restarts on every volume tick);
// here the swell rides a CSS var instead, so the keyframes stay static.
// mushroom-media-player-card still uses the legacy shape structure → no ha-tile-icon mirror.

const SPK_FX = `
      .shape {
        transform-origin: 50% 50%;
        position: relative;
        --icon-color: rgba(var(--spk-rgb, 128, 128, 128), 1) !important;
        opacity: var(--spk-op, 0.6);
        animation: var(--spk-anim, none);
      }
      .shape::before, .shape::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
      }
      .shape::before { animation: var(--spk-bars, none); }
      .shape::after  { animation: var(--spk-bass, none); }
      @keyframes spk-thump {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.06); }
        100% { transform: scale(1); }
      }
      @keyframes spk-bars {
        0% {
          box-shadow:
            -10px 6px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.4),
            0 2px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.6),
            10px -4px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.3);
        }
        33% {
          box-shadow:
            -10px -2px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.7),
            0 8px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.3),
            10px -8px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.6);
        }
        66% {
          box-shadow:
            -10px -8px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.3),
            0 -4px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.7),
            10px 6px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.5);
        }
        100% {
          box-shadow:
            -10px 6px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.4),
            0 2px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.6),
            10px -4px 0 -5px rgba(var(--spk-rgb, 255, 30, 30), 0.3);
        }
      }
      @keyframes spk-bass {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(var(--spk-rgb, 255, 30, 30), 0.9);
        }
        40% {
          transform: scale(var(--spk-swell, 1.12));
          box-shadow: 0 0 0 8px rgba(var(--spk-rgb, 255, 30, 30), 0.5), 0 0 0 14px rgba(var(--spk-rgb, 255, 30, 30), 0.25);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 20px rgba(var(--spk-rgb, 255, 30, 30), 0), 0 0 0 30px rgba(var(--spk-rgb, 255, 30, 30), 0);
        }
      }`;

const speakerCard = (c) => {
  const speed = c.speed || "0.9s";
  const glow = c.glow || "255, 30, 30";
  const offGlow = c.off_glow || "128, 128, 128";
  return {
    type: "custom:mushroom-media-player-card",
    entity: c.entity,
    ...(c.name ? { name: c.name } : {}),
    ...(c.icon ? { icon: c.icon } : {}),
    volume_controls: ["volume_mute", "volume_set", "volume_buttons"],
    media_controls: ["on_off", "shuffle", "previous", "play_pause_stop", "next", "repeat"],
    show_volume_level: true,
    use_media_info: false,
    card_mod: { style: {
      // STATIC: everything defaults to silent — a speaker is off/idle most of the day.
      "mushroom-shape-icon$": SPK_FX,
      ".": `${clip}
      ha-card {
        {% set s = states(config.entity) %}
        {% set live = s not in ['off', 'unavailable', 'unknown', 'standby'] %}
        {% set playing = s == 'playing' %}
        {% set vol = state_attr(config.entity, 'volume_level') | float(0) %}
        --spk-rgb: {{ '${glow}' if live else '${offGlow}' }};
        --spk-swell: {{ (1.08 + vol * 0.1) | round(2) }};
        --spk-anim: {{ 'spk-thump ${speed} ease-in-out infinite' if playing else 'none' }};
        --spk-bars: {{ 'spk-bars 0.55s linear infinite' if playing else 'none' }};
        --spk-bass: {{ 'spk-bass 1s ease-out infinite' if playing else 'none' }};
        --spk-op: {{ '1' if live else '0.6' }};
      }`,
    } },
    grid_options: { columns: 12, rows: 2 },
  };
};

registerKind("speaker", {
  label: "Animated Speaker",
  desc: "Media player whose icon thumps, shows EQ bars and a volume-scaled bass ring while playing",
  domains: ["media_player"],
  schema: [
    F.icon,
    F.glow,
    { name: "off_glow", selector: { text: {} } },
    F.speed,
  ],
  help: {
    glow: "Playing colour as R, G, B (default 255, 30, 30)",
    off_glow: "Colour while the speaker is off, as R, G, B (default 128, 128, 128)",
    speed: "Beat/thump period, e.g. 0.9s (smaller = faster)",
  },
  docs: "The bass ring's swell scales with the player's `volume_level` attribute; players that don't report volume simply get the base swell.",
  make: speakerCard,
});
