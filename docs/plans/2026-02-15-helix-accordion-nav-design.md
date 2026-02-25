# DNA Helix Accordion Nav — Design Doc

## Problem
The GCanvas demo gallery has grown to ~80 demos across 12 categories. The flat sidebar nav is unwieldy. We need an interactive accordion that collapses sections not in use and expands the active one.

## Approach
Pure CSS 3D transforms for a DNA double-helix visual metaphor. Typography-only — no decorative SVG lines. Minimal JS for state management (which section is open, hash sync).

## Layout
Keep existing `nav + iframe` split. Nav internals restructured into `.helix-section` blocks:

```
nav (perspective container)
├── .nav-branding (logo, github — unchanged)
├── .helix-section[data-section="docs"]
│   ├── .helix-header (clickable section title)
│   └── .helix-body (collapsible link container)
│       ├── a.helix-link (alternating left/right entrance)
│       └── ...
└── ...more sections
```

## Helix Effect
- Nav container: `perspective: 800px`
- Collapsed headers alternate transforms by even/odd index:
  - Even: `rotateY(-20deg) translateX(-15px)`
  - Odd: `rotateY(20deg) translateX(15px)`
- Active header snaps to `rotateY(0) translateX(0)` — comes forward
- Transition: `0.4s cubic-bezier(0.4, 0, 0.2, 1)`

## Unzip Animation
When a section expands, links stagger in from alternating sides:
- Odd links: slide from left (`translateX(-30px)` to `0`)
- Even links: slide from right (`translateX(30px)` to `0`)
- Stagger: `animation-delay: index * 50ms`
- Collapse: simultaneous fade-out (no stagger)

## State Management
- One section open at a time
- URL hash: `#/shapes` → opens Shapes section, loads shapes.html in iframe
- On load: parse hash → find section containing that demo → expand it
- Existing active-link highlighting preserved

## Sections
Home, Docs, Game, Shapes, Painter, Image, Motion, Scene, 3D, Generative Art, Math & Physics, Games

## Preserved
- Logo/branding, Genuary 2026 link, mobile hamburger, iframe routing, analytics
