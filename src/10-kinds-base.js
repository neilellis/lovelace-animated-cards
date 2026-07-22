// 10-kinds-base.js — the 14 hand-tuned kinds (the ones battle-tested on the house
// dashboards), wrapping the factory functions from 01-factories.js. Kinds converted
// straight from the upstream corpus live in kinds/*.js.

registerKind("lamp", {
  label: "Animated Lamp",
  desc: "Mushroom light card (brightness/colour controls) pulsing in the light's own colour",
  domains: ["light"],
  // Inverted on purpose: ha-form renders an unset boolean as OFF, and OFF here is the truth
  // (sliders collapsed behind a chevron by default). `true` pins them open — what the
  // floorplan subviews want on the wall tablet.
  schema: [F.active, { name: "controls_always_open", selector: { boolean: {} } }],
  help: { controls_always_open: "Keep the brightness/colour sliders open instead of behind a chevron" },
  make: (c) => animLamp(c.entity, c.name, prune({
    active: c.active, collapsible: c.controls_always_open ? false : undefined,
  })),
});

registerKind("led-strip", {
  label: "Animated LED Strip",
  desc: "Vertical tile glowing in the strip's own colour while on",
  domains: ["light"],
  schema: [F.icon, F.color, F.active],
  make: (c) => animLedStrip(c.entity, c.name, prune({ icon: c.icon, color: c.color, active: c.active })),
});

registerKind("switch", {
  label: "Animated Switch / Plug",
  desc: "Steady glow pulse while on; optional power sensor for plugs whose switch state lies",
  domains: ["switch", "input_boolean", "light"],
  schema: [F.icon, F.color, F.glow, F.powerEntity, F.powerAbove, F.active],
  make: (c) => animSwitch(c.entity, c.name, prune({ icon: c.icon, color: c.color, glow: c.glow, active: c.active, power: powerOf(c) })),
});

registerKind("fan", {
  label: "Animated Fan",
  desc: "Blades spin while on — for fans wired as a switch/plug",
  domains: ["switch", "fan", "input_boolean"],
  schema: [F.icon, F.color, F.glow, F.speed, F.powerEntity, F.powerAbove, F.active],
  make: (c) => animFan(c.entity, c.name, prune({ icon: c.icon, color: c.color, glow: c.glow, speed: c.speed, active: c.active, power: powerOf(c) })),
});

registerKind("contact", {
  label: "Animated Contact",
  desc: "Door/window sensor — calm when shut, pulsing red alert while open",
  domains: ["binary_sensor"],
  deviceClass: ["door", "window", "opening", "garage_door", "lock"],
  schema: [F.icon, { name: "open_icon", selector: { icon: {} } }, F.color, F.glow],
  help: { open_icon: "Icon shown while open" },
  make: (c) => animContact(c.entity, c.name || friendly(c.entity), prune({ icon: c.icon, openIcon: c.open_icon, color: c.color, glow: c.glow })),
});

registerKind("motion", {
  label: "Animated Motion Radar",
  desc: "Radar HUD — cyan SCANNING sweep while idle, red DETECTED sonar on motion",
  domains: ["binary_sensor"],
  deviceClass: ["motion", "occupancy", "presence"],
  schema: [F.icon],
  make: (c) => animMotion(c.entity, c.name, prune({ icon: c.icon })),
});

registerKind("vacuum", {
  label: "Animated Vacuum",
  desc: "Robot wanders a cleaning path while the vacuum runs",
  domains: ["vacuum"],
  schema: [F.icon, F.color, F.active],
  help: { active: "State that counts as cleaning (default: cleaning)" },
  make: (c) => animVacuum(c.entity, c.name, prune({ icon: c.icon, color: c.color, active: c.active })),
});

registerKind("climate", {
  label: "Animated Climate Tile",
  desc: "Compact zone tile — icon coloured/glowing by room temp, tap toggles the zone",
  domains: ["climate"],
  schema: [],
  make: (c) => animClimate(c.entity, c.name || friendly(c.entity)),
});

registerKind("temp", {
  label: "Animated Temperature",
  desc: "Breathing thermometer on a calm comfort ramp (20–23 °C reads near-white)",
  domains: ["sensor"],
  deviceClass: ["temperature"],
  entitySelector: { entity: { domain: "sensor", device_class: "temperature" } },
  schema: [],
  make: (c) => animTemp(c.entity, c.name || "Temperature"),
});

registerKind("humidity", {
  label: "Animated Humidity",
  desc: "Bobbing droplet, colour-banded — amber parched, slate healthy, blue saturated",
  domains: ["sensor"],
  deviceClass: ["humidity"],
  entitySelector: { entity: { domain: "sensor", device_class: "humidity" } },
  schema: [],
  make: (c) => animHum(c.entity, c.name || "Humidity"),
});

registerKind("washer", {
  label: "Animated Washing Machine",
  desc: "Hero card — spinning drum, bubbles and a programme progress bar (machine_status sensor)",
  domains: ["sensor"],
  schema: [
    { name: "remaining_entity", selector: { entity: { domain: "sensor" } } },
    { name: "total_entity", selector: { entity: { domain: "sensor" } } },
    // temp/spin are `select.*` on Home Connect machines (a settable programme option), so the
    // picker allows both rather than hiding the entity that actually exists.
    { name: "temp_entity", selector: { entity: { domain: ["sensor", "select"] } } },
    { name: "spin_entity", selector: { entity: { domain: ["sensor", "select"] } } },
    { name: "door_entity", selector: { entity: { domain: ["sensor", "binary_sensor"] } } },
  ],
  help: {
    remaining_entity: "Remaining-time sensor (minutes)",
    total_entity: "Programme-duration sensor (minutes) — drives the progress bar",
    temp_entity: "Wash-temperature sensor (optional)",
    spin_entity: "Spin-speed sensor (optional)",
    door_entity: "Door-state sensor (optional)",
  },
  make: (c) => animWasher(c.entity, c.name || friendly(c.entity), prune({
    remaining: c.remaining_entity, total: c.total_entity,
    temp: c.temp_entity, spin: c.spin_entity, door: c.door_entity,
  })),
});

registerKind("curtain", {
  label: "Animated Curtain",
  desc: "Draws the window — fabric panels slide with position, glass fades day-blue to night-dark",
  domains: ["cover"],
  schema: [
    F.icon,
    { name: "fabric", selector: { text: {} } },
    { name: "fabric_shadow", selector: { text: {} } },
    { name: "pane_open", selector: { text: {} } },
    { name: "pane_shut", selector: { text: {} } },
    { name: "window_width", selector: { text: {} } },
    { name: "height", selector: { text: {} } },
  ],
  help: {
    fabric: "Curtain fabric colour (CSS, default #c2a06a)",
    fabric_shadow: "Fabric fold-shadow colour (default #9c7f4f)",
    pane_open: "Glass colour when open (default #4fc3f7)",
    pane_shut: "Glass colour when shut (default #243240)",
    window_width: "Window pane width (CSS, default 40%)",
    height: "Card height (CSS, default 104px)",
  },
  make: (c) => animCurtain(c.entity, c.name, prune({
    icon: c.icon, fabric: c.fabric, fabricShadow: c.fabric_shadow,
    paneOpen: c.pane_open, paneShut: c.pane_shut,
    windowWidth: c.window_width, height: c.height,
  })),
});

registerKind("media", {
  label: "Animated Media Player",
  desc: "Media-player card with an RGB screen-glow pulse while playing",
  domains: ["media_player"],
  schema: [F.icon],
  make: (c) => animMedia(c.entity, c.name, prune({ icon: c.icon })),
});

registerKind("heater", {
  label: "Animated Heater",
  desc: "Climate card with flame glow + ember pulse while the zone is heating",
  domains: ["climate"],
  schema: [{ name: "flame_color", selector: { select: { mode: "dropdown", custom_value: true, options: MUSHROOM_COLORS } } }],
  help: { flame_color: "Mushroom colour name for the flame glow (default deep-orange)" },
  make: (c) => animHeater(c.entity, c.name, prune({ flameColor: c.flame_color })),
});
