/**
 * Layout utilities for positioning items in horizontal, vertical, and grid layouts.
 *
 * With the origin-based coordinate system (v3.0):
 * - Layout positions are for item origins (top-left by default)
 * - centerItems option defaults to false (origin-based positioning)
 * - Use centerItems: true for legacy center-based positioning
 *
 * @module layout
 */

/**
 * Applies layout positions to items with optional transformation
 *
 * With the origin-based coordinate system (v3.0):
 * - Layout positions can be either top-left (centerItems: false) or center (centerItems: true)
 * - By default, assumes positions are for top-left (no origin adjustment)
 * - Set centerItems: true if layout was created with centerItems: true
 *
 * @param {Object[]} items - Array of objects to position (must have x, y properties)
 * @param {Object[]} positions - Array of position objects from layout functions
 * @param {Object} options - Options for applying positions
 * @param {number} [options.offsetX=0] - X offset to apply to all positions
 * @param {number} [options.offsetY=0] - Y offset to apply to all positions
 * @param {boolean} [options.centerItems=false] - Whether layout positions are cell centers
 * @param {function} [options.transform] - Optional transform function to apply to positions
 * @return {Object[]} The items with updated positions
 */
export function applyLayout(items, positions, options = {}) {
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  const centerItems = options.centerItems ?? false;
  const transform = options.transform;

  items.forEach((item, index) => {
    if (index < positions.length) {
      const pos = positions[index];
      
      let finalX, finalY;
      
      if (centerItems) {
        // Layout positions are cell centers - adjust for item's origin
        // Items with center origin (0.5, 0.5) need no adjustment
        // Items with top-left origin (0, 0) need to subtract half dimensions
        const originX = item.originX ?? 0;
        const originY = item.originY ?? 0;
        const itemWidth = item.width ?? 0;
        const itemHeight = item.height ?? 0;
        
        // Convert from center position to origin position
        // originAdjust = (originX - 0.5) * dimension
        // For center origin: 0, for top-left origin: -width/2
        const originAdjustX = (originX - 0.5) * itemWidth;
        const originAdjustY = (originY - 0.5) * itemHeight;
        
        finalX = pos.x + originAdjustX;
        finalY = pos.y + originAdjustY;
      } else {
        // Layout positions are top-left - no origin adjustment needed
        // Items are positioned directly at the layout coordinates
        finalX = pos.x;
        finalY = pos.y;
      }

      if (transform) {
        const transformed = transform({ x: finalX, y: finalY });
        item.x = transformed.x + offsetX;
        item.y = transformed.y + offsetY;
      } else {
        item.x = finalX + offsetX;
        item.y = finalY + offsetY;
      }
    }
  });

  return items;
}

/**
 * Creates a horizontal layout for the given items
 *
 * With the origin-based coordinate system (v3.0):
 * - Positions are for item origins (top-left by default)
 * - centerItems defaults to false for origin-based positioning
 *
 * @param {Object[]} items - Array of objects with width and height properties
 * @param {Object} options - Layout configuration options
 * @param {number} [options.spacing=10] - Space between items
 * @param {number} [options.padding=0] - Padding around the entire layout
 * @param {string} [options.align="start"] - Vertical alignment ("start", "center", "end")
 * @param {boolean} [options.centerItems=false] - Whether to position items relative to their centers
 * @return {Object} Result containing positioned items and layout dimensions
 */
export function horizontalLayout(items, options = {}) {
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const align = options.align ?? "start";
  const centerItems = options.centerItems ?? false;

  let x = padding;
  let maxHeight = 0;
  const positions = [];

  // First pass: get max height
  for (const item of items) {
    maxHeight = Math.max(maxHeight, item.height ?? 0);
  }

  // Second pass: calculate positions
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const width = item.width ?? 0;
    const height = item.height ?? 0;

    // X position depends on whether we're centering the items
    const itemX = centerItems ? x + width / 2 : x;

    // Y position determined by alignment (starting after padding)
    let itemY;
    switch (align) {
      case "center":
        itemY = padding + (maxHeight - height) / 2;
        break;
      case "end":
        itemY = padding + maxHeight - height;
        break;
      case "start":
      default:
        itemY = padding;
    }
    
    // If centering items, Y should also be center-based
    if (centerItems) {
      itemY += height / 2;
    }

    positions.push({ x: itemX, y: itemY });

    // Move to next position
    x += width;
    if (i < items.length - 1) {
      x += spacing;
    }
  }

  // Calculate total dimensions
  const totalWidth = x + padding;
  const totalHeight = maxHeight + padding * 2;

  return {
    positions,
    width: totalWidth,
    height: totalHeight,
  };
}

/**
 * Creates a vertical layout for the given items
 *
 * With the origin-based coordinate system (v3.0):
 * - Positions are for item origins (top-left by default)
 * - centerItems defaults to false for origin-based positioning
 *
 * @param {Object[]} items - Array of objects with width and height properties
 * @param {Object} options - Layout configuration options
 * @param {number} [options.spacing=10] - Space between items
 * @param {number} [options.padding=0] - Padding around the entire layout
 * @param {string} [options.align="start"] - Horizontal alignment ("start", "center", "end")
 * @param {boolean} [options.centerItems=false] - Whether to position items relative to their centers
 * @return {Object} Result containing positioned items and layout dimensions
 */
export function verticalLayout(items, options = {}) {
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const align = options.align ?? "start";
  const centerItems = options.centerItems ?? false;

  let y = padding;
  let maxWidth = 0;
  const positions = [];

  // First pass: get max width
  for (const item of items) {
    maxWidth = Math.max(maxWidth, item.width ?? 0);
  }

  // Second pass: calculate positions
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const width = item.width ?? 0;
    const height = item.height ?? 0;

    // Y position depends on whether we're centering the items
    const itemY = centerItems ? y + height / 2 : y;

    // X position determined by alignment
    let itemX;
    switch (align) {
      case "center":
        itemX = (maxWidth - width) / 2;
        break;
      case "end":
        itemX = maxWidth - width;
        break;
      case "start":
      default:
        itemX = 0;
    }

    positions.push({ x: itemX, y: itemY });

    // Move to next position
    y += height;
    if (i < items.length - 1) {
      y += spacing;
    }
  }

  // Calculate total dimensions
  const totalWidth = maxWidth + padding * 2;
  const totalHeight = y + padding;

  return {
    positions,
    width: totalWidth,
    height: totalHeight,
  };
}

/**
 * Creates a tile layout for the given items
 *
 * With the origin-based coordinate system (v3.0):
 * - Positions are for item origins (top-left by default)
 * - centerItems defaults to false for origin-based positioning
 *
 * @param {Object[]} items - Array of objects with width and height properties
 * @param {Object} options - Layout configuration options
 * @param {number} [options.columns=4] - Number of columns in the grid
 * @param {number} [options.spacing=10] - Space between items
 * @param {number} [options.padding=0] - Padding around the entire layout
 * @param {boolean} [options.centerItems=false] - Whether to position items relative to their centers
 * @return {Object} Result containing positioned items and layout dimensions
 */
export function tileLayout(items, options = {}) {
  if (items.length === 0) {
    return { positions: [], width: 0, height: 0 };
  }

  const columns = options.columns ?? 4;
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const centerItems = options.centerItems ?? false;

  // Assume uniform tile size based on first item
  const tileWidth = items[0].width ?? 0;
  const tileHeight = items[0].height ?? 0;

  const rowCount = Math.ceil(items.length / columns);
  const positions = [];

  // Calculate grid dimensions
  const totalWidth =
    columns * tileWidth + (columns - 1) * spacing + padding * 2;
  const totalHeight =
    rowCount * tileHeight + (rowCount - 1) * spacing + padding * 2;

  // Set starting position at top-left corner
  let x = padding;
  let y = padding;
  let colIndex = 0;

  // Calculate positions for each item
  for (let i = 0; i < items.length; i++) {
    // Position depends on whether we're centering the items
    const itemX = centerItems ? x + tileWidth / 2 : x;
    const itemY = centerItems ? y + tileHeight / 2 : y;

    positions.push({ x: itemX, y: itemY });

    colIndex++;
    if (colIndex < columns) {
      x += tileWidth + spacing;
    } else {
      colIndex = 0;
      x = padding;
      y += tileHeight + spacing;
    }
  }

  return {
    positions,
    width: totalWidth,
    height: totalHeight,
  };
}

/**
 * Creates a grid layout for the given items with variable cell sizes
 *
 * With the origin-based coordinate system (v3.0):
 * - Positions are for item origins (top-left by default)
 * - centerItems defaults to false for origin-based positioning
 *
 * @param {Object[]} items - Array of objects with width and height properties
 * @param {Object} options - Layout configuration options
 * @param {number} [options.columns=4] - Number of columns in the grid
 * @param {number} [options.spacing=10] - Space between items
 * @param {number} [options.padding=0] - Padding around the entire layout
 * @param {boolean} [options.centerItems=false] - Whether to position items relative to their centers
 * @return {Object} Result containing positioned items and layout dimensions
 */
export function gridLayout(items, options = {}) {
  if (items.length === 0) {
    return { positions: [], width: 0, height: 0 };
  }

  const columns = options.columns ?? 4;
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const centerItems = options.centerItems ?? false;

  // Determine max width and height for each column and row
  const colWidths = new Array(columns).fill(0);
  const rowHeights = [];
  
  items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    const itemWidth = item.width ?? 0;
    const itemHeight = item.height ?? 0;
    
    // Track max width for each column
    colWidths[col] = Math.max(colWidths[col], itemWidth);
    
    // Track max height for each row
    if (rowHeights[row] === undefined) {
      rowHeights[row] = itemHeight;
    } else {
      rowHeights[row] = Math.max(rowHeights[row], itemHeight);
    }
  });

  // Calculate positions
  const positions = [];
  let x = padding;
  let y = padding;
  let colIndex = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemWidth = item.width ?? 0;
    const itemHeight = item.height ?? 0;
    const rowHeight = rowHeights[Math.floor(i / columns)];

    // Position depends on whether we're centering the items
    const posX = centerItems ? x + itemWidth / 2 : x;
    const posY = centerItems ? y + itemHeight / 2 : y;

    positions.push({ x: posX, y: posY });

    // Move to next position
    colIndex++;
    if (colIndex < columns) {
      x += colWidths[colIndex - 1] + spacing;
    } else {
      // Move to next row
      colIndex = 0;
      x = padding;
      y += rowHeight + spacing;
    }
  }

  // Calculate total dimensions
  const totalWidth = 
    padding * 2 + 
    colWidths.reduce((sum, width) => sum + width, 0) + 
    spacing * (columns - 1);
  
  const totalHeight = 
    padding * 2 + 
    rowHeights.reduce((sum, height) => sum + height, 0) + 
    spacing * (rowHeights.length - 1);

  return {
    positions,
    width: totalWidth,
    height: totalHeight,
    cols: columns,
    rows: rowHeights.length
  };
}