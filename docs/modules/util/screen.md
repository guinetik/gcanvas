# Screen

The `Screen` class provides device detection and responsive utilities. It sits alongside `Keys`, `Mouse`, and `Touch` in the IO module, offering a consistent API for adapting your game to different screen sizes and device capabilities.

## Quick Start

```javascript
import { Game, Screen } from '@guinetik/gcanvas';

class MyGame extends Game {
  init() {
    super.init();
    Screen.init(this);  // Initialize screen detection
    
    // Use responsive values
    this.scaleFactor = Screen.responsive(1.5, 2, 3);
    
    // Check device type
    if (Screen.isMobile) {
      this.enableSimplifiedEffects();
    }
  }
}
```

## Properties

### Device Type

| Property | Type | Description |
|----------|------|-------------|
| `Screen.isMobile` | `boolean` | True if width ≤ 768px |
| `Screen.isTablet` | `boolean` | True if 768px < width ≤ 1024px |
| `Screen.isDesktop` | `boolean` | True if width > 1024px |
| `Screen.hasTouch` | `boolean` | True if device has touch capability |

### Dimensions

| Property | Type | Description |
|----------|------|-------------|
| `Screen.width` | `number` | Current window width |
| `Screen.height` | `number` | Current window height |
| `Screen.pixelRatio` | `number` | Device pixel ratio (1 for standard, 2+ for Retina) |

### Orientation

| Property | Type | Description |
|----------|------|-------------|
| `Screen.orientation` | `string` | `'portrait'` or `'landscape'` |
| `Screen.isPortrait` | `boolean` | True if height > width |
| `Screen.isLandscape` | `boolean` | True if width ≥ height |

### Breakpoints

| Property | Default | Description |
|----------|---------|-------------|
| `Screen.MOBILE_BREAKPOINT` | `768` | Max width for mobile |
| `Screen.TABLET_BREAKPOINT` | `1024` | Max width for tablet |

## Methods

### `Screen.init(game)`

Initialize screen detection. Call this in your game's `init()` method.

```javascript
init() {
  super.init();
  Screen.init(this);
}
```

### `Screen.responsive(mobile, tablet?, desktop?)`

Returns a value based on current device type. Perfect for configuration values that should differ by device.

```javascript
// Different scale factors per device
const scaleFactor = Screen.responsive(1.5, 2, 3);

// Different particle counts
const maxParticles = Screen.responsive(500, 2000, 5000);

// If tablet/desktop not specified, they default to the previous value
const fontSize = Screen.responsive(12, 16);  // mobile: 12, tablet: 16, desktop: 16
```

### `Screen.scaled(value)`

Scale a value by the device pixel ratio. Useful for line widths and sizes on high-DPI displays.

```javascript
ctx.lineWidth = Screen.scaled(2);  // 4 on Retina displays
```

### `Screen.isTouchPrimary()`

Check if the device is primarily touch-based (mobile/tablet with touch). This is different from `hasTouch` - some laptops have touch screens but are primarily used with mouse/keyboard.

```javascript
if (Screen.isTouchPrimary()) {
  this.enableTouchControls();
} else {
  this.enableKeyboardControls();
}
```

### `Screen.minDimension()` / `Screen.maxDimension()`

Get the smaller or larger screen dimension. Useful for responsive sizing.

```javascript
const baseSize = Screen.minDimension() * 0.1;  // 10% of smaller dimension
```

### `Screen.aspectRatio()`

Get the aspect ratio (width / height).

```javascript
if (Screen.aspectRatio() > 2) {
  // Ultra-wide display
}
```

### `Screen.matches(query)`

Check if a CSS media query matches.

```javascript
if (Screen.matches('(prefers-color-scheme: dark)')) {
  this.useDarkTheme();
}
```

### `Screen.prefersReducedMotion()`

Check if the user prefers reduced motion (accessibility).

```javascript
if (Screen.prefersReducedMotion()) {
  this.disableParticleEffects();
}
```

### `Screen.prefersDarkMode()`

Check if the user prefers dark color scheme.

```javascript
this.backgroundColor = Screen.prefersDarkMode() ? '#000' : '#fff';
```

## Wake Lock API

The Screen class provides methods to prevent the device screen from sleeping during gameplay - essential for mobile games and simulations.

### `Screen.wakeLockSupported`

Boolean indicating if the Wake Lock API is available in the current browser.

### `Screen.wakeLockEnabled`

Boolean indicating if wake lock has been requested (even if temporarily released due to page visibility).

### `Screen.requestWakeLock()`

Request a wake lock to keep the screen awake. Returns a Promise that resolves to `true` if successful.

```javascript
async init() {
  super.init();
  Screen.init(this);
  
  // Keep screen awake during gameplay
  if (Screen.isTouchPrimary()) {
    await Screen.requestWakeLock();
  }
}
```

### `Screen.releaseWakeLock()`

Release the wake lock, allowing the screen to sleep normally.

```javascript
stop() {
  Screen.releaseWakeLock();
  super.stop();
}
```

### `Screen.isWakeLockActive()`

Check if the wake lock is currently held.

```javascript
if (Screen.isWakeLockActive()) {
  console.log('Screen will stay awake');
}
```

### Auto-Recovery

The wake lock is automatically re-acquired when:
- The page becomes visible again (after switching tabs)
- The user returns from the lock screen

This is handled internally - you don't need to manage visibility changes yourself.

## Events

When initialized with a game instance, Screen emits events through `game.events`:

### `screenresize`

Fired on window resize.

```javascript
this.events.on('screenresize', (e) => {
  console.log('New size:', e.width, e.height);
  console.log('Device type:', e.isMobile ? 'mobile' : 'desktop');
});
```

### `devicechange`

Fired when crossing a breakpoint (mobile ↔ tablet ↔ desktop).

```javascript
this.events.on('devicechange', (e) => {
  if (e.isMobile && !e.previous.isMobile) {
    console.log('Switched to mobile view');
    this.rebuildUI();
  }
});
```

### `orientationchange`

Fired when orientation changes (portrait ↔ landscape).

```javascript
this.events.on('orientationchange', (e) => {
  console.log('New orientation:', e.orientation);
  this.adjustLayout();
});
```

### `wakelockacquire`

Fired when wake lock is successfully acquired.

```javascript
this.events.on('wakelockacquire', () => {
  console.log('Screen will stay awake');
});
```

### `wakelockrelease`

Fired when wake lock is released (page hidden, manual release, or browser policy).

```javascript
this.events.on('wakelockrelease', () => {
  console.log('Screen may sleep now');
});
```

## Common Patterns

### Responsive Render Quality

```javascript
handleResize() {
  // Higher quality (lower divisor) for smaller screens
  const scaleFactor = Screen.responsive(1.5, 2, 3);
  this.renderWidth = Math.floor(this.width / scaleFactor);
  this.renderHeight = Math.floor(this.height / scaleFactor);
}
```

### Adaptive Particle Count

```javascript
init() {
  Screen.init(this);
  
  const maxParticles = Screen.responsive(500, 2000, 5000);
  this.particles = new ParticleSystem(this, {
    maxParticles,
    // ...
  });
}
```

### Touch vs Mouse Controls

```javascript
init() {
  Screen.init(this);
  
  if (Screen.isTouchPrimary()) {
    // Larger touch targets
    this.buttonSize = 64;
    this.enableSwipeGestures();
  } else {
    this.buttonSize = 32;
    this.enableKeyboardShortcuts();
  }
}
```

### Accessibility

```javascript
init() {
  Screen.init(this);
  
  if (Screen.prefersReducedMotion()) {
    this.animationSpeed = 0;  // Disable animations
    this.useStaticBackgrounds = true;
  }
}
```

### Prevent Sleep on Mobile

```javascript
class MyGame extends Game {
  async init() {
    super.init();
    Screen.init(this);
    
    // Keep screen awake on mobile devices
    if (Screen.isTouchPrimary()) {
      await Screen.requestWakeLock();
    }
  }
  
  stop() {
    // Allow screen to sleep when game stops
    Screen.releaseWakeLock();
    super.stop();
  }
}
```

## Usage Without Game Instance

Screen can be used without initialization for basic device detection, but events won't be emitted:

```javascript
import { Screen } from '@guinetik/gcanvas';

// Works without init()
const isMobile = Screen.isMobile;
const scaleFactor = Screen.responsive(1.5, 2, 3);

// But events require init()
Screen.init(game);
game.events.on('screenresize', handleResize);
```

## Comparison with Keys/Mouse/Touch

| Class | Purpose | Requires `init()` |
|-------|---------|-------------------|
| `Keys` | Keyboard input | Yes |
| `Mouse` | Mouse position/clicks | Yes |
| `Touch` | Touch events | Yes |
| `Screen` | Device detection | Optional (for events) |

Screen is unique in that its detection methods work without initialization - only events require `init()`.
