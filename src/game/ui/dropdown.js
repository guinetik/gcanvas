/***************************************************************
 * Dropdown.js
 *
 * A dropdown / combobox / picklist UI component.
 * Click the trigger to open a scrollable options panel,
 * hover to highlight, click to select.
 *
 * Theme: Terminal × Vercel aesthetic
 * - Dark transparent backgrounds
 * - Neon green accents (#0f0)
 * - Inverted colors on hover
 *
 * Mobile-first:
 * - Touch-drag scrolling in panel
 * - Touch-friendly item sizes
 * - Prevents page scroll when interacting with panel
 ***************************************************************/

import { Painter } from "../../painter";
import { GameObject } from "../objects/go";
import { UI_THEME } from "./theme.js";

const DROPDOWN_DEFAULTS = {
  label: "",
  options: [],
  value: undefined,
  width: 240,
  triggerHeight: 36,
  itemHeight: 34,
  maxVisible: 6,
  onChange: null,
  placeholder: "Select...",
  accentColor: null,
};

/**
 * Dropdown - A combobox / picklist component.
 *
 * Displays a trigger showing the selected value. Clicking
 * opens a scrollable panel of options. Supports mouse wheel
 * and touch-drag scrolling when options exceed maxVisible.
 *
 * @example
 * ```js
 * const dd = new Dropdown(game, {
 *   x: 200, y: 100,
 *   label: "Attractor",
 *   options: [
 *     { label: "Lorenz", value: "lorenz" },
 *     { label: "Rössler", value: "rossler" },
 *   ],
 *   value: "lorenz",
 *   onChange: (v) => console.log("Selected:", v),
 * });
 * game.pipeline.add(dd);
 * ```
 *
 * @extends GameObject
 */
export class Dropdown extends GameObject {
  constructor(game, options = {}) {
    options.origin = options.origin ?? "center";
    super(game, options);

    const opts = { ...DROPDOWN_DEFAULTS, ...options };

    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.dropdownWidth = opts.width;
    this.triggerHeight = opts.triggerHeight;
    this.itemHeight = opts.itemHeight;
    this.maxVisible = opts.maxVisible;
    this.labelText = opts.label;
    this.placeholder = opts.placeholder;
    this.onChange = opts.onChange;

    // Normalize options
    this._options = (opts.options || []).map((o) =>
      typeof o === "string" ? { label: o, value: o } : o
    );

    // Theme colors
    const theme = UI_THEME.dropdown;
    this._colors = {
      triggerBg: theme.trigger.bg,
      triggerBorder: theme.trigger.border,
      triggerText: theme.trigger.text,
      triggerPlaceholder: theme.trigger.placeholder,
      triggerArrow: theme.trigger.arrow,
      triggerHoverBg: theme.trigger.hoverBg,
      triggerHoverBorder: theme.trigger.hoverBorder,
      panelBg: theme.panel.bg,
      panelBorder: theme.panel.border,
      itemText: theme.item.text,
      itemHoverBg: theme.item.hoverBg,
      itemHoverText: theme.item.hoverText,
      itemSelectedText: theme.item.selectedText,
      scrollTrack: theme.scrollbar.track,
      scrollThumb: theme.scrollbar.thumb,
      labelText: theme.label.text,
    };

    if (opts.accentColor) {
      this._colors.triggerText = opts.accentColor;
      this._colors.triggerBorder = opts.accentColor;
      this._colors.triggerHoverBorder = opts.accentColor;
      this._colors.itemSelectedText = opts.accentColor;
    }

    // State
    this._isOpen = false;
    this._hoveredIndex = -1;
    this._scrollOffset = 0;
    this._isMouseOver = false;

    // Touch-scroll state
    this._touchScrolling = false;
    this._touchStartY = 0;
    this._touchScrollStart = 0;

    // Set initial value
    if (opts.value !== undefined) {
      this._selectedIndex = this._options.findIndex(
        (o) => o.value === opts.value
      );
    } else {
      this._selectedIndex = -1;
    }

    // Layout: center-origin
    // Label sits above trigger; trigger is the "anchor"; panel hangs below.
    this._labelHeight = this.labelText ? 18 : 0;
    this._totalTriggerTop = -this.triggerHeight / 2;
    this._totalTriggerBottom = this.triggerHeight / 2;

    // Closed height = label + trigger
    this.width = this.dropdownWidth;
    this.height = this._labelHeight + this.triggerHeight;

    this._initEvents();
  }

  // ─── Value ──────────────────────────────────────────────────

  get value() {
    if (this._selectedIndex < 0) return undefined;
    return this._options[this._selectedIndex].value;
  }

  set value(v) {
    const idx = this._options.findIndex((o) => o.value === v);
    if (idx !== this._selectedIndex) {
      this._selectedIndex = idx;
      if (typeof this.onChange === "function") {
        this.onChange(idx >= 0 ? this._options[idx].value : undefined);
      }
    }
  }

  get selectedLabel() {
    if (this._selectedIndex < 0) return this.placeholder;
    return this._options[this._selectedIndex].label;
  }

  // ─── Options management ─────────────────────────────────────

  setOptions(opts, keepValue = true) {
    const prevValue = this.value;
    this._options = (opts || []).map((o) =>
      typeof o === "string" ? { label: o, value: o } : o
    );
    this._scrollOffset = 0;
    this._hoveredIndex = -1;
    if (keepValue && prevValue !== undefined) {
      this._selectedIndex = this._options.findIndex(
        (o) => o.value === prevValue
      );
    } else {
      this._selectedIndex = -1;
    }
  }

  // ─── Panel geometry helpers ─────────────────────────────────

  get _visibleCount() {
    return Math.min(this._options.length, this.maxVisible);
  }

  get _panelHeight() {
    return this._visibleCount * this.itemHeight;
  }

  get _needsScroll() {
    return this._options.length > this.maxVisible;
  }

  get _maxScroll() {
    return Math.max(
      0,
      (this._options.length - this.maxVisible) * this.itemHeight
    );
  }

  // ─── Local-space bounds ─────────────────────────────────────

  /** Top edge of the entire widget in local coords */
  get _localTop() {
    return this._totalTriggerTop - this._labelHeight;
  }

  /** Bottom edge in local coords (changes when open) */
  get _localBottom() {
    return this._isOpen
      ? this._totalTriggerBottom + this._panelHeight
      : this._totalTriggerBottom;
  }

  // ─── Open / Close ──────────────────────────────────────────

  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this._hoveredIndex = -1;
    this._scrollOffset = 0;
    // Ensure selected item is visible
    if (this._selectedIndex >= 0) {
      const itemTop = this._selectedIndex * this.itemHeight;
      if (itemTop < this._scrollOffset) {
        this._scrollOffset = itemTop;
      } else if (
        itemTop + this.itemHeight >
        this._scrollOffset + this._panelHeight
      ) {
        this._scrollOffset = itemTop + this.itemHeight - this._panelHeight;
      }
    }
    // Z-order boost — use parent Scene if nested, otherwise pipeline
    const container = this.parent?.bringToFront
      ? this.parent
      : this.game.pipeline;
    container.bringToFront(this);
  }

  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._hoveredIndex = -1;
    this._touchScrolling = false;
  }

  // ─── Hit Test Override ─────────────────────────────────────
  // The default _hitTest assumes symmetric bounds around center
  // origin. The dropdown's panel extends only downward, so we
  // override with the actual asymmetric local-space bounds.

  _hitTest(x, y) {
    if (!this._interactive) return false;

    const local = this.screenToLocal(x, y);
    const halfW = this.dropdownWidth / 2;

    return (
      local.x >= -halfW &&
      local.x <= halfW &&
      local.y >= this._localTop &&
      local.y <= this._localBottom
    );
  }

  // ─── Events ─────────────────────────────────────────────────

  _initEvents() {
    this.interactive = true;
    this._isMouseOver = false;

    this.on("mouseover", () => {
      this._isMouseOver = true;
      this.game.canvas.style.cursor = "pointer";
    });

    this.on("mouseout", () => {
      this._isMouseOver = false;
      if (!this._isOpen) {
        this.game.canvas.style.cursor = "default";
      }
    });

    // Click on trigger or item
    this.on("inputdown", (e) => {
      const local = this.screenToLocal(e.x, e.y);
      this._handleInputDown(local, e);
    });

    // Global move for hover tracking inside panel
    this.game.events.on("inputmove", (e) => {
      if (!this._isOpen || !this.isInteractiveInHierarchy()) return;
      const local = this.screenToLocal(e.x, e.y);

      // Touch-drag scrolling
      if (this._touchScrolling) {
        const dy = this._touchStartY - local.y;
        this._scrollOffset = Math.max(
          0,
          Math.min(this._maxScroll, this._touchScrollStart + dy)
        );
        // Update hovered index while dragging
        this._handleHover(local);
        return;
      }

      this._handleHover(local);
    });

    // Global inputup — end touch scroll
    this.game.events.on("inputup", (e) => {
      if (this._touchScrolling && this.isInteractiveInHierarchy()) {
        const local = this.screenToLocal(e.x, e.y);
        const dy = Math.abs(local.y - (this._touchStartY - (this._scrollOffset - this._touchScrollStart)));
        // If finger barely moved, treat as a tap
        if (Math.abs(this._scrollOffset - this._touchScrollStart) < 4) {
          this._handleItemTap(local);
        }
        this._touchScrolling = false;
      }
    });

    // Click outside to close
    this.game.events.on("inputdown", (e) => {
      if (!this._isOpen || !this.isInteractiveInHierarchy()) return;
      const local = this.screenToLocal(e.x, e.y);
      const halfW = this.dropdownWidth / 2;
      if (
        local.x < -halfW ||
        local.x > halfW ||
        local.y < this._localTop ||
        local.y > this._localBottom
      ) {
        this.close();
      }
    });

    // Mouse wheel for scrolling
    this.game.canvas.addEventListener(
      "wheel",
      (e) => {
        if (!this._isOpen || !this._needsScroll) return;
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        const sx = (e.clientX - rect.left) * scaleX;
        const sy = (e.clientY - rect.top) * scaleY;
        const local = this.screenToLocal(sx, sy);
        if (this._isInPanel(local)) {
          e.preventDefault();
          this._scrollOffset = Math.max(
            0,
            Math.min(this._maxScroll, this._scrollOffset + e.deltaY)
          );
        }
      },
      { passive: false }
    );

    // Prevent page scroll on touch over open panel
    this.game.canvas.addEventListener(
      "touchmove",
      (e) => {
        if (this._touchScrolling) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  _isInPanel(local) {
    const halfW = this.dropdownWidth / 2;
    return (
      local.x >= -halfW &&
      local.x <= halfW &&
      local.y >= this._totalTriggerBottom &&
      local.y <= this._totalTriggerBottom + this._panelHeight
    );
  }

  _isInTrigger(local) {
    const halfW = this.dropdownWidth / 2;
    return (
      local.x >= -halfW &&
      local.x <= halfW &&
      local.y >= this._totalTriggerTop &&
      local.y <= this._totalTriggerBottom
    );
  }

  _handleInputDown(local, e) {
    // Trigger toggle
    if (this._isInTrigger(local)) {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
      return;
    }

    // Panel interaction
    if (this._isOpen && this._isInPanel(local)) {
      // Start touch-drag scroll for scrollable panels
      if (this._needsScroll && e.touches) {
        this._touchScrolling = true;
        this._touchStartY = local.y;
        this._touchScrollStart = this._scrollOffset;
        return;
      }
      // Mouse click — select immediately
      this._handleItemTap(local);
    }
  }

  _handleItemTap(local) {
    if (!this._isInPanel(local)) return;
    const relY = local.y - this._totalTriggerBottom + this._scrollOffset;
    const idx = Math.floor(relY / this.itemHeight);
    if (idx >= 0 && idx < this._options.length) {
      this._selectedIndex = idx;
      if (typeof this.onChange === "function") {
        this.onChange(this._options[idx].value);
      }
      this.close();
    }
  }

  _handleHover(local) {
    if (this._isInPanel(local)) {
      const relY = local.y - this._totalTriggerBottom + this._scrollOffset;
      const idx = Math.floor(relY / this.itemHeight);
      this._hoveredIndex =
        idx >= 0 && idx < this._options.length ? idx : -1;
      this.game.canvas.style.cursor = "pointer";
    } else {
      this._hoveredIndex = -1;
    }
  }

  // ─── Coordinate transform ──────────────────────────────────

  screenToLocal(screenX, screenY) {
    let localX = screenX;
    let localY = screenY;

    const transformChain = [];
    let current = this;
    while (current) {
      transformChain.unshift(current);
      current = current.parent;
    }

    for (const obj of transformChain) {
      localX -= obj.x || 0;
      localY -= obj.y || 0;

      if (obj.rotation) {
        const cos = Math.cos(-obj.rotation);
        const sin = Math.sin(-obj.rotation);
        const tempX = localX;
        localX = tempX * cos - localY * sin;
        localY = tempX * sin + localY * cos;
      }

      if (obj.scaleX !== undefined && obj.scaleX !== 0) {
        localX /= obj.scaleX;
      }
      if (obj.scaleY !== undefined && obj.scaleY !== 0) {
        localY /= obj.scaleY;
      }
    }

    return { x: localX, y: localY };
  }

  // ─── Bounds ─────────────────────────────────────────────────

  getBounds() {
    // Return bounds that match the actual asymmetric visual layout.
    // The y-center is shifted so the hit-test rect covers the right area.
    const top = this._localTop;
    const bottom = this._localBottom;
    const h = bottom - top;
    const centerOffsetY = (top + bottom) / 2;
    return {
      x: this.x,
      y: this.y + centerOffsetY,
      width: this.dropdownWidth,
      height: h,
    };
  }

  // ─── Render ─────────────────────────────────────────────────

  draw() {
    super.draw();
    const ctx = Painter.ctx;
    if (this.labelText) this._drawLabel(ctx);
    this._drawTrigger(ctx);
    if (this._isOpen && this._options.length > 0) this._drawPanel(ctx);
  }

  _drawLabel(ctx) {
    const y = this._totalTriggerTop - 6;
    ctx.font = UI_THEME.fonts.small;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = this._colors.labelText;
    ctx.fillText(this.labelText, -this.dropdownWidth / 2, y);
  }

  _drawTrigger(ctx) {
    const halfW = this.dropdownWidth / 2;
    const top = this._totalTriggerTop;
    const h = this.triggerHeight;
    const isHover = this._isMouseOver && !this._isOpen;
    const r = 3;

    // Background
    ctx.beginPath();
    this._roundRect(ctx, -halfW, top, this.dropdownWidth, h, r);
    ctx.fillStyle = isHover
      ? this._colors.triggerHoverBg
      : this._colors.triggerBg;
    ctx.fill();
    ctx.strokeStyle = isHover
      ? this._colors.triggerHoverBorder
      : this._isOpen
        ? this._colors.triggerHoverBorder
        : this._colors.triggerBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Selected text or placeholder
    const padding = 10;
    ctx.font = UI_THEME.fonts.medium;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const textY = top + h / 2;
    if (this._selectedIndex >= 0) {
      ctx.fillStyle = this._colors.triggerText;
      ctx.fillText(
        this._options[this._selectedIndex].label,
        -halfW + padding,
        textY
      );
    } else {
      ctx.fillStyle = this._colors.triggerPlaceholder;
      ctx.fillText(this.placeholder, -halfW + padding, textY);
    }

    // Arrow chevron
    const arrowX = halfW - padding - 2;
    const arrowY = textY;
    const arrowSize = 5;
    ctx.beginPath();
    if (this._isOpen) {
      ctx.moveTo(arrowX - arrowSize, arrowY + arrowSize / 2);
      ctx.lineTo(arrowX, arrowY - arrowSize / 2);
      ctx.lineTo(arrowX + arrowSize, arrowY + arrowSize / 2);
    } else {
      ctx.moveTo(arrowX - arrowSize, arrowY - arrowSize / 2);
      ctx.lineTo(arrowX, arrowY + arrowSize / 2);
      ctx.lineTo(arrowX + arrowSize, arrowY - arrowSize / 2);
    }
    ctx.strokeStyle = this._colors.triggerArrow;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _drawPanel(ctx) {
    const halfW = this.dropdownWidth / 2;
    const panelTop = this._totalTriggerBottom;
    const panelH = this._panelHeight;
    const r = 3;
    const scrollbarW = this._needsScroll ? 6 : 0;

    // Panel background
    ctx.beginPath();
    this._roundRect(ctx, -halfW, panelTop, this.dropdownWidth, panelH, r);
    ctx.fillStyle = this._colors.panelBg;
    ctx.fill();
    ctx.strokeStyle = this._colors.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clip to panel area
    ctx.save();
    ctx.beginPath();
    ctx.rect(-halfW, panelTop, this.dropdownWidth, panelH);
    ctx.clip();

    // Draw items
    const itemW = this.dropdownWidth - scrollbarW;
    const startIdx = Math.floor(this._scrollOffset / this.itemHeight);
    const endIdx = Math.min(
      this._options.length,
      startIdx + this._visibleCount + 2
    );

    for (let i = startIdx; i < endIdx; i++) {
      const itemY = panelTop + i * this.itemHeight - this._scrollOffset;
      const isHovered = i === this._hoveredIndex;
      const isSelected = i === this._selectedIndex;

      // Hover highlight
      if (isHovered) {
        ctx.fillStyle = this._colors.itemHoverBg;
        ctx.fillRect(-halfW, itemY, itemW, this.itemHeight);
      }

      // Item text
      ctx.font = UI_THEME.fonts.medium;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      if (isHovered) {
        ctx.fillStyle = this._colors.itemHoverText;
      } else if (isSelected) {
        ctx.fillStyle = this._colors.itemSelectedText;
      } else {
        ctx.fillStyle = this._colors.itemText;
      }
      ctx.fillText(
        this._options[i].label,
        -halfW + 10,
        itemY + this.itemHeight / 2
      );
    }

    // Scrollbar
    if (this._needsScroll) {
      const trackX = halfW - scrollbarW - 1;
      const thumbRatio = this.maxVisible / this._options.length;
      const thumbH = Math.max(12, panelH * thumbRatio);
      const scrollRange = panelH - thumbH;
      const thumbY =
        panelTop + (this._scrollOffset / this._maxScroll) * scrollRange;

      // Track
      ctx.fillStyle = this._colors.scrollTrack;
      ctx.fillRect(trackX, panelTop, scrollbarW, panelH);

      // Thumb
      ctx.fillStyle = this._colors.scrollThumb;
      this._roundRectFill(ctx, trackX, thumbY, scrollbarW, thumbH, 3);
    }

    ctx.restore();
  }

  // ─── Utility ────────────────────────────────────────────────

  _roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  _roundRectFill(ctx, x, y, w, h, r) {
    ctx.beginPath();
    this._roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }
}
