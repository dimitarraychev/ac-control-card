/*
 * AC Control Card
 * Header, temperature stepper and mode selector in one card.
 * Each section can be toggled; styling can be Mushroom or Bubble.
 */
const TAG = "ac-control-card";
const EDITOR_TAG = "ac-control-card-editor";
const CARD_VERSION = "0.4.1-beta";

const MODE_META = {
  heat: { icon: "mdi:fire", label: "Heat", rgb: "255,152,0" },
  cool: { icon: "mdi:snowflake", label: "Cool", rgb: "33,150,243" },
  dry: { icon: "mdi:water-percent", label: "Dry", rgb: "255,193,7" },
  fan_only: { icon: "mdi:fan", label: "Fan", rgb: "0,150,136" },
  auto: { icon: "mdi:thermostat-auto", label: "Auto", rgb: "156,39,176" },
  heat_cool: { icon: "mdi:sun-snowflake-variant", label: "Heat/Cool", rgb: "156,39,176" },
  off: { icon: "mdi:power", label: "Off", rgb: "142,142,147" },
};

const ACTION_LABEL = {
  heating: "Heating", cooling: "Cooling", drying: "Drying", fan: "Fan", idle: "Idle",
  defrosting: "Defrosting", preheating: "Preheating", off: "Off",
};
const MODE_ORDER = ["heat", "cool", "heat_cool", "auto", "dry", "fan_only", "off"];
const DEFAULT_MODES = ["heat", "cool", "off"];
const UNAVAILABLE = ["unavailable", "unknown"];

// The header is always first. Only Temperature and Modes can swap places
// (the card is a flex column, sections are re-ordered with CSS `order`).
const LAYOUT_OPTIONS = [
  { value: "temp_modes", label: "Temperature → Modes" },
  { value: "modes_temp", label: "Modes → Temperature" },
];
const DEFAULT_LAYOUT = "temp_modes";
const parseLayout = (v) => {
  const o = String(v ?? "").split("_").filter((x) => x === "temp" || x === "modes");
  return o.length === 2 && o[0] === "modes" ? ["modes", "temp"] : ["temp", "modes"];
};
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => String(s ?? "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

// Accepts "#rgb", "#rrggbb", "r,g,b" or "rgb(r,g,b)" -> "r,g,b"
const toRgb = (c) => {
  if (typeof c !== "string") return null;
  const s = c.trim();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
  }
  const m = s.match(/^(?:rgb\()?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i);
  return m ? `${m[1]},${m[2]},${m[3]}` : null;
};

class AcControlCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          --rgb: ${MODE_META.off.rgb};
          position: relative; overflow: hidden; box-sizing: border-box; padding: 12px;
          display: flex; flex-direction: column; gap: 12px;
          background: rgba(var(--rgb), .06);
          border: 1px solid rgba(var(--rgb), .18);
          -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
          transition: background .3s, border-color .3s;
        }
        ha-card:not(.off) { background: rgba(var(--rgb), .08); border-color: rgba(var(--rgb), .3); }
        ha-card.active { animation: glow 3s ease-in-out infinite; }
        @keyframes glow {
          0%, 100% { box-shadow: inset 0 0 10px rgba(var(--rgb), .15); }
          50% { box-shadow: inset 0 0 25px rgba(var(--rgb), .38); }
        }
        @media (prefers-reduced-motion: reduce) {
          ha-card.active { animation: none; box-shadow: inset 0 0 14px rgba(var(--rgb), .22); }
        }
        ha-card.active.static { animation: none; box-shadow: inset 0 0 14px rgba(var(--rgb), .22); }
        ha-card.solo-temp { padding: 6px 10px; min-height: 64px; justify-content: center; }

        .head { display: flex; align-items: center; gap: 12px; cursor: pointer; -webkit-tap-highlight-color: transparent; border-radius: 16px; }
        .head[hidden] { display: none; }
        .head:focus, .head:focus-visible, .tbtn:focus, .mbtn:focus { outline: none; }
        ha-card.kbd .head:focus-visible { outline: 2px solid rgb(var(--rgb)); outline-offset: 2px; }

        /* Mushroom-style icon container */
        .tile {
          flex: none; width: 65px; height: 65px; border-radius: 50%;
          margin: -18px -4px 0 -18px;
          display: flex; align-items: center; justify-content: center;
          color: rgb(var(--rgb));
          background: rgba(var(--rgb), 0.2);
          transition: color .3s, background .3s;
        }
        .tile ha-icon { --mdc-icon-size: 44px; display: flex; }

        .info { flex: 1; min-width: 0; }
        .name {
          font-size: 14px; font-weight: 500; line-height: 1.5;
          color: var(--primary-text-color);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sub {
          font-size: 12px; font-weight: 400; line-height: 1.5;
          color: var(--secondary-text-color);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .runtime {
          flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
          padding: 5px 10px 5px 8px; border-radius: 999px; font-size: 13.5px; font-weight: 600;
          color: rgb(var(--rgb)); background: rgba(var(--rgb), .14);
          font-variant-numeric: tabular-nums; line-height: normal;
        }
        .runtime ha-icon { display: flex; align-items: center; justify-content: center; --mdc-icon-size: 18px; width: 18px; height: 18px; }
        .runtime span { display: block; line-height: 1; }
        .runtime[hidden], .temp[hidden], .tsub[hidden] { display: none; }

        .temp { display: flex; align-items: center; justify-content: space-between; }
        .tbtn {
          all: unset; box-sizing: border-box; cursor: pointer; width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: var(--secondary-text-color);
          --mdc-icon-size: 26px; transition: background .2s, color .2s, transform .1s; -webkit-tap-highlight-color: transparent;
        }
        .tbtn:hover { background: rgba(var(--rgb), .15); color: rgb(var(--rgb)); }
        .tbtn:active { transform: scale(.9); }
        ha-card.kbd .tbtn:focus-visible { outline: 2px solid rgb(var(--rgb)); }
        .tbtn[disabled] { opacity: .3; pointer-events: none; }
        .tcenter { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0; user-select: none; }
        .tcenter.clickable { cursor: pointer; }
        .tval { display: flex; align-items: flex-start; line-height: 1; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
        .tnum { font-size: 2.2rem; font-weight: 300; letter-spacing: -1px; }
        .tunit { font-size: 1rem; margin: 5px 0 0 3px; color: rgb(var(--rgb)); }
        .tsub {
          margin-top: 2px; font-size: .7rem; letter-spacing: .5px; text-transform: uppercase;
          color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
        }
        .off .tval { opacity: .5; }

        .track {
          padding: 4px; border-radius: 16px;
          background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
        }
        .seg { position: relative; display: grid; grid-template-columns: repeat(var(--n, 1), 1fr); }
        .ind {
          position: absolute; top: 0; bottom: 0; left: 0; width: calc(100% / var(--n, 1));
          transform: translateX(calc(var(--i, 0) * 100%)); border-radius: 12px; pointer-events: none;
          background: rgba(var(--rgb), .2); box-shadow: inset 0 0 0 1px rgba(var(--rgb), .4);
          transition: transform .3s cubic-bezier(.4, 0, .2, 1), background .3s, opacity .2s;
        }
        .mbtn {
          all: unset; box-sizing: border-box; position: relative; z-index: 1; cursor: pointer; height: 40px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
          color: var(--secondary-text-color); --mdc-icon-size: 24px; border-radius: 12px;
          transition: color .2s; -webkit-tap-highlight-color: transparent;
        }
        .mbtn span { font-size: 10.5px; font-weight: 600; line-height: 1; }
        .mbtn.active { color: rgb(var(--rgb)); }
        ha-card.kbd .mbtn:focus-visible { outline: 2px solid rgb(var(--rgb)); outline-offset: -2px; }
        .labels .mbtn { height: 52px; }

        /* ---------- Bubble Card style ---------- */
        ha-card.bubble,
        ha-card.bubble:not(.off) {
          border: none; border-radius: 32px; padding: 8px; gap: 8px;
          background: var(--ha-card-background, var(--card-background-color, rgba(30,30,30,1)));
          -webkit-backdrop-filter: none; backdrop-filter: none;
          animation: none; box-shadow: none;
        }
        ha-card.bubble.solo-temp { padding: 6px 10px; }
        ha-card.bubble .head { gap: 12px; border-radius: 28px; }
        ha-card.bubble .tile {
          width: 40px; height: 40px; margin: 0 0 0 0;
          background: rgba(var(--rgb), .2);
        }
        ha-card.bubble .tile ha-icon { --mdc-icon-size: 24px; }
        ha-card.bubble .track { border-radius: 24px; }
        ha-card.bubble .ind { border-radius: 20px; }
        ha-card.bubble .mbtn { border-radius: 20px; }
      </style>
      <ha-card>
        <div class="head" tabindex="0" role="button">
          <div class="tile"><ha-icon></ha-icon></div>
          <div class="info"><div class="name"></div><div class="sub"></div></div>
          <div class="runtime" hidden></div>
        </div>
        <div class="temp" hidden>
          <button class="tbtn" id="down" aria-label="Decrease temperature"><ha-icon icon="mdi:minus"></ha-icon></button>
          <div class="tcenter">
            <div class="tval"><span class="tnum"></span><span class="tunit"></span></div>
            <div class="tsub" hidden></div>
          </div>
          <button class="tbtn" id="up" aria-label="Increase temperature"><ha-icon icon="mdi:plus"></ha-icon></button>
        </div>
        <div class="track"><div class="seg"></div></div>
      </ha-card>`;
    const $ = (s) => this.shadowRoot.querySelector(s);
    this._card = $("ha-card");
    this._head = $(".head");
    this._tile = $(".tile ha-icon");
    this._name = $(".name");
    this._sub = $(".sub");
    this._runtime = $(".runtime");
    this._temp = $(".temp");
    this._tcenter = $(".tcenter");
    this._tnum = $(".tnum");
    this._tunit = $(".tunit");
    this._tsub = $(".tsub");
    this._down = $("#down");
    this._up = $("#up");
    this._track = $(".track");
    this._seg = $(".seg");

    this._head.addEventListener("click", (e) => {
      this._onTap();
      if (e.detail) this._head.blur(); // pointer/touch click: don't keep focus
    });
    this.shadowRoot.addEventListener("pointerdown", () => this._card.classList.remove("kbd"), true);
    this.shadowRoot.addEventListener("keydown", (e) => { if (e.key === "Tab") this._card.classList.add("kbd"); }, true);
    this._head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._onTap(); }
    });
    // When the header is hidden, tapping the temperature opens more-info
    this._tcenter.addEventListener("click", () => {
      if (this._config?.show_header === false) {
        this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
      }
    });
    this._down.addEventListener("click", () => this._bump(-1));
    this._up.addEventListener("click", () => this._bump(1));
    this._seg.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mode]");
      if (b) this._setMode(b.dataset.mode);
    });
  }

  // ---------- HA integration ----------
  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(hass, entities, entitiesFallback) {
    const isClimate = (id) => typeof id === "string" && id.startsWith("climate.");
    const e =
      (entities || []).find(isClimate) ||
      (entitiesFallback || []).find(isClimate) ||
      Object.keys(hass?.states || {}).find(isClimate);
    return { entity: e || "climate.living_room_air_conditioner" };
  }

  static getEntitySuggestion(hass, entityId) {
    if (typeof entityId !== "string" || !entityId.startsWith("climate.")) return null;
    if (!hass?.states?.[entityId]) return null;
    return { config: { type: `custom:${TAG}`, entity: entityId } };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("You need to define a climate entity");
    this._config = {
      show_header: true,
      show_modes: true,
      show_temperature_control: false,
      tap_action: { action: "more-info" },
      ...config,
    };
    this._key = null;
    this._modesKey = null;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const c = this._config || {};
    let n = 0;
    if (c.show_header !== false) n += 1;
    if (c.show_temperature_control) n += 1;
    if (c.show_modes !== false) n += 1;
    return Math.max(n, 1);
  }
  getGridOptions() { return { columns: 12, min_columns: 3 }; }

  // ---------- helpers ----------
  _state() { return this._hass?.states?.[this._config.entity]; }

  _modes(st) {
    const supported = st?.attributes?.hvac_modes;
    const custom = Array.isArray(this._config.hvac_modes) && this._config.hvac_modes.length > 0;
    let list = custom ? this._config.hvac_modes : DEFAULT_MODES;
    if (Array.isArray(supported)) list = list.filter((m) => supported.includes(m));
    if (!custom && list.length < 2 && Array.isArray(supported)) list = MODE_ORDER.filter((m) => supported.includes(m));
    return list;
  }

  _step(st) { return Number(this._config.step) || Number(st?.attributes?.target_temp_step) || 1; }
  _decimals(step) { const s = String(step); return s.includes(".") ? s.split(".")[1].length : 0; }

  _runtimeText() {
    const id = this._config.duration_entity;
    const s = id && this._hass.states[id];
    if (!s || UNAVAILABLE.includes(s.state)) return "";
    let m = parseFloat(s.state);
    if (!Number.isFinite(m)) return "";
    const u = s.attributes?.unit_of_measurement;
    if (u === "h" || u === "hr") m *= 60;
    else if (u === "s") m /= 60;
    m = Math.round(m);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  }

  _model() {
    const cfg = this._config;
    const st = this._state();
    if (!st) return { missing: true, name: cfg.name || cfg.entity };
    const a = st.attributes || {};
    const unavailable = UNAVAILABLE.includes(st.state);
    if (this._pendingMode && this._pendingMode === st.state) this._pendingMode = null;
    if (this._pendingTemp != null && Number(a.temperature) === this._pendingTemp) this._pendingTemp = null;

    const mode = unavailable ? "off" : this._pendingMode ?? st.state;
    const isOff = mode === "off" || unavailable;
    const meta = MODE_META[mode] || { icon: "mdi:air-conditioner", label: cap(mode), rgb: "76,175,80" };
    const action = a.hvac_action;
    const active = !isOff && (action && mode === st.state ? !["idle", "off"].includes(action) : true);
    const unit = this._hass.config?.unit_system?.temperature || "°C";
    const step = this._step(st);
    const dec = this._decimals(step);

    const target = this._pendingTemp ?? (a.temperature != null ? Number(a.temperature) : null);
    let targetText = null;
    if (target != null && !isNaN(target)) targetText = target.toFixed(dec);
    else if (a.target_temp_low != null && a.target_temp_high != null) targetText = `${a.target_temp_low}–${a.target_temp_high}`;

    let sub;
    if (unavailable) sub = "Unavailable";
    else if (mode === "off") sub = "Off";
    else {
      const label = action && mode === st.state && ACTION_LABEL[action] ? ACTION_LABEL[action] : meta.label;
      const parts = [label];
      if (targetText) parts.push(`${targetText} ${unit}`);
      if (cfg.show_current && a.current_temperature != null) parts.push(`Now ${a.current_temperature}°`);
      sub = parts.join(" · ");
    }

    // Caption under the number (used when the header is hidden).
    // "Show current temperature and state" controls the Off / Now X° text.
    const tparts = [];
    if (cfg.name) tparts.push(cfg.name);
    if (unavailable) tparts.push("Unavailable");
    else if (cfg.show_current) {
      if (isOff) tparts.push("Off");
      else if (a.current_temperature != null) tparts.push(`Now ${a.current_temperature}°`);
    }

    const override = toRgb(cfg.color);

    return {
      name: cfg.name ?? a.friendly_name ?? cfg.entity,
      icon: cfg.icon || "mdi:air-conditioner",
      sub,
      tsub: tparts.join(" · "),
      rgb: cfg.coloring === false || isOff ? MODE_META.off.rgb : override || meta.rgb,
      isOff,
      active,
      mode,
      runtime: isOff ? "" : this._runtimeText(),
      tempText: targetText,
      tempUnit: unit,
      tempDisabled: isOff || target == null || isNaN(target),
    };
  }

  // ---------- render ----------
  _render() {
    if (!this._config || !this._hass) return;
    const cfg = this._config;
    const st = this._state();
    const m = this._model();
    const modes = st ? this._modes(st) : [];
    const showHeader = cfg.show_header !== false;
    const showModes = cfg.show_modes !== false;
    const showTemp = !!cfg.show_temperature_control;
    const bubble = cfg.card_style === "bubble";
    const animate = cfg.animation !== false;
    const order = parseLayout(cfg.layout);
    const key = JSON.stringify([m, modes, !!cfg.show_labels, showHeader, showModes, showTemp, bubble, animate, order]);
    if (key === this._key) return;
    this._key = key;

    // layout toggles
    this._card.classList.toggle("bubble", bubble);
    this._card.classList.toggle("static", !animate);
    this._head.style.order = 0;
    this._temp.style.order = 1 + order.indexOf("temp");
    this._track.style.order = 1 + order.indexOf("modes");
    this._card.classList.toggle("solo-temp", !showHeader && !showModes && showTemp);
    this._head.hidden = !showHeader;
    this._temp.hidden = !showTemp;
    this._tcenter.classList.toggle("clickable", !showHeader);
    this._tsub.hidden = showHeader;

    this._name.textContent = m.name;
    if (m.missing) {
      this._sub.textContent = "Entity not found";
      this._tsub.textContent = "Entity not found";
      this._tsub.hidden = showHeader;
      this._track.hidden = true;
      return;
    }

    this._card.style.setProperty("--rgb", m.rgb);
    this._card.classList.toggle("off", m.isOff);
    this._card.classList.toggle("active", m.active);
    this._tile.setAttribute("icon", m.icon);
    this._sub.textContent = m.sub;
    this._runtime.hidden = !m.runtime;
    this._runtime.innerHTML = m.runtime ? `<ha-icon icon="mdi:progress-clock"></ha-icon><span>${esc(m.runtime)}</span>` : "";

    this._tnum.textContent = m.tempText ?? "--";
    this._tunit.textContent = m.tempText ? m.tempUnit : "";
    this._tsub.textContent = m.tsub;
    this._tsub.hidden = showHeader || !m.tsub;
    this._down.disabled = this._up.disabled = m.tempDisabled;

    const modesKey = modes.join(",") + "|" + !!cfg.show_labels;
    if (modesKey !== this._modesKey) {
      this._modesKey = modesKey;
      this._track.classList.toggle("labels", !!cfg.show_labels);
      this._seg.innerHTML =
        `<div class="ind"></div>` +
        modes
          .map((mo) => {
            const meta = MODE_META[mo] || { icon: "mdi:air-conditioner", label: cap(mo) };
            return `<button class="mbtn" data-mode="${esc(mo)}" title="${esc(meta.label)}" aria-label="${esc(meta.label)}">
              <ha-icon icon="${esc(meta.icon)}"></ha-icon>${cfg.show_labels ? `<span>${esc(meta.label)}</span>` : ""}</button>`;
          })
          .join("");
      this._seg.style.setProperty("--n", Math.max(modes.length, 1));
    }
    const idx = modes.indexOf(m.mode);
    this._seg.style.setProperty("--i", Math.max(idx, 0));
    const ind = this._seg.querySelector(".ind");
    if (ind) ind.style.opacity = idx < 0 ? "0" : "1";
    this._seg.querySelectorAll(".mbtn").forEach((b) => {
      const on = b.dataset.mode === m.mode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    this._track.hidden = !showModes || modes.length === 0;
  }

  // ---------- actions ----------
  _setMode(mode) {
    const st = this._state();
    if (!st || mode === st.state) return;
    this._pendingMode = mode;
    this._render();
    this._hass.callService("climate", "set_hvac_mode", { entity_id: this._config.entity, hvac_mode: mode });
    clearTimeout(this._modeTimer);
    this._modeTimer = setTimeout(() => { this._pendingMode = null; this._render(); }, 5000);
  }

  _bump(dir) {
    const st = this._state();
    if (!st) return;
    const a = st.attributes;
    const base = this._pendingTemp ?? Number(a.temperature);
    if (isNaN(base)) return;
    const step = this._step(st);
    const min = a.min_temp ?? 16, max = a.max_temp ?? 32;
    const next = Number(Math.min(max, Math.max(min, base + dir * step)).toFixed(this._decimals(step)));
    this._pendingTemp = next;
    this._render();
    clearTimeout(this._tempTimer);
    this._tempTimer = setTimeout(() => {
      this._hass.callService("climate", "set_temperature", { entity_id: this._config.entity, temperature: next });
      clearTimeout(this._tempRelease);
      this._tempRelease = setTimeout(() => { this._pendingTemp = null; this._render(); }, 4000);
    }, 600);
  }

  _onTap() {
    const a = this._config.tap_action || { action: "more-info" };
    const entityId = a.entity || this._config.entity;
    switch (a.action) {
      case "navigate":
        if (!a.navigation_path) return;
        if (a.navigation_replace) history.replaceState(null, "", a.navigation_path);
        else history.pushState(null, "", a.navigation_path);
        window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !!a.navigation_replace } }));
        break;
      case "more-info":
        this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
        break;
      case "toggle":
        this._hass.callService("homeassistant", "toggle", { entity_id: entityId });
        break;
      case "perform-action":
      case "call-service": {
        const svc = a.perform_action || a.service;
        if (!svc) return;
        const [domain, service] = svc.split(".");
        this._hass.callService(domain, service, a.data || a.service_data || {}, a.target);
        break;
      }
      case "url":
        if (a.url_path) window.open(a.url_path, "_blank");
        break;
      default:
        break;
    }
  }
}

// ---------- Visual editor ----------
const MODE_OPTIONS = MODE_ORDER.map((m) => ({ value: m, label: MODE_META[m].label }));

const EDITOR_LABELS = {
  entity: "Climate entity",
  name: "Name",
  icon: "Icon",
  show_header: "Show header (icon, name, status, runtime)",
  show_temperature_control: "Show − / + temperature control",
  show_modes: "Show mode buttons",
  hvac_modes: "Mode buttons",
  layout: "Order of temperature and modes",
  show_current: "Show current temperature and state",
  show_labels: "Show labels under mode icons",
  tap_action: "Header tap action",
  card_style: "Card style (icon, icon box and borders)",
  duration_entity: "Runtime sensor in minutes (optional)",
  step: "Temperature step (default: entity step or 1)",
  color: "Accent color override (e.g. #2196f3)",
  animation: "Glow animation",
  coloring: "Mode coloring",
};

// Values the card uses when a key is missing. The editor shows these and
// never writes them into the YAML.
const EDITOR_DEFAULTS = {
  show_header: true,
  show_modes: true,
  show_temperature_control: false,
  show_current: false,
  show_labels: false,
  card_style: "mushroom",
  layout: DEFAULT_LAYOUT,
  animation: true,
  coloring: true,
};

const getEditorSchema = (cfg) => {
  const showHeader = cfg.show_header !== false;
  const showModes = cfg.show_modes !== false;
  const showTemp = !!cfg.show_temperature_control;
  return [
    { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
    { name: "name", selector: { text: {} } },
    { name: "icon", selector: { icon: {} } },
    { name: "show_header", selector: { boolean: {} } },
    { name: "show_temperature_control", selector: { boolean: {} } },
    { name: "show_modes", selector: { boolean: {} } },
    ...(showModes
      ? [{ name: "hvac_modes", selector: { select: { multiple: true, mode: "list", options: MODE_OPTIONS } } }]
      : []),
    ...(showTemp && showModes ? [{ name: "layout", selector: { select: { mode: "dropdown", options: LAYOUT_OPTIONS } } }] : []),
    ...(showHeader ? [{ name: "tap_action", selector: { ui_action: {} } }] : []),
    {
      type: "expandable",
      name: "advanced",
      title: "Advanced settings",
      flatten: true,
      schema: [
        {
          name: "card_style",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { value: "mushroom", label: "Mushroom" },
                { value: "bubble", label: "Bubble" },
              ],
            },
          },
        },
        { name: "duration_entity", selector: { entity: { domain: ["sensor", "input_number"] } } },
        { name: "step", selector: { number: { min: 0.1, max: 5, step: 0.1, mode: "box" } } },
        { name: "color", selector: { text: {} } },
        { name: "show_current", selector: { boolean: {} } },
        ...(showModes ? [{ name: "show_labels", selector: { boolean: {} } }] : []),
        { name: "animation", selector: { boolean: {} } },
        { name: "coloring", selector: { boolean: {} } },
      ],
    },
  ];
};

// The editor merges the card's defaults into the form data so toggles that
// default to "on" are shown as on, and the default modes are pre-selected.
class AcControlCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._sync();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._sync();
  }

  _sync() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => EDITOR_LABELS[s.name] || s.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const config = { ...this._config, ...ev.detail.value };
        // don't write default values into the YAML
        for (const [k, v] of Object.entries(EDITOR_DEFAULTS)) if (config[k] === v) delete config[k];
        if (!Array.isArray(config.hvac_modes) || config.hvac_modes.length === 0 || config.hvac_modes.join(",") === DEFAULT_MODES.join(",")) {
          delete config.hvac_modes;
        }
        for (const k of Object.keys(config)) {
          const v = config[k];
          if (v === "" || v == null) delete config[k];
        }
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;

    const cfg = this._config;
    const schemaKey = JSON.stringify([cfg.show_header !== false, cfg.show_modes !== false, !!cfg.show_temperature_control]);
    if (schemaKey !== this._schemaKey) {
      this._schemaKey = schemaKey;
      this._form.schema = getEditorSchema(cfg);
    }

    const data = { ...EDITOR_DEFAULTS, ...cfg };
    if (!Array.isArray(data.hvac_modes) || data.hvac_modes.length === 0) data.hvac_modes = [...DEFAULT_MODES];
    this._form.data = data;
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, AcControlCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, AcControlCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === TAG)) {
  window.customCards.push({
    type: TAG,
    name: "AC Control Card",
    description: "Climate card with optional header, temperature stepper and mode selector. Mushroom or Bubble styling.",
    preview: true,
    getEntitySuggestion: (hass, entityId) => AcControlCard.getEntitySuggestion(hass, entityId),
  });
}
console.info(`%c AC-CONTROL-CARD %c v${CARD_VERSION} `, "color:white;background:#FF9800;font-weight:700", "color:#FF9800;background:white");
