# Animated Cards for Lovelace

Every animated card design from **[Anashost/HA-Animated-cards](https://github.com/Anashost/HA-Animated-cards)**
as a **real, pickable Lovelace card**: install via HACS, open any dashboard's *Add card*
dialog, search "Animated", pick an entity in the visual editor — done. No YAML pasting,
no hand-editing entity ids into card-mod templates.

> [!IMPORTANT]
> **All animation designs are the work of [@Anasbox](https://www.youtube.com/@anasbox)**
> (GitHub: [Anashost](https://github.com/Anashost)). This project only re-packages his
> [HA-Animated-cards](https://github.com/Anashost/HA-Animated-cards) library — Mushroom +
> card-mod YAML configs — into parameterised custom cards. If you enjoy these cards, watch
> his build videos and support him:
>
> - 🎬 YouTube: [@anasbox](https://www.youtube.com/@anasbox) — card batch walkthroughs:
>   [Batch 1](https://youtu.be/5vYz37AqSO4) · [Batch 2](https://youtu.be/izx0JMrnhWE) ·
>   [Batch 3](https://youtu.be/SrFbC1ae35E) · [Batch 4](https://youtu.be/avAg9CR9TRc) ·
>   [Batch 5](https://youtu.be/5k6DfaymBZE)
> - ☕ Support him: [Ko-fi](https://ko-fi.com/anasbox) ·
>   [Buy Me a Coffee](https://www.buymeacoffee.com/anasbox) ·
>   [Patreon](https://patreon.com/AnasBox) · [PayPal](https://paypal.me/anasboxsupport) ·
>   [Revolut](https://revolut.me/anas4e)

## The animations

These are **[@Anasbox](https://www.youtube.com/@anasbox)'s own batch reels**, hosted in and
linked back to **[Anashost/HA-Animated-cards](https://github.com/Anashost/HA-Animated-cards)** —
they show the designs this repo packages. Click any of them for the source repo; the batch
walkthrough videos are linked above.

[![Batch 1 — the first set of animated card designs](https://github.com/user-attachments/assets/4f5a1af0-d89b-4ed9-9c8c-36e678045580)](https://github.com/Anashost/HA-Animated-cards)

[![Batch 2 — animated card designs](https://github.com/user-attachments/assets/65ba4a4e-bed4-4ee1-8735-03e2bfd67db6)](https://github.com/Anashost/HA-Animated-cards)

[![Batch 3 — animated card designs](https://github.com/user-attachments/assets/8acdc17a-abc0-41dc-80c3-929c5b1fa2b6)](https://github.com/Anashost/HA-Animated-cards)

[![Batch 4 — animated card designs](https://github.com/user-attachments/assets/a7c3671a-11bd-4725-9765-536dbc835220)](https://github.com/Anashost/HA-Animated-cards)

[![Batch 5 — animated card designs](https://github.com/user-attachments/assets/0a432feb-ed58-4dae-b88d-995f30331e04)](https://github.com/Anashost/HA-Animated-cards)

## Licence

The upstream library is licensed **[CC BY-NC-SA 4.0](LICENSE)**; this derivative work is
released under the **same licence**, with attribution to Anashost as required. In short:
free for personal, non-commercial Home Assistant use; share adaptations under the same
terms; keep the credit.

## Requirements

- [Mushroom](https://github.com/piitaya/lovelace-mushroom) (HACS)
- [card-mod](https://github.com/thomasloven/lovelace-card-mod) (HACS) — **load-bearing**:
  without it the cards degrade to plain Mushroom cards (no animations)

## Install

HACS → ⋮ → *Custom repositories* → add this repo URL with category **Dashboard** →
install **Animated Cards**. HACS registers the resource automatically.

## Use

Edit any dashboard → *Add card* → search **Animated**. Each device type is its own card
(`custom:anim-fan-card`, `custom:anim-washer-card`, …) with a visual editor; there is also
a generic `custom:animated-card` with a *kind* dropdown that can render every design.
Some upstream designs ship as a `variant` option on their kind rather than a separate card.

Cards animate only while the entity is active and dim when idle. Switch and fan cards also
show live wattage beside the state ("On · 489 W"), auto-discovering any `device_class: power`
entity on the same device — `power_entity` overrides the lookup, `hide_power` opts out. The
kinds whose whole premise is a dumb appliance on a metered plug (`washer-plug`, `dishwasher`,
`dryer`, `washer-dryer-combo`, `fridge`, `charger`) take a `power_entity` of their own, since
there the draw is the only signal available.

## Card index

<!-- CARD_INDEX -->
| Card | Type | Extra options | What it does |
|---|---|---|---|
| **Advanced Dishwasher** | `custom:anim-advanced-dishwasher-card` | — | A whole AEG/Electrolux dishwasher on one white fascia — glass door + spray arm, LED display, programme dial with pop-over, Start/Pause/Resume/Stop, option toggles and settings |
| **Advanced Washing Machine (large)** | `custom:anim-advanced-washer-card` | — | The whole machine on one white fascia — porthole, LED display, programme dial, Start/Pause/Stop, every setting, toggle and usage stat |
| **Advanced Washing Machine (medium)** | `custom:anim-advanced-washer-medium-card` | — | Porthole hero + LED display, programme dial and Start/Pause/Stop, temperature & spin, and the everyday toggles |
| **Advanced Washing Machine (small)** | `custom:anim-advanced-washer-small-card` | — | The animated porthole hero alone — beside the big LED screen (time, state + door glyphs, progress, EEEE faults) |
| **Animated 3D Printer** | `custom:anim-printer-3d-card` | `icon` `color` `glow` `speed` `variant` `max_value` `active` | Nozzle rasters layer by layer while printing — optional progress beam and DONE badge |
| **Animated Air Purifier** | `custom:anim-air-purifier-card` | `icon` `color` `glow` `speed` `active` | Motor hum breath with clean-air rings rippling out while it runs |
| **Animated Air Quality** | `custom:anim-air-quality-card` | `variant` `icon` `graph` `graph_hours` | AQI tile banded good→hazardous, glow + halo escalating with severity; optional 24 h sparkline |
| **Animated Alarm** | `custom:anim-alarm-card` | `variant` `icon` `color` `glow` `speed` `active` `arm_states` | Alarm panel shield — calm green disarmed, red radar + sonar armed, orange arming, strobing triggered |
| **Animated Alarmo Keypad** | `custom:anim-alarmo-card` | `keep_keypad_visible` `disarmed_glow` `armed_glow` `triggered_glow` `pending_glow` | Alarmo keypad card with a state-coloured inner glow — breathing disarmed, pulsing armed, strobing triggered |
| **Animated Badge / Button** | `custom:anim-badge-card` | `icon` `content` `icon_color` `active_states` `below` `above` `animation` `always_animate` `speed` `active_bg` `active_fg` `active_border` `active_opacity` `inactive_bg` `inactive_fg` `inactive_border` `inactive_opacity` `overlay` `position` `offset_y` `offset_x` `icon_size` `text_size` `radius` `border_width` | Configurable chip pill — colours, icon and animation flip on a state match or threshold |
| **Animated Barometer** | `custom:anim-pressure-card` | `icon` `graph` `graph_hours` | Barometric-pressure tile — storm blue through settled green to a high-pressure shimmer |
| **Animated Battery** | `custom:anim-battery-card` | `variant` `charging_entity` `low` `medium` `target_soc` `icon` `color_low` `color_medium` `color_high` `color_charging` | Battery level — liquid disc, card-wide fill or striped bar; charging is its own colour |
| **Animated Charger** | `custom:anim-charger-card` | `icon` `color` `glow` `speed` `power_entity` `active` | Plug that swells, halos and throws electric arcs while charging — pulse rate tracks the draw |
| **Animated Climate Tile** | `custom:anim-climate-card` | — | Compact zone tile — icon coloured/glowing by room temp, tap toggles the zone |
| **Animated CO₂** | `custom:anim-co2-card` | `icon` `graph` `graph_hours` | ppm tile — fresh green breath through to a red shimmer once the room needs airing |
| **Animated Contact** | `custom:anim-contact-card` | `icon` `open_icon` `color` `glow` | Door/window sensor — calm when shut, pulsing red alert while open |
| **Animated Curtain** | `custom:anim-curtain-card` | `icon` `fabric` `fabric_shadow` `pane_open` `pane_shut` `window_width` `height` | Draws the window — fabric panels slide with position, glass fades day-blue to night-dark |
| **Animated Dishwasher** | `custom:anim-dishwasher-card` | `variant` `source` `icon` `power_entity` `switch_entity` `running_entity` `remaining_entity` `door_entity` `percent_entity` `max_minutes` `running_states` `drying_states` `done_states` `active_above` `heat_above` `glow` | Wash tub swirls and fills — bubbles washing, steam drying, sparkle when the cycle ends |
| **Animated Doorbell** | `custom:anim-doorbell-card` | `icon` `color` `glow` `speed` `active` | Bell jolts and throws expanding rings while the button is pressed; silent and still otherwise |
| **Animated Fan** | `custom:anim-fan-card` | `icon` `color` `glow` `speed` `active` `power_entity` `hide_power` | Blades spin while on, with the plug's live wattage beside the state |
| **Animated Fireplace** | `custom:anim-fireplace-card` | `icon` `color` `glow` `tip_glow` `speed` `active` | Flickering flame with a shifting halo and a slow ember bloom while it's lit |
| **Animated Fridge / Freezer** | `custom:anim-fridge-card` | `variant` `icon` `active` `power_entity` `power_above` `door_entity` `door2_entity` `fridge_temp_entity` `freezer_temp_entity` `max_fridge_temp` `max_freezer_temp` `super_above` `defrost_above` `cooling_states` `super_states` `defrost_states` | Snow falls and the compressor rumbles while it cools; loud red alert when a door is left open |
| **Animated Fuel Tank** | `custom:anim-fuel-tank-card` | `icon` `color` `low_color` `low_at` `height` | Tank that fills with amber fuel, twin counter-scrolling surfaces, red below the low mark |
| **Animated Games Console** | `custom:anim-console-card` | `icon` `color` `glow` `speed` `active` | Pad rumbles inside a cycling RGB LED bloom while the console is on |
| **Animated Gaming Rig** | `custom:anim-gaming-rig-card` | `icon` `color` `glow` `glow_b` `idle_glow` `speed` `active` | PC case with a spinning RGB fan and neon breathe under load; faint glow when idle |
| **Animated Garage Door** | `custom:anim-garage-door-card` | `variant` `icon` `glow` `speed` `active` `closed_glow` `open_glow` `moving_glow` | Cover card — ring pulse while open, or a green/red/orange closed-open-moving state machine |
| **Animated Heater** | `custom:anim-heater-card` | `flame_color` | Climate card with flame glow + ember pulse while the zone is heating |
| **Animated Home Server** | `custom:anim-server-card` | `icon` `color` `glow` `speed` `active` | Rack box with flickering disk LEDs and a throbbing network glow while it's up |
| **Animated Humidity** | `custom:anim-humidity-card` | — | Bobbing droplet, colour-banded — amber parched, slate healthy, blue saturated |
| **Animated Humidity (graph)** | `custom:anim-humidity-graph-card` | `graph` `graph_hours` | Three-band droplet with glow + halo layers and a 24 h sparkline bled into the corner |
| **Animated Illuminance** | `custom:anim-lux-card` | `icon` `graph` `graph_hours` | Light-level tile ramping night-blue → dusk purple → warm → a near-white sun shimmer |
| **Animated Kettle** | `custom:anim-kettle-card` | `icon` `color` `glow` `speed` `active` | Heat glow swells and steam drifts off the spout while it boils |
| **Animated Lamp** | `custom:anim-lamp-card` | `active` `controls_always_open` | Mushroom light card (brightness/colour controls) pulsing in the light's own colour |
| **Animated LED Strip** | `custom:anim-led-strip-card` | `icon` `color` `active` | Vertical tile glowing in the strip's own colour while on |
| **Animated Lock** | `custom:anim-lock-card` | `icon` `open_icon` `locked_glow` `unlocked_glow` `moving_glow` | Door lock — quiet green halo when locked, amber tilt when open, fast swing mid-turn, red shudder when jammed |
| **Animated Mailbox** | `custom:anim-mailbox-card` | `icon` `active` `mail_color` `empty_color` `mail_text` `empty_text` `clear_chip` | Envelope drops into the icon and the flag waves while post is waiting; glowing status bar |
| **Animated Media Player** | `custom:anim-media-card` | `icon` | Media-player card with an RGB screen-glow pulse while playing |
| **Animated Motion Radar** | `custom:anim-motion-card` | `icon` | Radar HUD — cyan SCANNING sweep while idle, red DETECTED sonar on motion |
| **Animated Nintendo Switch** | `custom:anim-nintendo-switch-card` | `icon` `color` `glow` `glow_b` `speed` `active` | Red/blue Joy-Con blooms breathing either side of the icon, with a haptic rumble |
| **Animated PC** | `custom:anim-pc-card` | `icon` `color` `led_color` `speed` `active` | Tower case with an RGB edge glow and a blinking power LED while it runs |
| **Animated Pixel Clock** | `custom:anim-awtrix-clock-card` | `icon` `color` `speed` `active` | LED-matrix look — pixel grid, scrolling rainbow marquee and scanline glare (Awtrix/Ulanzi) |
| **Animated PM2.5** | `custom:anim-pm25-card` | `icon` `b1` `b2` `b3` `b4` `b5` `graph` `graph_hours` | Particulate tile (µg/m³) banded good→extremely poor, with tunable per-standard cut-offs |
| **Animated Pollen** | `custom:anim-pollen-card` | `variant` `icon` `count_entity` `high_states` `moderate_states` | Dark glass tile with a rotating two-colour aura — calm green, then amber, then red |
| **Animated Printer** | `custom:anim-printer-card` | `icon` `color` `led_color` `speed` `active` | Shakes and sweeps a scanner beam while printing; colour but still when idle |
| **Animated Printer Ink** | `custom:anim-printer-ink-card` | `variant` `icon` `ink_c` `ink_m` `ink_y` `ink_k` `low_threshold` `printing_states` `scan` `ink_theme` | Ink levels drawn as CMYK bars (or a single black tank) with a scanning beam while printing |
| **Animated Projector** | `custom:anim-projector-card` | `icon` `color` `glow` `speed` `active` | Lamp hums, a beam fans out of the lens and the focus glow breathes while it's running |
| **Animated RGB Light** | `custom:anim-rgb-card` | `icon` `color` `glow` `speed` `active` | Icon disc cycles the hue wheel while the RGB light/strip is on |
| **Animated Roller Shade** | `custom:anim-roller-shade-card` | `icon` `slat` `slat_shadow` `pane_open` `pane_shut` `window_width` `height` | Draws the window — a slatted blind rolls down with position, glass fades day→night |
| **Animated Router** | `custom:anim-router-card` | `icon` `color` `glow` `speed` `active` | Wifi rings radiate out while the router is up; dark and still when it isn't |
| **Animated Solar Panel** | `custom:anim-solar-card` | `icon` `voltage_entity` `current_entity` `max_watts` `milliamps` `message` `theme` `color` `height` | Panel with a scanning sweep, load-scaled glow, a power bar and W / A / V badges |
| **Animated Speaker** | `custom:anim-speaker-card` | `icon` `glow` `off_glow` `speed` | Media player whose icon thumps, shows EQ bars and a volume-scaled bass ring while playing |
| **Animated Sprinkler** | `custom:anim-sprinkler-card` | `icon` `color` `glow` `speed` `variant` `active` | Head bobs and throws arcing droplets with a mist haze while the valve is open |
| **Animated Switch / Plug** | `custom:anim-switch-card` | `icon` `color` `glow` `active` `power_entity` `hide_power` | Steady glow pulse while on, with the plug's live wattage beside the state |
| **Animated Temperature** | `custom:anim-temp-card` | — | Breathing thermometer on a calm comfort ramp (20–23 °C reads near-white) |
| **Animated Temperature (graph)** | `custom:anim-temp-graph-card` | `variant` `graph` `graph_hours` | Banded thermometer with glow + halo layers and a 24 h sparkline bled into the corner |
| **Animated Tumble Dryer** | `custom:anim-dryer-card` | `source` `icon` `power_entity` `switch_entity` `running_entity` `remaining_entity` `door_entity` `percent_entity` `max_minutes` `drying_states` `cooling_states` `done_states` `active_above` `heat_above` | Drum fills and turns — orange steam on heat, blue breeze on cool-down, sparkle when done |
| **Animated Vacuum** | `custom:anim-vacuum-card` | `icon` `color` `active` | Robot wanders a cleaning path while the vacuum runs |
| **Animated Vibration** | `custom:anim-vibration-card` | `icon` `color` `glow` `speed` `active` | Icon judders with a shockwave ring while something is vibrating; quiet and dim when still |
| **Animated VOC** | `custom:anim-voc-card` | `icon` `graph` `graph_hours` | Volatile-organic-compound index tile — clean green breath through to a red shimmer |
| **Animated Washer-Dryer Combo** | `custom:anim-washer-dryer-combo-card` | `source` `icon` `power_entity` `switch_entity` `running_entity` `drying_entity` `remaining_entity` `door_entity` `percent_entity` `max_minutes` `washing_states` `spinning_states` `drying_states` `cooling_states` `done_states` `active_above` `spin_above` | One drum, five phases — wash bubbles, spin rotation, dry steam, cool breeze, done sparkle |
| **Animated Washing Machine** | `custom:anim-washer-card` | `remaining_entity` `total_entity` `temp_entity` `spin_entity` `door_entity` | Hero card — spinning drum, bubbles and a programme progress bar (machine_status sensor) |
| **Animated Washing Machine (smart plug)** | `custom:anim-washer-plug-card` | `icon` `power_entity` `switch_entity` `running_entity` `door_entity` `active_above` `spin_above` `heat_above` | Dumb washer read off its plug — wash bubbles, spin rotation and a heater band, from watts alone |
| **Animated Water Boiler** | `custom:anim-boiler-card` | `variant` `icon` | Tank that fills with hot water — bar width tracks temperature, blue → orange → red |
| **Animated Water Leak** | `custom:anim-water-leak-card` | `variant` `icon` `water` `level` `wet_text` `dry_text` | Leak sensor that floods — the card (or the icon) fills with wobbling water when wet |
| **Animated Water Pump** | `custom:anim-water-pump-card` | `icon` `color` `glow` `speed` `active` | Impeller spins, housing buzzes and pressure rings flow out while the pump runs |
| **Animated Water Tank** | `custom:anim-water-tank-card` | `icon` `color` `low_color` `low_at` `height` | Tank that fills with blue water, twin counter-scrolling surfaces, red below the low mark |
| **Animated Weather** | `custom:anim-weather-card` | `icon` `temp_entity` `condition_entity` `feels_like_entity` `humidity_entity` `wind_entity` `sun_entity` `trend_entity` | Living sky — sun/moon, drifting cloud, rain, snow, fog and lightning by condition |

Plus `custom:animated-card` — the generic card with a *kind* dropdown covering all 67 designs above.

<details><summary><b>Advanced Dishwasher</b> — notes</summary>

Built for AEG/Electrolux dishwashers on the `electrolux_status` integration, which
exposes sibling entities on one id prefix (`sensor.<base>_connectivitystate`,
`sensor.<base>_cyclephase`, `select.<base>_userselections_programuid`,
`button.<base>_executecommand[_N]`, …). Pick any of the machine's sensors; everything else is
derived from the prefix. The fascia carries a glass door window with a spinning spray arm, a
seven-segment LED (time to end; the selected programme's duration dimmed while idle; a red
blinking "EEEE" when offline or faulted), a programme dial + water-hardness and delay-start
dials that each open a Bubble-Card bottom pop-over, embossed Start/Pause/Resume/Stop command
buttons (soft-disabled when the appliance's remote control isn't Enabled), rinse-aid and
end-of-cycle-sound segmented bars, and the option toggles (glass care, sanitize, extra power,
extra silent, auto door opener). NB `sensor.<base>_appliancestate` ships registry-disabled by
the integration — the card composes its state from connectivity + cycle phase, and picks the
richer states (paused / delayed start / end of cycle) up automatically if you enable it.

</details>

<details><summary><b>Advanced Washing Machine (large)</b> — notes</summary>

Built for Tuya washing machines / washer-dryers whose integration exposes
sibling entities on one id prefix (`sensor.<base>_machine_status`, `select.<base>_actions`,
`select.<base>_temperature`, `switch.<base>_prewash`, …). Pick the machine-status sensor;
everything else is derived. The card is drawn as the machine's own white fascia: a porthole
with a tumbling tri-spoke drum, a seven-segment LED showing time remaining (blinking when
paused, a red "EEEE" when the machine faults or goes offline), a rotary programme dial that
turns to the selected programme, and embossed Start/Pause/Stop buttons with live LED dots —
with the machine-state + door indicators tucked inside the LED bezel, a progress track along
its bottom edge, and a slim conditional row that surfaces the occasional statuses (delayed
start, load, low detergent / softener) only when they apply.

The large size shows everything and is happy as the only card on a dashboard; medium keeps
the dial/button fascia, temperature/spin and the everyday toggles; small is the hero alone.

</details>

<details><summary><b>Advanced Washing Machine (medium)</b> — notes</summary>

Built for Tuya washing machines / washer-dryers whose integration exposes
sibling entities on one id prefix (`sensor.<base>_machine_status`, `select.<base>_actions`,
`select.<base>_temperature`, `switch.<base>_prewash`, …). Pick the machine-status sensor;
everything else is derived. The card is drawn as the machine's own white fascia: a porthole
with a tumbling tri-spoke drum, a seven-segment LED showing time remaining (blinking when
paused, a red "EEEE" when the machine faults or goes offline), a rotary programme dial that
turns to the selected programme, and embossed Start/Pause/Stop buttons with live LED dots —
with the machine-state + door indicators tucked inside the LED bezel, a progress track along
its bottom edge, and a slim conditional row that surfaces the occasional statuses (delayed
start, load, low detergent / softener) only when they apply.

</details>

<details><summary><b>Advanced Washing Machine (small)</b> — notes</summary>

Built for Tuya washing machines / washer-dryers whose integration exposes
sibling entities on one id prefix (`sensor.<base>_machine_status`, `select.<base>_actions`,
`select.<base>_temperature`, `switch.<base>_prewash`, …). Pick the machine-status sensor;
everything else is derived. The card is drawn as the machine's own white fascia: a porthole
with a tumbling tri-spoke drum, a seven-segment LED showing time remaining (blinking when
paused, a red "EEEE" when the machine faults or goes offline), a rotary programme dial that
turns to the selected programme, and embossed Start/Pause/Stop buttons with live LED dots —
with the machine-state + door indicators tucked inside the LED bezel, a progress track along
its bottom edge, and a slim conditional row that surfaces the occasional statuses (delayed
start, load, low detergent / softener) only when they apply.

</details>

<details><summary><b>Animated 3D Printer</b> — notes</summary>

The `progress` variant expects a numeric percentage sensor (OctoPrint/Bambu/Moonraker all expose one). Anything at or above `max_value` shows the DONE badge; a missing or `unavailable` sensor goes grey with no bar rather than reporting 0 %.

</details>

<details><summary><b>Animated Air Quality</b> — notes</summary>

The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Alarmo Keypad</b> — notes</summary>

Needs the **Alarmo** integration plus its `custom:alarmo-card` frontend card, and **card-mod ≥ 3.4.6** — earlier card-mod cannot style non-Mushroom custom cards, and the card silently renders unstyled. `card_mod.style` here is a plain string (not the per-element map the Mushroom kinds use) for the same reason. If you only have a stock `alarm_control_panel`, use the `alarm` kind instead.

</details>

<details><summary><b>Animated Badge / Button</b> — notes</summary>

Standalone it's a chip-sized button. Turn on `overlay` and drop it AFTER another card inside a `custom:stack-in-card` / `custom:vertical-stack-in-card` to get upstream's floating corner badge (that's all badge_maker's example cards #8–#12 do — a normal card plus one or more of these). An unavailable entity always renders inactive and extra-dim, so a dead sensor never shows a confident badge.

</details>

<details><summary><b>Animated Barometer</b> — notes</summary>

Bands are in **mbar / hPa** (990 / 1005 / 1020 / 1035). A sensor reporting inHg or kPa will sit in the bottom band — convert it with a template sensor first. The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Battery</b> — notes</summary>

Works with a numeric battery-% sensor OR one whose state is the text low/medium/high (mapped to 20/50/100 as upstream does) — no separate card for the banded case. An unavailable/unknown sensor is drawn empty, grey and still, never as a plausible 0 %.

</details>

<details><summary><b>Animated CO₂</b> — notes</summary>

The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Dishwasher</b> — notes</summary>

Power mode reads the plug's power sensor directly — no helper entity is required. For a
debounced "running" latch that survives a cycle's low-power soak phases (and to get a real
elapsed-time readout, taken from the latch's `last_changed`), add the upstream template
binary_sensor and pass it as `running_entity`:

```yaml
template:
  - binary_sensor:
      - name: "Dishwasher Active delay"
        unique_id: dishwasher_active_delay
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"
        device_class: running
        icon: mdi:dishwasher
```

In status mode any entity works as long as its states are listed in the running/drying/done
options — an appliance integration's programme sensor, or your own template sensor.

</details>

<details><summary><b>Animated Doorbell</b> — notes</summary>

Bind the doorbell's *ding* sensor (e.g. Ring's `binary_sensor.<door>_ding`), not the camera or the chime switch — the card's secondary line reads "x ago" from that entity's last state change.

</details>

<details><summary><b>Animated Fridge / Freezer</b> — notes</summary>

No helper entities are needed. `snowfall` and `frosted` need nothing but the plug switch (or
a power sensor + threshold, which is the honest signal on a plug whose switch state lies).

`status` drives the cooling → super-cool → defrost ladder from `power_entity` when you set one,
falling back to matching the card entity's own state against the three state lists — so it
covers both upstream fridge cards (the smart one with a status sensor, and the dumb one on a
metering plug) without a second kind.

Compartment temperatures and the door contacts are optional; each only draws when supplied.
Upstream drew the temperatures as a second badge — here they share the secondary line, which
survives a narrow card better.

</details>

<details><summary><b>Animated Fuel Tank</b> — notes</summary>

Bind a level sensor that reports **percent full** (0–100). A depth or litre sensor needs a template sensor in front of it, or the tank will read empty.

</details>

<details><summary><b>Animated Games Console</b> — notes</summary>

Loud by design (fast rumble + bright bloom); keep one per view. A console left in standby will keep rumbling unless its integration reports standby as a distinct state — set `active` to the one that means playing.

</details>

<details><summary><b>Animated Gaming Rig</b> — notes</summary>

Two states: `active` (default `on`) reads as gaming — fan + neon — and anything else as idle. Upstream drove a third powered-but-idle level from a number-mode block; that needed a watts-as-state override, which this pack deliberately doesn't have.

</details>

<details><summary><b>Animated Garage Door</b> — notes</summary>

The `status` variant reads the cover's own states (`closed` / `open` / `opening` / `closing`); anything else — including `unavailable` — renders dead grey and still rather than faking a closed door. The `pulse` variant only needs an open state, so it also suits covers that report position only.

</details>

<details><summary><b>Animated Humidity (graph)</b> — notes</summary>

The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Illuminance</b> — notes</summary>

The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Kettle</b> — notes</summary>

Redrawn from upstream: the original card animates a CRT `tv-glitch` on the kettle, which reads as a fault rather than a boil. This kind uses a heat glow + rising steam instead. It keys off the plug's own on/off state.

</details>

<details><summary><b>Animated Lock</b> — notes</summary>

Tap opens more-info rather than toggling — an accidental tap should never unlock a door. Use a hold/tap action on your own dashboard if you want one-tap locking.

</details>

<details><summary><b>Animated Mailbox</b> — notes</summary>

Built for a helper you set from an automation (`input_boolean.mail_arrived`) or a mailbox contact sensor. The optional clear chip calls `input_boolean.turn_off`, so it is only offered when the entity is an `input_boolean`.

</details>

<details><summary><b>Animated PM2.5</b> — notes</summary>

Bands default to the **European AQI** 1-hour PM2.5 scale. Override them for WHO 2021 (5 / 15 / 25 / 35 / 50) or a US 24-hour scale (9 / 35 / 55 / 125 / 225). The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Pollen</b> — notes</summary>

Bind the **level** sensor (a text state like `low`/`moderate`/`high`) as the entity, and optionally its numeric sibling as `count_entity` for the badge — that's how the Kleenex Pollen Radar integration this came from splits them.

</details>

<details><summary><b>Animated Printer</b> — notes</summary>

Two-level card: `active` decides powered vs dead (colour vs monochrome), while shake/beam/LED only run when it's actually printing. That second level needs a status entity that distinguishes printing from idle; against a bare on/off switch a printer that is merely on will animate continuously.

</details>

<details><summary><b>Animated Printer Ink</b> — notes</summary>

Bind the printer's **status** sensor as the entity and its per-cartridge percentage sensors as ink_c/m/y/k. Missing cartridge sensors read 0 %, so leave them blank only on the `black` variant. Levels are drawn as gradient colour stops — no keyframes involved — so a level change glides via `transition` rather than restarting an animation.

</details>

<details><summary><b>Animated Solar Panel</b> — notes</summary>

Bind the **power** sensor as the entity; voltage and current sensors are optional and their badges simply read 0 without them. The bar is scaled against `max_watts` and clamped at 100 %, so a spiking inverter can't blow the layout out.

</details>

<details><summary><b>Animated Speaker</b> — notes</summary>

The bass ring's swell scales with the player's `volume_level` attribute; players that don't report volume simply get the base swell.

</details>

<details><summary><b>Animated Temperature (graph)</b> — notes</summary>

The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Tumble Dryer</b> — notes</summary>

Power mode reads the plug's power sensor directly — no helper entity is required. For a
debounced "running" latch (and a real elapsed-time readout, taken from the latch's
`last_changed`), add the upstream template binary_sensor and pass it as `running_entity`:

```yaml
template:
  - binary_sensor:
      - name: "Dryer Active delay"
        unique_id: dryer_active_delay
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"
        device_class: running
        icon: mdi:tumble-dryer
```

In power mode the Drying/Tumbling split is inferred from the draw: a heating element pulls
hundreds of watts, a bare drum motor does not. Watch a real cycle before trusting the default.

</details>

<details><summary><b>Animated Vibration</b> — notes</summary>

Alarm-class motion: bind it to something genuinely exceptional. On a `binary_sensor` entity the tap action becomes more-info rather than toggle.

</details>

<details><summary><b>Animated VOC</b> — notes</summary>

Expects a VOC **index** sensor on the usual 0–500 consumer scale (Sensirion SGP4x, BME680 and friends). A raw ppb sensor will sit permanently in the top band. The sparkline needs two more HACS frontend cards: **mini-graph-card** and **vertical-stack-in-card**. Turn the graph off and the kind renders as a plain Mushroom + card-mod card.

</details>

<details><summary><b>Animated Washer-Dryer Combo</b> — notes</summary>

Power mode reads the plug's power sensor directly. A combo machine can't be told apart from
its draw alone — a wash heater and a dryer element both pull hundreds of watts — so upstream
uses two template binary_sensors: a debounced "running" latch and a sustained-high-power
"drying" detector. Pass them as `running_entity` and `drying_entity`; without the second one
the card never claims "Drying" (it stays on the wash/spin split, which is the safe default).

```yaml
template:
  - binary_sensor:
      - name: "Combo Machine Active Delay"
        unique_id: combo_machine_active_delay
        device_class: running
        icon: mdi:washing-machine
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"        # wait 5 min before calling it idle

      - name: "Combo Machine Drying Detector"
        unique_id: combo_machine_drying_detector
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 800 }}"
        delay_on: "00:15:00"         # sustained high draw = drying, not a wash heater cycling
        delay_off: "00:05:00"        # stay 'drying' through the cool-down
```

</details>

<details><summary><b>Animated Washing Machine (smart plug)</b> — notes</summary>

Point `entity` (or `power_entity`) at the plug's power sensor and the card works with no
helpers: running = draw above `active_above`, then the spin and heater bands split the phases.

A raw threshold flaps during a cycle's low-power soak phases, so upstream debounces it with a
template binary_sensor. Pass it as `running_entity` and the card also gets a real elapsed-time
readout (from the latch's `last_changed`):

```yaml
template:
  - binary_sensor:
      - name: "Washing Machine Active delay"
        unique_id: washing_machine_active_delay
        state: "{{ states('sensor.YOUR_PLUG_power') | float(0) > 5 }}"
        delay_off: "00:05:00"
        device_class: running
        icon: mdi:washing-machine
```

Thresholds are machine-specific — watch one real cycle in the history graph before trusting
the defaults. For a machine that reports a proper `machine_status` enum, use the `washer`
kind instead.

</details>

<details><summary><b>Animated Water Leak</b> — notes</summary>

Binary — `on` means wet. The fill level is cosmetic (a leak sensor has no depth); pick whatever reads best on your dashboard.

</details>

<details><summary><b>Animated Water Pump</b> — notes</summary>

The motor buzz is a 0.12s alternate shake (upstream's 0.1s reads as a strobe on a big display). A pump that is powered but not running still animates — this card reads the entity's state, nothing else.

</details>

<details><summary><b>Animated Water Tank</b> — notes</summary>

Bind a level sensor that reports **percent full** (0–100). A depth or litre sensor needs a template sensor in front of it, or the tank will read empty.

</details>

<details><summary><b>Animated Weather</b> — notes</summary>

Rebuilt on Mushroom + card-mod (upstream shipped it as a `custom:button-card`), so no extra HACS card is required. The trend strip needs upstream's companion template sensor (climate #2), which stores 24 hourly readings in a `history` attribute:

```yaml
template:
  - trigger:
      - platform: time_pattern
        minutes: "/1"
      - platform: homeassistant
        event: start
    condition: >
      {{ (now().timestamp() - state_attr('sensor.temptrend_24h', 'last_update') | default(0, true) | float(0)) >= 3600 }}
    sensor:
      - name: "Temptrend 24h"
        unique_id: temptrend_24h
        state: "{{ states('sensor.your_temperature') | float(0) | round(1) }}"
        attributes:
          last_update: "{{ now().timestamp() }}"
          history: >
            {% set current = states('sensor.your_temperature') | float(0) | round(1) %}
            {% set past = state_attr('sensor.temptrend_24h', 'history') | default([current] * 24, true) %}
            {{ (past + [current])[-24:] }}
```

Leave `trend_entity` empty and the strip is simply omitted. Before the first template render the card shows a neutral slate sky with no effects — an absent forecast, never a wrong one.

</details>



## Development

```
src/00-core.js       registry + shared helpers (the kind contract lives here)
src/01-factories.js  hand-tuned factory functions (the original 14 ports)
src/10-kinds-base.js the 14 battle-tested kinds
src/kinds/*.js       one kind per file, converted from the upstream corpus
src/99-shell.js      custom elements, visual editor, picker registration
```

`node build.mjs` concatenates `src/` into `dist/animated-cards.js` (single ES module, no
dependencies, no build toolchain). `DESIGN.md` documents the conversion rules — the
instant-animation contract, the two Mushroom icon structures, and the option conventions.
