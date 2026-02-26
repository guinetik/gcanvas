/**
 * Quantum Manifold Playground — Composable UI components.
 *
 * Provides decoupled UI factories for info panel, control panel, toggle buttons,
 * and info overlay. All components receive a context object with callbacks
 * to avoid coupling to the main game implementation.
 *
 * @module quantum/quantuman.ui
 */

import {
  Painter,
  Text,
  Scene,
  applyAnchor,
  Position,
  verticalLayout,
  applyLayout,
  Screen,
  AccordionGroup,
  Slider,
  Dropdown,
  Button,
  ToggleButton,
  Stepper,
} from "/gcanvas.es.min.js";
import { StateMachine } from "/gcanvas.es.min.js";
import { CONFIG, MANIFOLD_PRESETS, PRESET_PARAMS, SURFACE_PRESETS, SURFACE_PARAMS } from "./quantuman.config.js";

// ─────────────────────────────────────────────────────────────────────────────
// INFO PANEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the top-center info panel with title, equation, and stats.
 *
 * @param {Game} game - The game instance
 * @param {Object} options - Options
 * @param {() => string} [options.getStats] - Returns current stats string
 * @returns {{ panel: Scene, statsText: Text, updateStats: (text: string) => void }}
 */
export function createInfoPanel(game, options = {}) {
  const panel = new Scene(game, { x: 0, y: 0 });
  applyAnchor(panel, {
    anchor: Position.TOP_LEFT,
    anchorOffsetX: Screen.responsive(10, 10, 10),
    anchorOffsetY: Screen.responsive(66, 10, 10),
  });

  const titleText = new Text(game, "Quantum Manifold", {
    font: `bold ${Screen.responsive(18, 24, 28)}px monospace`,
    color: "#7af",
    align: "left",
    baseline: "middle",
  });

  const equationText = new Text(
    game,
    "\u03A8(x,z,t) = A\u00B7e^(-r\u00B2/4\u03C3\u00B2)\u00B7e^(i(k\u00B7r-\u03C9t))",
    {
      font: `${Screen.responsive(14, 18, 20)}px monospace`,
      color: "#fff",
      align: "left",
      baseline: "middle",
    }
  );

  const statsText = new Text(game, "Superposition | 3 packets", {
    font: `${Screen.responsive(9, 12, 13)}px monospace`,
    color: "#667",
    align: "left",
    baseline: "middle",
  });

  const hintsText = new Text(
    game,
    "drag to rotate \u00B7 scroll to zoom \u00B7 hold to collapse \u00B7 double-click to reset",
    {
      font: `${Screen.responsive(8, 10, 11)}px monospace`,
      color: "#889",
      align: "left",
      baseline: "middle",
    }
  );

  const textItems = [titleText, equationText, statsText, hintsText];
  const spacing = Screen.responsive(18, 26, 30);
  let y = 0;
  for (const item of textItems) {
    item.x = 0;
    item.y = y;
    y += spacing;
    panel.add(item);
  }

  const updateStats = (text) => {
    if (statsText) statsText.text = text;
  };

  return { panel, statsText, titleText, equationText, updateStats };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXPLANATIONS (content only, no UI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns explanation content for the info overlay.
 *
 * @param {string} activePreset - Preset key
 * @param {Object} waveParams - Current wave parameters
 * @param {number} wellCount - Number of gravity wells
 * @returns {{ title: string, lines: string[] }}
 */
export function getPresetExplanation(activePreset, waveParams, wellCount = 0, surfaceKey = "flat") {
  const p = waveParams;

  const explanations = {
    superposition: {
      title: "Quantum Superposition",
      lines: [
        `${p.numPackets || 3} wave packets overlapping in space`,
        "Each packet is a Gaussian \u00B7 plane wave:",
        "A\u00B7e^(-r\u00B2/4\u03C3\u00B2)\u00B7e^(ikr)",
        "Interference creates peaks where waves align",
        "and valleys where they cancel (destructive)",
        `\u03C3=${(p.sigma || 1.2).toFixed(1)}  k=${(p.k || 5).toFixed(1)}  \u03C9=${(p.omega || 3).toFixed(1)}`,
      ],
    },
    gaussian: {
      title: "Gaussian Wave Packet",
      lines: [
        "A single localized particle",
        "the simplest quantum state",
        "Envelope: e^(-r\u00B2/4\u03C3\u00B2)",
        "Phase: e^(ikr-\u03C9t)",
        `v=(${(p.vx || 0).toFixed(1)}, ${(p.vz || 0).toFixed(1)})  \u03C3=${(p.sigma || 1).toFixed(1)}`,
      ],
    },
    doubleSlit: {
      title: "Double-Slit Interference",
      lines: [
        "Two coherent sources separated by a gap",
        "Waves from each slit overlap",
        "Constructive = bright rings",
        "Destructive = cancellation",
        `Separation: ${(p.slitSeparation || 2.5).toFixed(1)}  \u03C3=${(p.sigma || 0.8).toFixed(1)}`,
      ],
    },
    standingWave: {
      title: "Standing Wave (Box)",
      lines: [
        "Quantized modes: only certain",
        "wavelengths fit the boundary",
        "sin(n\u03C0x/L)\u00B7sin(m\u03C0z/L)",
        "This is WHY energy is quantized",
        `Mode (${p.nx || 3}, ${p.ny || 2})  \u03C9=${(p.omega || 2).toFixed(1)}`,
      ],
    },
    tunneling: {
      title: "Quantum Tunneling",
      lines: [
        "Particle hits a classically",
        "impassable barrier",
        "\u03C8 decays as e^(-\u03BAx) inside",
        "Thin barrier = \u03C8 leaks through",
        `h=${(p.barrierHeight || 0.6).toFixed(1)}  w=${(p.barrierWidth || 0.8).toFixed(1)}  v=${(p.vx || 0.6).toFixed(1)}`,
      ],
    },
    harmonic: {
      title: "Harmonic Oscillator",
      lines: [
        "Quantum version of a spring",
        "H\u2099(x)\u00B7e^(-x\u00B2/2)",
        "Hermite polynomials with n nodes",
        "Models molecules & photon fields",
        `Mode (${p.nx || 2}, ${p.ny || 3})  \u03C3=${(p.sigma || 1.5).toFixed(1)}`,
      ],
    },
  };

  const info = explanations[activePreset] || explanations.gaussian;

  if (surfaceKey && surfaceKey !== "flat") {
    const surfLabel = SURFACE_PRESETS[surfaceKey]?.label || surfaceKey;
    info.lines.push("");
    info.lines.push(`Surface: ${surfLabel}`);
  }

  if (wellCount > 0) {
    info.lines.push("");
    info.lines.push(`+ ${wellCount} gravity well${wellCount > 1 ? "s" : ""}`);
    info.lines.push("\u03A6(r) = -GM/r");
  }

  return info;
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO OVERLAY (draw function)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws the info overlay when visible.
 *
 * @param {Object} options - Options
 * @param {boolean} options.visible - Whether overlay is visible
 * @param {{ title: string, lines: string[] }} options.info - Explanation content
 * @param {number} options.width - Canvas width
 * @param {number} options.height - Canvas height
 */
export function drawInfoOverlay({ visible, info, width, height }) {
  if (!visible || !info) return;

  const padding = 16;
  const lineHeight = 18;
  const titleHeight = 28;
  const panelW = Screen.isMobile ? width - 40 : 320;
  const panelH = padding * 2 + titleHeight + info.lines.length * lineHeight;

  const px = Screen.isMobile
    ? (width - panelW) / 2
    : CONFIG.panel.marginRight;
  const py = Screen.isMobile
    ? CONFIG.toggle.margin + CONFIG.toggle.height + 12
    : (height - panelH) / 2;

  Painter.shapes.rect(px, py, panelW, panelH, "rgba(0, 0, 0, 0.8)");

  Painter.useCtx((ctx) => {
    ctx.save();
    ctx.textBaseline = "top";

    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#0ff";
    ctx.textAlign = "left";
    ctx.fillText(info.title, px + padding, py + padding);

    ctx.font = "11px monospace";
    for (let i = 0; i < info.lines.length; i++) {
      const line = info.lines[i];
      if (!line) continue;

      const isParam = line.startsWith("\u03C3") || line.startsWith("Slit")
        || line.startsWith("Mode") || line.startsWith("Barrier")
        || line.startsWith("+");
      ctx.fillStyle = isParam ? "#6d8" : "#aab";
      ctx.fillText(line, px + padding, py + padding + titleHeight + i * lineHeight);
    }

    ctx.restore();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the settings toggle button (mobile only).
 *
 * @param {Game} game - The game instance
 * @param {Object} callbacks - Callbacks
 * @param {() => void} callbacks.onToggle - Called when button is clicked
 * @returns {Button}
 */
export function createToggleButton(game, { onToggle }) {
  const btn = new Button(game, {
    text: "\u2699",
    width: CONFIG.toggle.width,
    height: CONFIG.toggle.height,
    onClick: onToggle,
  });
  btn.x = CONFIG.toggle.margin + CONFIG.toggle.width / 2;
  btn.y = CONFIG.toggle.margin + CONFIG.toggle.height / 2;
  btn.visible = Screen.isMobile;
  btn.interactive = Screen.isMobile;
  return btn;
}

/**
 * Creates the info (?) toggle button.
 *
 * @param {Game} game - The game instance
 * @param {Object} callbacks - Callbacks
 * @param {(on: boolean) => void} callbacks.onToggle - Called when toggled
 * @returns {ToggleButton}
 */
export function createInfoButton(game, { onToggle }) {
  const btn = new ToggleButton(game, {
    text: "?",
    width: CONFIG.toggle.width,
    height: CONFIG.toggle.height,
    onToggle,
  });
  const btnIndex = Screen.isMobile ? 1 : 0;
  btn.x = CONFIG.toggle.margin * (btnIndex + 1) + CONFIG.toggle.width * btnIndex + CONFIG.toggle.width / 2;
  btn.y = CONFIG.toggle.margin + CONFIG.toggle.height / 2;
  return btn;
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the panel visibility state machine.
 *
 * @param {Object} context - Context with panel, toggleBtn, infoBtn, etc.
 * @param {Object} context.panel - Accordion panel
 * @param {Button} [context.toggleBtn] - Toggle button
 * @param {ToggleButton} [context.infoBtn] - Info button
 * @param {(visible: boolean) => void} [context.setCrossSectionVisible] - Set cross-section visibility
 * @param {(visible: boolean) => void} [context.setInfoOverlayVisible] - Set info overlay visibility
 * @returns {StateMachine}
 */
export function createPanelStateMachine(context) {
  return new StateMachine({
    initial: Screen.isMobile ? "panel-hidden" : "panel-visible",
    context,
    states: {
      "panel-hidden": {
        enter() {
          this.panel.visible = false;
          this.panel.interactive = false;
          if (this.toggleBtn) this.toggleBtn.text = "\u2699";
          if (Screen.isMobile && this.setCrossSectionVisible) {
            this.setCrossSectionVisible(true);
          }
        },
      },
      "panel-visible": {
        enter() {
          this.panel.visible = true;
          this.panel.interactive = true;
          if (Screen.isMobile && this.toggleBtn) this.toggleBtn.text = "\u2716";
          if (Screen.isMobile) {
            if (this.setCrossSectionVisible) this.setCrossSectionVisible(false);
            if (this.setInfoOverlayVisible) this.setInfoOverlayVisible(false);
          }
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Positions the panel based on screen size (desktop sidebar vs mobile bottom sheet).
 *
 * @param {AccordionGroup} panel - The accordion panel
 * @param {number} gameWidth - Game width
 * @param {number} gameHeight - Game height
 */
export function layoutPanel(panel, gameWidth, gameHeight) {
  if (!panel) return;
  if (Screen.isMobile) {
    const panelH = panel._height || 300;
    const maxH = gameHeight * CONFIG.panel.mobileMaxHeight;
    const clampedH = Math.min(panelH, maxH);
    panel.x = 10;
    panel.y = gameHeight - clampedH - 10;
  } else {
    panel.x = gameWidth - CONFIG.panel.width - CONFIG.panel.marginRight;
    panel.y = CONFIG.panel.marginTop;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUSIVE SECTIONS (mobile)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Makes accordion sections mutually exclusive on mobile (only one expanded at a time).
 *
 * @param {AccordionGroup} panel - The accordion panel
 * @param {Object[]} sections - Section references
 * @param {Object} context - Context with panel reference for layout
 */
export function setupExclusiveSections(panel, sections, context) {
  const origToggles = new Map();
  for (const section of sections) {
    origToggles.set(section, section.toggle.bind(section));
  }
  for (const section of sections) {
    section.toggle = (force) => {
      const willExpand = force !== undefined ? force : !section.expanded;
      if (willExpand) {
        for (const other of sections) {
          if (other !== section && other.expanded) {
            origToggles.get(other)(false);
          }
        }
      }
      origToggles.get(section)(force);
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL PANEL (main accordion)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the main control panel with all sections and controls.
 *
 * @param {Game} game - The game instance
 * @param {Object} callbacks - All callbacks for panel actions
 * @param {(key: string) => void} callbacks.onPresetChange
 * @param {(presetKey: string) => void} callbacks.buildParamSliders
 * @param {() => void} callbacks.addWell
 * @param {() => void} callbacks.clearWells
 * @param {() => void} callbacks.collapse
 * @param {() => void} callbacks.resetToDefaults
 * @param {() => void} callbacks.restart
 * @param {boolean} callbacks.updatingSliders - Guard for slider updates
 * @param {Object} callbacks.waveParams - Mutable wave params ref
 * @param {string} callbacks.activePreset - Active preset key
 * @param {Object} callbacks.camera - Camera3D instance
 * @returns {{ panel: AccordionGroup, controls: Object, paramsSection: Object, sections: Object[] }}
 */
export function createControlPanel(game, callbacks) {
  const {
    onPresetChange,
    buildParamSliders,
    addWell,
    clearWells,
    collapse,
    resetToDefaults,
    restart,
    waveParams,
    activePreset,
    camera,
  } = callbacks;

  const isMobile = Screen.isMobile;
  const panelWidth = isMobile ? game.width - 20 : CONFIG.panel.width;
  const padding = isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
  const { spacing } = CONFIG.panel;
  const sw = panelWidth - padding * 2;

  const panel = new AccordionGroup(game, {
    width: panelWidth,
    padding,
    spacing,
    headerHeight: 28,
    debug: true,
    debugColor: "rgba(0, 255, 0, 0.18)",
  });

  // Semi-transparent background
  const originalDraw = panel.draw.bind(panel);
  panel.draw = () => {
    Painter.shapes.rect(0, 0, panel._width, panel._height, CONFIG.panel.backgroundColor);
    originalDraw();
  };

  // Reposition panel when sections expand/collapse
  const originalLayout = panel.layout.bind(panel);
  panel.layout = () => {
    originalLayout();
    layoutPanel(panel, game.width, game.height);
  };

  const controls = {};

  // Preset dropdown
  const presetOptions = Object.entries(MANIFOLD_PRESETS).map(
    ([key, preset]) => ({ label: preset.label, value: key })
  );
  controls.preset = new Dropdown(game, {
    label: "WAVE FUNCTION",
    width: sw,
    options: presetOptions,
    value: activePreset,
    onChange: (v) => onPresetChange(v),
  });
  panel.addItem(controls.preset);

  // Surface geometry dropdown
  const surfaceOptions = Object.entries(SURFACE_PRESETS).map(
    ([key, preset]) => ({ label: preset.label, value: key })
  );
  controls.surface = new Dropdown(game, {
    label: "SURFACE SHAPE",
    width: sw,
    options: surfaceOptions,
    value: callbacks.activeSurface || "flat",
    onChange: (v) => callbacks.onSurfaceChange?.(v),
  });
  panel.addItem(controls.surface);

  // Parameters section
  const paramsSection = panel.addSection("Parameters", { expanded: !Screen.isMobile });
  buildParamSliders(game, panel, paramsSection, activePreset, waveParams, callbacks);

  // Surface geometry section
  const surfaceGeom = panel.addSection("Surface Shape", { expanded: false });
  buildSurfaceSliders(game, panel, surfaceGeom, callbacks.activeSurface || "flat", callbacks.surfaceParams || {}, callbacks);

  // Surface section
  const surface = panel.addSection("Surface", { expanded: false });
  controls.amplitude = new Slider(game, {
    label: "AMPLITUDE",
    width: sw,
    min: 0.5,
    max: 10.0,
    value: CONFIG.surface.amplitude,
    step: 0.5,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      CONFIG.surface.amplitude = v;
    },
  });
  surface.addItem(controls.amplitude);

  controls.gridRes = new Stepper(game, {
    label: "GRID RES",
    value: CONFIG.grid.resolution,
    min: 20,
    max: 80,
    step: 10,
    buttonSize: 32,
    valueWidth: 60,
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      CONFIG.grid.resolution = v;
      callbacks.onGridResChange?.(v);
    },
  });
  surface.addItem(controls.gridRes);

  controls.wireframe = new ToggleButton(game, {
    text: "Wireframe",
    width: 100,
    height: 30,
    startToggled: CONFIG.surface.wireframe,
    onToggle: (on) => { CONFIG.surface.wireframe = on; },
  });
  surface.addItem(controls.wireframe);

  // Gravity section
  const gravity = panel.addSection("Quantum Gravity", { expanded: !Screen.isMobile });
  controls.gravityToggle = new ToggleButton(game, {
    text: "Gravity",
    width: 80,
    height: 30,
    startToggled: CONFIG.gravity.enabled,
    onToggle: (on) => { CONFIG.gravity.enabled = on; },
  });
  gravity.addItem(controls.gravityToggle);

  controls.wellDepth = new Slider(game, {
    label: "WELL DEPTH",
    width: sw,
    min: 1.0,
    max: 15.0,
    value: CONFIG.gravity.wellDepth,
    step: 0.5,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      CONFIG.gravity.wellDepth = v;
    },
  });
  gravity.addItem(controls.wellDepth);

  controls.wellWidth = new Slider(game, {
    label: "WELL WIDTH",
    width: sw,
    min: 0.5,
    max: 6.0,
    value: CONFIG.gravity.wellWidth,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      CONFIG.gravity.wellWidth = v;
    },
  });
  gravity.addItem(controls.wellWidth);

  controls.addWell = new Button(game, {
    text: "Add Gravity Well",
    width: sw,
    height: 32,
    onClick: addWell,
  });
  gravity.addItem(controls.addWell);

  controls.clearWells = new Button(game, {
    text: "Clear Wells",
    width: sw,
    height: 32,
    onClick: clearWells,
  });
  gravity.addItem(controls.clearWells);

  // View section
  const view = panel.addSection("View", { expanded: false });
  controls.autoRotate = new ToggleButton(game, {
    text: "Auto-Rotate",
    width: 110,
    height: 30,
    startToggled: CONFIG.camera.autoRotate,
    onToggle: (on) => { camera.autoRotate = on; },
  });
  view.addItem(controls.autoRotate);

  controls.rotSpeed = new Slider(game, {
    label: "ROTATION SPEED",
    width: sw,
    min: 0.01,
    max: 0.5,
    value: CONFIG.camera.autoRotateSpeed,
    step: 0.01,
    formatValue: (v) => v.toFixed(2),
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      camera.autoRotateSpeed = v;
    },
  });
  view.addItem(controls.rotSpeed);

  controls.timeScale = new Slider(game, {
    label: "TIME SCALE",
    width: sw,
    min: 0.0,
    max: 3.0,
    value: CONFIG.timeScale,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      CONFIG.timeScale = v;
    },
  });
  view.addItem(controls.timeScale);

  controls.crossSection = new ToggleButton(game, {
    text: "Cross-Section",
    width: 120,
    height: 30,
    startToggled: CONFIG.crossSection.enabled,
    onToggle: (on) => { CONFIG.crossSection.enabled = on; },
  });
  view.addItem(controls.crossSection);

  // Collapse + restart buttons
  controls.collapseBtn = new Button(game, {
    text: "Collapse Wave",
    width: sw,
    height: 32,
    onClick: () => collapse(),
  });
  panel.addItem(controls.collapseBtn);

  controls.reset = new Button(game, {
    text: "Reset Defaults",
    width: sw,
    height: 32,
    onClick: resetToDefaults,
  });
  panel.addItem(controls.reset);

  controls.restart = new Button(game, {
    text: "Restart",
    width: sw,
    height: 32,
    onClick: restart,
  });
  panel.addItem(controls.restart);

  const sections = [paramsSection, surfaceGeom, surface, gravity, view];
  if (Screen.isMobile) {
    setupExclusiveSections(panel, sections, {});
  }

  panel.layoutAll();
  layoutPanel(panel, game.width, game.height);

  return {
    panel,
    controls,
    paramsSection,
    surfaceGeomSection: surfaceGeom,
    sections,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM SLIDERS (dynamic per preset)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds parameter sliders for a given preset.
 *
 * @param {Game} game - The game instance
 * @param {AccordionGroup} panel - The accordion panel
 * @param {Object} paramsSection - The Parameters section
 * @param {string} presetKey - Preset key
 * @param {Object} waveParams - Mutable wave params
 * @param {Object} callbacks - Callbacks for param changes
 * @param {(v: number) => void} [callbacks.onNumPacketsChange]
 * @param {(nx: number) => void} [callbacks.onNxChange]
 * @param {(ny: number) => void} [callbacks.onNyChange]
 * @param {boolean} [callbacks.updatingSliders]
 * @returns {Object[]} Array of created controls (for clearing)
 */
export function buildParamSliders(game, panel, paramsSection, presetKey, waveParams, callbacks = {}) {
  const panelWidth = Screen.isMobile ? game.width - 20 : CONFIG.panel.width;
  const padding = Screen.isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
  const sw = panelWidth - padding * 2;

  panel.clearSection(paramsSection);
  const paramDefs = PRESET_PARAMS[presetKey];
  if (!paramDefs) return [];

  const items = [];

  if (presetKey === "superposition" && callbacks.onNumPacketsChange) {
    const stepper = new Stepper(game, {
      label: "PACKETS",
      value: waveParams.numPackets || 3,
      min: 2,
      max: 8,
      step: 1,
      buttonSize: 32,
      valueWidth: 60,
      onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        waveParams.numPackets = v;
        callbacks.onNumPacketsChange(v);
      },
    });
    paramsSection.addItem(stepper);
    items.push(stepper);
  }

  if ((presetKey === "standingWave" || presetKey === "harmonic") && callbacks.onNxChange && callbacks.onNyChange) {
    const nxStepper = new Stepper(game, {
      label: "N (x)",
      value: waveParams.nx || (presetKey === "harmonic" ? 2 : 3),
      min: 1,
      max: 6,
      step: 1,
      buttonSize: 32,
      valueWidth: 60,
      onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        waveParams.nx = v;
        callbacks.onNxChange(v);
      },
    });
    paramsSection.addItem(nxStepper);
    items.push(nxStepper);

    const nyStepper = new Stepper(game, {
      label: "M (z)",
      value: waveParams.ny || (presetKey === "harmonic" ? 3 : 2),
      min: 1,
      max: 6,
      step: 1,
      buttonSize: 32,
      valueWidth: 60,
      onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        waveParams.ny = v;
        callbacks.onNyChange(v);
      },
    });
    paramsSection.addItem(nyStepper);
    items.push(nyStepper);
  }

  for (const def of paramDefs) {
    const decimals = def.step >= 1 ? 0 : def.step >= 0.1 ? 1 : 2;
    const slider = new Slider(game, {
      label: def.label,
      width: sw,
      min: def.min,
      max: def.max,
      value: def.default,
      step: def.step,
      formatValue: (v) => v.toFixed(decimals),
      onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        waveParams[def.key] = v;
        if (def.key === "speed" && callbacks.onSpeedChange) {
          callbacks.onSpeedChange();
        }
      },
    });
    paramsSection.addItem(slider);
    items.push(slider);
  }

  panel.commitSection(paramsSection);
  panel.layout();
  return items;
}

/**
 * Builds surface geometry sliders for a given surface preset.
 */
export function buildSurfaceSliders(game, panel, surfaceSection, surfaceKey, surfaceParams, callbacks = {}) {
  const panelWidth = Screen.isMobile ? game.width - 20 : CONFIG.panel.width;
  const padding = Screen.isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
  const sw = panelWidth - padding * 2;

  panel.clearSection(surfaceSection);
  const paramDefs = SURFACE_PARAMS[surfaceKey];
  if (!paramDefs || paramDefs.length === 0) {
    panel.commitSection(surfaceSection);
    panel.layout();
    return [];
  }

  const items = [];
  for (const def of paramDefs) {
    const decimals = def.step >= 1 ? 0 : def.step >= 0.1 ? 1 : 2;
    const slider = new Slider(game, {
      label: def.label,
      width: sw,
      min: def.min,
      max: def.max,
      value: def.default,
      step: def.step,
      formatValue: (v) => v.toFixed(decimals),
      onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        surfaceParams[def.key] = v;
      },
    });
    surfaceSection.addItem(slider);
    items.push(slider);
  }

  panel.commitSection(surfaceSection);
  panel.layout();
  return items;
}
