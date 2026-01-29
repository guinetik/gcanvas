# Interactivity API Changes

## Summary

The GCanvas interactivity API has been updated. The old `enableInteractivity()` method and `onPointerDown()`/`onPointerUp()`/`onPointerMove()` lifecycle methods have been replaced with a simpler event emitter pattern.

## What Changed

### Old API (Deprecated - No Longer Works)

```js
class Player extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(40, { color: 'blue' });
    this.enableInteractivity(this.shape); // ❌ Method doesn't exist
  }
  
  onPointerDown(e) { // ❌ Never called
    console.log('Player clicked!');
  }
  
  onPointerUp(e) { // ❌ Never called
    console.log('Released!');
  }
  
  onPointerMove(e) { // ❌ Never called
    console.log('Moving!');
  }
}
```

### New API (Current - Use This)

```js
class Player extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(40, { color: 'blue' });
    
    // ✅ Enable interactivity
    this.interactive = true;
    
    // ✅ Use event emitter pattern
    this.on('inputdown', (e) => {
      console.log('Player clicked!');
    });
    
    this.on('inputup', (e) => {
      console.log('Released!');
    });
    
    this.on('inputmove', (e) => {
      console.log('Moving!');
    });
  }
}
```

## Migration Guide

### Step 1: Remove `enableInteractivity()` calls

**Before:**
```js
this.enableInteractivity(this.shape);
```

**After:**
```js
this.interactive = true;
```

### Step 2: Replace lifecycle methods with event listeners

**Before:**
```js
onPointerDown(e) {
  this.handleClick(e);
}

onPointerUp(e) {
  this.handleRelease(e);
}
```

**After:**
```js
constructor(game) {
  super(game);
  this.interactive = true;
  
  this.on('inputdown', (e) => {
    this.handleClick(e);
  });
  
  this.on('inputup', (e) => {
    this.handleRelease(e);
  });
}
```

### Step 3: Update hover handlers

**Before:**
```js
onMouseOver() {
  this.hovered = true;
}

onMouseOut() {
  this.hovered = false;
}
```

**After:**
```js
constructor(game) {
  super(game);
  this.interactive = true;
  
  this.on('mouseover', () => {
    this.hovered = true;
  });
  
  this.on('mouseout', () => {
    this.hovered = false;
  });
}
```

## Available Events

| Event | When Fired | Event Data |
|-------|------------|------------|
| `inputdown` | Mouse click or touch start | `{ x, y, ...nativeEvent }` |
| `inputup` | Mouse release or touch end | `{ x, y, ...nativeEvent }` |
| `inputmove` | Pointer movement over object | `{ x, y, ...nativeEvent }` |
| `click` | Complete click/tap | `{ x, y, ...nativeEvent }` |
| `mouseover` | Pointer enters object | `{ x, y, ...nativeEvent }` |
| `mouseout` | Pointer leaves object | `{ x, y, ...nativeEvent }` |

## Scene Interactivity - It Works!

GameObjects inside Scenes receive events correctly. The Pipeline handles nested Scene dispatch automatically.

```js
const scene = new Scene(this);

const button = new GameObject(this, { width: 100, height: 50 });
button.interactive = true;
button.on('inputdown', () => {
  console.log('Button in scene clicked!'); // ✅ This works!
});

scene.add(button);
this.pipeline.add(scene);
```

### Nested Scenes Work Too

```js
const rootScene = new Scene(this);
const childScene = new Scene(this);
const button = new GameObject(this);

button.interactive = true;
button.on('inputdown', () => {
  console.log('Nested button clicked!'); // ✅ This works!
});

childScene.add(button);
rootScene.add(childScene);
this.pipeline.add(rootScene);
```

## Common Patterns

### Button with Hover State

```js
class Button extends GameObject {
  constructor(game, label, onClick) {
    super(game);
    this.interactive = true;
    this.onClick = onClick;
    this.hovered = false;
    
    this.on('mouseover', () => {
      this.hovered = true;
      this.updateVisual();
    });
    
    this.on('mouseout', () => {
      this.hovered = false;
      this.updateVisual();
    });
    
    this.on('inputdown', () => {
      this.onClick?.();
    });
  }
}
```

### Toggle Switch

```js
class Toggle extends GameObject {
  constructor(game) {
    super(game);
    this.interactive = true;
    this.enabled = false;
    
    this.on('inputdown', () => {
      this.enabled = !this.enabled;
      this.updateVisual();
    });
  }
}
```

### Draggable Object

```js
import { applyDraggable } from '@guinetik/gcanvas';

const box = new GameObject(game);
box.interactive = true; // Already set by applyDraggable, but explicit is fine
applyDraggable(box);
```

## Documentation Updates

The following documentation files have been updated:

- ✅ `readme.md` - Main README
- ✅ `docs/README.md` - Documentation index
- ✅ `docs/getting-started/first-game.md` - Getting started guide
- ✅ `docs/modules/game/README.md` - Game module docs
- ✅ `docs/concepts/two-layer-architecture.md` - Architecture docs
- ✅ `docs/concepts/interactivity.md` - NEW: Comprehensive interactivity guide
- ✅ `src/mixins/draggable.js` - Updated to use new API

## Demo Updates

- ✅ `demos/scene-interactivity-test.html` - NEW: Test demo showing Scene event dispatch
- ✅ `demos/events.html` - Already uses correct API

## Testing

Run the new test demo to verify Scene interactivity:

```bash
npm run dev
# Open demos/scene-interactivity-test.html
```

You should see:
- 5 clickable boxes (3 in main scene, 2 in nested scene)
- Click counter increments on each box
- Hover state changes color and border
- All events work correctly

## Why This Change?

1. **Simpler API**: One property (`interactive = true`) instead of a method
2. **More Flexible**: Event emitter pattern allows multiple listeners
3. **Consistent**: Matches standard JavaScript event patterns
4. **Cleaner**: No magic lifecycle methods - explicit event registration
5. **Better Removal**: Can remove specific event handlers with `.off()`

## Questions?

See the new comprehensive guide at `docs/concepts/interactivity.md` for:
- Complete API reference
- Event coordinate system
- Hit testing details
- Keyboard input
- Common patterns
- More examples