# Caos Playground - Mobile Responsive Design

**Date:** 2026-02-21
**Status:** Approved
**File:** `demos/js/caos-playground.js`

## Problem

The Caos Playground control panel (AccordionGroup with sliders, dropdowns, steppers) works well on desktop but is unusable on mobile/narrow screens (tested on Z Fold). The panel obscures the attractor and controls are hard to interact with.

## Design

### 1. Bottom Sheet Panel (Mobile)

When `Screen.isMobile`:
- Panel repositions to bottom of screen, full-width with reduced padding
- Panel height capped at **75% screen height**
- Panel width: `Screen.responsive(this.width - 20, this.width - 20, 300)` (full-width mobile/tablet, 300px desktop)
- Slider/stepper widths scale with panel width
- On desktop: behavior is unchanged (right-aligned sidebar)

### 2. Toggle Button (Top-Left, Mobile Only)

- Small Button anchored top-left with settings icon/label
- Only visible on mobile (`Screen.isMobile`)
- Tapping toggles panel visibility via StateMachine

### 3. StateMachine for Panel Visibility

```
States: panel-hidden <-> panel-visible
```

- `panel-hidden`: Panel hidden (`visible=false, interactive=false`), toggle button shown
- `panel-visible`: Panel shown as bottom sheet, toggle button changes to "Close"
- Desktop: panel always visible, FSM not used

StateMachine controls:
- `panel.visible` / `panel.interactive`
- Toggle button text/state
- Initialized in `init()`, transitions triggered by toggle button tap

### 4. Reset Button

New "Reset" button alongside existing "Restart":
- **Restart** (existing): Restarts simulation with current slider values
- **Reset** (new): Resets all sliders to `ATTRACTOR_PRESETS[activePreset]` defaults, then restarts

Implementation:
1. Read defaults from `ATTRACTOR_PRESETS[this._activePreset]`
2. Set `_updatingSliders = true`
3. Update all slider `.value` properties to preset defaults
4. Set `_updatingSliders = false`
5. Call `_onAttractorChange(this._activePreset)` to apply

### Layout (Mobile)

```
+----------------------------------+
| [Settings]         (top-left)    |
|                                  |
|       ATTRACTOR CANVAS           |
|                                  |
|                                  |
+----------------------------------+  <- 75% height
| ATTRACTOR: [Lorenz      v]      |
| Parameters >  Physics >  ...    |
| [slider] [slider] [stepper]     |
| [Reset]  [Restart]              |
+----------------------------------+
```

### Files Changed

- `demos/js/caos-playground.js` only

### Imports Added

- `Screen` (from src/index.js)
- `StateMachine` (from src/state/state-machine.js)
