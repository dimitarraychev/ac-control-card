# AC Control Card

A modern, highly customizable Lovelace card for `climate` entities featuring a glass surface tinted by HVAC mode with an animated inner glow, a status header, an optional runtime chip, optional −/+ temperature control, and a sliding mode selector.

---

## Features & Latest Updates (v0.3.0-beta)

* **Unified Card Design:** Merged features from the separate temperature card directly into this main card, supporting independent section visibility and custom layout ordering.
* **Independent Section Toggles:** 
  * `show_header` (default `true`): Toggles the header containing the icon, name, status, and runtime chip.
  * `show_modes` (default `true`): Toggles the sliding mode selector bar.
  * `show_temperature_control` (default `false`): Toggles the −/+ temperature adjustment row.
* **Flexible Layout Ordering (`layout`):** Customize the vertical order of sections (e.g., Header, Temperature, Modes) using six supported layout permutations (`header_temp_modes`, `temp_modes_header`, etc.).
* **Glow & Color Customization:**
  * **Glow Animation (`animation`, default `true`):** Toggle the active pulsing glow on or off. Disabling it retains a soft static tint.
  * **Mode Coloring (`coloring`, default `true`):** Toggle off to make the card neutral grey across all states, bypassing HVAC tints and color overrides.
  * **Accent Color Override (`color`):** Accepts hex codes (e.g., `#2196f3`) or comma-separated RGB values (e.g., `33,150,243`).
* **Compact / Solo-Temp Layout:** When the header is hidden and temperature control is active, the card adopts a sleek compact view with the caption underneath, and tapping the temperature opens the `more-info` dialog.
* **Dual Card Styles (`card_style`):**
  * **`mushroom`**: Features an oversized corner icon in a 65px circle, tinted borders, and an inner glow animation.
  * **`bubble`**: Features a clean 24px icon in a 40px circle, no borders or glow, a 32px card radius, and a pill-shaped mode bar.
* **Dedicated Custom Editor:** Integrated `ac-control-card-editor` with organized sections and collapsible advanced settings, avoiding writing unnecessary default values to your raw YAML.

---

## Install (HACS)
1. Put the card files in the root of your GitHub repository.
2. HACS → ⋮ → **Custom repositories** → add your repo with category **Dashboard**.
3. Download and hard-refresh your browser.

---

## Usage Example
```yaml
type: custom:ac-control-card
entity: climate.living_room_air_conditioner
name: Air Conditioner
card_style: mushroom
show_header: true
show_modes: true
show_temperature_control: true
layout: header_temp_modes
animation: true
coloring: true
duration_entity: sensor.living_room_ac_runtime_minutes
color: "#2196f3"
hvac_modes: 
  - heat
  - cool
  - off
tap_action:
  action: navigate
  navigation_path: /dashboard-ac
```

## Configuration Options

| Option | Default | Description |
|---|---|---|
| `entity` | **required** | A `climate` entity |
| `name` | friendly name | Card title |
| `icon` | `mdi:air-conditioner` | Header icon |
| `card_style` | `mushroom` | Card styling theme (`mushroom` or `bubble`) |
| `show_header` | `true` | Show header (icon, name, status line, runtime badge) |
| `show_modes` | `true` | Show mode buttons selection bar |
| `show_temperature_control` | `false` | Add −/+ temperature control row (debounced) |
| `layout` | `temp_modes` | Order of temperature and modes when both are active (`temp_modes` or `modes_temp`) |
| `animation` | `true` | Enable active pulsing inner glow |
| `coloring` | `true` | Enable mode-based colors and accent color overrides |
| `hvac_modes` | `heat, cool, off` | Mode buttons in order (filtered to entity support) |
| `duration_entity` | none | Sensor or `input_number` tracking runtime in minutes (`h`/`s` units automatically converted) |
| `show_current` | `false` | Include current room temperature (e.g., `"Now 24.5°"`) in status lines |
| `show_labels` | `false` | Show text labels underneath mode selector icons |
| `step` | entity step or `1` | Temperature adjustment step value |
| `color` | none | Accent color override supporting hex (`#2196f3`) or RGB (`33,150,243`) |
| `tap_action` | `more-info` | Header tap behavior (`more-info`, `navigate`, `toggle`, `perform-action`, `url`, `none`) |

*Note: The inner glow animates only while the unit is actively heating/cooling (or on, if the entity lacks an explicit `hvac_action`).*
