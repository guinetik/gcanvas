# DNA Helix Accordion Nav — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat sidebar nav in `demos/index.html` with a CSS 3D helix accordion — sections collapse/expand with a DNA unzipping animation, only one section open at a time, synced to URL hash.

**Architecture:** Pure CSS 3D transforms on `.helix-header` elements create a zigzag spiral. Expand/collapse uses `max-height` + `overflow:hidden` transitions. JS handles state: which section is open, hash routing, and setting CSS custom properties for stagger delays. No dependencies.

**Tech Stack:** HTML, CSS (3D transforms, keyframe animations, custom properties), vanilla JS

---

### Task 1: Add helix CSS to demos.css

**Files:**
- Modify: `demos/demos.css` (append after existing nav styles, before `#info` styles ~line 63)

**Step 1: Add the helix CSS rules**

Insert the following CSS block after the `nav a.active` rule (line 62) and before the `iframe` rule (line 64):

```css
/* ========================================
   Helix Accordion Nav
   ======================================== */

/* Perspective container for 3D effect */
nav#main-nav {
  perspective: 800px;
}

/* Section wrapper */
.helix-section {
  transform-style: preserve-3d;
  margin-bottom: 0.25rem;
}

/* Section headers — the helix backbone */
.helix-header {
  display: block;
  width: 100%;
  background: none;
  border: none;
  color: #888;
  font-family: monospace;
  font-size: 0.85em;
  font-weight: bold;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 0.5rem 0.25rem;
  cursor: pointer;
  text-align: left;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.3s ease,
              text-shadow 0.3s ease;
  transform-origin: center center;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Helix twist — even sections lean left, odd lean right */
.helix-section:nth-child(even) > .helix-header {
  transform: rotateY(-18deg) translateX(-12px);
}

.helix-section:nth-child(odd) > .helix-header {
  transform: rotateY(18deg) translateX(12px);
}

/* Hover: come forward slightly */
.helix-header:hover {
  color: #ccc;
  text-shadow: 0 0 8px rgba(0, 255, 0, 0.2);
}

/* Active/open section — snap to front */
.helix-section.open > .helix-header {
  transform: rotateY(0deg) translateX(0);
  color: #0f0;
  text-shadow: 0 0 12px rgba(0, 255, 0, 0.3);
}

/* Green accent bar on active header */
.helix-section.open > .helix-header::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, #0f0, transparent);
}

/* Collapsible body */
.helix-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s ease;
  opacity: 0;
}

.helix-section.open > .helix-body {
  max-height: 1200px;
  opacity: 1;
}

/* Links inside helix body */
.helix-link {
  display: block;
  color: #999;
  text-decoration: none;
  padding: 0.2rem 0.4rem;
  margin-bottom: 0.15rem;
  font-size: 0.8em;
  transition: color 0.2s ease, background 0.2s ease, padding-left 0.2s ease;
  opacity: 0;
  animation: none;
}

.helix-link:hover {
  color: #0f0;
  background: #151515;
}

.helix-link.active {
  color: #0f0;
  background: #111;
  border-left: 2px solid #0f0;
  padding-left: 0.5rem;
}

/* Unzip animation — links stagger in from alternating sides */
@keyframes unzip-left {
  from {
    opacity: 0;
    transform: translateX(-25px) rotateY(15deg);
  }
  to {
    opacity: 1;
    transform: translateX(0) rotateY(0);
  }
}

@keyframes unzip-right {
  from {
    opacity: 0;
    transform: translateX(25px) rotateY(-15deg);
  }
  to {
    opacity: 1;
    transform: translateX(0) rotateY(0);
  }
}

/* When section is open, animate links in */
.helix-section.open .helix-link:nth-child(odd) {
  animation: unzip-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.helix-section.open .helix-link:nth-child(even) {
  animation: unzip-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Stagger delays are set via inline style --i custom property */
.helix-section.open .helix-link {
  animation-delay: calc(var(--i, 0) * 40ms);
}

/* Collapsed links reset */
.helix-section:not(.open) .helix-link {
  opacity: 0;
  transform: translateX(0);
  animation: none;
}

/* Genuary external link — special styling */
.helix-external {
  display: block;
  color: #0f0;
  text-decoration: none;
  font-family: monospace;
  font-size: 0.85em;
  font-weight: bold;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 0.5rem 0.25rem;
  margin-bottom: 0.25rem;
  transition: text-shadow 0.3s ease;
}

.helix-external:hover {
  text-shadow: 0 0 12px rgba(0, 255, 0, 0.4);
}

/* Separator between branding and sections */
.helix-separator {
  border: none;
  border-top: 1px solid #1a1a1a;
  margin: 0.5rem 0;
}
```

**Step 2: Verify the CSS doesn't break existing styles**

Run: `npm run dev`
Open browser → check that the page loads. The nav will look broken because we haven't changed the HTML yet — that's expected and fine.

**Step 3: Commit**

```bash
git add demos/demos.css
git commit -m "style: add helix accordion CSS with 3D transforms and unzip animations"
```

---

### Task 2: Restructure nav HTML into helix sections

**Files:**
- Modify: `demos/index.html` (lines 140-327 — the entire `<nav>` content)

**Step 1: Replace the nav content**

Replace lines 140–327 (from `<nav id="main-nav">` through `</nav>`) with the new helix-structured HTML. Keep the `nav-branding` div unchanged. Replace all `<h2>`/`<h3>` headings and flat link lists with `.helix-section` blocks.

Each section follows this pattern:
```html
<div class="helix-section" data-section="sectionname">
    <button class="helix-header">Section Title</button>
    <div class="helix-body">
        <a href="demo.html" class="helix-link" style="--i:0">Demo Name</a>
        <a href="demo2.html" class="helix-link" style="--i:1">Demo 2</a>
    </div>
</div>
```

The `--i` custom property on each link controls its stagger delay.

Full replacement for lines 140–327:

```html
<nav id="main-nav">
    <div class="nav-branding">
        <div style="text-align: center; margin-bottom: 1em">
            <img
                src="./logo.svg"
                alt="Logo"
                width="90"
                height="80"
                style="display: inline-block; vertical-align: middle"
            />
        </div>
        <div style="text-align: center; margin-bottom: 1em">
            <h1
                style="
                    letter-spacing: 2px;
                    margin-bottom: 0.3em;
                    margin-top: 0.25em;
                    font-family: monospace;
                    font-size: 2em;
                    color: #ccc;
                "
            >
                GCANVAS
            </h1>
            <hr style="margin: 0.5em 1.6em" />
            <a
                href="https://github.com/guinetik/gcanvas"
                target="_blank"
                title="View on GitHub"
                style="
                    display: inline-block;
                    background: #1f1f1f;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    margin: 0.5em;
                    box-shadow: 0 2px 6px #0002;
                "
            >
                <svg
                    viewBox="0 0 16 16"
                    width="22"
                    height="22"
                    aria-hidden="true"
                    fill="#fff"
                    style="margin: 7px 0 0 0"
                >
                    <path
                        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
          0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
          -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2
          -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12
          0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04
          2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15
          0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01
          2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                    ></path>
                </svg>
            </a>
        </div>
    </div>
    <hr class="helix-separator" />

    <!-- Home — always visible, not a collapsible section -->
    <div class="helix-section open" data-section="home">
        <button class="helix-header">Home</button>
        <div class="helix-body">
            <a href="home.html" class="helix-link" style="--i:0">Welcome</a>
        </div>
    </div>

    <!-- External link -->
    <a href="https://genuary2026.guinetik.com/" target="_blank" class="helix-external">Genuary 2026</a>

    <hr class="helix-separator" />

    <!-- Docs -->
    <div class="helix-section" data-section="docs">
        <button class="helix-header">Docs</button>
        <div class="helix-body">
            <a href="pipeline.html" class="helix-link" style="--i:0">Rendering Pipeline</a>
            <a href="gameobjects.html" class="helix-link" style="--i:1">Game Objects</a>
            <a href="coordinates.html" class="helix-link" style="--i:2">Coordinate System</a>
            <a href="fluent.html" class="helix-link" style="--i:3">Fluent API</a>
        </div>
    </div>

    <hr class="helix-separator" />

    <!-- Game -->
    <div class="helix-section" data-section="game">
        <button class="helix-header">Game</button>
        <div class="helix-body">
            <a href="basic.html" class="helix-link" style="--i:0">Basic</a>
            <a href="loop.html" class="helix-link" style="--i:1">Game Loop</a>
            <a href="events.html" class="helix-link" style="--i:2">Event Handlers</a>
        </div>
    </div>

    <!-- Shapes -->
    <div class="helix-section" data-section="shapes">
        <button class="helix-header">Shapes</button>
        <div class="helix-body">
            <a href="shapes.html" class="helix-link" style="--i:0">Shape Gallery</a>
            <a href="visibility.html" class="helix-link" style="--i:1">Visibility</a>
            <a href="opacity.html" class="helix-link" style="--i:2">Opacity</a>
            <a href="transforms.html" class="helix-link" style="--i:3">Transforms</a>
            <a href="group.html" class="helix-link" style="--i:4">Groups</a>
            <a href="particles.html" class="helix-link" style="--i:5">Shape Particles</a>
        </div>
    </div>

    <!-- Painter -->
    <div class="helix-section" data-section="painter">
        <button class="helix-header">Painter</button>
        <div class="helix-body">
            <a href="painter.html" class="helix-link" style="--i:0">Painter</a>
            <a href="bezier.html" class="helix-link" style="--i:1">Bezier Curves</a>
            <a href="beziersignature.html" class="helix-link" style="--i:2">Bezier Signature</a>
            <a href="svgtween.html" class="helix-link" style="--i:3">SVG Motion</a>
        </div>
    </div>

    <!-- Image -->
    <div class="helix-section" data-section="image">
        <button class="helix-header">Image</button>
        <div class="helix-body">
            <a href="patterns.html" class="helix-link" style="--i:0">Image Patterns</a>
            <a href="fractals.html" class="helix-link" style="--i:1">Fractals</a>
        </div>
    </div>

    <!-- Motion -->
    <div class="helix-section" data-section="motion">
        <button class="helix-header">Motion</button>
        <div class="helix-body">
            <a href="animations.html" class="helix-link" style="--i:0">Animations</a>
            <a href="easing.html" class="helix-link" style="--i:1">Easing</a>
            <a href="tween.html" class="helix-link" style="--i:2">Tween</a>
            <a href="sprite.html" class="helix-link" style="--i:3">Sprite Timeline</a>
            <a href="particles-showcase.html" class="helix-link" style="--i:4">Particle System</a>
        </div>
    </div>

    <!-- Scene -->
    <div class="helix-section" data-section="scene">
        <button class="helix-header">Scene</button>
        <div class="helix-body">
            <a href="scene.html" class="helix-link" style="--i:0">Scene</a>
            <a href="layouts.html" class="helix-link" style="--i:1">Scene Layouts</a>
            <a href="tiles.html" class="helix-link" style="--i:2">Tile Layout</a>
            <a href="isometric.html" class="helix-link" style="--i:3">Isometric</a>
            <a href="scenes.html" class="helix-link" style="--i:4">Scene Transforms</a>
            <a href="scene-interactivity-test.html" class="helix-link" style="--i:5">Scene Interactivity</a>
        </div>
    </div>

    <hr class="helix-separator" />

    <!-- 3D -->
    <div class="helix-section" data-section="3d">
        <button class="helix-header">3D</button>
        <div class="helix-body">
            <a href="sphere3d.html" class="helix-link" style="--i:0">Sphere3D Showcase</a>
            <a href="plane3d.html" class="helix-link" style="--i:1">Plane3D Showcase</a>
            <a href="cube3d.html" class="helix-link" style="--i:2">Rubik's Cube</a>
        </div>
    </div>

    <hr class="helix-separator" />

    <!-- Generative Art -->
    <div class="helix-section" data-section="genart">
        <button class="helix-header">Generative Art</button>
        <div class="helix-body">
            <a href="genart.html" class="helix-link" style="--i:0">Hypnotic Mandala</a>
            <a href="study001.html" class="helix-link" style="--i:1">Study 001</a>
            <a href="study002.html" class="helix-link" style="--i:2">Study 002</a>
            <a href="study003.html" class="helix-link" style="--i:3">Study 003</a>
            <a href="study004.html" class="helix-link" style="--i:4">Study 004</a>
            <a href="study005.html" class="helix-link" style="--i:5">Study 005</a>
            <a href="study006.html" class="helix-link" style="--i:6">Study 006</a>
            <a href="study007.html" class="helix-link" style="--i:7">Study 007</a>
            <a href="study008.html" class="helix-link" style="--i:8">Study 008</a>
            <a href="study009.html" class="helix-link" style="--i:9">Study 009</a>
            <a href="hyperbolic001.html" class="helix-link" style="--i:10">Hyperbolic 001</a>
            <a href="hyperbolic002.html" class="helix-link" style="--i:11">Hyperbolic 002</a>
            <a href="hyperbolic003.html" class="helix-link" style="--i:12">Hyperbolic 003</a>
            <a href="hyperbolic004.html" class="helix-link" style="--i:13">Hyperbolic 004</a>
            <a href="hyperbolic005.html" class="helix-link" style="--i:14">Hyperbolic 005</a>
            <a href="mondrian.html" class="helix-link" style="--i:15">Mondrian</a>
            <a href="gendream.html" class="helix-link" style="--i:16">Fractal Plasma</a>
            <a href="lavalamp.html" class="helix-link" style="--i:17">Lava Lamp</a>
            <a href="baskara.html" class="helix-link" style="--i:18">Root Dance</a>
        </div>
    </div>

    <!-- Math & Physics -->
    <div class="helix-section" data-section="math">
        <button class="helix-header">Math & Physics</button>
        <div class="helix-body">
            <a href="cmb.html" class="helix-link" style="--i:0">Cosmic Microwave Background</a>
            <a href="fluid.html" class="helix-link" style="--i:1">Fluid Playground</a>
            <a href="fluid-simple.html" class="helix-link" style="--i:2">Fluid System</a>
            <a href="schrodinger.html" class="helix-link" style="--i:3">Schrodinger Wave</a>
            <a href="spacetime.html" class="helix-link" style="--i:4">Spacetime Curvature</a>
            <a href="schwarzschild.html" class="helix-link" style="--i:5">Schwarzschild Metric</a>
            <a href="kerr.html" class="helix-link" style="--i:6">Kerr Metric</a>
            <a href="blackhole.html" class="helix-link" style="--i:7">Black Hole</a>
            <a href="tde.html" class="helix-link" style="--i:8">Tidal Disruption</a>
            <a href="dadras.html" class="helix-link" style="--i:9">Dadras Attractor</a>
            <a href="lorenz.html" class="helix-link" style="--i:10">Lorenz Attractor</a>
            <a href="aizawa.html" class="helix-link" style="--i:11">Aizawa Attractor</a>
            <a href="thomas.html" class="helix-link" style="--i:12">Thomas Attractor</a>
            <a href="rossler.html" class="helix-link" style="--i:13">Rossler Attractor</a>
            <a href="halvorsen.html" class="helix-link" style="--i:14">Halvorsen Attractor</a>
            <a href="rabinovich-fabrikant.html" class="helix-link" style="--i:15">Rabinovich-Fabrikant</a>
            <a href="chen.html" class="helix-link" style="--i:16">Chen Attractor</a>
            <a href="threescroll.html" class="helix-link" style="--i:17">Three-Scroll</a>
            <a href="chua.html" class="helix-link" style="--i:18">Chua's Circuit</a>
            <a href="clifford.html" class="helix-link" style="--i:19">Clifford Attractor</a>
            <a href="dejong.html" class="helix-link" style="--i:20">De Jong Attractor</a>
            <a href="caos-playground.html" class="helix-link" style="--i:21">Caos Playground</a>
            <a href="quantum-manifold.html" class="helix-link" style="--i:22">Quantum Manifold</a>
            <a href="hydrogen-orbital.html" class="helix-link" style="--i:23">Hydrogen Orbitals</a>
        </div>
    </div>

    <hr class="helix-separator" />

    <!-- Games -->
    <div class="helix-section" data-section="games">
        <button class="helix-header">Games</button>
        <div class="helix-body">
            <a href="blob.html" class="helix-link" style="--i:0">Bezier Blob</a>
            <a href="space.html" class="helix-link" style="--i:1">Space Invaders</a>
            <a href="dino.html" class="helix-link" style="--i:2">Dino Run</a>
            <a href="platformer.html" class="helix-link" style="--i:3">Tron Platformer</a>
            <a href="tetris3d.html" class="helix-link" style="--i:4">3D Tetris</a>
            <a href="starfaux.html" class="helix-link" style="--i:5">StarFaux</a>
            <a href="penrose-game.html" class="helix-link" style="--i:6">Penrose Spacetime</a>
        </div>
    </div>
</nav>
```

**Step 2: Verify the HTML renders**

Run: `npm run dev`
Open browser → nav should show section headers in helix twist positions. Only "Home" section should be expanded. Clicking other headers won't work yet (JS not updated).

**Step 3: Commit**

```bash
git add demos/index.html
git commit -m "refactor: restructure nav HTML into helix accordion sections"
```

---

### Task 3: Replace nav JS with helix accordion logic

**Files:**
- Modify: `demos/index.html` (lines 330–451 — the three `<script>` blocks)

**Step 1: Replace all three script blocks**

Replace the three `<script>` blocks (active link highlight, hash routing, hamburger toggle) with a single unified script:

```html
<script>
document.addEventListener("DOMContentLoaded", () => {
    const nav = document.getElementById("main-nav");
    const iframe = document.getElementById("demo-frame");
    const sections = nav.querySelectorAll(".helix-section");
    const allLinks = nav.querySelectorAll(".helix-link");
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const overlay = document.getElementById("nav-overlay");

    // Build a lookup: route name → section name
    const routeToSection = {};
    sections.forEach((section) => {
        const sectionName = section.dataset.section;
        section.querySelectorAll(".helix-link").forEach((link) => {
            const route = link.getAttribute("href").replace(".html", "");
            routeToSection[route] = sectionName;
        });
    });

    // Open a section (close all others)
    function openSection(sectionName) {
        sections.forEach((s) => {
            if (s.dataset.section === sectionName) {
                s.classList.add("open");
            } else {
                s.classList.remove("open");
            }
        });
    }

    // Highlight the active link
    function setActiveLink(route) {
        allLinks.forEach((link) => {
            const linkRoute = link.getAttribute("href").replace(".html", "");
            link.classList.toggle("active", linkRoute === route);
        });
    }

    // Parse hash: "#/shapes" → "shapes"
    function getRouteFromHash() {
        if (location.hash.startsWith("#/")) {
            return location.hash.slice(2);
        }
        return "home";
    }

    // Load route into iframe, highlight link, expand section
    function loadRoute(route) {
        iframe.src = route + ".html";
        setActiveLink(route);

        const sectionName = routeToSection[route];
        if (sectionName) {
            openSection(sectionName);
        }

        if (typeof trackPageView === "function") {
            trackPageView(route);
        }
    }

    // Handle hash changes
    function handleHashChange() {
        loadRoute(getRouteFromHash());
    }

    // Section header clicks — toggle accordion
    sections.forEach((section) => {
        const header = section.querySelector(".helix-header");
        if (!header) return;

        header.addEventListener("click", () => {
            const isOpen = section.classList.contains("open");
            if (isOpen) {
                // Clicking an open section collapses it
                section.classList.remove("open");
            } else {
                // Open this section, close others
                openSection(section.dataset.section);
                // If section has links, load the first one (or the active one)
                const activeLink = section.querySelector(".helix-link.active");
                const firstLink = section.querySelector(".helix-link");
                const target = activeLink || firstLink;
                if (target) {
                    const route = target.getAttribute("href").replace(".html", "");
                    location.hash = "/" + route;
                }
            }
        });
    });

    // Link clicks — set hash (which triggers route load)
    allLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const route = link.getAttribute("href").replace(".html", "");
            location.hash = "/" + route;

            // Close mobile menu
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });

    // Hamburger menu
    function toggleMenu() {
        nav.classList.toggle("open");
        overlay.classList.toggle("open");
        hamburgerBtn.classList.toggle("active");
    }

    function closeMenu() {
        nav.classList.remove("open");
        overlay.classList.remove("open");
        hamburgerBtn.classList.remove("active");
    }

    hamburgerBtn.addEventListener("click", toggleMenu);
    overlay.addEventListener("click", closeMenu);

    // Init
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
});
</script>
```

**Step 2: Verify full behavior**

Run: `npm run dev`

Test these scenarios:
1. Page loads with no hash → Home section open, Welcome loaded in iframe
2. Page loads with `#/lorenz` → Math & Physics section expands, Lorenz link highlighted
3. Click "Shapes" header → Shapes section expands, others collapse, first demo loads
4. Click a link inside expanded section → iframe loads, link highlighted
5. Click already-open section header → section collapses
6. Mobile: hamburger opens/closes nav

**Step 3: Commit**

```bash
git add demos/index.html
git commit -m "feat: add helix accordion JS — section toggle, hash sync, route-to-section lookup"
```

---

### Task 4: Clean up old nav styles that conflict

**Files:**
- Modify: `demos/demos.css` (adjust existing `nav a` styles)

**Step 1: Scope old nav link styles to avoid conflicts**

The existing `nav a` styles (lines 41-62) apply to ALL links in nav, including `.helix-link` and `.helix-external`. We need to make the old generic `nav a` styles not override our helix-specific styles.

Replace lines 40-62:

```css
/* Links inside nav (generic — non-helix links like branding) */
nav a:not(.helix-link):not(.helix-external) {
  display: block;
  color: #ccc;
  margin-bottom: 0.5rem;
  text-decoration: none;
  padding: 0.25rem;
  transition: background 0.2s ease;
}

/* Hover effect for generic nav links */
nav a:not(.helix-link):not(.helix-external):hover {
  background: #151515;
  color: #0f0;
}

/* Active generic link highlight */
nav a:not(.helix-link):not(.helix-external).active {
  background: #111;
  color: #0f0;
  border-left: 2px solid #0f0;
  padding-left: 0.5rem;
}
```

Also remove the old `hr` styling in nav — the `<hr>` tags are now `.helix-separator` elements. No old `hr` rules exist in CSS so nothing to remove there.

**Step 2: Verify no visual regressions**

Run: `npm run dev`
Check: branding GitHub link still styled correctly, helix links use their own styles, no double-styling.

**Step 3: Commit**

```bash
git add demos/demos.css
git commit -m "fix: scope generic nav link styles to avoid helix class conflicts"
```

---

### Task 5: Widen nav for helix readability

**Files:**
- Modify: `demos/demos.css` (nav width)

**Step 1: Increase nav width**

The helix 3D transforms need more horizontal room. Change nav width from 200px to 240px.

In the `nav` rule (~line 19-30), change:
```css
width: 200px;
```
to:
```css
width: 240px;
```

Also update the mobile nav width in the media query (~line 267-270):
```css
left: -300px;
width: 300px;
```

**Step 2: Verify layout**

Run: `npm run dev`
Check: nav is wider, section headers don't clip, iframe still fills remaining space.

**Step 3: Commit**

```bash
git add demos/demos.css
git commit -m "style: widen nav to 240px for helix transforms readability"
```

---

### Task 6: Final polish and visual verification

**Files:**
- Modify: `demos/demos.css` (minor tweaks if needed)
- Modify: `demos/index.html` (minor tweaks if needed)

**Step 1: Open dev server and test all interactions**

Run: `npm run dev`

Verify checklist:
- [ ] Collapsed section headers zigzag left/right (helix twist)
- [ ] Clicking a section header expands it, collapses others
- [ ] Active section header snaps to center (rotateY 0)
- [ ] Links animate in with alternating left/right stagger (unzip)
- [ ] Collapsing a section fades links out
- [ ] Hash updates when clicking links
- [ ] Loading page with a hash (e.g. `#/lorenz`) opens the right section
- [ ] Active link has green border-left
- [ ] Mobile hamburger still works
- [ ] Genuary 2026 external link works (opens in new tab)
- [ ] GitHub link in branding still works
- [ ] Scrolling within nav works for long sections (Math & Physics)

**Step 2: Adjust any values that look off**

Common tweaks:
- `rotateY` angle: if too subtle increase to 25deg, if too extreme reduce to 12deg
- `translateX` offset: if clipping increase nav width or reduce offset
- `animation-delay` multiplier: if stagger too slow reduce from 40ms to 30ms
- `max-height: 1200px`: if sections get cut off increase to 1600px

**Step 3: Final commit**

```bash
git add demos/demos.css demos/index.html
git commit -m "polish: tune helix accordion visual parameters"
```
