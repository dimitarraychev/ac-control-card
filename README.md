# AC Control Card

A modern Lovelace card for `climate` entities: glass surface tinted by HVAC mode with an animated inner glow,
status header, optional runtime chip, optional −/+ temperature control and a sliding mode selector.

## Install (HACS)
1. Put these files in the root of a GitHub repo named `ac-control-card`.
2. HACS → ⋮ → **Custom repositories** → add the repo, category **Dashboard**.
3. Download, then hard-refresh the browser.

## Usage
```yaml
type: custom:ac-control-card
entity: climate.living_room_air_conditioner
name: Air Conditioner
duration_entity: sensor.living_room_ac_runtime_minutes   # optional
hvac_modes: [heat, cool, "off"]                          # optional, order = button order
show_temperature_control: true                           # optional
tap_action:
  action: navigate
  navigation_path: /dashboard-ac
```

| Option | Default | Description |
|---|---|---|
| `entity` | required | A `climate` entity |
| `name` | friendly name | Card title |
| `icon` | `mdi:air-conditioner` | Header icon |
| `hvac_modes` | `heat, cool, off` | Mode buttons, filtered to what the entity supports |
| `duration_entity` | none | Sensor/input_number with runtime (minutes; `h`/`s` units converted) |
| `show_temperature_control` | `false` | Adds a −/+ row (debounced) |
| `show_current` | `false` | Adds "Now 24.5°" to the status line |
| `show_labels` | `false` | Text labels under mode icons |
| `step` | entity step or `1` | Temperature step |
| `tap_action` | `more-info` | Header tap: more-info, navigate, toggle, perform-action, url, none |

The glow animates only while the unit is actively heating/cooling (or on, if the entity has no `hvac_action`).
