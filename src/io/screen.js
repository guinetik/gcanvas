/**
 * Screen.js
 *
 * Provides an abstraction layer over screen/device information and responsive
 * utilities. Detects device type, orientation, pixel density, and emits events
 * on changes.
 *
 * Example usage:
 *   // Initialization (usually in your Game constructor):
 *   Screen.init(this);
 *
 *   // Check device type:
 *   if (Screen.isMobile) {
 *     this.scaleFactor = 1.5; // Higher quality for smaller screens
 *   }
 *
 *   // Listen for orientation changes:
 *   this.events.on("orientationchange", () => {
 *     this.handleOrientationChange();
 *   });
 *
 *   // Get responsive values:
 *   const fontSize = Screen.responsive(12, 16, 20); // mobile, tablet, desktop
 */
export class Screen {
  // Breakpoints (can be customized)
  static MOBILE_BREAKPOINT = 768;
  static TABLET_BREAKPOINT = 1024;

  /**
   * Reference to the main game instance for event emission.
   * @type {Game}
   */
  static game = null;

  /**
   * Whether Screen has been initialized with a game instance.
   * @type {boolean}
   */
  static _initialized = false;

  /**
   * Current screen/window width.
   * @type {number}
   */
  static width = 0;

  /**
   * Current screen/window height.
   * @type {number}
   */
  static height = 0;

  /**
   * Device pixel ratio (for high-DPI displays).
   * @type {number}
   */
  static pixelRatio = 1;

  /**
   * Whether the device is considered mobile (width <= MOBILE_BREAKPOINT).
   * @type {boolean}
   */
  static isMobile = false;

  /**
   * Whether the device is considered tablet (MOBILE_BREAKPOINT < width <= TABLET_BREAKPOINT).
   * @type {boolean}
   */
  static isTablet = false;

  /**
   * Whether the device is considered desktop (width > TABLET_BREAKPOINT).
   * @type {boolean}
   */
  static isDesktop = false;

  /**
   * Whether the device has touch capability.
   * @type {boolean}
   */
  static hasTouch = false;

  /**
   * Current orientation: 'portrait' or 'landscape'.
   * @type {string}
   */
  static orientation = "landscape";

  /**
   * Whether the screen is in portrait mode.
   * @type {boolean}
   */
  static isPortrait = false;

  /**
   * Whether the screen is in landscape mode.
   * @type {boolean}
   */
  static isLandscape = true;

  /**
   * Current wake lock sentinel (if active).
   * @type {WakeLockSentinel|null}
   * @private
   */
  static _wakeLock = null;

  /**
   * Whether wake lock is currently enabled (requested by user).
   * @type {boolean}
   */
  static wakeLockEnabled = false;

  /**
   * Whether the Wake Lock API is supported.
   * @type {boolean}
   */
  static wakeLockSupported = false;

  /**
   * Static initializer - runs once when the class is first loaded.
   * Ensures properties are populated even without calling init().
   */
  static {
    // Only run in browser environment
    if (typeof window !== "undefined") {
      Screen._detect();
      Screen.wakeLockSupported = "wakeLock" in navigator;
    }
  }

  /**
   * Initialize screen detection and event handling.
   * Attaches resize and orientation change listeners.
   *
   * @param {Game} game - Your main Game instance with event emitter.
   */
  static init(game) {
    Screen.game = game;

    // Initial detection (in case static initializer didn't run)
    Screen._detect();

    // Only attach listeners once
    if (Screen._initialized) return;
    Screen._initialized = true;

    // Attach listeners
    window.addEventListener("resize", Screen._onResize);
    window.addEventListener("orientationchange", Screen._onOrientationChange);

    // Also listen for media query changes for more accurate detection
    if (window.matchMedia) {
      const mobileQuery = window.matchMedia(
        `(max-width: ${Screen.MOBILE_BREAKPOINT}px)`
      );
      const tabletQuery = window.matchMedia(
        `(max-width: ${Screen.TABLET_BREAKPOINT}px)`
      );

      // Modern browsers
      if (mobileQuery.addEventListener) {
        mobileQuery.addEventListener("change", Screen._onMediaChange);
        tabletQuery.addEventListener("change", Screen._onMediaChange);
      }
    }

    // Re-acquire wake lock when page becomes visible again
    document.addEventListener("visibilitychange", Screen._onVisibilityChange);
  }

  /**
   * Detect current screen properties.
   * @private
   */
  static _detect() {
    // Dimensions
    Screen.width = window.innerWidth;
    Screen.height = window.innerHeight;
    Screen.pixelRatio = window.devicePixelRatio || 1;

    // Device type detection
    Screen.isMobile = Screen.width <= Screen.MOBILE_BREAKPOINT;
    Screen.isTablet =
      Screen.width > Screen.MOBILE_BREAKPOINT &&
      Screen.width <= Screen.TABLET_BREAKPOINT;
    Screen.isDesktop = Screen.width > Screen.TABLET_BREAKPOINT;

    // Touch capability
    Screen.hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - msMaxTouchPoints for older IE
      navigator.msMaxTouchPoints > 0;

    // Orientation
    Screen.isPortrait = Screen.height > Screen.width;
    Screen.isLandscape = !Screen.isPortrait;
    Screen.orientation = Screen.isPortrait ? "portrait" : "landscape";
  }

  /**
   * Handle window resize.
   * @private
   */
  static _onResize = () => {
    const prevMobile = Screen.isMobile;
    const prevTablet = Screen.isTablet;
    const prevOrientation = Screen.orientation;

    Screen._detect();

    // Emit resize event
    if (Screen.game) {
      Screen.game.events.emit("screenresize", {
        width: Screen.width,
        height: Screen.height,
        isMobile: Screen.isMobile,
        isTablet: Screen.isTablet,
        isDesktop: Screen.isDesktop,
      });

      // Emit device type change if breakpoint crossed
      if (prevMobile !== Screen.isMobile || prevTablet !== Screen.isTablet) {
        Screen.game.events.emit("devicechange", {
          isMobile: Screen.isMobile,
          isTablet: Screen.isTablet,
          isDesktop: Screen.isDesktop,
          previous: {
            isMobile: prevMobile,
            isTablet: prevTablet,
            isDesktop: !prevMobile && !prevTablet,
          },
        });
      }

      // Emit orientation change if changed
      if (prevOrientation !== Screen.orientation) {
        Screen.game.events.emit("orientationchange", {
          orientation: Screen.orientation,
          isPortrait: Screen.isPortrait,
          isLandscape: Screen.isLandscape,
        });
      }
    }
  };

  /**
   * Handle orientation change event.
   * @private
   */
  static _onOrientationChange = () => {
    // Delay detection slightly to allow browser to update dimensions
    setTimeout(() => {
      Screen._onResize();
    }, 100);
  };

  /**
   * Handle media query change.
   * @private
   */
  static _onMediaChange = () => {
    Screen._onResize();
  };

  /**
   * Get a responsive value based on device type.
   * Returns different values for mobile, tablet, and desktop.
   *
   * @param {number|any} mobile - Value to use on mobile devices.
   * @param {number|any} [tablet] - Value to use on tablet devices. Defaults to mobile.
   * @param {number|any} [desktop] - Value to use on desktop devices. Defaults to tablet.
   * @returns {number|any} The appropriate value for the current device.
   *
   * @example
   * const scaleFactor = Screen.responsive(1.5, 2, 3);
   * const fontSize = Screen.responsive(12, 14, 16);
   */
  static responsive(mobile, tablet, desktop) {
    // Ensure detection has run (for environments without static initializer support)
    if (Screen.width === 0 && typeof window !== "undefined") {
      Screen._detect();
    }

    if (tablet === undefined) tablet = mobile;
    if (desktop === undefined) desktop = tablet;

    if (Screen.isMobile) return mobile;
    if (Screen.isTablet) return tablet;
    return desktop;
  }

  /**
   * Get a value scaled by pixel ratio for high-DPI displays.
   *
   * @param {number} value - The base value to scale.
   * @returns {number} The value multiplied by device pixel ratio.
   *
   * @example
   * const lineWidth = Screen.scaled(2); // 4 on 2x displays
   */
  static scaled(value) {
    return value * Screen.pixelRatio;
  }

  /**
   * Check if the current device is likely a touch-primary device.
   * This is different from hasTouch - some laptops have touch screens
   * but are primarily used with mouse/keyboard.
   *
   * @returns {boolean} True if device is likely touch-primary.
   */
  static isTouchPrimary() {
    return Screen.hasTouch && (Screen.isMobile || Screen.isTablet);
  }

  /**
   * Get the smaller dimension (useful for responsive sizing).
   *
   * @returns {number} The smaller of width or height.
   */
  static minDimension() {
    return Math.min(Screen.width, Screen.height);
  }

  /**
   * Get the larger dimension.
   *
   * @returns {number} The larger of width or height.
   */
  static maxDimension() {
    return Math.max(Screen.width, Screen.height);
  }

  /**
   * Get the aspect ratio (width / height).
   *
   * @returns {number} The aspect ratio.
   */
  static aspectRatio() {
    return Screen.width / Screen.height;
  }

  /**
   * Check if screen matches a media query.
   *
   * @param {string} query - CSS media query string.
   * @returns {boolean} True if the query matches.
   *
   * @example
   * if (Screen.matches('(prefers-color-scheme: dark)')) {
   *   // Use dark theme
   * }
   */
  static matches(query) {
    if (!window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }

  /**
   * Check if the user prefers reduced motion.
   *
   * @returns {boolean} True if user prefers reduced motion.
   */
  static prefersReducedMotion() {
    return Screen.matches("(prefers-reduced-motion: reduce)");
  }

  /**
   * Check if the user prefers dark color scheme.
   *
   * @returns {boolean} True if user prefers dark mode.
   */
  static prefersDarkMode() {
    return Screen.matches("(prefers-color-scheme: dark)");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WAKE LOCK API - Prevent screen from sleeping during gameplay
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle visibility change - re-acquire wake lock when page becomes visible.
   * @private
   */
  static _onVisibilityChange = async () => {
    if (Screen.wakeLockEnabled && document.visibilityState === "visible") {
      await Screen._acquireWakeLock();
    }
  };

  /**
   * Internal method to acquire wake lock.
   * @private
   * @returns {Promise<boolean>} True if lock was acquired.
   */
  static async _acquireWakeLock() {
    if (!Screen.wakeLockSupported) return false;

    try {
      Screen._wakeLock = await navigator.wakeLock.request("screen");
      Screen._wakeLock.addEventListener("release", () => {
        // Lock was released (page hidden or manual release)
        if (Screen.game) {
          Screen.game.events.emit("wakelockrelease");
        }
      });
      if (Screen.game) {
        Screen.game.events.emit("wakelockacquire");
      }
      return true;
    } catch (err) {
      // Wake lock request failed (e.g., low battery, browser policy)
      console.warn("[Screen] Wake lock request failed:", err.message);
      return false;
    }
  }

  /**
   * Request a wake lock to prevent the screen from sleeping.
   * Useful for games/simulations that should keep the display on.
   * The lock is automatically re-acquired when the page becomes visible.
   *
   * @returns {Promise<boolean>} True if wake lock was successfully acquired.
   *
   * @example
   * // In your game's init():
   * await Screen.requestWakeLock();
   *
   * // In your game's stop():
   * Screen.releaseWakeLock();
   */
  static async requestWakeLock() {
    if (!Screen.wakeLockSupported) {
      console.warn("[Screen] Wake Lock API not supported in this browser");
      return false;
    }

    Screen.wakeLockEnabled = true;
    return await Screen._acquireWakeLock();
  }

  /**
   * Release the wake lock, allowing the screen to sleep normally.
   * Call this when your game/simulation stops or pauses.
   *
   * @returns {Promise<void>}
   *
   * @example
   * // When game stops:
   * Screen.releaseWakeLock();
   */
  static async releaseWakeLock() {
    Screen.wakeLockEnabled = false;

    if (Screen._wakeLock) {
      try {
        await Screen._wakeLock.release();
        Screen._wakeLock = null;
      } catch (err) {
        console.warn("[Screen] Wake lock release failed:", err.message);
      }
    }
  }

  /**
   * Check if wake lock is currently active.
   *
   * @returns {boolean} True if wake lock is held.
   */
  static isWakeLockActive() {
    return Screen._wakeLock !== null && !Screen._wakeLock.released;
  }
}
