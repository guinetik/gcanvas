/**
 * Dither Studies Demo
 *
 * 5 techniques for approximating continuous tone with discrete values.
 * Uses the Dither library module for all algorithms.
 */
import { Dither } from "/gcanvas.es.min.js";

const CONFIG = {
  canvasSize: 200,
  animation: { step: 1, shiftStep: 20 },
  stipple: { numDotsRatio: 0.08, seed: 42 },
  techniques: [
    {
      id: "bayer",
      title: "Ordered Dithering",
      subtitle: "Bayer Matrix 8\u00d78",
      description:
        "Pixels are compared against a repeating threshold matrix. The 8\u00d78 Bayer pattern creates a characteristic cross-hatch texture. Computationally cheap and GPU-friendly \u2014 no dependencies between pixels.",
    },
    {
      id: "bluenoise",
      title: "Blue Noise",
      subtitle: "Void & Cluster",
      description:
        "Uses a noise texture with carefully distributed frequencies \u2014 no low-frequency clumps or high-frequency grid artifacts. The result looks organic and film-like. The gold standard for real-time rendering.",
    },
    {
      id: "floyd",
      title: "Error Diffusion",
      subtitle: "Floyd-Steinberg",
      description:
        "Quantization error at each pixel is distributed to unprocessed neighbors using a specific kernel (7/16, 3/16, 5/16, 1/16). Produces smooth gradients but is inherently sequential \u2014 each pixel depends on previous results.",
    },
    {
      id: "stipple",
      title: "Stippling",
      subtitle: "Density Mapping",
      description:
        "Points are placed probabilistically weighted by brightness \u2014 denser in bright areas, sparser in dark. Connects digital dithering to centuries of printmaking and pointillist painting technique.",
    },
    {
      id: "quantize",
      title: "Color Quantize",
      subtitle: "Palette + Dither",
      description:
        "The synthesis: reduce colors to an 8-color CGA palette, then apply Floyd-Steinberg error diffusion across all three channels. The dither creates the illusion of colors that don't exist in the palette.",
    },
  ],
};

// State
let time = 0;
let isAnimating = false;
let selected = null;
let animFrameId = null;

// Pre-generate blue noise once
const blueNoise = Dither.generateBlueNoise(64);

// Build panels
const grid = document.getElementById("grid");
const canvases = {};

CONFIG.techniques.forEach((tech, i) => {
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.dataset.id = tech.id;

  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <span class="panel-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="panel-title">${tech.title}</span>
      </div>
      <span class="panel-subtitle">${tech.subtitle}</span>
    </div>
    <div class="panel-canvas-wrap">
      <canvas width="${CONFIG.canvasSize}" height="${CONFIG.canvasSize}"></canvas>
    </div>
    <p class="panel-desc">${tech.description}</p>
  `;

  panel.addEventListener("click", () => {
    if (selected === tech.id) {
      selected = null;
      panel.classList.remove("selected");
    } else {
      // Deselect previous
      const prev = grid.querySelector(".panel.selected");
      if (prev) prev.classList.remove("selected");
      selected = tech.id;
      panel.classList.add("selected");
    }
  });

  grid.appendChild(panel);
  canvases[tech.id] = panel.querySelector("canvas");
});

// Footer size label
document.getElementById("footer-size").textContent =
  `Canvas ${CONFIG.canvasSize}\u00d7${CONFIG.canvasSize} \u2192 pixelated upscale`;

// Render all dither canvases
function renderDithers() {
  const sz = CONFIG.canvasSize;

  for (const tech of CONFIG.techniques) {
    const canvas = canvases[tech.id];
    const ctx = canvas.getContext("2d");
    let pixelData;

    if (tech.id === "quantize") {
      const colorSrc = Dither.generateColorSource(sz, sz, time);
      pixelData = Dither.colorQuantize(colorSrc, sz, sz);
    } else {
      const source = Dither.generateSource(sz, sz, time);
      switch (tech.id) {
        case "bayer":
          pixelData = Dither.bayer(source, sz, sz);
          break;
        case "bluenoise":
          pixelData = Dither.blueNoise(source, sz, sz, {
            noiseTexture: blueNoise,
            noiseSize: 64,
          });
          break;
        case "floyd":
          pixelData = Dither.floydSteinberg(source, sz, sz);
          break;
        case "stipple":
          pixelData = Dither.stipple(source, sz, sz, CONFIG.stipple);
          break;
      }
    }

    const imgData = new ImageData(pixelData, sz, sz);
    ctx.putImageData(imgData, 0, 0);
  }
}

// Animation loop
function animate() {
  time += CONFIG.animation.step;
  renderDithers();
  animFrameId = requestAnimationFrame(animate);
}

// Controls
const btnAnimate = document.getElementById("btn-animate");
const btnShift = document.getElementById("btn-shift");

btnAnimate.addEventListener("click", () => {
  isAnimating = !isAnimating;
  if (isAnimating) {
    btnAnimate.classList.add("active");
    btnAnimate.innerHTML = "&#9632; Stop";
    btnShift.style.display = "none";
    animFrameId = requestAnimationFrame(animate);
  } else {
    btnAnimate.classList.remove("active");
    btnAnimate.innerHTML = "&#9654; Animate";
    btnShift.style.display = "";
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
});

btnShift.addEventListener("click", () => {
  if (!isAnimating) {
    time += CONFIG.animation.shiftStep;
    renderDithers();
  }
});

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    btnAnimate.click();
  } else if (e.code === "ArrowRight" && !isAnimating) {
    time += CONFIG.animation.shiftStep;
    renderDithers();
  }
});

// Initial render
renderDithers();
