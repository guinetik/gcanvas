# Quantum Manifold Mobile Enhancements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Quantum Manifold Playground fully mobile-friendly using the same patterns established in Caos Playground and Hydrogen Orbital demos.

**Architecture:** The existing `QuantumManifoldPlayground` class gets: (1) a `StateMachine` controlling panel visibility on mobile (states: `panel-hidden`, `panel-visible`), (2) a 44x44 toggle button for mobile panel access, (3) responsive panel sizing via `Screen.responsive()` with bottom-sheet positioning on mobile, (4) exclusive accordion sections on mobile, (5) panel background fill, (6) a Reset Defaults button separate from Restart, and (7) bottom-anchor relayout on section toggle. Desktop behavior is unchanged.

**Tech Stack:** GCanvas (Game, AccordionGroup, Button, Screen, StateMachine, Painter)

**Reference:** `docs/plans/2026-02-21-caos-playground-mobile-enhancements.md` documents the patterns being applied.

---

### Task 1: Add StateMachine import and expand CONFIG with mobile values

**Files:**
- Modify: `demos/js/quantum-manifold.js:16-35` (imports)
- Modify: `demos/js/quantum-manifold.js:140-213` (CONFIG)

**Step 1: Add StateMachine import**

The file already imports `Screen` from `../../src/index.js` (line 26). Add `StateMachine` as a direct import since it's not in the main barrel:

```javascript
import { StateMachine } from "../../src/state/state-machine.js";
```

Add this after line 36 (`import { Complex } ...`).

**Step 2: Expand CONFIG.panel with mobile values**

Replace the current `CONFIG.panel` block (lines 195-201):

```javascript
  panel: {
    width: 280,
    padding: 14,
    marginRight: 16,
    marginTop: 16,
    spacing: 10,
    mobilePadding: 12,
    mobileMaxHeight: 0.85,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
```

**Step 3: Add CONFIG.toggle**

Add after `CONFIG.panel` (before `CONFIG.gravity`):

```javascript
  toggle: {
    margin: 12,
    width: 44,
    height: 44,
  },
```

**Step 4: Verify dev server runs**

Run: `npm run dev`
Expected: No import errors, demo loads unchanged on desktop.

**Step 5: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum-manifold): add StateMachine import and mobile CONFIG values"
```

---

### Task 2: Build toggle button and panel StateMachine

**Files:**
- Modify: `demos/js/quantum-manifold.js` — `init()` method and new methods

**Step 1: Add toggle button and FSM initialization in `init()`**

After the existing `this._buildUI();` call (line 245), add:

```javascript
    this._buildToggleButton();
    this._initPanelStateMachine();
```

**Step 2: Add `_buildToggleButton()` method**

Add after `_buildUI()` method (after the `this.panel.layoutAll();` closing brace around line 696):

```javascript
  // ─── Mobile Toggle Button ──────────────────────────────────────────

  _buildToggleButton() {
    this._toggleBtn = new Button(this, {
      text: "\u2699",
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
              this._toggleBtn.text = "\u2699";
            }
          },
        },
        "panel-visible": {
          enter() {
            this.panel.visible = true;
            this.panel.interactive = true;
            if (Screen.isMobile && this._toggleBtn) {
              this._toggleBtn.text = "\u2716";
            }
          },
        },
      },
    });
  }
```

Note: State `enter()` callbacks use regular functions (not arrows) because `context: this` binds them to the QuantumManifoldPlayground instance.

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

Run: `npm run dev`, open Quantum Manifold demo.
Expected: Toggle button NOT visible on desktop. Panel visible as before. No behavior change.

**Step 6: Test on mobile**

Open in Chrome DevTools mobile emulation (e.g. iPhone SE).
Expected: Toggle button visible top-left. Panel hidden. Tapping gear shows panel, icon changes to ✖. Tapping ✖ hides panel.

**Step 7: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum-manifold): add mobile toggle button and panel StateMachine"
```

---

### Task 3: Responsive panel layout with bottom-sheet on mobile

**Files:**
- Modify: `demos/js/quantum-manifold.js` — `_buildUI()`, new `_layoutPanel()`, `onResize()`

**Step 1: Make `_buildUI()` responsive**

Replace lines 472-487 (panel creation and positioning) with:

```javascript
  _buildUI() {
    const isMobile = Screen.isMobile;
    const panelWidth = isMobile
      ? this.width - 20
      : CONFIG.panel.width;
    const padding = isMobile
      ? CONFIG.panel.mobilePadding
      : CONFIG.panel.padding;
    const { spacing } = CONFIG.panel;

    this.panel = new AccordionGroup(this, {
      width: panelWidth,
      padding,
      spacing,
      headerHeight: 28,
      debug: true,
      debugColor: "rgba(0, 255, 0, 0.18)",
    });
    this.pipeline.add(this.panel);

    const sw = panelWidth - padding * 2;
    this._controls = {};
```

Keep everything else in `_buildUI()` the same, but ensure all controls use the local `sw` variable (they already do).

**Step 2: Add panel background**

After `this.pipeline.add(this.panel);` and before `const sw = ...`, add:

```javascript
    // Semi-transparent background
    const originalDraw = this.panel.draw.bind(this.panel);
    this.panel.draw = () => {
      Painter.shapes.rect(
        0, 0,
        this.panel._width, this.panel._height,
        CONFIG.panel.backgroundColor
      );
      originalDraw();
    };
```

**Step 3: Add bottom-anchor relayout on section toggle**

After the panel background code, add:

```javascript
    // Reposition panel when sections expand/collapse (bottom-anchor)
    const originalLayout = this.panel.layout.bind(this.panel);
    this.panel.layout = () => {
      originalLayout();
      this._layoutPanel();
    };
```

**Step 4: Call `_layoutPanel()` for initial positioning**

Replace the old positioning lines (`this.panel.x = ...`, `this.panel.y = ...`) with a single call. After `this.pipeline.add(this.panel);` and the patches above, add:

```javascript
    this._layoutPanel();
```

**Step 5: Add `_layoutPanel()` method**

Add after `_togglePanel()`:

```javascript
  _layoutPanel() {
    if (!this.panel) return;
    if (Screen.isMobile) {
      // Bottom sheet: full width - 20px, anchored to bottom
      const panelH = this.panel._height || 300;
      const maxH = this.height * CONFIG.panel.mobileMaxHeight;
      const clampedH = Math.min(panelH, maxH);
      this.panel.x = 10;
      this.panel.y = this.height - clampedH - 10;
    } else {
      // Desktop: right sidebar
      this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
      this.panel.y = CONFIG.panel.marginTop;
    }
  }
```

Note: AccordionGroup uses `origin: "top-left"`, so `x/y` is the top-left corner.

**Step 6: At end of `_buildUI()`, call `_layoutPanel()` after `layoutAll()`**

After the existing `this.panel.layoutAll();` line (end of `_buildUI()`), add:

```javascript
    this._layoutPanel();
```

This ensures the panel is correctly positioned after all sections have been laid out and `_height` is known.

**Step 7: Update `onResize()` for responsive behavior**

Replace the existing `onResize()` method (lines 1419-1428) with:

```javascript
  onResize() {
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );

    if (this.panel) {
      this._layoutPanel();
    }

    // Update toggle button visibility based on new screen size
    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }

    // On desktop, ensure panel is always visible; on mobile, hide
    if (!Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-visible");
    } else if (Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-hidden");
    }
  }
```

**Step 8: Test mobile layout**

Open in DevTools mobile emulation.
Expected: Panel appears at bottom of screen when toggled, full-width with 10px margins. Expanding/collapsing sections keeps panel anchored to bottom.

**Step 9: Test desktop (no regressions)**

Expected: Panel positioned as right sidebar. No toggle button visible.

**Step 10: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum-manifold): responsive bottom-sheet panel on mobile"
```

---

### Task 4: Exclusive sections, collapsed defaults, and responsive FPS counter

**Files:**
- Modify: `demos/js/quantum-manifold.js` — `_buildUI()`, `init()`, new `_setupExclusiveSections()`

**Step 1: Collapse sections by default on mobile**

In `_buildUI()`, update the section creation calls:

```javascript
    // Parameters section — collapsed on mobile
    this._paramsSection = this.panel.addSection("Parameters", {
      expanded: !Screen.isMobile,
    });
```

```javascript
    // Quantum Gravity section — collapsed on mobile
    const gravity = this.panel.addSection("Quantum Gravity", {
      expanded: !Screen.isMobile,
    });
```

Surface and View sections are already `expanded: false`, so leave them unchanged.

**Step 2: Store section references for exclusive behavior**

After all sections are created (before `this.panel.layoutAll()`), collect them:

```javascript
    this._sections = [this._paramsSection, surface, gravity, view];
    if (Screen.isMobile) {
      this._setupExclusiveSections();
    }
```

This means `surface`, `gravity`, and `view` need to be stored as instance variables OR the sections array built from locals. Since these are local variables, assign them before this line:

```javascript
    this._surfaceSection = surface;
    this._gravitySection = gravity;
    this._viewSection = view;
    this._sections = [this._paramsSection, this._surfaceSection, this._gravitySection, this._viewSection];
    if (Screen.isMobile) {
      this._setupExclusiveSections();
    }
```

**Step 3: Add `_setupExclusiveSections()` method**

Add after `_layoutPanel()`:

```javascript
  _setupExclusiveSections() {
    const origToggles = new Map();
    for (const section of this._sections) {
      origToggles.set(section, section.toggle.bind(section));
    }
    for (const section of this._sections) {
      section.toggle = (force) => {
        const willExpand = force !== undefined ? force : !section.expanded;
        if (willExpand) {
          for (const other of this._sections) {
            if (other !== section && other.expanded) {
              origToggles.get(other)(false);
            }
          }
        }
        origToggles.get(section)(force);
      };
    }
  }
```

Each section's original `toggle` is stored in a Map **before** any wrapping, avoiding circular references.

**Step 4: Make FPS counter responsive**

In `init()`, replace the FPS counter creation (lines 247-251):

```javascript
    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);
```

**Step 5: Test mobile**

Open in DevTools mobile emulation.
Expected:
- Parameters and Quantum Gravity sections collapsed by default
- Expanding one section auto-collapses any other expanded section
- FPS counter shows bottom-left (doesn't overlap toggle button)

**Step 6: Test desktop (no regressions)**

Expected: Parameters and Quantum Gravity expanded by default. Multiple sections can be open simultaneously. FPS counter bottom-right.

**Step 7: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum-manifold): exclusive sections, mobile-collapsed defaults, responsive FPS"
```

---

### Task 5: Reset Defaults button and responsive `_buildParamSliders()`

**Files:**
- Modify: `demos/js/quantum-manifold.js` — `_buildUI()`, `_buildParamSliders()`, new `_resetToDefaults()`

**Step 1: Add Reset Defaults button in `_buildUI()`**

Before the existing Restart button block (line 684), add:

```javascript
    // ── Reset + Restart buttons (always visible, not in a section) ────
    this._controls.reset = new Button(this, {
      text: "Reset Defaults",
      width: sw,
      height: 32,
      onClick: () => this._resetToDefaults(),
    });
    this.panel.addItem(this._controls.reset);
```

**Step 2: Differentiate Restart from Reset**

The existing Restart button (line 684-693) calls `this._clearWells()` then `this._onPresetChange()`, which fully resets to preset defaults. Change Restart to preserve current slider values:

```javascript
    this._controls.restart = new Button(this, {
      text: "Restart",
      width: sw,
      height: 32,
      onClick: () => {
        // Restart simulation with current params (don't reset sliders)
        this.time = 0;
        this.isCollapsed = false;
        this.collapseAmount = 0;
        this._clearWells();
        if (this._activePreset === "superposition") {
          this._superPackets = this._generateSuperPackets(
            this._waveParams.numPackets || 3
          );
        }
      },
    });
    this.panel.addItem(this._controls.restart);
```

**Step 3: Add `_resetToDefaults()` method**

Add after `_onPresetChange()`:

```javascript
  _resetToDefaults() {
    this._onPresetChange(this._activePreset);
  }
```

This re-applies the preset from `MANIFOLD_PRESETS`, reverting all slider values AND restarting the simulation.

**Step 4: Make `_buildParamSliders()` responsive**

Replace the hardcoded width calculation (line 699):

```javascript
  _buildParamSliders(presetKey) {
    const panelWidth = Screen.isMobile
      ? this.width - 20
      : CONFIG.panel.width;
    const padding = Screen.isMobile
      ? CONFIG.panel.mobilePadding
      : CONFIG.panel.padding;
    const sw = panelWidth - padding * 2;
```

**Step 5: Test both buttons**

1. Load demo, change some sliders (e.g. amplitude, time scale, add gravity wells)
2. Click "Restart" — simulation restarts (time resets, wells cleared) but sliders keep their modified values
3. Click "Reset Defaults" — sliders revert to preset defaults AND simulation restarts

**Step 6: Test `_buildParamSliders` on mobile**

Switch preset on mobile — param sliders should fill the full panel width.

**Step 7: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum-manifold): add Reset Defaults button, responsive param sliders"
```

---

### Task 6: Final polish and edge case testing

**Files:**
- Modify: `demos/js/quantum-manifold.js`

**Step 1: Verify info panel doesn't overlap toggle button on mobile**

The info panel (`_buildInfoPanel()`) is anchored to `Position.TOP_CENTER` with `anchorOffsetY: 150`. On mobile, the toggle button is at y=34 (margin 12 + height/2 22). The info panel at y=150 should be well clear. If it overlaps, increase `anchorOffsetY` for mobile:

```javascript
    applyAnchor(this.infoPanel, {
      anchor: Position.TOP_CENTER,
      anchorOffsetY: Screen.isMobile ? 80 : 150,
    });
```

Adjust only if visually needed during testing.

**Step 2: Test full mobile flow**

1. Open in mobile emulation
2. Surface renders full-screen, toggle button top-left, FPS bottom-left
3. Tap gear → panel appears as bottom sheet
4. Sections collapsed by default, only one expands at a time
5. Change preset via dropdown → param sliders rebuild at correct width
6. Tap "Reset Defaults" → sliders revert
7. Tap "Restart" → simulation restarts with current values
8. Tap ✖ → panel hides
9. Resize browser to desktop → panel appears as right sidebar, no toggle button

**Step 3: Test desktop (no regressions)**

1. Panel visible as right sidebar, no toggle button
2. Multiple sections can be open simultaneously
3. All sliders, dropdowns, steppers, toggle buttons work
4. Reset Defaults and Restart both work
5. Collapse Wave button works
6. Gravity wells can be added/cleared
7. Cross-section overlay renders correctly
8. FPS counter bottom-right

**Step 4: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(quantum-manifold): polish mobile layout and edge cases"
```
