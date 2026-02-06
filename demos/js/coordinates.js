/**
 * Origin System Demo
 *
 * Interactive demos showcasing the GCanvas origin-based coordinate system.
 * Each demo illustrates a different aspect of how origins affect positioning,
 * rotation, and scaling.
 */

import {
  Game,
  Rectangle,
  Circle,
  Triangle,
  TextShape,
  Group,
  Painter,
  GameObject,
} from '../../src/index.js';

// ─────────────────────────────────────────────────────────
// Demo 1: Origin Positions
// Shows how different origins affect where x,y places the shape
// ─────────────────────────────────────────────────────────

function initOriginPositionsDemo() {
  const canvas = document.getElementById('origin-positions-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  const origins = [
    { name: 'top-left', originX: 0, originY: 0, color: '#0f0' },
    { name: 'center', originX: 0.5, originY: 0.5, color: '#0ff' },
    { name: 'bottom-center', originX: 0.5, originY: 1, color: '#f0f' },
    { name: 'top-right', originX: 1, originY: 0, color: '#ff0' },
  ];

  let currentOriginIndex = 0;
  let rect, originDot, label, boundsRect;
  let initialized = false;

  canvas.addEventListener('click', () => {
    currentOriginIndex = (currentOriginIndex + 1) % origins.length;
    updateOrigin();
  });

  function updateOrigin() {
    if (!rect) return;
    const origin = origins[currentOriginIndex];
    rect.originX = origin.originX;
    rect.originY = origin.originY;
    rect.color = origin.color;
    label.text = `origin: "${origin.name}" (${origin.originX}, ${origin.originY})`;
    label.color = origin.color;
  }

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);

    if (!initialized) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;
      const origin = origins[currentOriginIndex];

      // The rectangle
      rect = new Rectangle({
        x: centerX,
        y: centerY,
        width: 120,
        height: 80,
        color: origin.color,
        stroke: '#fff',
        lineWidth: 2,
        originX: origin.originX,
        originY: origin.originY,
      });

      // Marker at the x,y position
      originDot = new Circle(8, {
        x: centerX,
        y: centerY,
        color: '#f00',
        origin: 'center',
      });

      // Crosshair at x,y
      class CrosshairGO extends GameObject {
        constructor(game) {
          super(game, { x: centerX, y: centerY });
        }
        draw() {
          super.draw();
          Painter.useCtx((ctx) => {
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(this.x - 30, this.y);
            ctx.lineTo(this.x + 30, this.y);
            ctx.moveTo(this.x, this.y - 30);
            ctx.lineTo(this.x, this.y + 30);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        }
      }

      // Label showing current origin
      label = new TextShape(`origin: "${origin.name}" (${origin.originX}, ${origin.originY})`, {
        x: centerX,
        y: 30,
        color: origin.color,
        font: '14px monospace',
        align: 'center',
        baseline: 'middle',
      });

      // Position label
      const posLabel = new TextShape(`(x, y) = (${centerX}, ${centerY})`, {
        x: centerX,
        y: centerY + 70,
        color: '#f00',
        font: '12px monospace',
        align: 'center',
        baseline: 'top',
      });

      game.pipeline.add(rect);
      game.pipeline.add(new CrosshairGO(game));
      game.pipeline.add(originDot);
      game.pipeline.add(label);
      game.pipeline.add(posLabel);

      initialized = true;
    }
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 2: Rotation with Different Origins
// Shows how origin affects the rotation pivot point
// ─────────────────────────────────────────────────────────

function initRotationOriginsDemo() {
  const canvas = document.getElementById('rotation-origins-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let rects = [];
  let labels = [];
  let pivotDots = [];
  let animTime = 0;
  let initialized = false;

  const configs = [
    { origin: 'top-left', originX: 0, originY: 0, color: '#0f0' },
    { origin: 'center', originX: 0.5, originY: 0.5, color: '#0ff' },
    { origin: 'bottom-center', originX: 0.5, originY: 1, color: '#f0f' },
  ];

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);
    animTime += dt;

    if (!initialized) {
      const spacing = game.width / 4;
      const y = game.height / 2;

      configs.forEach((config, i) => {
        const x = spacing * (i + 1);

        const rect = new Rectangle({
          x: x,
          y: y,
          width: 80,
          height: 50,
          color: config.color,
          stroke: '#fff',
          lineWidth: 1,
          originX: config.originX,
          originY: config.originY,
        });
        rects.push(rect);
        game.pipeline.add(rect);

        // Pivot point marker
        const dot = new Circle(6, {
          x: x,
          y: y,
          color: '#f00',
          origin: 'center',
        });
        pivotDots.push(dot);
        game.pipeline.add(dot);

        // Label
        const label = new TextShape(`origin: "${config.origin}"`, {
          x: x,
          y: y + 60,
          color: config.color,
          font: '11px monospace',
          align: 'center',
          baseline: 'top',
        });
        labels.push(label);
        game.pipeline.add(label);
      });

      initialized = true;
    }

    // Animate rotation (rotation setter expects degrees)
    const rotationDegrees = Math.sin(animTime) * 30; // +/- 30 degrees
    rects.forEach(rect => {
      rect.rotation = rotationDegrees;
    });
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 3: Scaling with Different Origins
// Shows how origin affects scale direction
// ─────────────────────────────────────────────────────────

function initScalingOriginsDemo() {
  const canvas = document.getElementById('scaling-origins-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let rects = [];
  let initialized = false;
  let hoverIndex = -1;

  const configs = [
    { origin: 'top-left', originX: 0, originY: 0, color: '#0f0' },
    { origin: 'center', originX: 0.5, originY: 0.5, color: '#0ff' },
    { origin: 'bottom-right', originX: 1, originY: 1, color: '#f0f' },
  ];

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const spacing = game.width / 4;

    hoverIndex = -1;
    for (let i = 0; i < 3; i++) {
      const x = spacing * (i + 1);
      if (Math.abs(mouseX - x) < 60) {
        hoverIndex = i;
        break;
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoverIndex = -1;
  });

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);

    if (!initialized) {
      const spacing = game.width / 4;
      const y = game.height / 2;

      configs.forEach((config, i) => {
        const x = spacing * (i + 1);

        const rect = new Rectangle({
          x: x,
          y: y,
          width: 80,
          height: 60,
          color: config.color,
          stroke: '#fff',
          lineWidth: 1,
          originX: config.originX,
          originY: config.originY,
          scaleX: 1,
          scaleY: 1,
        });
        rects.push(rect);
        game.pipeline.add(rect);

        // Pivot marker
        const dot = new Circle(5, {
          x: x,
          y: y,
          color: '#f00',
          origin: 'center',
        });
        game.pipeline.add(dot);

        // Label
        const label = new TextShape(`"${config.origin}"`, {
          x: x,
          y: y + 55,
          color: config.color,
          font: '11px monospace',
          align: 'center',
          baseline: 'top',
        });
        game.pipeline.add(label);

        // Instruction
        const instr = new TextShape('Hover to scale', {
          x: x,
          y: y + 75,
          color: '#666',
          font: '10px monospace',
          align: 'center',
          baseline: 'top',
        });
        game.pipeline.add(instr);
      });

      initialized = true;
    }

    // Apply scale on hover
    rects.forEach((rect, i) => {
      const targetScale = (i === hoverIndex) ? 1.3 : 1.0;
      rect.scaleX += (targetScale - rect.scaleX) * 0.15;
      rect.scaleY += (targetScale - rect.scaleY) * 0.15;
    });
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 4: Text Alignment
// Shows text alignment independent of origin
// ─────────────────────────────────────────────────────────

function initTextAlignmentDemo() {
  const canvas = document.getElementById('text-alignment-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  const aligns = ['left', 'center', 'right'];
  const baselines = ['top', 'middle', 'bottom'];
  let alignIndex = 1; // Start with center
  let baselineIndex = 1; // Start with middle
  let text, alignLabel, baselineLabel;
  let initialized = false;

  canvas.addEventListener('click', () => {
    alignIndex = (alignIndex + 1) % aligns.length;
    if (alignIndex === 0) {
      baselineIndex = (baselineIndex + 1) % baselines.length;
    }
    updateText();
  });

  function updateText() {
    if (!text) return;
    text.align = aligns[alignIndex];
    text.baseline = baselines[baselineIndex];
    alignLabel.text = `align: "${aligns[alignIndex]}"`;
    baselineLabel.text = `baseline: "${baselines[baselineIndex]}"`;
  }

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);

    if (!initialized) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;

      // Crosshair at text position
      class CrosshairGO extends GameObject {
        constructor(game) {
          super(game, { x: centerX, y: centerY });
        }
        draw() {
          super.draw();
          Painter.useCtx((ctx) => {
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(0, this.y);
            ctx.lineTo(game.width, this.y);
            ctx.moveTo(this.x, 0);
            ctx.lineTo(this.x, game.height);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        }
      }

      // The text
      text = new TextShape('Hello World!', {
        x: centerX,
        y: centerY,
        color: '#0f0',
        font: 'bold 24px monospace',
        align: aligns[alignIndex],
        baseline: baselines[baselineIndex],
      });

      // Labels
      alignLabel = new TextShape(`align: "${aligns[alignIndex]}"`, {
        x: 20,
        y: 30,
        color: '#0ff',
        font: '12px monospace',
        align: 'left',
        baseline: 'top',
      });

      baselineLabel = new TextShape(`baseline: "${baselines[baselineIndex]}"`, {
        x: 20,
        y: 50,
        color: '#f0f',
        font: '12px monospace',
        align: 'left',
        baseline: 'top',
      });

      // Position marker
      const dot = new Circle(6, {
        x: centerX,
        y: centerY,
        color: '#f00',
        origin: 'center',
      });

      game.pipeline.add(new CrosshairGO(game));
      game.pipeline.add(text);
      game.pipeline.add(dot);
      game.pipeline.add(alignLabel);
      game.pipeline.add(baselineLabel);

      initialized = true;
    }
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 5: Circle Origins
// Shows how origin works with circles (bounding box based)
// ─────────────────────────────────────────────────────────

function initCircleOriginsDemo() {
  const canvas = document.getElementById('circle-origins-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let circle, boundsRect, originDot, label;
  let isCentered = false;
  let initialized = false;

  canvas.addEventListener('click', () => {
    isCentered = !isCentered;
    updateCircle();
  });

  function updateCircle() {
    if (!circle) return;
    const origin = isCentered ? 'center' : 'top-left';
    circle.originX = isCentered ? 0.5 : 0;
    circle.originY = isCentered ? 0.5 : 0;
    label.text = `origin: "${origin}"`;
    label.color = isCentered ? '#0ff' : '#0f0';
    circle.color = isCentered ? 'rgba(0,255,255,0.3)' : 'rgba(0,255,0,0.3)';
    circle.stroke = isCentered ? '#0ff' : '#0f0';
  }

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);

    if (!initialized) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;
      const radius = 50;

      // The circle
      circle = new Circle(radius, {
        x: centerX,
        y: centerY,
        color: 'rgba(0,255,0,0.3)',
        stroke: '#0f0',
        lineWidth: 2,
        originX: 0,
        originY: 0,
      });

      // Bounding box visualization
      boundsRect = new Rectangle({
        x: centerX,
        y: centerY,
        width: radius * 2,
        height: radius * 2,
        color: null,
        stroke: '#666',
        lineWidth: 1,
        originX: 0,
        originY: 0,
      });

      // Origin point marker
      originDot = new Circle(8, {
        x: centerX,
        y: centerY,
        color: '#f00',
        origin: 'center',
      });

      // Label
      label = new TextShape('origin: "top-left"', {
        x: centerX,
        y: 30,
        color: '#0f0',
        font: '14px monospace',
        align: 'center',
        baseline: 'middle',
      });

      // Instruction
      const instr = new TextShape('Click to toggle origin', {
        x: centerX,
        y: game.height - 30,
        color: '#666',
        font: '11px monospace',
        align: 'center',
        baseline: 'bottom',
      });

      game.pipeline.add(boundsRect);
      game.pipeline.add(circle);
      game.pipeline.add(originDot);
      game.pipeline.add(label);
      game.pipeline.add(instr);

      initialized = true;
    }

    // Update bounding box to match circle's origin
    if (boundsRect && circle) {
      boundsRect.originX = circle.originX;
      boundsRect.originY = circle.originY;
    }
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 6: All Origin Positions
// Shows all 9 origin positions in a grid
// ─────────────────────────────────────────────────────────

function initAllOriginsDemo() {
  const canvas = document.getElementById('all-origins-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  const allOrigins = [
    { name: 'top-left', originX: 0, originY: 0 },
    { name: 'top-center', originX: 0.5, originY: 0 },
    { name: 'top-right', originX: 1, originY: 0 },
    { name: 'center-left', originX: 0, originY: 0.5 },
    { name: 'center', originX: 0.5, originY: 0.5 },
    { name: 'center-right', originX: 1, originY: 0.5 },
    { name: 'bottom-left', originX: 0, originY: 1 },
    { name: 'bottom-center', originX: 0.5, originY: 1 },
    { name: 'bottom-right', originX: 1, originY: 1 },
  ];

  let initialized = false;
  let rects = [];
  let animTime = 0;

  const originalUpdate = game.update.bind(game);
  game.update = function(dt) {
    originalUpdate(dt);
    animTime += dt;

    if (!initialized) {
      const gridCols = 3;
      const gridRows = 3;
      const cellWidth = game.width / gridCols;
      const cellHeight = game.height / gridRows;

      allOrigins.forEach((origin, i) => {
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        const x = cellWidth * (col + 0.5);
        const y = cellHeight * (row + 0.5);

        const colors = [
          '#0f0', '#0ff', '#ff0',
          '#f0f', '#fff', '#f80',
          '#08f', '#8f0', '#f08',
        ];

        // Rectangle with this origin
        const rect = new Rectangle({
          x: x,
          y: y,
          width: 60,
          height: 40,
          color: colors[i],
          stroke: '#fff',
          lineWidth: 1,
          originX: origin.originX,
          originY: origin.originY,
        });
        rects.push(rect);
        game.pipeline.add(rect);

        // Pivot point marker
        const dot = new Circle(5, {
          x: x,
          y: y,
          color: '#f00',
          origin: 'center',
        });
        game.pipeline.add(dot);

        // Origin name label
        const label = new TextShape(origin.name, {
          x: x,
          y: y + 35,
          color: '#888',
          font: '9px monospace',
          align: 'center',
          baseline: 'top',
        });
        game.pipeline.add(label);
      });

      initialized = true;
    }

    // Gentle rotation animation (rotation setter expects degrees)
    rects.forEach((rect, i) => {
      rect.rotation = Math.sin(animTime + i * 0.7) * 15; // +/- 15 degrees
    });
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Initialize all demos on page load
// ─────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initOriginPositionsDemo();
  initRotationOriginsDemo();
  initScalingOriginsDemo();
  initTextAlignmentDemo();
  initCircleOriginsDemo();
  initAllOriginsDemo();
});
