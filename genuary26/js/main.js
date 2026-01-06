/**
 * Genuary 2026 - Main Application Controller
 *
 * Handles:
 * - Dynamic section generation
 * - Snap scroll detection
 * - Game lifecycle (mount/unmount)
 * - Navigation (sidebar, hamburger, arrows)
 */

import { PROMPTS, TOTAL_DAYS, getPrompt, getInterpretation } from './prompts.js';

// ============================================
// Configuration
// ============================================

const CONFIG = {
  scrollDebounce: 150,
  implementedDays: [1, 2, 3, 4, 5, 6, 7], // Days with actual implementations
};

// ============================================
// State
// ============================================

const state = {
  currentDay: 1,
  games: new Map(), // dayNumber -> game instance
  mounting: new Set(), // days currently being mounted (prevent race condition)
  sections: [],
  isScrolling: false,
};

// ============================================
// DOM References
// ============================================

const elements = {
  main: null,
  sidebar: null,
  navLinks: null,
  overlay: null,
  hamburger: null,
  navUp: null,
  navDown: null,
};

// ============================================
// Lifecycle Management
// ============================================

/**
 * Mount a day's game loop
 * @param {number} day - Day number to mount
 */
async function mountDay(day) {
  // Already mounted or currently mounting? Skip (prevents race condition)
  if (state.games.has(day) || state.mounting.has(day)) {
    return;
  }

  // Mark as mounting BEFORE async operation
  state.mounting.add(day);

  const canvas = document.getElementById(`canvas-${day}`);
  if (!canvas) {
    state.mounting.delete(day);
    return;
  }

  // Check if this day has an implementation
  if (!CONFIG.implementedDays.includes(day)) {
    showPlaceholder(canvas, day);
    state.mounting.delete(day);
    return;
  }

  try {
    // Dynamic import of day module
    const dayModule = await import(`./days/day${String(day).padStart(2, '0')}.js`);

    // Double-check we still should mount (might have been unmounted during import)
    if (!state.mounting.has(day)) {
      return;
    }

    // Resize canvas to container
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Create and start the game
    const game = dayModule.default(canvas);
    state.games.set(day, game);
    state.mounting.delete(day);

    console.log(`[Genuary] Mounted Day ${day}`);
  } catch (err) {
    console.warn(`[Genuary] Day ${day} not implemented:`, err.message);
    state.mounting.delete(day);
    showPlaceholder(canvas, day);
  }
}

/**
 * Unmount a day's game loop
 * @param {number} day - Day number to unmount
 */
function unmountDay(day) {
  // Cancel any in-progress mount
  state.mounting.delete(day);

  const game = state.games.get(day);
  if (!game) return;

  // Stop the game loop
  game.stop();
  state.games.delete(day);

  console.log(`[Genuary] Unmounted Day ${day}`);
}

/**
 * Show placeholder for unimplemented days
 * @param {HTMLCanvasElement} canvas
 * @param {number} day
 */
function showPlaceholder(canvas, day) {
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  // Handle high DPI
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  // Don't scale context here if we are setting canvas style width/height elsewhere, 
  // but usually for crisp rendering we want this.
  // However, the original code didn't handle DPI, so let's stick to the simple size matching
  // but add some style.
  canvas.width = rect.width;
  canvas.height = rect.height;

  const w = canvas.width;
  const h = canvas.height;

  // Background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);

  // Dotted Grid
  ctx.fillStyle = '#1a1a1a';
  const gridSize = 30;
  for (let x = 0; x < w; x += gridSize) {
    for (let y = 0; y < h; y += gridSize) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Cross lines
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, h);
  ctx.moveTo(w, 0);
  ctx.lineTo(0, h);
  ctx.stroke();

  // "OFFLINE" Text with glitch look
  const fontSize = Math.min(w, h) * 0.1;
  ctx.font = `bold ${fontSize}px "Fira Code", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Shadow effect
  ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
  ctx.fillText('SYSTEM_OFFLINE', w / 2 + 2, h / 2 + 2);
  
  ctx.fillStyle = '#222';
  ctx.fillText('SYSTEM_OFFLINE', w / 2, h / 2);

  // Day info
  ctx.font = '14px "Fira Code", monospace';
  
  ctx.fillStyle = '#444';
  ctx.textAlign = 'left';
  ctx.fillText(`DAY_${String(day).padStart(2, '0')}_PENDING_INIT`, 20, 30);
  
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f0';
  ctx.globalAlpha = 0.5;
  ctx.fillText(`INITIALIZING...`, w - 20, h - 20);
  ctx.globalAlpha = 1.0;
}

// ============================================
// Section Generation
// ============================================

/**
 * Generate all day sections and nav links
 */
function generateSections() {
  elements.main = document.getElementById('main-content');
  elements.navLinks = document.getElementById('nav-links');

  for (let day = 1; day <= TOTAL_DAYS; day++) {
    // Create section
    const section = document.createElement('section');
    section.className = 'day-section';
    section.dataset.day = day;
    if (day === 1) section.classList.add('active');

    section.innerHTML = `
      <div class="day-bg-number">${String(day).padStart(2, '0')}</div>
      <div class="day-canvas-container">
        <div class="corner-tr"></div>
        <div class="corner-bl"></div>
        <div class="tech-decor-top">SYSTEM.Render(0${day})</div>
        <canvas id="canvas-${day}"></canvas>
      </div>
      <div class="day-info">
        <div class="day-number-display">Day ${day}</div>
        <h2 class="day-title">${getPrompt(day)}</h2>
        <p class="day-interpretation">${getInterpretation(day)}</p>
        <p class="day-date">January ${day}, 2026</p>
      </div>
    `;

    elements.main.appendChild(section);
    state.sections.push(section);

    // Create nav link
    const link = document.createElement('a');
    link.href = `#day-${day}`;
    link.dataset.day = day;
    if (day === 1) link.classList.add('active');

    link.innerHTML = `
      <span class="day-number">${String(day).padStart(2, '0')}</span>
      <span class="day-name">${getPrompt(day)}</span>
    `;

    link.addEventListener('click', (e) => handleNavClick(e, day));
    elements.navLinks.appendChild(link);
  }
}

// ============================================
// Navigation
// ============================================

/**
 * Handle nav link click
 * @param {Event} e
 * @param {number} day
 */
function handleNavClick(e, day) {
  e.preventDefault();
  scrollToDay(day);
  closeMobileMenu();
}

/**
 * Scroll to a specific day
 * @param {number} day
 */
function scrollToDay(day) {
  const section = state.sections[day - 1];
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Update active nav highlight
 * @param {number} day
 */
function updateActiveNav(day) {
  // Update nav links
  document.querySelectorAll('#nav-links a').forEach(link => {
    const linkDay = parseInt(link.dataset.day);
    link.classList.toggle('active', linkDay === day);
  });

  // Update sections
  state.sections.forEach((section, i) => {
    section.classList.toggle('active', i + 1 === day);
  });

  // Update arrow buttons
  elements.navUp.disabled = day === 1;
  elements.navDown.disabled = day === TOTAL_DAYS;
}

/**
 * Navigate to previous day
 */
function navigatePrev() {
  if (state.currentDay > 1) {
    scrollToDay(state.currentDay - 1);
  }
}

/**
 * Navigate to next day
 */
function navigateNext() {
  if (state.currentDay < TOTAL_DAYS) {
    scrollToDay(state.currentDay + 1);
  }
}

// ============================================
// Scroll Handling
// ============================================

/**
 * Setup scroll snap detection
 */
function setupScrollHandling() {
  let scrollTimeout;

  elements.main.addEventListener('scroll', () => {
    state.isScrolling = true;
    clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
      state.isScrolling = false;
      handleScrollEnd();
    }, CONFIG.scrollDebounce);
  }, { passive: true });
}

/**
 * Handle scroll end - detect current day and manage lifecycle
 */
function handleScrollEnd() {
  const scrollTop = elements.main.scrollTop;
  const sectionHeight = elements.main.clientHeight;

  // Calculate which day is currently visible
  const newDay = Math.round(scrollTop / sectionHeight) + 1;
  const clampedDay = Math.max(1, Math.min(TOTAL_DAYS, newDay));

  if (clampedDay !== state.currentDay) {
    transitionToDay(clampedDay);
  }
}

/**
 * Transition from current day to new day
 * @param {number} newDay
 */
async function transitionToDay(newDay) {
  const oldDay = state.currentDay;
  state.currentDay = newDay;

  // Unmount old day's game
  unmountDay(oldDay);

  // Mount new day's game
  await mountDay(newDay);

  // Update UI
  updateActiveNav(newDay);

  // Update URL hash without scrolling
  history.replaceState(null, '', `#day-${newDay}`);
}

// ============================================
// Mobile Menu
// ============================================

/**
 * Setup hamburger menu
 */
function setupMobileMenu() {
  elements.hamburger = document.getElementById('hamburger');
  elements.sidebar = document.getElementById('sidebar');
  elements.overlay = document.getElementById('nav-overlay');

  elements.hamburger.addEventListener('click', toggleMobileMenu);
  elements.overlay.addEventListener('click', closeMobileMenu);
}

/**
 * Toggle mobile menu open/closed
 */
function toggleMobileMenu() {
  elements.sidebar.classList.toggle('open');
  elements.overlay.classList.toggle('open');
  elements.hamburger.classList.toggle('active');
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
  elements.sidebar.classList.remove('open');
  elements.overlay.classList.remove('open');
  elements.hamburger.classList.remove('active');
}

// ============================================
// Arrow Navigation
// ============================================

/**
 * Setup arrow navigation buttons
 */
function setupArrowNavigation() {
  elements.navUp = document.getElementById('nav-up');
  elements.navDown = document.getElementById('nav-down');

  elements.navUp.addEventListener('click', navigatePrev);
  elements.navDown.addEventListener('click', navigateNext);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      navigatePrev();
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      navigateNext();
    }
  });
}

// ============================================
// Window Resize
// ============================================

/**
 * Handle window resize - remount current day to resize canvas
 */
function setupResizeHandler() {
  let resizeTimeout;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Remount current day to resize canvas
      const day = state.currentDay;
      if (state.games.has(day)) {
        unmountDay(day);
        mountDay(day);
      }
    }, 250);
  });
}

// ============================================
// Initial URL Hash
// ============================================

/**
 * Handle initial URL hash on page load
 */
function handleInitialHash() {
  const hash = window.location.hash;
  const match = hash.match(/^#day-(\d+)$/);

  if (match) {
    const day = parseInt(match[1]);
    if (day >= 1 && day <= TOTAL_DAYS) {
      state.currentDay = day;
      state.pendingMount = day; // Don't mount yet, wait for scroll
      setTimeout(() => {
        scrollToDay(day);
        updateActiveNav(day);
        // Mount after scroll animation completes (~600ms for smooth scroll)
        setTimeout(() => {
          if (state.pendingMount === day) {
            mountDay(day);
            state.pendingMount = null;
          }
        }, 700);
      }, 100);
      return true; // Signal that we handled a hash
    }
  }
  return false;
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize the application
 */
async function init() {
  console.log('[Genuary] Initializing...');

  // Generate DOM
  generateSections();

  // Setup interactions
  setupScrollHandling();
  setupMobileMenu();
  setupArrowNavigation();
  setupResizeHandler();

  // Handle initial URL hash - returns true if we're scrolling to a specific day
  const handlingHash = handleInitialHash();

  // Only mount immediately if not handling a hash (hash mounting is delayed for scroll)
  if (!handlingHash) {
    await mountDay(state.currentDay);
    updateActiveNav(state.currentDay);
  }

  console.log('[Genuary] Ready!');
}

// ============================================
// Curved Grid Background
// ============================================

/**
 * Generate curved wireframe grid SVG
 */
function generateCurvedGrid() {
  const svg = document.getElementById('grid-svg');
  const gridLines = document.getElementById('grid-lines');
  if (!svg || !gridLines) return;

  const width = window.innerWidth;
  const height = window.innerHeight * TOTAL_DAYS;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.width = '100%';
  svg.style.height = `${TOTAL_DAYS * 100}vh`;

  // Clear existing lines
  gridLines.innerHTML = '';

  const numVerticalLines = 20;
  const numHorizontalLines = TOTAL_DAYS * 8;
  const sectionHeight = height / TOTAL_DAYS;

  // Generate curved vertical lines
  for (let i = 0; i <= numVerticalLines; i++) {
    const baseX = (i / numVerticalLines) * width;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    let d = `M ${baseX} 0`;

    for (let section = 0; section < TOTAL_DAYS; section++) {
      const sectionY = section * sectionHeight;
      const centerY = sectionY + sectionHeight / 2;

      // Calculate curve - lines bend toward center of each section
      const distFromCenter = Math.abs(baseX - width / 2) / (width / 2);
      const curveAmount = (1 - distFromCenter) * 40; // Max 40px curve

      // Control points for bezier curve
      const cp1y = sectionY + sectionHeight * 0.25;
      const cp2y = sectionY + sectionHeight * 0.75;

      // Curve toward center at middle of section
      const curveX = baseX + (baseX < width / 2 ? curveAmount : -curveAmount);

      d += ` Q ${curveX} ${centerY}, ${baseX} ${sectionY + sectionHeight}`;
    }

    path.setAttribute('d', d);
    path.setAttribute('stroke', 'url(#lineGradient)');
    path.setAttribute('stroke-width', '0.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.5');
    gridLines.appendChild(path);
  }

  // Generate horizontal lines with gravity wells at each section center
  for (let i = 0; i <= numHorizontalLines; i++) {
    const baseY = (i / numHorizontalLines) * height;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Find which section this line is in
    const sectionIndex = Math.floor(baseY / sectionHeight);
    const sectionCenterY = (sectionIndex + 0.5) * sectionHeight;
    const distFromSectionCenter = Math.abs(baseY - sectionCenterY) / (sectionHeight / 2);

    // Lines near section centers curve more (gravity well effect)
    const curveIntensity = Math.max(0, 1 - distFromSectionCenter) * 30;

    let d = `M 0 ${baseY}`;

    // Create curve with gravity well at center
    const midX = width / 2;
    const curvedY = baseY + curveIntensity; // Curve downward toward center

    d += ` Q ${midX} ${curvedY}, ${width} ${baseY}`;

    path.setAttribute('d', d);
    path.setAttribute('stroke', '#0f0');
    path.setAttribute('stroke-width', '0.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', `${0.08 + (1 - distFromSectionCenter) * 0.15}`);
    gridLines.appendChild(path);
  }

  // Add gravity well circles at each section center
  for (let section = 0; section < TOTAL_DAYS; section++) {
    const centerY = (section + 0.5) * sectionHeight;
    const centerX = width / 2;

    // Concentric circles
    for (let r = 1; r <= 3; r++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      circle.setAttribute('cx', centerX);
      circle.setAttribute('cy', centerY);
      circle.setAttribute('rx', 80 + r * 60);
      circle.setAttribute('ry', 40 + r * 30);
      circle.setAttribute('stroke', '#0f0');
      circle.setAttribute('stroke-width', '0.5');
      circle.setAttribute('fill', 'none');
      circle.setAttribute('opacity', `${0.25 - r * 0.05}`);
      gridLines.appendChild(circle);
    }
  }
}

/**
 * Handle resize for grid
 */
function setupGridResize() {
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(generateCurvedGrid, 300);
  });
}

// Bootstrap
window.addEventListener('load', () => {
  init();
  generateCurvedGrid();
  setupGridResize();
});
