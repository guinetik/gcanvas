/**
 * Harmonic Geometries — UI components.
 *
 * Minimal control panel: number of arms, speed, and shape type.
 * Matches the original project's simplicity.
 *
 * @module harmonic/harmonicgeo.ui
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
  ToggleButton,
} from "/gcanvas.es.min.js";
import { StateMachine } from "/gcanvas.es.min.js";
import { CONFIG, SHAPES, THEMES } from "./harmonicgeo.config.js";

// ─────────────────────────────────────────────────────────────────────────────
// INFO PANEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the top-left info panel.
 *
 * @param {Game} game
 * @returns {{ panel: Scene, statsText: Text, updateStats: (t: string) => void }}
 */
export function createInfoPanel(game) {
  const panel = new Scene(game, { x: 0, y: 0 });
  applyAnchor(panel, {
    anchor: Position.TOP_LEFT,
    anchorOffsetX: Screen.responsive(10, 10, 10),
    anchorOffsetY: Screen.responsive(66, 10, 10),
  });

  const titleText = new Text(game, "Harmonic Geometries", {
    font: `bold ${Screen.responsive(18, 24, 28)}px monospace`,
    color: "#0f0",
    align: "left",
    baseline: "middle",
  });

  const subtitleText = new Text(game, "Polygon Epicycles", {
    font: `${Screen.responsive(13, 17, 19)}px monospace`,
    color: "#fff",
    align: "left",
    baseline: "middle",
  });

  const statsText = new Text(game, "", {
    font: `${Screen.responsive(9, 12, 13)}px monospace`,
    color: "rgba(0, 255, 0, 0.45)",
    align: "left",
    baseline: "middle",
  });

  const hintsText = new Text(
    game,
    Screen.isMobile
      ? "pinch to zoom · double-tap to reset"
      : "scroll to zoom · double-click to reset",
    {
      font: `${Screen.responsive(8, 10, 11)}px monospace`,
      color: "rgba(0, 255, 0, 0.3)",
      align: "left",
      baseline: "middle",
    }
  );

  const items = [titleText, subtitleText, statsText, hintsText];
  const spacing = Screen.responsive(16, 24, 28);
  let y = 0;
  for (const item of items) {
    item.x = 0;
    item.y = y;
    y += spacing;
    panel.add(item);
  }

  return {
    panel,
    statsText,
    updateStats: (text) => { statsText.text = text; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE BUTTON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the settings toggle button (mobile only).
 *
 * @param {Game} game
 * @param {{ onToggle: () => void }} callbacks
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
// PANEL STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ panel: AccordionGroup, toggleBtn: Button }} ctx
 * @returns {StateMachine}
 */
export function createPanelStateMachine(ctx) {
  return new StateMachine({
    initial: Screen.isMobile ? "panel-hidden" : "panel-visible",
    context: ctx,
    states: {
      "panel-hidden": {
        enter() {
          this.panel.visible = false;
          this.panel.interactive = false;
          if (this.toggleBtn) this.toggleBtn.text = "\u2699";
        },
      },
      "panel-visible": {
        enter() {
          this.panel.visible = true;
          this.panel.interactive = true;
          if (Screen.isMobile && this.toggleBtn) this.toggleBtn.text = "\u2716";
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {AccordionGroup} panel
 * @param {number} gameWidth
 * @param {number} gameHeight
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
 * Builds the control panel with 3 controls: circles, speed, shape.
 *
 * @param {Game} game
 * @param {Object} callbacks
 * @returns {{ panel: AccordionGroup, controls: Object }}
 */
export function createControlPanel(game, callbacks) {
  const {
    onNumCirclesChange,
    onRadiusChange,
    onSpreadChange,
    onSpeedChange,
    onShapeChange,
    onFadeChange,
    onThemeChange,
    onWireframeToggle,
    numCircles,
    radius,
    spread,
    speedMultiplier,
    sides,
    fade,
    theme,
    showWireframe,
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
  const LABEL_COLOR = "#ffffff";
  const whiteLabel = (ctrl) => {
    if (ctrl._colors) ctrl._colors.labelText = LABEL_COLOR;
  };

  // Number of circles (arms)
  controls.numCircles = new Slider(game, {
    label: "CIRCLES",
    width: sw,
    min: 2,
    max: 6,
    value: numCircles,
    step: 1,
    formatValue: (v) => v.toFixed(0),
    onChange: (v) => onNumCirclesChange(v),
  });
  whiteLabel(controls.numCircles);
  panel.addItem(controls.numCircles);

  // Radius of the biggest arm
  controls.radius = new Slider(game, {
    label: "RADIUS",
    width: sw,
    min: 0.5,
    max: 6.0,
    value: radius,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => onRadiusChange(v),
  });
  whiteLabel(controls.radius);
  panel.addItem(controls.radius);

  // Spread — distance between shapes (travel multiplier)
  controls.spread = new Slider(game, {
    label: "SPREAD",
    width: sw,
    min: 0.2,
    max: 3.0,
    value: spread,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => onSpreadChange(v),
  });
  whiteLabel(controls.spread);
  panel.addItem(controls.spread);

  // Speed multiplier
  controls.speed = new Slider(game, {
    label: "SPEED",
    width: sw,
    min: 0.05,
    max: 3.0,
    value: speedMultiplier,
    step: 0.05,
    formatValue: (v) => v.toFixed(2),
    onChange: (v) => onSpeedChange(v),
  });
  whiteLabel(controls.speed);
  panel.addItem(controls.speed);

  // Fade exponent
  controls.fade = new Slider(game, {
    label: "FADE",
    width: sw,
    min: 0.3,
    max: 3.0,
    value: fade,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => onFadeChange(v),
  });
  whiteLabel(controls.fade);
  panel.addItem(controls.fade);

  // Shape dropdown
  const shapeOptions = SHAPES.map((s) => ({
    label: s.label,
    value: String(s.sides),
  }));
  controls.shape = new Dropdown(game, {
    label: "SHAPE",
    width: sw,
    options: shapeOptions,
    value: String(sides),
    onChange: (v) => onShapeChange(parseInt(v, 10)),
  });
  whiteLabel(controls.shape);
  panel.addItem(controls.shape);

  // Theme dropdown
  const themeOptions = Object.keys(THEMES).map((k) => ({
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: k,
  }));
  controls.theme = new Dropdown(game, {
    label: "THEME",
    width: sw,
    options: themeOptions,
    value: theme,
    onChange: (v) => onThemeChange(v),
  });
  whiteLabel(controls.theme);
  panel.addItem(controls.theme);

  // Wireframe toggle
  controls.wireframe = new ToggleButton(game, {
    text: "WIREFRAME",
    width: sw,
    height: 28,
    startToggled: showWireframe,
    onToggle: (isOn) => onWireframeToggle(isOn),
  });
  panel.addItem(controls.wireframe);

  panel.layoutAll();
  layoutPanel(panel, game.width, game.height);

  return { panel, controls };
}
