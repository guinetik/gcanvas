# Caos Playground Mobile Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Caos Playground control panel mobile-friendly with a toggleable bottom sheet, reset-to-defaults button, and StateMachine-driven UI state.

**Architecture:** The existing `CaosPlayground` class gets three additions: (1) responsive CONFIG values via `Screen.responsive()`, (2) a `StateMachine` controlling panel visibility on mobile (states: `panel-hidden`, `panel-visible`), (3) a reset button that restores preset defaults. Desktop behavior is unchanged.

**Tech Stack:** GCanvas (Game, AccordionGroup, Button, Screen, StateMachine)

**Design doc:** `docs/plans/2026-02-21-caos-playground-mobile-design.md`

---

### Task 1: Add imports and responsive CONFIG

**Files:**
- Modify: `demos/js/caos-playground.js:15-25` (imports)
- Modify: `demos/js/caos-playground.js:256-268` (CONFIG)

**Step 1: Add Screen and StateMachine imports**

Change the import block to:

```javascript
import {
  FPSCounter,
  Slider,
  Dropdown,
  Button,
  ToggleButton,
  Stepper,
  AccordionGroup,
  Painter,
  Screen,
} from "../../src/index";
import { StateMachine } from "../../src/state/state-machine.js";
import { Attractor3DDemo, DEFAULTS, deepMerge } from "./attractor-3d-demo.js";
```

Note: `Screen` is available from `src/index` via the `io` barrel export. `StateMachine` is imported directly since it's not in the main barrel.

**Step 2: Make CONFIG responsive**

Replace the CONFIG block with:

```javascript
const CONFIG = {
  panel: {
    width: 300,           // Desktop width; overridden at runtime on mobile
    padding: 14,
    marginRight: 16,
    marginTop: 16,
    debugColor: "rgba(0, 255, 0, 0.18)",
    spacing: 10,
    mobileMaxHeight: 0.75, // 75% of screen height
    mobilePadding: 10,
  },
  accordion: {
    headerHeight: 28,
  },
  toggle: {
    margin: 12,
    width: 90,
    height: 32,
  },
};
```

**Step 3: Verify dev server runs**

Run: `npm run dev`
Expected: No import errors, demo loads unchanged on desktop.

**Step 4: Commit**

```bash
git add demos/js/caos-playground.js
git commit -m "feat(caos): add Screen and StateMachine imports, responsive CONFIG"
```

---

### Task 2: Add StateMachine and toggle button for mobile panel visibility

**Files:**
- Modify: `demos/js/caos-playground.js:284-299` (init method)

**Step 1: Initialize Screen and StateMachine in init()**

After `this._buildPanel();` (line 298), add the mobile setup:

```javascript
    // ─── Mobile: Screen detection + panel toggle ──────────────────────
    Screen.init(this);
    this._buildToggleButton();
    this._initPanelStateMachine();
```

**Step 2: Add `_buildToggleButton()` method**

Add after `_buildPanel()` method (after line 529):

```javascript
  // ─── Mobile Toggle Button ──────────────────────────────────────────

  _buildToggleButton() {
    this._toggleBtn = new Button(this, {
      text: "\u2699 Settings",
      width: CONFIG.toggle.width,
      height: CONFIG.toggle.height,
      onClick: () => this._togglePanel(),
    });
    this._toggleBtn.x = CONFIG.toggle.margin + CONFIG.toggle.width / 2;
    this._toggleBtn.y = CONFIG.toggle.margin + CONFIG.toggle.height / 2;
    this.pipeline.add(this._toggleBtn);

    // Only show on mobile
    this._toggleBtn.visible = Screen.isMobile;
    this._toggleBtn.interactive = Screen.isMobile;
  }
```

**Step 3: Add `_initPanelStateMachine()` method**

Add after `_buildToggleButton()`:

```javascript
  _initPanelStateMachine() {
    this._panelFSM = new StateMachine({
      initial: Screen.isMobile ? "panel-hidden" : "panel-visible",
      context: this,
      states: {
        "panel-hidden": {
          enter() {
            this.panel.visible = false;
            this.panel.interactive = false;
            if (this._toggleBtn) {
              this._toggleBtn.text = "\u2699 Settings";
            }
          },
        },
        "panel-visible": {
          enter() {
            this.panel.visible = true;
            this.panel.interactive = true;
            if (Screen.isMobile && this._toggleBtn) {
              this._toggleBtn.text = "\u2716 Close";
            }
          },
        },
      },
    });
  }
```

**Step 4: Add `_togglePanel()` method**

```javascript
  _togglePanel() {
    if (this._panelFSM.is("panel-hidden")) {
      this._panelFSM.setState("panel-visible");
    } else {
      this._panelFSM.setState("panel-hidden");
    }
  }
```

**Step 5: Test on desktop**

Run: `npm run dev`, open Caos Playground
Expected: Toggle button NOT visible on desktop. Panel visible as before. No behavior change.

**Step 6: Test on mobile**

Open in Chrome DevTools mobile emulation (e.g. iPhone SE or Galaxy Fold).
Expected: Toggle button visible top-left. Panel hidden. Tapping "Settings" shows panel, button changes to "Close". Tapping "Close" hides panel.

**Step 7: Commit**

```bash
git add demos/js/caos-playground.js
git commit -m "feat(caos): add mobile toggle button and panel StateMachine"
```

---

### Task 3: Responsive panel positioning (bottom sheet on mobile)

**Files:**
- Modify: `demos/js/caos-playground.js` — `_buildPanel()` and `onResize()`

**Step 1: Update `_buildPanel()` for responsive width**

Replace lines 313-330 of `_buildPanel()` (the panel creation and positioning) with:

```javascript
  _buildPanel() {
    const isMobile = Screen.isMobile;
    const panelWidth = isMobile
      ? this.width - 20
      : CONFIG.panel.width;
    const padding = isMobile
      ? CONFIG.panel.mobilePadding
      : CONFIG.panel.padding;
    const { debugColor, spacing } = CONFIG.panel;
    const cfg = this.config;

    this.panel = new AccordionGroup(this, {
      width: panelWidth,
      padding,
      spacing,
      headerHeight: CONFIG.accordion.headerHeight,
      debug: true,
      debugColor,
    });
    this._layoutPanel();
    this.pipeline.add(this.panel);

    const sw = panelWidth - padding * 2;
    this._controls = {};
```

Then update ALL slider/stepper/dropdown `width: sw` references in the method to use the same `sw` variable (they already do via the `sw` const, so just ensure the `sw` calc uses `panelWidth` instead of `width`).

**Step 2: Add `_layoutPanel()` helper**

Add after `_togglePanel()`:

```javascript
  _layoutPanel() {
    if (Screen.isMobile) {
      // Bottom sheet: full width, anchored to bottom
      const panelWidth = this.width - 20;
      this.panel.x = this.width / 2;
      this.panel.y = this.height - 10; // 10px margin from bottom
      // Anchor to bottom: panel draws upward from y
      // AccordionGroup uses center origin, so offset by half height
      // We'll adjust after layoutAll() when height is known
    } else {
      // Desktop: right sidebar
      this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
      this.panel.y = CONFIG.panel.marginTop;
    }
  }
```

**Step 3: Update `onResize()` for responsive repositioning**

Replace the existing `onResize()`:

```javascript
  /** @override */
  onResize() {
    super.onResize();
    if (!this.panel) return;

    this._layoutPanel();

    // Update toggle button visibility based on new screen size
    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }

    // On desktop, ensure panel is always visible
    if (!Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-visible");
    } else if (Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-hidden");
    }
  }
```

**Step 4: Adjust panel Y after layout for bottom-sheet positioning**

At the end of `_buildPanel()`, after `this.panel.layoutAll();`, add:

```javascript
    // After layout, adjust Y for bottom-sheet mode
    if (Screen.isMobile) {
      const maxH = this.height * CONFIG.panel.mobileMaxHeight;
      const panelH = Math.min(this.panel._height || 400, maxH);
      this.panel.y = this.height - panelH / 2 - 10;
    }
```

**Step 5: Test mobile layout**

Open in DevTools mobile emulation.
Expected: Panel appears at bottom of screen when toggled, full-width with 75% max height.

**Step 6: Commit**

```bash
git add demos/js/caos-playground.js
git commit -m "feat(caos): responsive bottom-sheet panel on mobile"
```

---

### Task 4: Add Reset button

**Files:**
- Modify: `demos/js/caos-playground.js` — `_buildPanel()` method and new `_resetToDefaults()` method

**Step 1: Add Reset button next to Restart in `_buildPanel()`**

Replace the restart button block (lines 520-525) with:

```javascript
    // ── Reset + Restart buttons (always visible, not in a section) ────
    this._controls.reset = new Button(this, {
      text: "Reset Defaults", width: sw, height: 32,
      onClick: () => this._resetToDefaults(),
    });
    this.panel.addItem(this._controls.reset);

    this._controls.restart = new Button(this, {
      text: "Restart", width: sw, height: 32,
      onClick: () => this._onAttractorChange(this._activePreset),
    });
    this.panel.addItem(this._controls.restart);
```

**Step 2: Add `_resetToDefaults()` method**

Add after `_onAttractorChange()`:

```javascript
  // ─── Reset to Preset Defaults ─────────────────────────────────────

  _resetToDefaults() {
    const preset = ATTRACTOR_PRESETS[this._activePreset];
    if (!preset) return;

    // Re-apply the full preset (same as switching to same attractor)
    this._onAttractorChange(this._activePreset);

    console.log(`Reset ${preset.label} to defaults`);
  }
```

Note: `_onAttractorChange` already reads from `ATTRACTOR_PRESETS`, calls `switchAttractor` with preset values, and updates all slider values. So "reset" is effectively re-selecting the current attractor, which restores all defaults. The only difference from "Restart" is semantic — Restart keeps current slider values, Reset reverts them.

Wait — looking more carefully, `_onAttractorChange` already calls `switchAttractor(key, preset)` which rebuilds everything from scratch. So both Reset and Restart currently do the same thing. The distinction only matters if Restart should keep current slider values.

**Step 3: Differentiate Restart from Reset**

Update the Restart button's onClick to restart without resetting config:

```javascript
    this._controls.restart = new Button(this, {
      text: "Restart", width: sw, height: 32,
      onClick: () => {
        // Restart simulation with current slider values (don't reset to preset)
        this.switchAttractor(this._activePreset, {
          ...this.config,
          maxSegments: 250000,
        });
      },
    });
```

And Reset stays as calling `_onAttractorChange` which reloads from `ATTRACTOR_PRESETS`:

```javascript
    this._controls.reset = new Button(this, {
      text: "Reset Defaults", width: sw, height: 32,
      onClick: () => this._resetToDefaults(),
    });
```

**Step 4: Test both buttons**

1. Load demo, change some sliders (e.g. time step, hue)
2. Click "Restart" — simulation restarts but sliders keep their modified values
3. Click "Reset Defaults" — sliders revert to preset defaults AND simulation restarts

**Step 5: Commit**

```bash
git add demos/js/caos-playground.js
git commit -m "feat(caos): add Reset Defaults button, differentiate from Restart"
```

---

### Task 5: Polish and edge cases

**Files:**
- Modify: `demos/js/caos-playground.js`

**Step 1: Handle `_buildParamSliders` responsive width**

In `_buildParamSliders()`, the `sw` is currently hardcoded from `CONFIG.panel.width`. Make it dynamic:

```javascript
  _buildParamSliders(attractorKey) {
    const panelWidth = Screen.isMobile
      ? this.width - 20
      : CONFIG.panel.width;
    const padding = Screen.isMobile
      ? CONFIG.panel.mobilePadding
      : CONFIG.panel.padding;
    const sw = panelWidth - padding * 2;
```

**Step 2: Collapse all sections on mobile by default**

In `_buildPanel()`, make sections default to collapsed on mobile for space savings:

```javascript
    this._paramsSection = this.panel.addSection("Parameters", {
      expanded: !Screen.isMobile,
    });
    // ...
    const physics = this.panel.addSection("Physics", {
      expanded: !Screen.isMobile,
    });
```

Leave Color and Effects sections as `expanded: false` (already collapsed).

**Step 3: FPS counter repositioning on mobile**

Move FPS counter to bottom-left on mobile so it doesn't overlap the toggle button:

```javascript
    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
```

**Step 4: Test full flow on mobile emulation**

1. Open in mobile emulation
2. Attractor renders full-screen, toggle button top-left, FPS bottom-left
3. Tap "Settings" → panel slides up from bottom as bottom sheet
4. Sections are collapsed by default
5. Expand a section, adjust sliders
6. Tap "Reset Defaults" → sliders revert
7. Tap "Close" → panel hides
8. Resize browser to desktop → panel appears as sidebar automatically

**Step 5: Test on desktop (no regressions)**

1. Panel visible as right sidebar
2. No toggle button visible
3. Reset and Restart buttons both work
4. Sections expand/collapse normally

**Step 6: Commit**

```bash
git add demos/js/caos-playground.js
git commit -m "feat(caos): polish mobile layout, responsive param sliders, section defaults"
```
