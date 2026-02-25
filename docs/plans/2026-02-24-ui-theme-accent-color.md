# UI Theme: Accent Color Generator — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `createTheme(accentHex)` function so demos can theme all UI components with a single accent color, then apply cyan to the Quantum Manifold demo.

**Architecture:** A pure function `createTheme("#0ff")` generates a full theme object (same shape as `UI_THEME`). Game stores `this.theme`. Each UI component resolves `game.theme || UI_THEME` in its constructor instead of hardcoding `UI_THEME`.

**Tech Stack:** Vanilla JS, no dependencies. No existing UI tests — this project has no test infrastructure for UI components.

---

### Task 1: Add `createTheme()` to `theme.js`

**Files:**
- Modify: `src/game/ui/theme.js` (append after existing `UI_THEME` export, before `export default`)

**Step 1: Add hex-to-RGB parser and `createTheme` function**

Add this code after the `UI_THEME` object and before `export default UI_THEME`:

```js
/**
 * Parse a 3 or 6 digit hex color to [r, g, b] (0-255).
 * Accepts "#0ff", "#00ffff", "0ff", "00ffff".
 */
function parseHex(hex) {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/**
 * Create a complete UI theme from a single accent color.
 *
 * Returns an object with the same shape as UI_THEME, so it can be
 * used as a drop-in replacement. All shades (dim, glow, hover, etc.)
 * are derived from the accent color's RGB values.
 *
 * @param {string} accentHex - Hex color string, e.g. "#0ff" or "#ff6600"
 * @returns {Object} Full theme object matching UI_THEME structure
 *
 * @example
 * ```js
 * import { createTheme } from "gcanvas";
 * const cyanTheme = createTheme("#0ff");
 * // Use in a Game subclass constructor:
 * this.theme = cyanTheme;
 * ```
 */
export function createTheme(accentHex) {
  const [r, g, b] = parseHex(accentHex);
  const accent = `rgb(${r},${g},${b})`;
  const dim = `rgba(${r},${g},${b},0.7)`;
  const glow = `rgba(${r},${g},${b},0.5)`;
  const subtle = `rgba(${r},${g},${b},0.4)`;
  const active = `rgba(${r},${g},${b},0.15)`;
  const hover = `rgba(${r},${g},${b},0.08)`;
  const fillGlow = `rgba(${r},${g},${b},0.3)`;
  const pulseGlow = `rgba(${r},${g},${b},0.25)`;
  const scrollTrack = `rgba(${r},${g},${b},0.1)`;

  // Darker accent for pressed state
  const pr = Math.floor(r * 0.8);
  const pg = Math.floor(g * 0.8);
  const pb = Math.floor(b * 0.8);
  const pressed = `rgb(${pr},${pg},${pb})`;

  return {
    colors: {
      neonGreen: accent,
      terminalGreen: accent,
      cyanAccent: accent,
      darkBg: "rgba(0, 0, 0, 0.85)",
      darkerBg: "rgba(0, 0, 0, 0.92)",
      hoverBg: accent,
      pressedBg: pressed,
      activeBg: active,
      lightText: accent,
      darkText: "#000",
      dimText: dim,
      subtleBorder: subtle,
      activeBorder: accent,
      glowBorder: glow,
    },
    fonts: { ...UI_THEME.fonts },
    spacing: { ...UI_THEME.spacing },
    button: {
      default: { bg: "rgba(0, 0, 0, 0.85)", stroke: subtle, text: accent },
      hover: { bg: accent, stroke: accent, text: "#000" },
      pressed: { bg: pressed, stroke: accent, text: "#000" },
      active: { bg: active, stroke: accent, text: accent },
    },
    tooltip: {
      bg: "rgba(0, 0, 0, 0.92)",
      border: glow,
      text: accent,
    },
    dropdown: {
      trigger: {
        bg: "rgba(0, 0, 0, 0.85)",
        border: subtle,
        text: accent,
        placeholder: glow,
        arrow: dim,
        hoverBg: hover,
        hoverBorder: accent,
      },
      panel: { bg: "rgba(0, 0, 0, 0.92)", border: glow },
      item: {
        text: dim,
        hoverBg: accent,
        hoverText: "#000",
        selectedText: accent,
      },
      scrollbar: { track: scrollTrack, thumb: subtle },
      label: { text: dim },
    },
    slider: {
      track: {
        bg: "rgba(0, 0, 0, 0.85)",
        border: subtle,
        fill: accent,
        fillGlow: fillGlow,
      },
      thumb: {
        fill: accent,
        stroke: accent,
        glow: glow,
        pulseGlow: pulseGlow,
      },
      label: { text: dim, value: accent, minMax: glow },
    },
  };
}
```

**Step 2: Update the `ui/index.js` export**

In `src/game/ui/index.js`, add:

```js
export { UI_THEME, createTheme } from "./theme.js";
```

(Change line 10 from `export { UI_THEME } from "./theme.js";`)

**Step 3: Verify dev server starts**

Run: `npm run dev`
Expected: No errors, existing demos still work with green theme.

**Step 4: Commit**

```bash
git add src/game/ui/theme.js src/game/ui/index.js
git commit -m "feat(ui): add createTheme() accent color generator"
```

---

### Task 2: Add `theme` property to Game base class

**Files:**
- Modify: `src/game/game.js:34` (inside constructor)

**Step 1: Add theme property**

In `src/game/game.js`, inside the `constructor(canvas)` method, after line 50 (`this.events = new EventEmitter();`), add:

```js
/**
 * Optional UI theme override. Set to a theme object (e.g. from createTheme())
 * to change the accent color of all UI components in this game.
 * Components fall back to UI_THEME (green) when this is null.
 * @type {Object|null}
 */
this.theme = null;
```

**Step 2: Commit**

```bash
git add src/game/game.js
git commit -m "feat(ui): add theme property to Game base class"
```

---

### Task 3: Update Button to resolve theme from game

**Files:**
- Modify: `src/game/ui/button.js:106-114`

**Step 1: Change default color resolution**

In `button.js`, the constructor destructures defaults from `UI_THEME.button.*` at lines 106-114. Change these 9 lines to resolve from the game's theme:

Replace:
```js
      // Terminal × Vercel theme: dark bg, green accents, inverted hover
      colorDefaultBg = UI_THEME.button.default.bg,
      colorDefaultStroke = UI_THEME.button.default.stroke,
      colorDefaultText = UI_THEME.button.default.text,
      colorHoverBg = UI_THEME.button.hover.bg,
      colorHoverStroke = UI_THEME.button.hover.stroke,
      colorHoverText = UI_THEME.button.hover.text,
      colorPressedBg = UI_THEME.button.pressed.bg,
      colorPressedStroke = UI_THEME.button.pressed.stroke,
      colorPressedText = UI_THEME.button.pressed.text,
```

With:
```js
      colorDefaultBg,
      colorDefaultStroke,
      colorDefaultText,
      colorHoverBg,
      colorHoverStroke,
      colorHoverText,
      colorPressedBg,
      colorPressedStroke,
      colorPressedText,
```

Then after the destructuring block (after `} = options;`), add theme resolution:

```js
    // Resolve theme: per-option overrides > game theme > default UI_THEME
    const _t = (game?.theme?.button) || UI_THEME.button;
    colorDefaultBg = colorDefaultBg ?? _t.default.bg;
    colorDefaultStroke = colorDefaultStroke ?? _t.default.stroke;
    colorDefaultText = colorDefaultText ?? _t.default.text;
    colorHoverBg = colorHoverBg ?? _t.hover.bg;
    colorHoverStroke = colorHoverStroke ?? _t.hover.stroke;
    colorHoverText = colorHoverText ?? _t.hover.text;
    colorPressedBg = colorPressedBg ?? _t.pressed.bg;
    colorPressedStroke = colorPressedStroke ?? _t.pressed.stroke;
    colorPressedText = colorPressedText ?? _t.pressed.text;
```

**Step 2: Verify existing demos work**

Open any demo with buttons (e.g. quantum manifold). Buttons should still be green since no game.theme is set yet.

**Step 3: Commit**

```bash
git add src/game/ui/button.js
git commit -m "feat(ui): Button resolves theme from game.theme"
```

---

### Task 4: Update ToggleButton to resolve theme from game

**Files:**
- Modify: `src/game/ui/togglebutton.js:55-58`

**Step 1: Change active color resolution**

Replace lines 55-58:
```js
    this.colorActiveBg = options.colorActiveBg || UI_THEME.button.active.bg;
    this.colorActiveStroke = options.colorActiveStroke || UI_THEME.button.active.stroke;
    this.colorActiveText = options.colorActiveText || UI_THEME.button.active.text;
```

With:
```js
    const _ta = (game?.theme?.button?.active) || UI_THEME.button.active;
    this.colorActiveBg = options.colorActiveBg || _ta.bg;
    this.colorActiveStroke = options.colorActiveStroke || _ta.stroke;
    this.colorActiveText = options.colorActiveText || _ta.text;
```

**Step 2: Commit**

```bash
git add src/game/ui/togglebutton.js
git commit -m "feat(ui): ToggleButton resolves theme from game.theme"
```

---

### Task 5: Update Slider to resolve theme from game

**Files:**
- Modify: `src/game/ui/slider.js:84-98`

**Step 1: Change theme resolution**

Replace line 85:
```js
    const theme = UI_THEME.slider;
```

With:
```js
    const theme = (this.game?.theme?.slider) || UI_THEME.slider;
```

No other changes — the existing `accentColor` override logic and `_colors` build already work off the `theme` variable.

**Step 2: Commit**

```bash
git add src/game/ui/slider.js
git commit -m "feat(ui): Slider resolves theme from game.theme"
```

---

### Task 6: Update Dropdown to resolve theme from game

**Files:**
- Modify: `src/game/ui/dropdown.js:83`

**Step 1: Change theme resolution**

Replace line 83:
```js
    const theme = UI_THEME.dropdown;
```

With:
```js
    const theme = (this.game?.theme?.dropdown) || UI_THEME.dropdown;
```

No other changes — the `_colors` build and `accentColor` override already use the `theme` variable.

**Step 2: Commit**

```bash
git add src/game/ui/dropdown.js
git commit -m "feat(ui): Dropdown resolves theme from game.theme"
```

---

### Task 7: Update Stepper to resolve theme from game

**Files:**
- Modify: `src/game/ui/stepper.js`

This is the most involved change — Stepper has 20+ direct `UI_THEME.*` references scattered across `initComponents()` (lines 130-249) and `updateButtonStates()` (lines 440-481).

**Step 1: Cache resolved theme in constructor**

In `constructor()`, after line 66 (`super(game, options);`), before the destructuring block, add:

```js
    // Resolve theme once for all sub-components
    this._theme = game?.theme || UI_THEME;
```

**Step 2: Replace all UI_THEME references with this._theme**

In `initComponents()` (lines 130-249), replace every `UI_THEME.` with `this._theme.`:

- Line 79: `font = UI_THEME.fonts.medium` → `font = (game?.theme || UI_THEME).fonts.medium` (this is in the destructuring, so use the pattern)
- Line 163: `UI_THEME.fonts.small` → `this._theme.fonts.small`
- Line 164: `UI_THEME.colors.dimText` → `this._theme.colors.dimText`
- Lines 177-178: `UI_THEME.button.default.bg` / `.stroke` → `this._theme.button.default.bg` / `.stroke`
- Line 188: `UI_THEME.button.default.text` → `this._theme.button.default.text`
- Lines 200-201: `UI_THEME.colors.darkerBg` / `.subtleBorder` → `this._theme.colors.darkerBg` / `.subtleBorder`
- Line 211: `UI_THEME.colors.neonGreen` → `this._theme.colors.neonGreen`
- Lines 223-224: `UI_THEME.button.default.bg` / `.stroke` → `this._theme.button.default.bg` / `.stroke`
- Line 234: `UI_THEME.button.default.text` → `this._theme.button.default.text`

In `updateButtonStates()` (lines 440-481), replace every `UI_THEME.` with `this._theme.`:

- Lines 443-453: All `UI_THEME.button.pressed/hover/default.*` → `this._theme.button.pressed/hover/default.*`
- Lines 458-459: `UI_THEME.colors.subtleBorder` / `.dimText` → `this._theme.colors.subtleBorder` / `.dimText`
- Lines 464-474: All `UI_THEME.button.pressed/hover/default.*` → `this._theme.button.pressed/hover/default.*`
- Lines 479-480: `UI_THEME.colors.subtleBorder` / `.dimText` → `this._theme.colors.subtleBorder` / `.dimText`

Also handle the `font` default in the destructuring. Replace line 79:
```js
      font = UI_THEME.fonts.medium,
```
With:
```js
      font = null,
```
Then after the destructuring, resolve it:
```js
    this._theme = game?.theme || UI_THEME;
    // font default must resolve after theme
    const resolvedFont = font || this._theme.fonts.medium;
```
And use `resolvedFont` where `font` was used (line 92: `this.font = font;` → `this.font = resolvedFont;`).

**Step 3: Commit**

```bash
git add src/game/ui/stepper.js
git commit -m "feat(ui): Stepper resolves theme from game.theme"
```

---

### Task 8: Update AccordionSection to resolve theme from game

**Files:**
- Modify: `src/game/ui/accordion.js:190-202`

**Step 1: Cache theme in constructor**

The AccordionSection constructor needs to cache the resolved theme. Find the constructor and add:

```js
this._theme = game?.theme || UI_THEME;
```

**Step 2: Replace render references**

In the render method (around lines 190-202), replace:
```js
    ctx.strokeStyle = this._expanded
      ? UI_THEME.colors.neonGreen
      : UI_THEME.colors.dimText;
```
With:
```js
    ctx.strokeStyle = this._expanded
      ? this._theme.colors.neonGreen
      : this._theme.colors.dimText;
```

And replace:
```js
    ctx.fillStyle = this._expanded
      ? UI_THEME.colors.neonGreen
      : UI_THEME.colors.dimText;
```
With:
```js
    ctx.fillStyle = this._expanded
      ? this._theme.colors.neonGreen
      : this._theme.colors.dimText;
```

**Step 3: Commit**

```bash
git add src/game/ui/accordion.js
git commit -m "feat(ui): AccordionSection resolves theme from game.theme"
```

---

### Task 9: Apply cyan theme to Quantum Manifold demo

**Files:**
- Modify: `demos/js/quantum-manifold.js:17` (imports) and `demos/js/quantum-manifold.js:49` (constructor)

**Step 1: Add import**

At line 24 (after the `Random` import), add:

```js
import { createTheme } from "../../src/game/ui/theme.js";
```

**Step 2: Set theme in constructor**

In the constructor (line 48-51), after `this.enableFluidSize();` and before the closing `}`, add:

```js
    this.theme = createTheme("#0ff");
```

**Step 3: Verify visually**

Open `demos/quantum-manifold.html` in the dev server. All UI controls (accordion headers, buttons, sliders, dropdowns, stepper) should now be cyan instead of green.

**Step 4: Commit**

```bash
git add demos/js/quantum-manifold.js
git commit -m "feat(demos): apply cyan theme to Quantum Manifold playground"
```

---

### Task 10: Final verification

**Step 1: Check other demos still use green**

Open 2-3 other demos that have UI controls. They should still render with the default green theme since they don't set `game.theme`.

**Step 2: Check Quantum Manifold completely cyan**

Verify: accordion chevrons, section headers, sliders, dropdown trigger text/borders, buttons, stepper +/- buttons, toggle buttons — all cyan.

**Step 3: Squash commit if desired**

All changes are complete. The feature is ready.
