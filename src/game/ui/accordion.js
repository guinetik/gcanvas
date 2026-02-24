/***************************************************************
 * Accordion.js
 *
 * Collapsible section UI components for organizing controls
 * into expandable/collapsible groups.
 *
 * - AccordionSection: clickable header bar that shows/hides
 *   a set of registered child items.
 * - AccordionGroup: Scene subclass that auto-layouts sections
 *   and standalone items vertically, relayouts on toggle.
 *
 * Theme: Terminal × Vercel aesthetic
 * - Dark transparent backgrounds
 * - Neon green accents (#0f0)
 * - Chevron ▸/▾ expand/collapse indicator
 ***************************************************************/

import { Painter } from "../../painter";
import { GameObject } from "../objects/go";
import { Scene } from "../objects/scene";
import { UI_THEME } from "./theme.js";

const ACCORDION_DEFAULTS = {
  width: 240,
  padding: 14,
  spacing: 10,
  headerHeight: 28,
};

// ─────────────────────────────────────────────────────────────────────────────
// AccordionSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AccordionSection — a clickable header bar that toggles visibility
 * of its registered child items.
 *
 * @example
 * ```js
 * const section = new AccordionSection(game, "Physics", {
 *   expanded: true,
 *   width: 260,
 *   onToggle: (expanded) => panel.layout(),
 * });
 * section.addItem(slider1);
 * section.addItem(slider2);
 * game.pipeline.add(section);
 * ```
 *
 * @extends GameObject
 */
export class AccordionSection extends GameObject {
  /**
   * @param {Game}     game
   * @param {string}   title     - Section label text
   * @param {Object}   [options={}]
   * @param {boolean}  [options.expanded=false]    - Initial state
   * @param {number}   [options.width=240]         - Header width
   * @param {number}   [options.headerHeight=28]   - Header bar height
   * @param {Function} [options.onToggle]          - Called with (expanded) after toggle
   */
  constructor(game, title, options = {}) {
    options.origin = options.origin ?? "center";
    super(game, options);

    this._theme = game?.theme || UI_THEME;
    this._title = title;
    this._expanded = options.expanded ?? false;
    this._onToggle = options.onToggle ?? null;
    this._items = [];
    this._isHovered = false;

    this.width = options.width ?? ACCORDION_DEFAULTS.width;
    this.height = options.headerHeight ?? ACCORDION_DEFAULTS.headerHeight;

    this._initEvents();
  }

  // ─── Items ────────────────────────────────────────────────────────

  /**
   * Register a child item controlled by this section.
   * Its visibility and interactivity will track the expanded state.
   * @param {GameObject} item
   * @returns {GameObject} The item, for chaining.
   */
  addItem(item) {
    this._items.push(item);
    item.visible = this._expanded;
    item.interactive = this._expanded;
    return item;
  }

  /**
   * Remove all registered items from this section.
   * @returns {GameObject[]} The removed items (so the caller can clean them up).
   */
  clearItems() {
    const removed = this._items.slice();
    this._items = [];
    return removed;
  }

  /** @returns {GameObject[]} All registered child items. */
  get items() {
    return this._items;
  }

  // ─── State ────────────────────────────────────────────────────────

  /** @returns {boolean} Whether the section is expanded. */
  get expanded() {
    return this._expanded;
  }

  /**
   * Toggle or force expanded/collapsed state.
   * @param {boolean} [force] - If provided, sets to this value; otherwise toggles.
   */
  toggle(force) {
    this._expanded = force !== undefined ? force : !this._expanded;
    for (const item of this._items) {
      item.visible = this._expanded;
      item.interactive = this._expanded;
    }
    if (this._onToggle) this._onToggle(this._expanded);
  }

  // ─── Events ───────────────────────────────────────────────────────

  _initEvents() {
    this.interactive = true;

    this.on("mouseover", () => {
      this._isHovered = true;
      this.game.canvas.style.cursor = "pointer";
    });

    this.on("mouseout", () => {
      this._isHovered = false;
      this.game.canvas.style.cursor = "default";
    });

    this.on("inputdown", () => {
      this.toggle();
    });
  }

  // ─── Bounds ───────────────────────────────────────────────────────

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  // ─── Render ───────────────────────────────────────────────────────

  draw() {
    super.draw();
    const ctx = Painter.ctx;
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // Background bar
    ctx.fillStyle = this._isHovered
      ? "rgba(0, 255, 0, 0.08)"
      : "rgba(0, 255, 0, 0.03)";
    ctx.fillRect(-halfW, -halfH, this.width, this.height);

    // Bottom border
    ctx.strokeStyle = "rgba(0, 255, 0, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-halfW, halfH);
    ctx.lineTo(halfW, halfH);
    ctx.stroke();

    // Chevron indicator
    const chevronX = -halfW + 8;
    const chevronY = 0;
    const cs = 4;
    ctx.beginPath();
    if (this._expanded) {
      ctx.moveTo(chevronX - cs, chevronY - cs / 2);
      ctx.lineTo(chevronX, chevronY + cs / 2);
      ctx.lineTo(chevronX + cs, chevronY - cs / 2);
    } else {
      ctx.moveTo(chevronX - cs / 2, chevronY - cs);
      ctx.lineTo(chevronX + cs / 2, chevronY);
      ctx.lineTo(chevronX - cs / 2, chevronY + cs);
    }
    ctx.strokeStyle = this._expanded
      ? this._theme.colors.neonGreen
      : this._theme.colors.dimText;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title text
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this._expanded
      ? this._theme.colors.neonGreen
      : this._theme.colors.dimText;
    ctx.fillText(this._title.toUpperCase(), -halfW + 20, 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AccordionGroup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AccordionGroup — a Scene that auto-layouts AccordionSections and
 * standalone items vertically. Relayouts when sections expand/collapse.
 *
 * @example
 * ```js
 * const panel = new AccordionGroup(game, {
 *   width: 300,
 *   padding: 14,
 *   spacing: 10,
 *   debug: true,
 *   debugColor: "rgba(0,255,0,0.2)",
 * });
 *
 * // Always-visible item
 * panel.addItem(dropdown);
 *
 * // Collapsible section
 * const physics = panel.addSection("Physics", { expanded: true });
 * physics.addItem(dtSlider);
 * physics.addItem(scaleSlider);
 *
 * panel.layout();
 * game.pipeline.add(panel);
 * ```
 *
 * @extends Scene
 */
export class AccordionGroup extends Scene {
  /**
   * @param {Game}   game
   * @param {Object} [options={}]
   * @param {number} [options.width=240]    - Panel width
   * @param {number} [options.padding=14]   - Top/bottom padding
   * @param {number} [options.spacing=10]   - Vertical gap between items
   * @param {number} [options.headerHeight=28] - Default section header height
   */
  constructor(game, options = {}) {
    options.origin = options.origin ?? "top-left";
    super(game, options);

    this._panelWidth = options.width ?? ACCORDION_DEFAULTS.width;
    this._padding = options.padding ?? ACCORDION_DEFAULTS.padding;
    this._spacing = options.spacing ?? ACCORDION_DEFAULTS.spacing;
    this._headerHeight = options.headerHeight ?? ACCORDION_DEFAULTS.headerHeight;
    this._itemWidth = this._panelWidth - this._padding * 2;

    // Ordered list of entries: { type: 'item'|'section', ref }
    this._entries = [];
  }

  /** The usable content width inside the padding. */
  get itemWidth() {
    return this._itemWidth;
  }

  /**
   * Add a standalone item that is always visible (not inside a section).
   * @param {GameObject} item
   * @returns {GameObject} The item, for chaining.
   */
  addItem(item) {
    this._entries.push({ type: "item", ref: item });
    super.add(item);
    return item;
  }

  /**
   * Create and add a collapsible section.
   * @param {string}  title
   * @param {Object}  [options={}]
   * @param {boolean} [options.expanded=false]
   * @returns {AccordionSection} The section — call `.addItem()` on it to register children.
   */
  addSection(title, options = {}) {
    const section = new AccordionSection(this.game, title, {
      expanded: options.expanded ?? false,
      width: this._itemWidth,
      headerHeight: this._headerHeight,
      onToggle: () => this.layout(),
    });
    this._entries.push({ type: "section", ref: section });
    super.add(section);
    return section;
  }

  /**
   * Remove all items from a section and detach them from this Scene.
   * Sets `interactive = false` on each removed item so orphaned
   * event handlers (e.g. Slider drag) become no-ops.
   *
   * @param {AccordionSection} section
   */
  clearSection(section) {
    const removed = section.clearItems();
    for (const item of removed) {
      item.interactive = false;
      super.remove(item);
    }
  }

  /**
   * Finalize a section after all its items have been registered
   * via `section.addItem()`. Adds the section's items to this Scene
   * so they participate in rendering and hit testing.
   *
   * Call this once per section after adding all its items, or use
   * {@link layoutAll} which calls it automatically.
   *
   * @param {AccordionSection} section
   */
  commitSection(section) {
    for (const item of section.items) {
      // Only add if not already a child of this scene
      if (item.parent !== this) {
        super.add(item);
      }
    }
  }

  /**
   * Commit all sections and perform vertical layout.
   * Call this once after all sections and items have been configured.
   */
  layoutAll() {
    for (const entry of this._entries) {
      if (entry.type === "section") {
        this.commitSection(entry.ref);
      }
    }
    this.layout();
  }

  /**
   * Recalculate vertical positions of all visible items.
   * Called automatically when a section is toggled.
   */
  layout() {
    const centerX = this._panelWidth / 2;
    let y = this._padding;

    for (const entry of this._entries) {
      if (entry.type === "section") {
        const section = entry.ref;

        // Position the header
        const hh = section.height;
        section.x = centerX;
        section.y = y + hh / 2;
        y += hh + this._spacing;

        // Position child items (skip if collapsed)
        for (const item of section.items) {
          if (!item.visible) continue;
          const bounds = item.getBounds?.();
          const h = bounds?.height || 40;
          item.x = centerX;
          item.y = y + h / 2;
          y += h + this._spacing;
        }
      } else {
        // Standalone item — always visible
        const item = entry.ref;
        const bounds = item.getBounds?.();
        const h = bounds?.height || 40;
        item.x = centerX;
        item.y = y + h / 2;
        y += h + this._spacing;
      }
    }

    // Resize panel bounds
    y += this._padding - this._spacing;
    this._height = y;
    this._width = this._panelWidth;
    this.markBoundsDirty();
  }
}
