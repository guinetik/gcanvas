/**
 * Coordinate System Demo Initializations
 *
 * Each function creates an interactive demo on a specific canvas element,
 * showcasing different aspects of GCanvas's coordinate system.
 */

import {
  Game,
  Rectangle,
  Circle,
  Triangle,
  TextShape,
  Group,
  Line,
  Scene,
  Painter,
  GameObject,
  Camera3D,
  applyDraggable,
  GameObjectShapeWrapper,
} from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────
// Demo 1: Center-Based Positioning
// Shows how x,y refers to center, not top-left
// ─────────────────────────────────────────────────────────

function initCenterBasedDemo() {
  const canvas = document.getElementById('center-based-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let dragGO, shape, centerDot, boundsRect, labels;

  const originalUpdate = game.update.bind(game);

  game.update = function(dt) {
    originalUpdate(dt);

    if (!dragGO) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;

      // Create a Circle shape
      shape = new Circle(50, {
        color: 'rgba(0, 255, 0, 0.3)',
        stroke: '#0f0',
        lineWidth: 2
      });

      // Wrap it in a GameObjectShapeWrapper for interactivity
      dragGO = new GameObjectShapeWrapper(game, shape, {
        x: centerX,
        y: centerY,
        width: 100,
        height: 100
      });
      dragGO.interactive = true;

      // Make it draggable
      applyDraggable(dragGO, {});

      // Center point indicator
      centerDot = new Circle(5, {
        x: centerX,
        y: centerY,
        color: '#ff0',
        stroke: '#ff0',
        lineWidth: 1
      });

      // Bounding box visualization
      boundsRect = new Rectangle({
        x: centerX,
        y: centerY,
        width: 100,
        height: 100,
        color: null,
        stroke: 'rgba(255, 255, 0, 0.5)',
        lineWidth: 1
      });

      // Coordinate labels
      labels = {
        center: new TextShape('', {
          x: centerX,
          y: centerY - 60,
          color: '#0f0',
          font: '12px monospace',
          align: 'center'
        }),
        left: new TextShape('', {
          x: centerX - 60,
          y: centerY,
          color: '#888',
          font: '10px monospace',
          align: 'right'
        }),
        right: new TextShape('', {
          x: centerX + 60,
          y: centerY,
          color: '#888',
          font: '10px monospace',
          align: 'left'
        }),
        top: new TextShape('', {
          x: centerX,
          y: centerY - 55,
          color: '#888',
          font: '10px monospace',
          align: 'center'
        }),
        bottom: new TextShape('', {
          x: centerX,
          y: centerY + 60,
          color: '#888',
          font: '10px monospace',
          align: 'center'
        })
      };

      game.pipeline.add(boundsRect);
      game.pipeline.add(dragGO);
      game.pipeline.add(centerDot);
      Object.values(labels).forEach(l => game.pipeline.add(l));
    }

    // Update positions to follow the dragged object
    centerDot.x = dragGO.x;
    centerDot.y = dragGO.y;
    boundsRect.x = dragGO.x;
    boundsRect.y = dragGO.y;

    // Update labels
    const radius = 50;
    labels.center.x = dragGO.x;
    labels.center.y = dragGO.y - radius - 15;
    labels.center.text = `Center: (${Math.round(dragGO.x)}, ${Math.round(dragGO.y)})`;

    labels.left.x = dragGO.x - radius - 5;
    labels.left.y = dragGO.y;
    labels.left.text = `${Math.round(dragGO.x - radius)}`;

    labels.right.x = dragGO.x + radius + 5;
    labels.right.y = dragGO.y;
    labels.right.text = `${Math.round(dragGO.x + radius)}`;

    labels.top.x = dragGO.x;
    labels.top.y = dragGO.y - radius - 5;
    labels.top.text = `${Math.round(dragGO.y - radius)}`;

    labels.bottom.x = dragGO.x;
    labels.bottom.y = dragGO.y + radius + 15;
    labels.bottom.text = `${Math.round(dragGO.y + radius)}`;
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 2: Basic Screen Coordinates
// Click to place shapes at screen positions
// ─────────────────────────────────────────────────────────

function initBasicPositionDemo() {
  const canvas = document.getElementById('basic-position-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  const shapes = [];
  let coordLabel;
  let axisLines = [];
  let clickCount = 0;

  // Draw coordinate axis
  class AxisGameObject extends GameObject {
    constructor(game) {
      super(game, {});
      this.zIndex = -100;
    }

    draw() {
      super.draw();
      Painter.useCtx((ctx) => {
        // Origin marker
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.fillText('(0,0)', 5, 15);

        // X axis arrow
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(80, 0);
        ctx.stroke();
        ctx.fillText('X →', 85, 5);

        // Y axis arrow
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 80);
        ctx.stroke();
        ctx.save();
        ctx.translate(5, 90);
        ctx.fillText('Y ↓', 0, 0);
        ctx.restore();
      });
    }
  }

  game.pipeline.add(new AxisGameObject(game));

  // Coordinate display
  coordLabel = new TextShape('Click to place shapes', {
    x: game.width / 2,
    y: 20,
    color: '#0f0',
    font: '14px monospace',
    align: 'center'
  });
  game.pipeline.add(coordLabel);

  // Handle clicks
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Alternate between shapes using click counter (not array length)
    clickCount++;
    const shapeTypes = ['circle', 'rect', 'triangle'];
    const type = shapeTypes[clickCount % 3];
    const colors = ['#0ff', '#f0f', '#ff0'];
    const color = colors[clickCount % 3];

    let shape;
    if (type === 'circle') {
      shape = new Circle(15, { x, y, color, stroke: '#0f0', lineWidth: 1 });
    } else if (type === 'rect') {
      shape = new Rectangle({ x, y, width: 30, height: 20, color, stroke: '#0f0', lineWidth: 1 });
    } else {
      shape = new Triangle(20, { x, y, color, stroke: '#0f0', lineWidth: 1 });
    }

    // Add coordinate label
    const label = new TextShape(`(${Math.round(x)}, ${Math.round(y)})`, {
      x: x,
      y: y + 25,
      color: '#888',
      font: '10px monospace',
      align: 'center'
    });

    shapes.push({ shape, label });
    game.pipeline.add(shape);
    game.pipeline.add(label);

    // Keep only last 5 shapes
    if (shapes.length > 5) {
      const removed = shapes.shift();
      game.pipeline.remove(removed.shape);
      game.pipeline.remove(removed.label);
    }

    coordLabel.text = `Last click: (${Math.round(x)}, ${Math.round(y)})`;
  });

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);
    coordLabel.x = game.width / 2;
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 3: Parent-Child Relationships
// Draggable scene with children that follow
// ─────────────────────────────────────────────────────────

function initParentChildDemo() {
  const canvas = document.getElementById('parent-child-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let dragGO, sceneGroup, child1, child2, child3, sceneLabel, child1Label;

  const originalUpdate = game.update.bind(game);

  game.update = function(dt) {
    originalUpdate(dt);

    if (!dragGO) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;

      // Create a Group with all the visual elements
      sceneGroup = new Group();

      // Scene background (for visualization)
      const sceneBg = new Rectangle({
        x: 0, y: 0,
        width: 150, height: 120,
        color: 'rgba(0, 255, 0, 0.1)',
        stroke: '#0f0',
        lineWidth: 2
      });
      sceneGroup.add(sceneBg);

      // Scene center marker
      const sceneCenter = new Circle(3, {
        x: 0, y: 0,
        color: '#0f0'
      });
      sceneGroup.add(sceneCenter);

      // Children at local positions
      child1 = new Circle(15, {
        x: 40, y: 20,
        color: '#0ff',
        stroke: '#0ff',
        lineWidth: 1
      });
      sceneGroup.add(child1);

      child2 = new Circle(12, {
        x: -30, y: 30,
        color: '#f0f',
        stroke: '#f0f',
        lineWidth: 1
      });
      sceneGroup.add(child2);

      child3 = new Rectangle({
        x: 0, y: -35,
        width: 40, height: 20,
        color: '#ff0',
        stroke: '#ff0',
        lineWidth: 1
      });
      sceneGroup.add(child3);

      // Wrap in GameObjectShapeWrapper for interactivity
      dragGO = new GameObjectShapeWrapper(game, sceneGroup, {
        x: centerX,
        y: centerY,
        width: 150,
        height: 120
      });
      dragGO.interactive = true;

      // Make it draggable
      applyDraggable(dragGO, {});

      // Labels
      sceneLabel = new TextShape('', {
        x: centerX,
        y: centerY - 80,
        color: '#0f0',
        font: '12px monospace',
        align: 'center'
      });

      child1Label = new TextShape('', {
        x: centerX + 40,
        y: centerY + 20 + 25,
        color: '#0ff',
        font: '10px monospace',
        align: 'center'
      });

      game.pipeline.add(dragGO);
      game.pipeline.add(sceneLabel);
      game.pipeline.add(child1Label);
    }

    // Update labels
    sceneLabel.x = dragGO.x;
    sceneLabel.y = dragGO.y - 80;
    sceneLabel.text = `Scene: (${Math.round(dragGO.x)}, ${Math.round(dragGO.y)})`;

    child1Label.x = dragGO.x + child1.x;
    child1Label.y = dragGO.y + child1.y + 25;
    child1Label.text = `Local: (${child1.x}, ${child1.y}) → Screen: (${Math.round(dragGO.x + child1.x)}, ${Math.round(dragGO.y + child1.y)})`;
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 4: Nested Hierarchy
// Multi-level nesting demonstration
// ─────────────────────────────────────────────────────────

function initNestedDemo() {
  const canvas = document.getElementById('nested-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let dragGO, outerGroup, innerGroup, deepest, labels;
  // Store offsets for nested elements
  const innerOffset = { x: 40, y: 20 };
  const deepestOffset = { x: 20, y: 15 };

  const originalUpdate = game.update.bind(game);

  game.update = function(dt) {
    originalUpdate(dt);

    if (!dragGO) {
      const startX = game.width / 3;
      const startY = game.height / 2;

      // Create nested group structure for visualization
      outerGroup = new Group();

      // Outer background
      const outerBg = new Rectangle({
        x: 0, y: 0, width: 180, height: 140,
        color: 'rgba(0, 255, 0, 0.1)',
        stroke: '#0f0',
        lineWidth: 2
      });
      outerGroup.add(outerBg);
      outerGroup.add(new TextShape('Outer (0,0)', { x: 0, y: -50, color: '#0f0', font: '10px monospace', align: 'center' }));

      // Inner group (offset from outer)
      innerGroup = new Group({ x: innerOffset.x, y: innerOffset.y });
      const innerBg = new Rectangle({
        x: 0, y: 0, width: 100, height: 80,
        color: 'rgba(0, 255, 255, 0.1)',
        stroke: '#0ff',
        lineWidth: 2
      });
      innerGroup.add(innerBg);
      innerGroup.add(new TextShape('Inner (+40,+20)', { x: 0, y: -25, color: '#0ff', font: '10px monospace', align: 'center' }));

      // Deepest shape (offset from inner)
      deepest = new Circle(12, {
        x: deepestOffset.x, y: deepestOffset.y,
        color: '#ff0',
        stroke: '#ff0',
        lineWidth: 1
      });
      innerGroup.add(deepest);
      innerGroup.add(new TextShape('Shape (+20,+15)', { x: deepestOffset.x, y: deepestOffset.y + 20, color: '#ff0', font: '9px monospace', align: 'center' }));

      outerGroup.add(innerGroup);

      // Wrap in GameObjectShapeWrapper for interactivity
      dragGO = new GameObjectShapeWrapper(game, outerGroup, {
        x: startX,
        y: startY,
        width: 180,
        height: 140
      });
      dragGO.interactive = true;
      applyDraggable(dragGO, {});
      game.pipeline.add(dragGO);

      // Calculation display
      labels = {
        calc: new TextShape('', {
          x: game.width * 0.75,
          y: game.height / 2 - 40,
          color: '#888',
          font: '11px monospace',
          align: 'center'
        }),
        result: new TextShape('', {
          x: game.width * 0.75,
          y: game.height / 2,
          color: '#ff0',
          font: '14px monospace',
          align: 'center'
        })
      };
      game.pipeline.add(labels.calc);
      game.pipeline.add(labels.result);
    }

    // Update calculation display
    const screenX = Math.round(dragGO.x + innerOffset.x + deepestOffset.x);
    const screenY = Math.round(dragGO.y + innerOffset.y + deepestOffset.y);

    labels.calc.x = game.width * 0.7;
    labels.calc.text = `Outer(${Math.round(dragGO.x)},${Math.round(dragGO.y)}) + Inner(${innerOffset.x},${innerOffset.y}) + Shape(${deepestOffset.x},${deepestOffset.y})`;

    labels.result.x = game.width * 0.7;
    labels.result.text = `= Screen Position (${screenX}, ${screenY})`;
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 5: Camera3D Projection
// 3D projection with mouse rotation
// ─────────────────────────────────────────────────────────

function initCamera3dDemo() {
  const canvas = document.getElementById('camera3d-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  const camera = new Camera3D({
    perspective: 400,
    rotationY: 0.3,
    rotationX: 0.2,
    inertia: true,
    friction: 0.95
  });
  camera.enableMouseControl(canvas);

  // 3D points to project
  const points3D = [
    { x: 0, y: 0, z: 0, color: '#0f0', label: 'Origin' },
    { x: 80, y: 0, z: 0, color: '#f00', label: '+X' },
    { x: 0, y: -80, z: 0, color: '#0ff', label: '+Y' },
    { x: 0, y: 0, z: 80, color: '#ff0', label: '+Z' },
    { x: -60, y: -40, z: 40, color: '#f0f', label: 'Point A' },
    { x: 60, y: 40, z: -40, color: '#fff', label: 'Point B' },
  ];

  // Axis lines
  const axisLines = [
    { from: { x: -100, y: 0, z: 0 }, to: { x: 100, y: 0, z: 0 }, color: '#f00' },
    { from: { x: 0, y: -100, z: 0 }, to: { x: 0, y: 100, z: 0 }, color: '#0ff' },
    { from: { x: 0, y: 0, z: -100 }, to: { x: 0, y: 0, z: 100 }, color: '#ff0' },
  ];

  const originalUpdate = game.update.bind(game);
  const originalRender = game.render.bind(game);

  game.update = function(dt) {
    originalUpdate(dt);
    camera.update(dt);
  };

  game.render = function() {
    originalRender();

    const centerX = game.width / 2;
    const centerY = game.height / 2;

    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw axis lines
      ctx.lineWidth = 1;
      for (const line of axisLines) {
        const from = camera.project(line.from.x, line.from.y, line.from.z);
        const to = camera.project(line.to.x, line.to.y, line.to.z);
        ctx.strokeStyle = line.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Sort points by z for proper depth ordering
      const projected = points3D.map(p => ({
        ...p,
        proj: camera.project(p.x, p.y, p.z)
      })).sort((a, b) => b.proj.z - a.proj.z);

      // Draw points
      for (const p of projected) {
        const { x, y, scale } = p.proj;
        const radius = Math.max(3, 8 * scale);

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.font = `${Math.max(8, 12 * scale)}px monospace`;
        ctx.fillStyle = p.color;
        ctx.textAlign = 'left';
        ctx.fillText(p.label, x + radius + 5, y + 4);
      }

      ctx.restore();

      // Info text
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Camera rotation: Y=${camera.rotationY.toFixed(2)}, X=${camera.rotationX.toFixed(2)}`, 10, 20);
      ctx.fillText('Scene3D centered at canvas center', 10, 35);
      ctx.fillText('Origin (0,0,0) appears at center', 10, 50);
    });
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 6: Anchor Positions
// Shows all anchor positions
// ─────────────────────────────────────────────────────────

function initAnchorDemo() {
  const canvas = document.getElementById('anchor-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  const anchors = [
    { name: 'TOP_LEFT', getPos: (w, h, m) => ({ x: m, y: m }) },
    { name: 'TOP_CENTER', getPos: (w, h, m) => ({ x: w / 2, y: m }) },
    { name: 'TOP_RIGHT', getPos: (w, h, m) => ({ x: w - m, y: m }) },
    { name: 'CENTER_LEFT', getPos: (w, h, m) => ({ x: m, y: h / 2 }) },
    { name: 'CENTER', getPos: (w, h, m) => ({ x: w / 2, y: h / 2 }) },
    { name: 'CENTER_RIGHT', getPos: (w, h, m) => ({ x: w - m, y: h / 2 }) },
    { name: 'BOTTOM_LEFT', getPos: (w, h, m) => ({ x: m, y: h - m }) },
    { name: 'BOTTOM_CENTER', getPos: (w, h, m) => ({ x: w / 2, y: h - m }) },
    { name: 'BOTTOM_RIGHT', getPos: (w, h, m) => ({ x: w - m, y: h - m }) },
  ];

  const margin = 30;
  const labels = [];
  const dots = [];

  const originalUpdate = game.update.bind(game);
  let initialized = false;

  game.update = function(dt) {
    originalUpdate(dt);

    if (!initialized) {
      for (const anchor of anchors) {
        const pos = anchor.getPos(game.width, game.height, margin);

        const dot = new Circle(5, {
          x: pos.x,
          y: pos.y,
          color: '#0f0'
        });

        const label = new TextShape(anchor.name, {
          x: pos.x,
          y: pos.y + 15,
          color: '#888',
          font: '9px monospace',
          align: 'center'
        });

        dots.push({ anchor, dot });
        labels.push({ anchor, label });

        game.pipeline.add(dot);
        game.pipeline.add(label);
      }
      initialized = true;
    }

    // Update positions on resize
    for (const { anchor, dot } of dots) {
      const pos = anchor.getPos(game.width, game.height, margin);
      dot.x = pos.x;
      dot.y = pos.y;
    }

    for (const { anchor, label } of labels) {
      const pos = anchor.getPos(game.width, game.height, margin);
      label.x = pos.x;
      label.y = pos.y + 15;
    }
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 7: Vertical Layout
// Interactive layout with add/remove
// ─────────────────────────────────────────────────────────

function initLayoutDemo() {
  const canvas = document.getElementById('layout-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  const items = [];
  const spacing = 12;
  let itemCount = 0;

  function addItem() {
    itemCount++;
    const colors = ['#0ff', '#f0f', '#ff0', '#0f0', '#f00'];
    const color = colors[(itemCount - 1) % colors.length];

    const rect = new Rectangle({
      x: 0, y: 0,
      width: 100 + Math.random() * 50,
      height: 25,
      color: color,
      stroke: '#fff',
      lineWidth: 1
    });

    const label = new TextShape(`Item ${itemCount}`, {
      x: 0, y: 0,
      color: '#000',
      font: '12px monospace',
      align: 'center',
      baseline: 'middle'
    });

    const group = new Group({ x: 0, y: 0 });
    group.add(rect);
    group.add(label);

    items.push({ group, rect, label });
    game.pipeline.add(group);
    updateLayout();
  }

  function removeItem() {
    if (items.length > 0) {
      const removed = items.pop();
      game.pipeline.remove(removed.group);
      updateLayout();
    }
  }

  function updateLayout() {
    const centerX = game.width / 2;
    let totalHeight = 0;

    // Calculate total height
    for (const item of items) {
      totalHeight += item.rect.height;
    }
    totalHeight += (items.length - 1) * spacing;

    // Position items
    let y = (game.height - totalHeight) / 2;
    for (const item of items) {
      item.group.x = centerX;
      item.group.y = y + item.rect.height / 2;
      y += item.rect.height + spacing;
    }
  }

  // Add initial items
  for (let i = 0; i < 3; i++) {
    addItem();
  }

  // Click handlers
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);

    if (x < canvas.width / 2) {
      addItem();
    } else {
      removeItem();
    }
  });

  // Instructions
  const leftLabel = new TextShape('Click LEFT to add', {
    x: 10, y: 20,
    color: '#0f0',
    font: '12px monospace',
    align: 'left'
  });

  const rightLabel = new TextShape('Click RIGHT to remove', {
    x: game.width - 10, y: 20,
    color: '#f00',
    font: '12px monospace',
    align: 'right'
  });

  game.pipeline.add(leftLabel);
  game.pipeline.add(rightLabel);

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);
    rightLabel.x = game.width - 10;
    updateLayout();
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Initialize all demos on page load
// ─────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initCenterBasedDemo();
  initBasicPositionDemo();
  initParentChildDemo();
  initNestedDemo();
  initCamera3dDemo();
  initAnchorDemo();
  initLayoutDemo();
});
