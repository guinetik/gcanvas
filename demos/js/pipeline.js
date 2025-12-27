/**
 * Pipeline Demo Initializations
 *
 * Each function creates a demo on a specific canvas element,
 * showcasing different layers of the rendering pipeline.
 */

import {
  Game,
  Rectangle,
  Circle,
  Triangle,
  TextShape,
  Group,
  Line,
  Painter,
  Motion,
  Easing,
  GameObject,
} from '../../src/index.js';

// ─────────────────────────────────────────────────────────
// Demo 1: Euclidian - Basic positioning (point in space)
// ─────────────────────────────────────────────────────────

function initEuclidianDemo() {
  const canvas = document.getElementById('euclidian-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  // Grid GameObject that renders the cartesian plane
  class GridGameObject extends GameObject {
    constructor(game, options = {}) {
      super(game, options);
      this.zIndex = -1000; // Render grid first (lowest z-index)
      this.game = game;
    }

    draw() {
      super.draw();
      Painter.useCtx((ctx) => {
        const width = this.game.width;
        const height = this.game.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Draw grid lines (thin, 1px) - subtle grey
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= width; x += 5) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += 5) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        
        // Draw center axes (terminal green)
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Vertical axis
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        // Horizontal axis
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
      });
    }
  }

  // Create a point (circle) representing the Euclidian position
  const point = new Circle(6, {
    x: 100,
    y: 100,
    color: '#333',
    stroke: '#0f0',
    lineWidth: 1
  });

  // Create text labels showing coordinates
  const coordLabel = new TextShape('(100, 100)', {
    x: 100,
    y: 100,
    color: '#0f0',
    font: '12px monospace',
    align: 'center',
    baseline: 'top',
    opacity: 0.9
  });

  // Create and add grid to pipeline
  const grid = new GridGameObject(game);

  // Animate the point moving around
  let animTime = 0;
  const originalUpdate = game.update.bind(game);
  
  game.update = function(dt) {
    originalUpdate(dt);
    animTime += dt;
    
    const centerX = game.width / 2;
    const centerY = game.height / 2;
    
    // Move point in a circular pattern
    const radius = Math.min(game.width, game.height) * 0.2;
    point.x = centerX + Math.cos(animTime * 0.8) * radius;
    point.y = centerY + Math.sin(animTime * 0.8) * radius;
    
    // Update coordinate label
    coordLabel.x = point.x;
    coordLabel.y = point.y + 15; // Position below the point
    coordLabel.text = `(${Math.round(point.x)}, ${Math.round(point.y)})`;
  };

  // Add objects to pipeline (grid first so it renders behind)
  game.pipeline.add(grid);
  game.pipeline.add(point);
  game.pipeline.add(coordLabel);
  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 2: Geometry2d - Bounds and constraints
// ─────────────────────────────────────────────────────────

function initGeometry2dDemo() {
  const canvas = document.getElementById('geometry2d-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let animTime = 0;
  const originalUpdate = game.update.bind(game);
  
  // Create a constrained shape (positioned relative to game center)
  let constrainedShape, constraintBounds;
  
  game.update = function(dt) {
    originalUpdate(dt);
    
    // Initialize shapes on first update when game dimensions are available
    if (!constrainedShape) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;
      const constraintSize = Math.min(game.width, game.height) * 0.3;
      
      constrainedShape = new Rectangle({
        x: centerX,
        y: centerY,
        width: 50,
        height: 30,
        minX: centerX - constraintSize / 2,
        maxX: centerX + constraintSize / 2,
        minY: centerY - constraintSize / 2,
        maxY: centerY + constraintSize / 2,
        crisp: true,
        color: '#333',
        stroke: '#0f0',
        lineWidth: 1,
        debug: false
      });

      constraintBounds = new Rectangle({
        x: centerX,
        y: centerY,
        width: constraintSize,
        height: constraintSize,
        color: null,
        stroke: '#0f0',
        lineWidth: 1,
        debug: false
      });
      
      game.pipeline.add(constraintBounds);
      game.pipeline.add(constrainedShape);
    }
    
    animTime += dt;
    const centerX = game.width / 2;
    const centerY = game.height / 2;
    const constraintSize = Math.min(game.width, game.height) * 0.3;
    
    // Update constraints dynamically
    constrainedShape.minX = centerX - constraintSize / 2;
    constrainedShape.maxX = centerX + constraintSize / 2;
    constrainedShape.minY = centerY - constraintSize / 2;
    constrainedShape.maxY = centerY + constraintSize / 2;
    
    // Try to move outside constraints - will be constrained
    const radius = constraintSize * 0.6;
    constrainedShape.x = centerX + Math.sin(animTime * 0.5) * radius;
    constrainedShape.y = centerY + Math.cos(animTime * 0.5) * radius;
    constrainedShape.update(); // Apply constraints
    
    // Update constraint bounds visualization
    constraintBounds.x = centerX;
    constraintBounds.y = centerY;
    constraintBounds.width = constraintSize;
    constraintBounds.height = constraintSize;
    
    // Show actual bounds of the constrained shape
    const bounds = constrainedShape.getBounds();
    // Convert top-left bounds to center coordinates for Rectangle
    constraintBounds.x = bounds.x + bounds.width / 2;
    constraintBounds.y = bounds.y + bounds.height / 2;
    constraintBounds.width = bounds.width;
    constraintBounds.height = bounds.height;
  };

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 3: Renderable - Opacity and shadows
// ─────────────────────────────────────────────────────────

function initRenderableDemo() {
  const canvas = document.getElementById('renderable-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let shape1, shape2, shape3;
  let animTime = 0;
  const originalUpdate = game.update.bind(game);
  
  game.update = function(dt) {
    originalUpdate(dt);
    
    // Initialize shapes on first update when game dimensions are available
    if (!shape1) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;
      const spacing = Math.min(game.width, game.height) * 0.25;
      
      shape1 = new Rectangle({
        x: centerX - spacing,
        y: centerY,
        width: 50,
        height: 30,
        visible: true,
        opacity: 0.8,
        shadowColor: 'rgba(0,255,0,0.3)',
        shadowBlur: 8,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        color: '#1a1a1a',
        stroke: '#0f0',
        lineWidth: 1
      });

      shape2 = new Circle(25, {
        x: centerX,
        y: centerY,
        opacity: 0.7,
        shadowColor: 'rgba(0,255,0,0.3)',
        shadowBlur: 10,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        color: '#2a2a2a',
        stroke: '#0f0',
        lineWidth: 1
      });

      shape3 = new Triangle({
        x: centerX + spacing,
        y: centerY,
        size: 30,
        opacity: 0.9,
        shadowColor: 'rgba(0,255,0,0.3)',
        shadowBlur: 8,
        shadowOffsetX: -2,
        shadowOffsetY: 2,
        color: '#1a1a1a',
        stroke: '#0f0',
        lineWidth: 1
      });
      
      game.pipeline.add(shape1);
      game.pipeline.add(shape2);
      game.pipeline.add(shape3);
    }
    
    animTime += dt;
    shape1.opacity = 0.5 + Math.sin(animTime * 2) * 0.3;
    shape2.opacity = 0.3 + Math.cos(animTime * 1.5) * 0.4;
    shape3.opacity = 0.7 + Math.sin(animTime * 1.8) * 0.2;
  };
  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 4: Transformable - Rotation and scaling
// ─────────────────────────────────────────────────────────

function initTransformableDemo() {
  const canvas = document.getElementById('transformable-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let shape1, shape2, shape3;
  let animTime = 0;
  const originalUpdate = game.update.bind(game);
  
  game.update = function(dt) {
    originalUpdate(dt);
    
    // Initialize shapes on first update when game dimensions are available
    if (!shape1) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;
      const spacing = Math.min(game.width, game.height) * 0.25;
      
      shape1 = new Rectangle({
        x: centerX - spacing,
        y: centerY,
        width: 50,
        height: 30,
        rotation: Math.PI / 4, // 45 degrees
        scaleX: 1.5,
        scaleY: 0.8,
        color: '#1a1a1a',
        stroke: '#0f0',
        lineWidth: 1
      });

      shape2 = new Circle(20, {
        x: centerX,
        y: centerY,
        rotation: 0,
        scaleX: 1.2,
        scaleY: 1.2,
        color: '#2a2a2a',
        stroke: '#0f0',
        lineWidth: 1
      });

      shape3 = new Triangle({
        x: centerX + spacing,
        y: centerY,
        size: 25,
        rotation: Math.PI / 6, // 30 degrees
        scaleX: 2.0,
        scaleY: 2.0,
        color: '#1a1a1a',
        stroke: '#0f0',
        lineWidth: 1
      });
      
      game.pipeline.add(shape1);
      game.pipeline.add(shape2);
      game.pipeline.add(shape3);
    }
    
    animTime += dt;
    shape1.rotation = Math.PI / 4 + Math.sin(animTime) * 0.3;
    shape1.scaleX = 1.5 + Math.sin(animTime * 2) * 0.3;
    shape1.scaleY = 0.8 + Math.cos(animTime * 2) * 0.2;
    
    shape2.rotation = animTime * 0.5;
    shape2.scaleX = 1.2 + Math.sin(animTime * 1.5) * 0.3;
    shape2.scaleY = 1.2 + Math.sin(animTime * 1.5) * 0.3;
    
    shape3.rotation = Math.PI / 6 + animTime * 0.8;
    shape3.scaleX = 2.0 + Math.cos(animTime * 1.2) * 0.4;
    shape3.scaleY = 2.0 + Math.cos(animTime * 1.2) * 0.4;
  };
  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 5: Shape - Styling properties (fill, stroke)
// ─────────────────────────────────────────────────────────

function initShapeDemo() {
  const canvas = document.getElementById('shape-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let rect, circle, triangle;
  const originalUpdate = game.update.bind(game);
  
  game.update = function(dt) {
    originalUpdate(dt);
    
    // Initialize shapes on first update when game dimensions are available
    if (!rect) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;
      const spacing = Math.min(game.width, game.height) * 0.25;
      
      rect = new Rectangle({
        x: centerX - spacing,
        y: centerY,
        width: 50,
        height: 30,
        color: '#1a1a1a',
        stroke: '#0f0',
        lineWidth: 1,
        lineJoin: 'miter',
        lineCap: 'butt'
      });

      circle = new Circle(25, {
        x: centerX,
        y: centerY,
        color: '#2a2a2a',
        stroke: '#0f0',
        lineWidth: 1,
        lineJoin: 'round',
        lineCap: 'round'
      });

      triangle = new Triangle({
        x: centerX + spacing,
        y: centerY,
        size: 30,
        color: '#1a1a1a',
        stroke: '#0f0',
        lineWidth: 1,
        lineJoin: 'miter',
        lineCap: 'butt'
      });
      
      game.pipeline.add(rect);
      game.pipeline.add(circle);
      game.pipeline.add(triangle);
    }
  };
  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 6: Group - Composing shapes together
// ─────────────────────────────────────────────────────────

function initGroupDemo() {
  const canvas = document.getElementById('group-canvas');
  if (!canvas) return;

  const game = new Game(canvas);
  game.backgroundColor = '#000';
  game.enableFluidSize(canvas.parentElement);
  game.init();

  let group;
  let animTime = 0;
  const originalUpdate = game.update.bind(game);
  
  game.update = function(dt) {
    originalUpdate(dt);
    
    // Initialize group on first update when game dimensions are available
    if (!group) {
      const centerX = game.width / 2;
      const centerY = game.height / 2;
      
      // Create a Group to hold multiple shapes
      group = new Group({
        x: centerX,
        y: centerY
      });

      // Add shapes to the group - organized geometrically
      const rect = new Rectangle({
        width: 100,
        height: 50,
        color: '#1a1a1a',
        stroke: '#0f0',
        lineWidth: 1
      });

      const circle = new Circle(25, {
        x: 50,
        y: 0,
        color: '#2a2a2a',
        stroke: '#0f0',
        lineWidth: 1
      });

      const text = new TextShape('GROUP', {
        x: 0,
        y: 0,
        color: '#0f0',
        align: 'center',
        baseline: 'middle',
        font: '14px monospace'
      });

      // Add shapes to the group
      group.add(rect);
      group.add(circle);
      group.add(text);

      // Set initial transformations
      group.rotation = Math.PI / 6;  // 30 degrees
      group.scaleX = 1.5;
      group.scaleY = 1.5;
      group.opacity = 0.7;
      
      game.pipeline.add(group);
    }
    
    animTime += dt;
    group.rotation = Math.PI / 6 + Math.sin(animTime * 0.5) * 0.3;
    group.scaleX = 1.5 + Math.sin(animTime * 1.2) * 0.2;
    group.scaleY = 1.5 + Math.sin(animTime * 1.2) * 0.2;
    group.opacity = 0.7 + Math.cos(animTime * 0.8) * 0.2;
  };
  game.start();
}

// ─────────────────────────────────────────────────────────
// Initialize all demos on page load
// ─────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initEuclidianDemo();
  initGeometry2dDemo();
  initRenderableDemo();
  initTransformableDemo();
  initShapeDemo();
  initGroupDemo();
});

