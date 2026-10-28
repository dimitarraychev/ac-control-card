/*
 * AC Control Card
 * A modern climate card matching native Mushroom layout and styling.
 */
const TAG = "ac-control-card";
const CARD_VERSION = "0.1.2-beta";

const MODE_META = {
  heat: { icon: "mdi:fire", label: "Heat", rgb: "255,152,0" },
  cool: { icon: "mdi:snowflake", label: "Cool", rgb: "33,150,243" },
  dry: { icon: "mdi:water-percent", label: "Dry", rgb: "255,193,7" },
  fan_only: { icon: "mdi:fan", label: "Fan", rgb: "0,150,136" },
  auto: { icon: "mdi:thermostat-auto", label: "Auto", rgb: "156,39,176" },
  heat_cool: { icon: "mdi:sun-snowflake-variant", label: "Heat/Cool", rgb: "156,39,176" },
  off: { icon: "mdi:power", label: "Off", rgb: "140,140,150" },
};
const ACTION_LABEL = {
  heating: "Heating", cooling: "Cooling", drying: "Drying", fan: "Fan", idle: "Idle",
  defrosting: "Defrosting", preheating: "Preheating", off: "Off",
};
const MODE_ORDER = ["heat", "cool", "heat_cool", "auto", "dry", "fan_only", "off"];
const DEFAULT_MODES = ["heat", "cool", "off"];
const UNAVAILABLE = ["unavailable", "unknown"];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => String(s ?? "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

class AcControlCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          --rgb: 140,140,150;
          position: relative; overflow: hidden; box-sizing: border-box; padding: 12px;
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
        .head { display: flex; align-items: center; gap: 12px; cursor: pointer; -webkit-tap-highlight-color: transparent; border-radius: 16px; }
        .head:focus-visible { outline: 2px solid rgb(var(--rgb)); outline-offset: 2px; }
        
        /* Exact Mushroom card icon container styling matching your original template */
        .tile {
          flex: none; width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: rgb(var(--rgb));
          background: rgba(var(--rgb), 0.2);
          position: relative;
          overflow: hidden;
          transition: color .3s, background .3s;
        }
        .tile ha-icon {
          --icon-size: 65px;
          display: flex;
          margin: -18px 0px 0px -18px !important;
        }

        .info { flex: 1; min-width: 0; line-height: 1.25; }
        .name { font-size: 15px; font-weight: 600; color: var(--primary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sub { font-size: 12.5px; color: #8E8E93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        
        .runtime {
          flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
          padding: 5px 10px 5px 8px; border-radius: 999px; font-size: 13.5px; font-weight: 600;
          color: rgb(var(--rgb)); background: rgba(var(--rgb), .14);
          font-variant-numeric: tabular-nums;
          line-height: normal;
        }
        .runtime ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          --mdc-icon-size: 18px;
        }

        .runtime[hidden], .temp[hidden] { display: none; }
        .temp { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .tbtn {
          all: unset; box-sizing: border-box; cursor: pointer; width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: #8E8E93;
          --mdc-icon-size: 26px; transition: background .2s, color .2s, transform .1s; -webkit-tap-highlight-color: transparent;
        }
        .tbtn:hover { background: rgba(var(--rgb), .15); color: rgb(var(--rgb)); }
        .tbtn:active { transform: scale(.9); }
        .tbtn:focus-visible { outline: 2px solid rgb(var(--rgb)); }
        .tbtn[disabled] { opacity: .3; pointer-events: none; }
        .tval { display: flex; align-items: flex-start; line-height: 1; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
        .tnum { font-size: 2.2rem; font-weight: 300; letter-spacing: -1px; }
        .tunit { font-size: 1rem; margin: 5px 0 0 3px; color: rgb(var(--rgb)); }
        .off .tval { opacity: .5; }
        .track {
          margin-top: 12px; padding: 4px; border-radius: 16px;
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
          color: #8E8E93; --mdc-icon-size: 22px; border-radius: 12px;
          transition: color .2s; -webkit-tap-highlight-color: transparent;
        }
        .mbtn span { font-size: 10.5px; font-weight: 600; line-height: 1; }
        .mbtn.active { color: rgb(var(--rgb)); }
        .mbtn:focus-visible { outline: 2px solid rgb(var(--rgb)); outline-offset: -2px; }
        .labels .mbtn { height: 52px; }
      </style>
      <ha-card>
        <div class="head" tabindex="0" role="button">
          <div class="tile"><ha-icon></ha-icon></div>
          <div class="info"><div class="name"></div><div class="sub"></div></div>
          <div class="runtime" hidden></div>
        </div>
        <div class="temp" hidden>
          <button class="tbtn" id="down" aria-label="Decrease temperature"><ha-icon icon="mdi:minus"></ha-icon></button>
          <div class="tval"><span class="tnum"></span><span class="tunit"></span></div>
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
    this._tnum = $(".tnum");
    this._tunit = $(".tunit");
    this._down = $("#down");
    this._up = $("#up");
    this._track = $(".track");
    this._seg = $(".seg");

    this._head.addEventListener("click", () => this._onTap());
    this._head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._onTap(); }
    });
    this._down.addEventListener("click", () => this._bump(-1));
    this._up.addEventListener("click", () => this._bump(1));
    this._seg.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mode]");
      if (b) this._setMode(b.dataset.mode);
    });
  }

  // ---------- HA integration ----------
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

  static getConfigForm() {
    const modeOptions = MODE_ORDER.map((m) => ({ value: m, label: MODE_META[m].label }));
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "hvac_modes", selector: { select: { multiple: true, mode: "list", options: modeOptions } } },
        { name: "duration_entity", selector: { entity: { domain: ["sensor", "input_number"] } } },
        { name: "show_temperature_control", selector: { boolean: {} } },
        { name: "show_current", selector: { boolean: {} } },
        { name: "show_labels", selector: { boolean: {} } },
        { name: "step", selector: { number: { min: 0.1, max: 5, step: 0.1, mode: "box" } } },
        { name: "tap_action", selector: { ui_action: {} } },
      ],
      computeLabel: (s) =>
        ({
          entity: "Climate entity",
          name: "Name",
          icon: "Icon",
          hvac_modes: "Mode buttons (in order; empty = Heat, Cool, Off)",
          duration_entity: "Runtime sensor in minutes (optional)",
          show_temperature_control: "Show − / + temperature control",
          show_current: "Show current room temperature",
          show_labels: "Show labels under mode icons",
          step: "Temperature step (default: entity step or 1)",
          tap_action: "Header tap action",
        }[s.name] || s.name),
    };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error("You need to define a climate entity");
    this._config = { tap_action: { action: "more-info" }, ...config };
    this._key = null;
    this._modesKey = null;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return this._config?.show_temperature_control ? 3 : 2; }
  getGridOptions() { return { columns: 12, min_columns: 4 }; }

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

    return {
      name: cfg.name ?? a.friendly_name ?? cfg.entity,
      icon: cfg.icon || "mdi:air-conditioner",
      sub,
      rgb: isOff ? MODE_META.off.rgb : meta.rgb,
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
    const st = this._state();
    const m = this._model();
    const modes = st ? this._modes(st) : [];
    const key = JSON.stringify([m, modes, !!this._config.show_labels, !!this._config.show_temperature_control]);
    if (key === this._key) return;
    this._key = key;

    this._name.textContent = m.name;
    if (m.missing) { this._sub.textContent = "Entity not found"; return; }

    this._card.style.setProperty("--rgb", m.rgb);
    this._card.classList.toggle("off", m.isOff);
    this._card.classList.toggle("active", m.active);
    this._tile.setAttribute("icon", m.icon);
    this._sub.textContent = m.sub;
    this._runtime.hidden = !m.runtime;
    this._runtime.innerHTML = m.runtime ? `<ha-icon icon="mdi:timer-outline"></ha-icon><span>${esc(m.runtime)}</span>` : "";

    this._temp.hidden = !this._config.show_temperature_control;
    this._tnum.textContent = m.tempText ?? "--";
    this._tunit.textContent = m.tempText ? m.tempUnit : "";
    this._down.disabled = this._up.disabled = m.tempDisabled;

    const modesKey = modes.join(",") + "|" + !!this._config.show_labels;
    if (modesKey !== this._modesKey) {
      this._modesKey = modesKey;
      this._track.classList.toggle("labels", !!this._config.show_labels);
      this._seg.innerHTML =
        `<div class="ind"></div>` +
        modes
          .map((mo) => {
            const meta = MODE_META[mo] || { icon: "mdi:air-conditioner", label: cap(mo) };
            return `<button class="mbtn" data-mode="${esc(mo)}" title="${esc(meta.label)}" aria-label="${esc(meta.label)}">
              <ha-icon icon="${esc(meta.icon)}"></ha-icon>${this._config.show_labels ? `<span>${esc(meta.label)}</span>` : ""}</button>`;
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
    this._track.hidden = modes.length === 0;
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

if (!customElements.get(TAG)) customElements.define(TAG, AcControlCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === TAG)) {
  window.customCards.push({
    type: TAG,
    name: "AC Control Card",
    description: "Modern climate card with mode-tinted glow, runtime chip, temperature stepper and sliding mode selector.",
    preview: true,
    getEntitySuggestion: (hass, entityId) => AcControlCard.getEntitySuggestion(hass, entityId),
  });
}
console.info(`%c AC-CONTROL-CARD %c v${CARD_VERSION} `, "color:white;background:#FF9800;font-weight:700", "color:#FF9800;background:white");
