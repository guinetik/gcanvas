# TDE Demo Z-Order Rendering System

This document describes the z-ordering (depth sorting) system used in the Tidal Disruption Event (TDE) demo.

## Overview

The TDE demo uses a 3D scene with multiple objects that need to be rendered in the correct order based on their depth relative to the camera. The system uses a combination of:

1. **Static z-index buckets** for objects that always render in a fixed order
2. **Dynamic z-index updates** for objects whose render order depends on camera position

## Z-Index Buckets

Objects are assigned to z-index buckets. Lower z-index values render first (behind), higher values render later (in front).

**Only the Star has a dynamic z-index** that changes based on its position relative to the camera. The TidalStream particles always render on top for a cleaner visual effect.

| Object | Z-Index | Description |
|--------|---------|-------------|
| Star (back) | 10 | Star when behind black hole |
| BlackHole | 15 | Dark shadow - at the back |
| AccretionDisk | 20 | Disk renders over the black hole |
| Star (front) | 25 | Star when in front of black hole |
| TidalStream | 30 | Particles - always on top |
| RelativisticJets | 40 | Jets - always on top |

### Layering by Camera View

**When star is IN FRONT of black hole:**
- Stream (30) > Star (25) > Disk (20) > BlackHole (15)

**When star is BEHIND black hole:**
- Stream (30) > Disk (20) > BlackHole (15) > Star (10)

The accretion disk particles curve around the black hole visually, and the stream always stays on top.

## Rendering Rules

### Rule 1: TidalStream Always Behind Star
The tidal stream particles (z-index 10) always render behind the star (z-index 25-35). This ensures the star is always visible and the stream appears to emanate from behind/around it.

### Rule 2: Star in Front of Black Hole (When Closer)
When the star is closer to the camera than the black hole, the star's z-index is set to 35 (starFront), which is higher than the black hole's z-index of 30. This causes the star to render after (on top of) the black hole.

### Rule 3: Black Hole in Front of Star (When Star is Behind)
When the star is farther from the camera than the black hole, the star's z-index is set to 25 (starBack), which is lower than the black hole's z-index of 30. This causes the black hole to render after (on top of) the star.

## Dynamic Z-Order Algorithm

The `BlackHoleScene.updateStarZOrder()` method handles dynamic z-ordering:

```javascript
updateStarZOrder() {
    const camera = this.game.camera;
    
    // Project star position to get depth after camera rotation
    const projStar = camera.project(star.x, star.y, star.z);
    
    // Black hole is always at origin
    const projBH = camera.project(0, 0, 0);
    
    // Lower projected z = closer to camera
    const starInFront = projStar.z < projBH.z;
    
    // Update z-index based on depth comparison
    star.zIndex = starInFront ? Z.starFront : Z.starBack;
}
```

### Critical: Update Order

The z-order update **must be called AFTER** the star position is updated each frame. This is done in `TDEDemo.update()` at the end, after all state-based position updates:

```javascript
// In TDEDemo.update(), at the end:
if (this.scene) {
    this.scene.updateStarZOrder();
}
```

If called before the position update, it uses stale position data and causes incorrect ordering.

## Camera3D Projection

The `Camera3D.project()` method returns:
- `x, y`: Screen position
- `z`: Depth after rotation (lower = closer to camera)
- `scale`: Perspective scale factor

The depth (`z`) value is used for z-order comparisons. Objects with lower depth values are closer to the camera and should render on top.

## Scene3D Sorting

`Scene3D` sorts children before rendering:

1. **Primary sort**: By `zIndex` (lower renders first)
2. **Secondary sort**: By projected `z` depth (back-to-front, as tie-breaker)

This ensures objects with different z-indices render in the correct order, while objects with the same z-index are sorted by actual depth.

## Implementation Files

- `demos/js/tde/blackholescene.js` - Main scene with z-ordering logic
- `src/game/objects/scene3d.js` - Base Scene3D with depth sorting
- `src/util/camera3d.js` - Camera projection utilities

