/**
 * Galaxy Playground — Composable UI components.
 *
 * Provides panel, sliders, dropdowns for galaxy parameter tuning.
 * Follows the quantum-manifold UI pattern.
 *
 * @module galaxy/galaxy.ui
 */

import {
  Painter,
  Text,
  Scene,
  applyAnchor,
  Position,
  Screen,
  AccordionGroup,
  Slider,
  Dropdown,
  Button,
  Stepper,
  ToggleButton,
} from "../../../src/index.js";
import { CONFIG, GALAXY_PRESETS, GALAXY_PARAMS } from "./galaxy.config.js";

// ─────────────────────────────────────────────────────────────────────────────
// INFO PANEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the top-left info panel with title and stats.
 *
 * @param {Game} game - The game instance
 * @returns {{ panel: Scene, statsText: Text, updateStats: (text: string) => void }}
 */
export function createInfoPanel(game) {
  const panel = new Scene(game, { x: 0, y: 0 });
  applyAnchor(panel, {
    anchor: Position.TOP_LEFT,
    anchorOffsetX: Screen.responsive(15, 30, 40),
    anchorOffsetY: Screen.responsive(60, 80, 90),
  });

  const titleText = new Text(game, "Galaxy Playground", {
    font: `bold ${Screen.responsive(18, 24, 28)}px monospace`,
    color: "#7af",
    align: "left",
    baseline: "middle",
  });

  const statsText = new Text(game, "Spiral (S) | 3000 stars", {
    font: `${Screen.responsive(9, 12, 13)}px monospace`,
    color: "#667",
    align: "left",
    baseline: "middle",
  });

  const hintsText = new Text(
    game,
    "drag to tilt \u00B7 scroll to zoom \u00B7 click to pause \u00B7 double-click to reset",
    {
      font: `${Screen.responsive(8, 10, 11)}px monospace`,
      color: "#445",
      align: "left",
      baseline: "middle",
    }
  );

  const textItems = [titleText, statsText, hintsText];
  const spacing = Screen.responsive(14, 20, 24);
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

  return { panel, statsText, titleText, updateStats };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE BUTTON
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

// ─────────────────────────────────────────────────────────────────────────────
// PANEL LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Positions the panel based on screen size.
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
// CONTROL PANEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the main control panel with galaxy type dropdown and parameter sliders.
 *
 * @param {Game} game - The game instance
 * @param {Object} callbacks - Callbacks
 * @param {(key: string) => void} callbacks.onPresetChange
 * @param {() => void} callbacks.regenerate
 * @param {Object} callbacks.galaxyParams - Mutable params ref
 * @param {string} callbacks.activePreset - Active preset key
 * @param {Object} callbacks.camera - Camera3D instance
 * @returns {{ panel: AccordionGroup, controls: Object, paramsSection: Object }}
 */
export function createControlPanel(game, callbacks) {
  const {
    onPresetChange,
    regenerate,
    galaxyParams,
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
    debug: false,
  });

  const originalDraw = panel.draw.bind(panel);
  panel.draw = () => {
    Painter.shapes.rect(0, 0, panel._width, panel._height, CONFIG.panel.backgroundColor);
    originalDraw();
  };

  const originalLayout = panel.layout.bind(panel);
  panel.layout = () => {
    originalLayout();
    layoutPanel(panel, game.width, game.height);
  };

  const controls = {};

  const presetOptions = Object.entries(GALAXY_PRESETS).map(
    ([key, preset]) => ({ label: preset.label, value: key })
  );
  controls.preset = new Dropdown(game, {
    label: "GALAXY TYPE",
    width: sw,
    options: presetOptions,
    value: activePreset,
    onChange: (v) => onPresetChange(v),
  });
  panel.addItem(controls.preset);

  const paramsSection = panel.addSection("Parameters", { expanded: !Screen.isMobile });
  buildParamSliders(game, panel, paramsSection, activePreset, galaxyParams, callbacks);

  const structureSection = panel.addSection("Structure", { expanded: false });
  controls.starCount = new Stepper(game, {
    label: "STAR COUNT",
    value: galaxyParams.starCount || 15000,
    min: 2000,
    max: 30000,
    step: 1000,
    buttonSize: 32,
    valueWidth: 60,
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      galaxyParams.starCount = v;
      regenerate();
    },
  });
  structureSection.addItem(controls.starCount);

  controls.galaxyRadius = new Slider(game, {
    label: "RADIUS",
    width: sw,
    min: 150,
    max: 500,
    value: galaxyParams.galaxyRadius || 350,
    step: 10,
    formatValue: (v) => v.toFixed(0),
    onChange: (v) => {
      if (callbacks.getUpdatingSliders?.()) return;
      galaxyParams.galaxyRadius = v;
      regenerate();
    },
  });
  structureSection.addItem(controls.galaxyRadius);

  const viewSection = panel.addSection("View", { expanded: false });
  controls.autoRotate = new ToggleButton(game, {
    text: "Auto-Rotate",
    width: 110,
    height: 30,
    startToggled: false,
    onToggle: (on) => { if (camera.autoRotate !== undefined) camera.autoRotate = on; },
  });
  viewSection.addItem(controls.autoRotate);

  controls.regenerate = new Button(game, {
    text: "Regenerate Galaxy",
    width: sw,
    height: 32,
    onClick: regenerate,
  });
  panel.addItem(controls.regenerate);

  panel.layoutAll();
  layoutPanel(panel, game.width, game.height);

  return {
    panel,
    controls,
    paramsSection,
    structureSection,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM SLIDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds parameter sliders for a given galaxy preset.
 *
 * @param {Game} game - The game instance
 * @param {AccordionGroup} panel - The accordion panel
 * @param {Object} paramsSection - The Parameters section
 * @param {string} presetKey - Preset key
 * @param {Object} galaxyParams - Mutable params
 * @param {Object} callbacks - Callbacks
 * @returns {Object[]} Array of created controls
 */
export function buildParamSliders(game, panel, paramsSection, presetKey, galaxyParams, callbacks = {}) {
  const panelWidth = Screen.isMobile ? game.width - 20 : CONFIG.panel.width;
  const padding = Screen.isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
  const sw = panelWidth - padding * 2;

  panel.clearSection(paramsSection);
  const paramDefs = GALAXY_PARAMS[presetKey];
  if (!paramDefs) {
    panel.commitSection(paramsSection);
    panel.layout();
    return [];
  }

  const items = [];
  for (const def of paramDefs) {
    const decimals = def.step >= 1 ? 0 : def.step >= 0.1 ? 1 : 2;
    const currentValue = galaxyParams[def.key] ?? def.default;
    const slider = new Slider(game, {
      label: def.label,
      width: sw,
      min: def.min,
      max: def.max,
      value: currentValue,
      step: def.step,
      formatValue: (v) => v.toFixed(decimals),
      onChange: (v) => {
        if (callbacks.getUpdatingSliders?.()) return;
        galaxyParams[def.key] = v;
        callbacks.onParamChange?.(def.key, v);
      },
    });
    paramsSection.addItem(slider);
    items.push(slider);
  }

  panel.commitSection(paramsSection);
  panel.layout();
  return items;
}
