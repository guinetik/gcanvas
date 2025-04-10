export function applyAnchor(go, options = {}) {
  go.anchor = options.anchor ?? null;
  go.padding = options.padding ?? 10;

  const game = go.game;

  const resolve = (anchor, padding) => {
    const w = game.width;
    const h = game.height;

    switch (anchor) {
      case "top-left":
        return {
          x: padding,
          y: padding,
          align: "left",
          baseline: "top",
        };
      case "top-center":
        return {
          x: (w - go.width) / 2,
          y: padding,
          align: "center",
          baseline: "top",
        };
      case "top-right":
        return {
          x: w - go.width - padding,
          y: padding,
          align: "right",
          baseline: "top",
        };
      case "center-left":
        return {
          x: padding,
          y: (h - go.height) / 2,
          align: "left",
          baseline: "middle",
        };
      case "center":
        return {
          x: (w - go.width) / 2,
          y: (h - go.height) / 2,
          align: "center",
          baseline: "middle",
        };
      case "center-right":
        return {
          x: w - go.width - padding,
          y: h / 2,
          align: "right",
          baseline: "middle",
        };
      case "bottom-left":
        return {
          x: padding,
          y: h - padding,
          align: "left",
          baseline: "bottom",
        };
      case "bottom-center":
        return {
          x: (w - go.width)/2,
          y: h - go.height -padding,
          align: "center",
          baseline: "bottom",
        };
      case "bottom-right":
        return {
          x: w - padding,
          y: h - padding,
          align: "right",
          baseline: "bottom",
        };
      default:
        // Fallback if anchor is not recognized
        return {
          x: 10,
          y: 10,
          align: "left",
          baseline: "top",
        };
    }
  };

  const anchorUpdate = go.update?.bind(go);

  go.update = function (dt) {
    if (go.anchor) {
      const { x, y, align, baseline } = resolve(go.anchor, go.padding);
      go.x = x;
      go.y = y;

      if ("align" in go) go.align = align;
      if ("baseline" in go) go.baseline = baseline;
    }

    anchorUpdate?.(dt);
  };
}
