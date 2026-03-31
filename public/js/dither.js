/**
 * Dither Studies Demo
 *
 * 12 techniques for approximating continuous tone with discrete values.
 * Uses the Dither library module for all algorithms.
 */
import { Dither } from "/gcanvas.es.min.js";

const CONFIG = {
  canvasSize: 200,
  sourceImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Milky_Way_Galaxy.jpg/1280px-Milky_Way_Galaxy.jpg",
  animation: { step: 1, shiftStep: 20 },
  stipple: { numDotsRatio: 0.08, seed: 42 },
  techniques: [
    {
      id: "bayer",
      title: "Bayer Matrix",
      subtitle: "Ordered Dithering",
      description:
        "Pixels are compared against a repeating 8\u00d78 threshold matrix. Creates a characteristic cross-hatch texture. Computationally cheap and GPU-friendly \u2014 no dependencies between pixels.",
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
      title: "Floyd-Steinberg",
      subtitle: "Error Diffusion",
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
      id: "stucki",
      title: "Stucki",
      subtitle: "Error Diffusion",
      description:
        "A 12-neighbor error diffusion kernel with sharper results than Floyd-Steinberg. Distributes error over a 3\u00d75 area, reducing banding artifacts while preserving edge detail.",
    },
    {
      id: "atkinson",
      title: "Atkinson",
      subtitle: "Error Diffusion",
      description:
        "Only diffuses 3/4 of the quantization error, discarding the rest. This produces higher contrast results with less blurring \u2014 famously used in early Macintosh software.",
    },
    {
      id: "jarvis",
      title: "Jarvis-Judice-Ninke",
      subtitle: "Error Diffusion",
      description:
        "A wide 12-neighbor kernel distributing error over 3 rows. Produces very smooth gradients with minimal patterning, at the cost of more diffusion blur.",
    },
    {
      id: "sierra",
      title: "Sierra",
      subtitle: "Error Diffusion",
      description:
        "A balanced 10-neighbor kernel offering a good compromise between the smoothness of Jarvis and the sharpness of Floyd-Steinberg.",
    },
    {
      id: "sierra-two-row",
      title: "Sierra Two-Row",
      subtitle: "Error Diffusion",
      description:
        "A faster variant of Sierra using only 2 rows instead of 3. Slightly less smooth but noticeably faster for large images.",
    },
    {
      id: "sierra-lite",
      title: "Sierra Lite",
      subtitle: "Error Diffusion",
      description:
        "The minimal Sierra variant \u2014 only 3 neighbors, similar to Floyd-Steinberg but with different weights. Fastest error diffusion option.",
    },
    {
      id: "burkes",
      title: "Burkes",
      subtitle: "Error Diffusion",
      description:
        "A 7-neighbor, 2-row kernel similar to Stucki but faster. Produces results between Floyd-Steinberg and Stucki in quality.",
    },
    {
      id: "quantize",
      title: "Color Quantize",
      subtitle: "CGA Palette",
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
let imageGraySource = null;  // Float32Array grayscale 0-1
let imageColorSource = null; // Float32Array RGB 0-1
let activeSource = "procedural";  // "image" or "procedural"

// Pre-generate blue noise once
const blueNoise = Dither.generateBlueNoise(64);

// Load source image and extract pixel data
function loadSourceImage() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sz = CONFIG.canvasSize;
      const oc = document.createElement("canvas");
      oc.width = sz;
      oc.height = sz;
      const octx = oc.getContext("2d");
      // Crop to square from center
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      octx.drawImage(img, sx, sy, side, side, 0, 0, sz, sz);

      // Show source preview
      const preview = document.getElementById("source-preview");
      if (preview) {
        preview.width = sz;
        preview.height = sz;
        preview.getContext("2d").drawImage(oc, 0, 0);
      }

      const imgData = octx.getImageData(0, 0, sz, sz);
      const pixels = imgData.data;

      // Extract grayscale source (0-1)
      imageGraySource = new Float32Array(sz * sz);
      for (let i = 0; i < imageGraySource.length; i++) {
        const idx = i * 4;
        imageGraySource[i] = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255;
      }

      // Extract color source (0-1, width*height*3)
      imageColorSource = new Float32Array(sz * sz * 3);
      for (let i = 0; i < sz * sz; i++) {
        const idx = i * 4;
        imageColorSource[i * 3] = pixels[idx] / 255;
        imageColorSource[i * 3 + 1] = pixels[idx + 1] / 255;
        imageColorSource[i * 3 + 2] = pixels[idx + 2] / 255;
      }

      resolve();
    };
    img.onerror = () => {
      // Fallback to procedural if image fails to load
      resolve();
    };
    img.src = CONFIG.sourceImage;
  });
}

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

    const useProcedural = activeSource === "procedural" || !imageGraySource;

    if (tech.id === "quantize") {
      const colorSrc = useProcedural ? Dither.generateColorSource(sz, sz, time) : imageColorSource;
      pixelData = Dither.colorQuantize(colorSrc, sz, sz);
    } else {
      const source = useProcedural ? Dither.generateSource(sz, sz, time) : imageGraySource;
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
        case "stucki":
          pixelData = Dither.stucki(source, sz, sz);
          break;
        case "atkinson":
          pixelData = Dither.atkinson(source, sz, sz);
          break;
        case "jarvis":
          pixelData = Dither.jarvis(source, sz, sz);
          break;
        case "sierra":
          pixelData = Dither.sierra(source, sz, sz);
          break;
        case "sierra-two-row":
          pixelData = Dither.sierraTwoRow(source, sz, sz);
          break;
        case "sierra-lite":
          pixelData = Dither.sierraLite(source, sz, sz);
          break;
        case "burkes":
          pixelData = Dither.burkes(source, sz, sz);
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

// Source selection
const srcProcedural = document.getElementById("source-procedural");
const srcImage = document.getElementById("source-preview");

function setActiveSource(mode) {
  activeSource = mode;
  srcProcedural.classList.toggle("active", mode === "procedural");
  srcImage.parentElement.classList.toggle("active", mode === "image");
  // Show animate buttons only for procedural
  btnAnimate.style.display = mode === "procedural" ? "" : "none";
  btnShift.style.display = mode === "procedural" && !isAnimating ? "" : "none";
  // Stop animation when switching to image
  if (mode === "image" && isAnimating) {
    btnAnimate.click();
  }
  renderDithers();
}

srcProcedural.addEventListener("click", () => setActiveSource("procedural"));
srcImage.addEventListener("click", () => setActiveSource("image"));

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

// Render procedural preview
function renderProceduralPreview() {
  const sz = CONFIG.canvasSize;
  const canvas = document.getElementById("source-procedural");
  if (!canvas) return;
  canvas.width = sz;
  canvas.height = sz;
  const source = Dither.generateSource(sz, sz, 0);
  const data = new Uint8ClampedArray(sz * sz * 4);
  for (let i = 0; i < source.length; i++) {
    const v = Math.round(source[i] * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  canvas.getContext("2d").putImageData(new ImageData(data, sz, sz), 0, 0);
}

// Load image, render previews, then render dithers
renderProceduralPreview();
loadSourceImage().then(() => {
  // Start with procedural, image is ready if user clicks it
  setActiveSource("procedural");
});
