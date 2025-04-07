export function applyAnchor(go, options = {}) {
  go.anchor = options.anchor ?? null;
  go.padding = options.padding ?? 10;

  const game = go.game;

  const resolve = (anchor, padding) => {
    const w = game.width;
    const h = game.height;

    switch (anchor) {
      case "top-left":
        return { x: padding, y: padding, align: "left", baseline: "top" };
      case "top-right":
        return { x: w - padding, y: padding, align: "right", baseline: "top" };
      case "bottom-left":
        return {
          x: padding,
          y: h - padding,
          align: "left",
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
        return { x: 10, y: 10, align: "left", baseline: "top" };
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
