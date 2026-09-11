import { GameObject, Painter, AccordionGroup, Slider, Dropdown, Button, Text, VerticalLayout } from "../../src/index.js";
import { coreScales, viewScales, playbackProgress, playbackDecades, SINGULARITY_CONFIG as MODEL } from "./singularity-model.js";

export const UI_CONFIG = {
  panelWidth: 300, margin: 12, panelTop: 48, padding: 14, spacing: 8,
  buttonHeight: 36, toggleWidth: 128, captionBottom: 32, captionOffsetX: 0,
  readout: { width: 368, height: 126, gap: 34, padding: 14, lineHeight: 20, marker: 12 },
  chart: { height: 150, left: 34, right: 10, top: 12, bottom: 26, decadesY: 7 },
  colors: { radius: "#70e2da", height: "#dce8eb", speed: "#f2c879", energy: "#b6a2ff", muted: "#8da9b3" },
};

const formatScale = (value) => `${value.toExponential(2).replace("e+", "e")}×`;

class ConcentrationReadout extends GameObject {
  constructor(game) {
    super(game, { origin: "top-left", interactive: false });
  }

  get showing() { return this.game.atDisplayLimit || (!this.game.magnify && this.game.corePixelRadius < 1); }
  get heading() {
    if (!this.game.atDisplayLimit) return "CORE SMALLER THAN ONE PIXEL";
    return this.game.magnify ? "PLAYBACK COMPLETE · FOLLOW CORE" : "PLAYBACK COMPLETE · COLLAPSE";
  }

  get lines() {
    const game = this.game;
    if (game.atDisplayLimit && game.magnify) {
      return [this.heading,
        `τ = 1e−12 · physical radius ${formatScale(game.scales.radius)}`,
        `Magnification: ${formatScale(viewScales(game.scales).zoom * game.zoom)}`,
        "Auto zoom keeps the tiny core visible.",
        "Switch to Collapse to see the shrinkage."];
    }
    return [this.heading,
      game.atDisplayLimit ? "τ = 1e−12; T has not been crossed." : "Target marks location, not physical size.",
      `Radius ${formatScale(game.scales.radius)} · speed ${formatScale(game.scales.speed)}`,
      game.atDisplayLimit ? "The limit is radius → 0, speed → ∞." : "The core keeps shrinking as speed grows.",
      game.atDisplayLimit ? "Replay to watch the collapse again." : "Choose Follow core for a magnified view."];
  }

  draw() {
    super.draw();
    if (!this.showing) return;
    const game = this.game, c = UI_CONFIG.readout, { cx, cy } = game.field;
    const width = Math.min(c.width, game.width - UI_CONFIG.margin * 2);
    const left = cx - width / 2, top = cy + c.gap;
    const color = game.atDisplayLimit ? UI_CONFIG.colors.speed : UI_CONFIG.colors.radius;
    // This fixed-size target locates the unresolved core; it is not a core boundary.
    if (!game.magnify) {
      for (const sign of [-1, 1]) {
        Painter.lines.line(cx + sign * c.marker, cy, cx + sign * c.marker / 2, cy, color, 1);
        Painter.lines.line(cx, cy + sign * c.marker, cx, cy + sign * c.marker / 2, color, 1);
      }
    }
    Painter.shapes.roundRect(left, top, width, c.height, 8, game.theme.colors.darkBg, color, 1);
    Painter.useCtx((ctx) => {
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      this.lines.forEach((line, i) => Painter.text.fillText(line, left + c.padding, top + c.padding + i * c.lineHeight,
        i === 0 ? color : UI_CONFIG.colors.height, `${game.compact ? 10 : 12}px ${game.theme.fonts.family}`));
    }, { saveState: true });
  }
}

class ScaleChart extends GameObject {
  constructor(game, width) {
    super(game, { width, height: UI_CONFIG.chart.height, origin: "center", interactive: false });
    this.end = coreScales(MODEL.maxDecades);
  }

  draw() {
    super.draw();
    const c = UI_CONFIG.chart;
    const left = -this.width / 2, top = -this.height / 2;
    const x = left + c.left, width = this.width - c.left - c.right;
    const height = this.height - c.top - c.bottom;
    const y = (exponent) => top + c.top + height / 2 - exponent / c.decadesY * height / 2;
    const font = `10px ${this.game.theme.fonts.family}`;
    for (const exponent of [-6, 0, 6]) {
      Painter.lines.line(x, y(exponent), x + width, y(exponent), this.game.theme.colors.subtleBorder, 1);
      Painter.text.fillText(`1e${exponent}`, left, y(exponent) + 3, UI_CONFIG.colors.muted, font);
    }
    for (const key of ["speed", "radius", "energy"]) {
      Painter.lines.line(x, y(0), x + width, y(Math.log10(this.end[key])), UI_CONFIG.colors[key], 1.5);
    }
    const cursor = x + this.game.decades / MODEL.maxDecades * width;
    Painter.lines.line(cursor, top + c.top, cursor, top + c.top + height, UI_CONFIG.colors.height, 1);
    Painter.text.fillText("τ = 1", x, top + this.height - 5, UI_CONFIG.colors.muted, font);
    Painter.text.fillText("τ = 1e−12", x + width - 62, top + this.height - 5, UI_CONFIG.colors.muted, font);
  }
}

export function buildSingularityUI(game) {
  const c = UI_CONFIG;
  const panel = new AccordionGroup(game, {
    width: Math.min(c.panelWidth, game.width - c.margin * 2),
    padding: game.compact ? 8 : c.padding, spacing: game.compact ? 4 : c.spacing,
    headerHeight: game.compact ? 24 : 28, origin: "top-left",
    debug: true, debugColor: game.theme.colors.subtleBorder,
  });
  game.panel = panel;
  const draw = panel.draw.bind(panel);
  panel.draw = () => {
    Painter.shapes.rect(0, 0, panel.width * panel.scaleX, panel.height * panel.scaleY, game.theme.colors.darkBg);
    draw();
  };
  game.pipeline.add(panel);
  game.limitReadout = new ConcentrationReadout(game);
  game.pipeline.add(game.limitReadout);
  const controls = game.controls = {};
  controls.timeline = new Slider(game, {
    label: "PLAYBACK TIMELINE", width: panel.itemWidth, origin: "center",
    min: 0, max: 1, step: 0.0001, value: playbackProgress(game.decades), friction: 1,
    formatValue: (value) => `${(value * 100).toFixed(1)}%`,
    onChange: (value) => { if (!game.syncing) { game.paused = true; game.setTime(playbackDecades(value)); } },
  });
  panel.addItem(controls.timeline);
  game.pauseButton = new Button(game, { text: "Pause", width: panel.itemWidth, height: c.buttonHeight, origin: "center", onClick: () => game.togglePause() });
  game.resetButton = new Button(game, { text: "Reset experiment", width: panel.itemWidth, height: c.buttonHeight, origin: "center", onClick: () => game.reset() });
  panel.addItem(game.pauseButton);
  panel.addItem(game.resetButton);
  const view = panel.addSection("View & motion", { expanded: !game.compact });
  const scales = panel.addSection("Core scales", { expanded: !game.compact });
  game.sections = [view, scales];
  for (const [name, label, value, options, apply] of [
    ["view", "VIEW", game.magnify ? "magnify" : "fixed", [{ label: "Collapse · fixed scale", value: "fixed" }, { label: "Follow core · magnified", value: "magnify" }], (value) => { game.magnify = value === "magnify"; }],
    ["rate", "PLAYBACK", game.rate, [{ label: "Slow", value: 0.5 }, { label: "Normal", value: 1 }, { label: "Fast", value: 2 }], (value) => { game.rate = value; }],
    ["pulses", "ANNULAR PULSES", game.pulses ? "on" : "off", [{ label: "Show schematic", value: "on" }, { label: "Hide schematic", value: "off" }], (value) => { game.pulses = value === "on"; }],
  ]) {
    controls[name] = new Dropdown(game, { label, value, options, width: panel.itemWidth, origin: "center",
      onChange: (value) => { if (!game.syncing) { apply(value); game.syncUI(); } } });
    view.addItem(controls[name]);
  }
  controls.zoom = new Slider(game, {
    label: "CAMERA ZOOM · MOUSE WHEEL", width: panel.itemWidth, origin: "center",
    min: game.zoomRange.min, max: game.zoomRange.max, step: 0.01, value: game.zoom, friction: 1,
    formatValue: (value) => `${value.toFixed(2)}×`,
    onChange: (value) => { if (!game.syncing) game.setZoom(value); },
  });
  view.addItem(controls.zoom);
  controls.autoMove = new Slider(game, {
    label: "AUTO MOVE · Y AXIS", width: panel.itemWidth, origin: "center",
    min: 0, max: game.maxAutoMove, step: 1, value: game.autoMove, friction: 1,
    formatValue: (value) => value === 0 ? "Off" : `${value.toFixed(0)}°/s`,
    onChange: (value) => { if (!game.syncing) game.autoMove = value; },
  });
  view.addItem(controls.autoMove);
  game.metrics = {};
  for (const key of ["radius", "height", "speed", "energy"]) {
    const item = new Text(game, "", { font: `12px ${game.theme.fonts.family}`, color: c.colors[key], origin: "center", align: "center", interactive: false });
    game.metrics[key] = item;
    scales.addItem(item);
  }
  scales.addItem(new ScaleChart(game, panel.itemWidth));
  for (const section of game.sections) {
    const toggle = section.toggle.bind(section);
    section.toggle = (force) => {
      if (game.compact && force !== false && !section.expanded) for (const other of game.sections) if (other !== section) other.toggle(false);
      toggle(force);
    };
  }
  const layout = panel.layout.bind(panel);
  panel.layout = () => { layout(); game.layoutUI(); };

  game.toggleButton = new Button(game, {
    text: "Controls", width: c.toggleWidth, height: c.buttonHeight, origin: "center",
    x: c.margin + c.toggleWidth / 2, y: c.margin + c.buttonHeight / 2,
    onClick: () => { game.clean = false; game.panelOpen = !game.panelOpen; game.layoutUI(); },
  });
  game.pipeline.add(game.toggleButton);
  const caption = game.caption = new VerticalLayout(game, { spacing: c.spacing, align: "center", origin: "top-left", interactive: false });
  caption.getLayoutOffset = () => ({ offsetX: 0, offsetY: 0 });
  const calculateLayout = caption.calculateLayout.bind(caption);
  caption.calculateLayout = () => {
    const result = calculateLayout();
    result.positions.forEach((p, i) => { p.x += caption.children[i].width / 2; });
    return result;
  };
  const captionDraw = caption.draw.bind(caption);
  caption.draw = () => {
    Painter.shapes.roundRect(-c.padding, -c.padding, caption.width + c.padding * 2, caption.height + c.padding * 2, 8, game.theme.colors.darkBg, game.theme.colors.subtleBorder, 1);
    captionDraw();
  };
  for (const [name, text, size, color] of [
    ["title", "FLUID SINGULARITIES", game.compact ? 18 : 26, c.colors.speed],
    ["magnification", "", game.compact ? 10 : 12, c.colors.radius],
    ["status", "", game.compact ? 10 : 12, c.colors.height],
    ["hint", "Schematic geometry · drag to orbit", game.compact ? 9 : 11, c.colors.muted],
  ]) {
    game[name] = new Text(game, text, { font: `${size}px ${game.theme.fonts.family}`, color, origin: "center", align: "center", interactive: false });
    caption.add(game[name]);
  }
  game.pipeline.add(caption);
  game.syncUI();
  for (const text of Object.values(game.metrics)) text.update(0);
  panel.layoutAll();
  game.uiCompact = game.compact;
  game.layoutUI();
}

export function syncSingularityUI(game) {
  if (!game.controls) return;
  game.syncing = true;
  game.controls.timeline.value = playbackProgress(game.decades);
  game.controls.zoom.value = game.zoom;
  game.controls.autoMove.value = game.autoMove;
  game.syncing = false;
  for (const [key, label] of [["radius", "Radius · τ^0.5"], ["height", "Height · τ^0.495"], ["speed", "Speed · τ^-0.505"], ["energy", "Core energy · τ^0.485"]]) {
    game.metrics[key].text = `${label}  ${formatScale(game.scales[key])}`;
  }
  game.pauseButton.text = game.paused ? (game.decades === MODEL.maxDecades ? "Replay" : "Play") : "Pause";
  game.magnification.text = game.magnify ? `Follow core · ${formatScale(viewScales(game.scales).zoom * game.zoom)} magnification` : `Collapse · ${game.zoom.toFixed(2)}× camera zoom`;
  game.status.text = game.atDisplayLimit ? "Playback complete · Replay to restart" : `τ = ${game.scales.tau.toExponential(2)} · time remaining`;
  game.hint.text = game.magnify ? "Auto magnification hides contraction · wheel zooms" : "Faint outline = starting size · wheel zooms";
}
