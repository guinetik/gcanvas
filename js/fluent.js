/**
 * Fluent API Demo Initializations
 *
 * Each function creates a demo on a specific canvas element,
 * showcasing different aspects of the Fluent API.
 */

import { gcanvas, sketch } from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────
// Demo 1: Hello World
// ─────────────────────────────────────────────────────────

function initHelloDemo() {
  const canvas = document.getElementById('hello-canvas');
  if (!canvas) return;
  gcanvas({ canvas, bg: '#111' })
    .scene('game')
      .go({ x: 200, y: 125 })
        .circle({ radius: 40, fill: '#00ff88' })
    .start();
}

// ─────────────────────────────────────────────────────────
// Demo 2: Builder Chain
// ─────────────────────────────────────────────────────────

function initChainDemo() {
  const canvas = document.getElementById('chain-canvas');
  if (!canvas) return;

  gcanvas({ canvas, bg: '#111' })
    .scene('game')
      .go({ x: 80, y: 125 })
        .circle({ radius: 30, fill: '#ff6b6b' })
      .end()
      .go({ x: 200, y: 125 })
        .star({ points: 5, radius: 35, fill: '#ffd93d' })
      .end()
      .go({ x: 320, y: 125 })
        .rect({ width: 50, height: 50, fill: '#6bcb77' })
    .start();
}

// ─────────────────────────────────────────────────────────
// Demo 3: Shape Variety
// ─────────────────────────────────────────────────────────

function initShapesDemo() {
  const canvas = document.getElementById('shapes-canvas');
  if (!canvas) return;

  gcanvas({ canvas, bg: '#111' })
    .scene('shapes')
      .go({ x: 40, y: 125 }).triangle({ size: 30, fill: '#ff6b6b' }).end()
      .go({ x: 105, y: 125 }).hexagon({ radius: 18, fill: '#c44dff' }).end()
      .go({ x: 170, y: 125 }).diamond({ width: 28, height: 36, fill: '#4ecdc4' }).end()
      .go({ x: 235, y: 110 }).heart({ size: 26, fill: '#ff6b9d' }).end()
      .go({ x: 300, y: 125 }).cross({ size: 26, thickness: 6, fill: '#ffd93d' }).end()
      .go({ x: 365, y: 125 }).ring({ innerRadius: 10, outerRadius: 18, fill: '#a8e6cf' }).end()
      .go({ x: 430, y: 125 }).star({ points: 6, radius: 18, fill: '#ff8c42' }).end()
      .go({ x: 485, y: 125 }).cloud({ size: 25, fill: '#dfe6e9' })
    .start();
}

// ─────────────────────────────────────────────────────────
// Demo 4: Motion Presets
// ─────────────────────────────────────────────────────────

function initMotionDemo() {
  const canvas = document.getElementById('motion-canvas');
  if (!canvas) return;

  gcanvas({ canvas, bg: '#111' })
    .scene('motion')
      // Pulsing circle
      .go({ x: 100, y: 125 })
        .circle({ radius: 30, fill: '#ff6b6b' })
        .pulse({ min: 0.7, max: 1.3, duration: 1 })
      .end()
      // Oscillating star
      .go({ x: 220, y: 125 })
        .star({ points: 5, radius: 25, fill: '#ffd93d' })
        .oscillate({ prop: 'y', min: -30, max: 30, duration: 2 })
      .end()
      // Orbiting shape
      .go({ x: 300, y: 125 })
        .hexagon({ radius: 20, fill: '#4ecdc4' })
        .orbit({ radiusX: 40, radiusY: 40, duration: 3 })
    .start();
}

// ─────────────────────────────────────────────────────────
// Demo 5: Sketch Mode (using gcanvas to target existing canvas)
// Note: sketch() auto-creates a canvas, so we recreate the pattern with gcanvas
// ─────────────────────────────────────────────────────────

function initSketchDemo() {
  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: '#111' });
  const scene = game.scene('default');

  // Create radial pattern
  const count = 12;
  const radius = 80;
  const cx = 200;
  const cy = 125;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    scene.go({ x, y, name: `shape_${i}` })
      .circle({ radius: 15, fill: `hsl(${i * 30}, 70%, 60%)` });
  }

  game.on('update', (dt, ctx) => {
    for (let i = 0; i < count; i++) {
      const shape = ctx.refs[`shape_${i}`];
      if (shape) {
        shape.rotation += dt * (i % 2 === 0 ? 1 : -1);
      }
    }
  });

  game.start();
}

// ─────────────────────────────────────────────────────────
// Demo 6: Events & Interactivity
// ─────────────────────────────────────────────────────────

function initEventsDemo() {
  const canvas = document.getElementById('events-canvas');
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: '#111' })
    .state({ clicks: 0 });

  game.scene('interactive')
    .go({ x: 200, y: 100, name: 'clickTarget' })
      .circle({ radius: 40, fill: '#ff6b6b' })
      .on('click', (ctx) => {
        // Access shared state via game.refs
        const state = game.getState('clicks') || 0;
        game.setState('clicks', state + 1);

        // Update label text
        const label = game.refs.label;
        if (label && label._fluentShape) {
          label._fluentShape.text = `Clicks: ${state + 1}`;
        }

        // Visual feedback - brief pulse
        ctx.go.scaleX = 1.2;
        ctx.go.scaleY = 1.2;
        setTimeout(() => {
          ctx.go.scaleX = 1;
          ctx.go.scaleY = 1;
        }, 100);
      })
    .end()
    .go({ x: 200, y: 200, name: 'label' })
      .text('Click the circle!', { fill: '#aaa', font: '14px monospace' });

  game.start();
}

// ─────────────────────────────────────────────────────────
// Initialize all demos on page load
// ─────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initHelloDemo();
  initChainDemo();
  initShapesDemo();
  initMotionDemo();
  initSketchDemo();
  initEventsDemo();
});
