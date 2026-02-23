# Quantum Manifold Demo — Module Structure

The Quantum Manifold demo is split into composable modules under `demos/js/quantum/` to keep the main game file focused on simulation logic.

## File Layout

```
demos/js/
├── quantum-manifold.js      # Main game subclass (QuantumManifoldPlayground)
└── quantum/
    ├── quantuman.config.js  # Configuration constants
    └── quantuman.ui.js      # Composable UI components
```

## quantuman.config.js

Exports all configuration constants:

- **MANIFOLD_PRESETS** — Wave function presets (superposition, gaussian, doubleSlit, etc.) with default parameters
- **PRESET_PARAMS** — Per-preset slider definitions for dynamic parameter UI
- **CONFIG** — Grid, surface, camera, colors, cross-section, collapse, zoom, panel, toggle, gravity, and time scale settings

## quantuman.ui.js

Provides composable, decoupled UI factories. All components receive a context object with callbacks to avoid coupling to the main game.

### Exports

| Function | Purpose |
|----------|---------|
| `createInfoPanel(game, options)` | Top-center info panel with title, equation, and stats |
| `getPresetExplanation(activePreset, waveParams, wellCount)` | Returns explanation content for the info overlay |
| `drawInfoOverlay({ visible, info, width, height })` | Draws the info overlay when visible |
| `createToggleButton(game, { onToggle })` | Settings toggle button (mobile only) |
| `createInfoButton(game, { onToggle })` | Info (?) toggle button |
| `createPanelStateMachine(context)` | Panel visibility state machine (hidden/visible) |
| `layoutPanel(panel, gameWidth, gameHeight)` | Positions panel (desktop sidebar vs mobile bottom sheet) |
| `setupExclusiveSections(panel, sections, context)` | Makes accordion sections mutually exclusive on mobile |
| `createControlPanel(game, callbacks)` | Main accordion panel with all sections and controls |
| `buildParamSliders(game, panel, paramsSection, presetKey, waveParams, callbacks)` | Dynamic parameter sliders per preset |

### Callback Pattern

UI components use callbacks for all state changes. Example:

```javascript
createControlPanel(game, {
  onPresetChange: (key) => game._onPresetChange(key),
  addWell: () => game._addRandomWell(),
  getUpdatingSliders: () => game._updatingSliders,
  waveParams: game._waveParams,
  camera: game.camera,
  // ...
});
```

## quantum-manifold.js

Contains only the `QuantumManifoldPlayground` game subclass:

- Imports config and UI from `./quantum/`
- Implements wave functions, gravity wells, rendering, and update logic
- Wires UI callbacks to game methods
- No inline config or UI construction
