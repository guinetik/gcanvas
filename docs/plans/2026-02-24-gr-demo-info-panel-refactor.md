# GR Demo Info Panel Refactor — Schwarzschild & Kerr

**Date:** 2026-02-24
**Status:** Schwarzschild complete, Kerr planned

## Summary

Refactor the metric tensor info panels in both GR demos (Schwarzschild and Kerr) from inline `GameObject` classes using raw primitives into standalone modal overlay modules using proper GCanvas abstractions and state management.

## Motivation

The original `MetricPanelGO` / `KerrMetricPanelGO` implementations had several issues:

1. **Raw primitives** — Used `TextShape`, `Rectangle`, `verticalLayout()` utility instead of proper GameObjects (`Text`, `VerticalLayout`)
2. **No state management** — Visibility toggled via ad-hoc boolean flags instead of `StateMachine`
3. **Raw event handlers** — Used `canvas.addEventListener("click")` instead of `game.events`
4. **Monolithic files** — Panel code was inlined in the demo file, inflating it to 800+ lines
5. **Painter.useCtx** in panel code — Should use GCanvas shape/GO abstractions exclusively
6. **Dismiss logic in parent** — The demo handled click-outside dismiss instead of the panel owning its behavior

## Architecture (Schwarzschild — completed)

### File Structure

```
demos/js/schwarzschild.js       — Demo class, buttons, rendering
demos/js/schwarzschild.info.js  — SchwarzschildInfoPanel (modal overlay)
```

### Key Patterns

#### 1. Text GameObjects + VerticalLayout

All label rows use `Text` from `src/game/objects/text.js` inside a `VerticalLayout` from `src/game/objects/layoutscene.js`. No raw `TextShape` or `verticalLayout()` utility.

```javascript
const textGo = new Text(this.game, "Time: g_tt = -(1 - rs/r) = -0.8000", {
  font, color: "#f88", align: "left", baseline: "top",
});
this._layout.add(textGo);
```

#### 2. Rectangle Shapes for Backdrop/Panel

`Rectangle` shapes with `origin: "top-left"` handle their own positioning via `Renderable.render()` — no manual `Painter.save/translateTo/restore` needed. Just set `.x`, `.y`, `.width`, `.height` before calling `.render()`.

#### 3. StateMachine for Open/Closed

```javascript
this._fsm = new StateMachine({
  initial: "closed",
  context: this,
  states: {
    closed: {
      enter() { this.visible = false; this.interactive = false; },
    },
    open: {
      enter() { this.visible = true; this.interactive = true; this._justOpened = true; },
    },
  },
});
```

#### 4. Game Events for Dismiss

The panel listens for `inputup` on `game.events`. If the click is outside the panel bounds, it transitions to `closed` and emits `"panel:dismiss"`. The parent demo listens for this event to untoggle the settings button.

```javascript
// In panel:
this.game.events.on("inputup", this._onInputUp);
// On outside click:
this._fsm.setState("closed");
this.game.events.emit("panel:dismiss");

// In demo:
this.events.on("panel:dismiss", () => {
  this._settingsBtn.toggle(false);
});
```

The `_justOpened` flag prevents the same `inputup` event that opened the panel from immediately dismissing it.

#### 5. ToggleButton + Permanent Buttons

Settings (gear icon) uses `ToggleButton`, shuffle mass (refresh icon) uses `Button`. Both are always visible at top-left, side by side, on all screen sizes.

#### 6. Manual Render Order

The info panel is NOT in the pipeline. It renders manually at the very end of `render()` so it overlays all 3D scene content (grid, horizon, orbiter, graph). The tooltip also renders after the panel.

```javascript
render() {
  super.render();        // pipeline (buttons, info header, fps)
  this.drawGrid(cx, cy);
  this.drawHorizon(cx, cy);
  this.drawOrbiter(cx, cy);
  this.drawEffectivePotential();
  this.drawControls(w, h);
  this.infoPanel.render();  // modal overlay
  this.tooltip.render();    // always on top
}
```

#### 7. Responsive Sizing

All font sizes, spacing, and padding use `Screen.responsive(mobile, tablet, desktop)`.

#### 8. Combined Label + Value Rows

Each row is a single `Text` with both the casual name, formula, and live value:
```
Time: g_tt = -(1 - rs/r) = -0.8000
Event Horizon: rs = 2M = 2.00
ISCO: r_isco = 3rs = 6.00
```

### Issues Encountered

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Panel not centered | Used `draw()` override (Scene transforms applied) | Override `render()` to bypass Scene transforms |
| Modal behind 3D scene | Panel was in pipeline, rendered before manual draw calls | Remove from pipeline, render manually last |
| Tooltip behind modal | Tooltip was in pipeline | Remove from pipeline, render after info panel |
| Click to open immediately dismisses | Same `inputup` event opens panel then triggers dismiss | `_justOpened` flag consumed on first inputup |
| Hit detection mismatch | Complex coordinate math didn't account for VerticalLayout's `-h/2` offset | Compute layout-local Y as `screenY - layout.y`, compare to `child.y` |

## Plan: Kerr Demo Refactor

Apply the same patterns to `demos/js/kerr.js`.

### Changes Required

#### 1. Create `demos/js/kerr.info.js`

Extract `KerrMetricPanelGO` (lines 99-361) into a new `KerrInfoPanel` class extending `Scene`:

- Replace `TextShape` rows with `Text` GameObjects
- Replace `verticalLayout()` + `applyLayout()` with `VerticalLayout`
- Replace `Rectangle` bg rendered via `GameObject.draw()` with positioned `Rectangle` shapes
- Add `StateMachine` with `closed`/`open` states
- Add `inputup` handler via `game.events` for dismiss
- Emit `"panel:dismiss"` event
- Combined label + value per row with casual names (same format as Schwarzschild)
- Use `Screen.responsive()` for all sizing
- Override `render()` for screen-space drawing

Kerr-specific rows:
- Title: "Kerr Metric (Rotating Black Hole)"
- Equation: "ds² = gμν dxμ dxν (Boyer-Lindquist)"
- Mass, Spin parameter
- Diagonal: Time (g_tt), Radial (g_rr), Polar (g_θθ), Azimuthal (g_φφ)
- **Frame Dragging: g_tφ** (highlighted — the key Kerr term)
- Outer Horizon (r+), Inner Horizon (r-), Ergosphere (r_ergo)
- Prograde ISCO, Retrograde ISCO
- Orbiter position + Ω_drag

#### 2. Update `demos/js/kerr.js`

- Remove `KerrMetricPanelGO` class entirely
- Remove imports: `GameObject`, `Rectangle`, `TextShape`, `verticalLayout`, `applyLayout`
- Add imports: `ToggleButton`, `Text`, `Scene`, `applyAnchor`, `VerticalLayout`
- Import `KerrInfoPanel` from `./kerr.info.js`
- Add `_buildButtons()`: ToggleButton (settings) + Button (new black hole), side by side at top-left
- Add info header (title, equation, mass/spin/orbit summary) like Schwarzschild
- Remove panel from pipeline, render manually last
- Remove tooltip from pipeline, render after panel
- Listen for `"panel:dismiss"` to untoggle settings button
- Add `_buildInfoHeader()` with zeta-style summary at top-left

#### 3. Kerr-Specific Considerations

- The `formationProgress` / lambda interpolation stays in the demo — not related to the info panel
- The "New Black Hole" button replaces the current `Button` with anchor-relative positioning. Move to fixed top-left like Schwarzschild.
- Kerr has more rows than Schwarzschild (spin, g_tφ, inner horizon, ergosphere, two ISCOs) — ensure panel sizing accommodates this
- Frame dragging term (g_tφ) should be visually emphasized (bold, yellow `#ff0`)
