/**
 * Genuary 2026 - Day 7
 * Prompt: Boolean algebra. Get inspired by Boolean algebra, in any way.
 *
 * LOGIC GATE CIRCUIT
 * Parse a boolean expression into an AST and render it as a circuit diagram,
 * with animated signals propagating through the wires.
 *
 * Interaction:
 * - Click anywhere: regenerate the expression/circuit.
 */

import { Game, Painter, Motion, BooleanAlgebra } from "../../../src/index.js";

const CONFIG = {
  expr: {
    variables: ["A", "B", "C", "D", "E"],
    maxDepth: 5,
    notProbability: 0.22,
    ops: ["AND", "OR", "XOR", "NAND", "NOR", "XNOR"],
  },

  layout: {
    margin: 70,
    layerGap: 150,
    leafGap: 80,
    nodeW: 92,
    nodeH: 46,
    portOffsetY: 12,
    elbowX: 60,
  },

  render: {
    backgroundAlpha: 0.14,
    blendMode: "screen",
    wireWidth: 2,
    wireWidthHot: 3,
    gateRadius: 10,
    font: '12px "Fira Code", monospace',
    signalRadius: 4.2,
  },

  animation: {
    clockHz: 0.55,
    jitterHz: 0.12,
    packetSpeed: 0.6, // normalized per wire
    packetSpacing: 0.33,
  },

  colors: {
    bg: "#000",
    gateFill: "rgba(0, 255, 0, 0.05)",
    gateStroke: "rgba(0, 255, 0, 0.55)",
    wireOff: "rgba(0, 255, 0, 0.16)",
    wireOn: "rgba(0, 255, 0, 0.75)",
    wireHot: "rgba(255, 255, 255, 0.85)",
    signalOff: "rgba(0, 255, 0, 0.25)",
    signalOn: "rgba(0, 255, 0, 0.95)",
    signalHot: "rgba(255, 255, 255, 0.95)",
    text: "rgba(0, 255, 0, 0.85)",
  },
};

/**
 * @typedef {import("../../../src/math/boolean.js").BooleanAst} BooleanAst
 */

/**
 * Clamp value to [0, 1].
 * @param {number} v
 * @returns {number}
 */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Fractional part in [0,1).
 * @param {number} v
 * @returns {number}
 */
function fract(v) {
  return v - Math.floor(v);
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {number} t
 * @returns {number}
 */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * @typedef {"var"|"const"|"not"|"and"|"or"|"xor"|"nand"|"nor"|"xnor"} CircuitNodeType
 *
 * @typedef {Object} CircuitNode
 * @property {string} id
 * @property {CircuitNodeType} type
 * @property {string} [name]
 * @property {boolean} [value]
 * @property {CircuitNode[]} inputs
 * @property {number} x
 * @property {number} y
 * @property {number} depth
 *
 * @typedef {Object} CircuitEdge
 * @property {string} id
 * @property {CircuitNode} from
 * @property {CircuitNode} to
 * @property {0|1} portIndex
 */

/**
 * Random expression generator (string) used to exercise the library parser.
 */
class ExprFactory {
  /**
   * @param {{ vars: string[], ops: string[], maxDepth: number, notProbability: number }} cfg
   */
  constructor(cfg) {
    this.cfg = cfg;
  }

  /**
   * @param {number} depth
   * @returns {{ type:"var"|"not"|"bin", name?: string, op?: string, a?: any, b?: any }}
   */
  node(depth) {
    const { vars, maxDepth, notProbability } = this.cfg;
    const atLeaf = depth >= maxDepth || Math.random() < 0.22;

    if (atLeaf) {
      let leaf = { type: "var", name: vars[Math.floor(Math.random() * vars.length)] };
      if (Math.random() < notProbability) {
        leaf = { type: "not", a: leaf };
      }
      return leaf;
    }

    const left = this.node(depth + 1);
    const right = this.node(depth + 1);
    const op = this.cfg.ops[Math.floor(Math.random() * this.cfg.ops.length)];
    let n = { type: "bin", op, a: left, b: right };
    if (Math.random() < notProbability * 0.6) n = { type: "not", a: n };
    return n;
  }

  /**
   * @param {any} n
   * @returns {string}
   */
  toString(n) {
    if (n.type === "var") return n.name;
    if (n.type === "not") return `NOT(${this.toString(n.a)})`;
    return `(${this.toString(n.a)} ${n.op} ${this.toString(n.b)})`;
  }
}

/**
 * Convert BooleanAlgebra AST to a circuit-friendly node graph.
 * @param {BooleanAst} ast
 * @returns {CircuitNode}
 */
function astToCircuit(ast) {
  let uid = 0;
  /** @type {Map<BooleanAst, CircuitNode>} */
  const memo = new Map();

  /**
   * @param {BooleanAst} n
   * @returns {CircuitNode}
   */
  const build = (n) => {
    const existing = memo.get(n);
    if (existing) return existing;

    /** @type {CircuitNode} */
    const node = {
      id: `n${uid++}`,
      type: /** @type {CircuitNodeType} */ (n.type),
      name: n.type === "var" ? n.name : undefined,
      value: n.type === "const" ? Boolean(n.value) : undefined,
      inputs: [],
      x: 0,
      y: 0,
      depth: 0,
    };

    memo.set(n, node);

    if (n.type === "not") {
      node.inputs = [build(n.left)];
    } else if (
      n.type === "and" ||
      n.type === "or" ||
      n.type === "xor" ||
      n.type === "nand" ||
      n.type === "nor" ||
      n.type === "xnor"
    ) {
      node.inputs = [build(n.left), build(n.right)];
    }
    return node;
  };

  return build(ast);
}

/**
 * Assign depth and y-positions (tidy tree: leaves stacked, parents centered).
 * @param {CircuitNode} root
 * @returns {{ nodes: CircuitNode[], edges: CircuitEdge[], maxDepth: number }}
 */
function layoutCircuit(root) {
  /** @type {CircuitNode[]} */
  const nodes = [];
  /** @type {CircuitEdge[]} */
  const edges = [];
  let edgeId = 0;

  /** @type {CircuitNode[]} */
  const leaves = [];

  /**
   * @param {CircuitNode} n
   * @param {number} depth
   */
  const walk = (n, depth) => {
    n.depth = depth;
    nodes.push(n);
    if (n.inputs.length === 0) {
      leaves.push(n);
      return;
    }
    for (let i = 0; i < n.inputs.length; i++) {
      const child = n.inputs[i];
      edges.push({
        id: `e${edgeId++}`,
        from: child,
        to: n,
        portIndex: /** @type {0|1} */ (i === 0 ? 0 : 1),
      });
      walk(child, depth + 1);
    }
  };

  walk(root, 0);

  // Normalize depths: currently root at depth 0, leaves at larger depth.
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  for (const n of nodes) {
    n.depth = maxDepth - n.depth; // leaves on left, root on right
  }

  // Sort leaves by a stable traversal order (already in visit order)
  for (let i = 0; i < leaves.length; i++) {
    leaves[i].y = i * CONFIG.layout.leafGap;
  }

  // Post-order assign parent y = average(children y)
  const byDepthDesc = [...nodes].sort((a, b) => b.depth - a.depth);
  for (const n of byDepthDesc) {
    if (n.inputs.length > 0) {
      const ys = n.inputs.map((c) => c.y);
      n.y = ys.reduce((s, v) => s + v, 0) / ys.length;
    }
  }

  // Assign x by depth
  for (const n of nodes) {
    n.x = n.depth * CONFIG.layout.layerGap;
  }

  // Center y around 0
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const centerY = (minY + maxY) / 2;
  for (const n of nodes) n.y -= centerY;

  // Center x around 0
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const centerX = (minX + maxX) / 2;
  for (const n of nodes) n.x -= centerX;

  return { nodes, edges, maxDepth };
}

/**
 * Evaluate a CircuitNode recursively given env.
 * @param {CircuitNode} node
 * @param {Record<string, boolean>} env
 * @returns {boolean}
 */
function evalCircuit(node, env) {
  switch (node.type) {
    case "const":
      return Boolean(node.value);
    case "var":
      return Boolean(env[node.name] ?? false);
    case "not":
      return !evalCircuit(node.inputs[0], env);
    case "and":
      return evalCircuit(node.inputs[0], env) && evalCircuit(node.inputs[1], env);
    case "nand":
      return !(evalCircuit(node.inputs[0], env) && evalCircuit(node.inputs[1], env));
    case "or":
      return evalCircuit(node.inputs[0], env) || evalCircuit(node.inputs[1], env);
    case "nor":
      return !(evalCircuit(node.inputs[0], env) || evalCircuit(node.inputs[1], env));
    case "xor": {
      const a = evalCircuit(node.inputs[0], env);
      const b = evalCircuit(node.inputs[1], env);
      return (a && !b) || (!a && b);
    }
    case "xnor": {
      const a = evalCircuit(node.inputs[0], env);
      const b = evalCircuit(node.inputs[1], env);
      return a === b;
    }
    default:
      return false;
  }
}

class LogicCircuitDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.colors.bg;
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    this.container = this.canvas.parentElement;
    if (this.container) this.enableFluidSize(this.container);

    this.time = 0;
    this.clock = 0;

    this._onClick = () => this.regenerate();
    this.canvas.addEventListener("click", this._onClick);

    this.regenerate();
  }

  stop() {
    super.stop();
    if (this._onClick) this.canvas.removeEventListener("click", this._onClick);
  }

  regenerate() {
    // Build a fresh expression string, then parse with BooleanAlgebra.
    const factory = new ExprFactory({
      vars: CONFIG.expr.variables,
      ops: CONFIG.expr.ops,
      maxDepth: CONFIG.expr.maxDepth,
      notProbability: CONFIG.expr.notProbability,
    });
    this.expression = factory.toString(factory.node(0));
    this.ast = BooleanAlgebra.parse(this.expression);

    // Circuit graph + layout
    this.root = astToCircuit(this.ast);
    const { nodes, edges } = layoutCircuit(this.root);
    this.nodes = nodes;
    this.edges = edges;
  }

  /**
   * Compute a deterministic-but-alive environment for the input variables.
   * @param {number} t
   * @returns {Record<string, boolean>}
   */
  buildEnv(t) {
    /** @type {Record<string, boolean>} */
    const env = {};

    const base = t * CONFIG.animation.clockHz * 2 * Math.PI;
    const jitter = t * CONFIG.animation.jitterHz * 2 * Math.PI;

    for (let i = 0; i < CONFIG.expr.variables.length; i++) {
      const name = CONFIG.expr.variables[i];
      const phase = i * 1.7;
      const s = Math.sin(base + phase) + 0.35 * Math.sin(jitter + phase * 2.2);
      env[name] = s > 0;
    }

    return env;
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
  }

  render() {
    // Ensure Painter is bound to this canvas (multi-canvas page)
    Painter.setContext(this.ctx);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Trail background
    this.ctx.fillStyle = `rgba(0,0,0,${CONFIG.render.backgroundAlpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const env = this.buildEnv(this.time);

    // Fit circuit to canvas (local coords centered at screen center)
    const margin = CONFIG.layout.margin;
    const bounds = this.getCircuitBounds();
    const availW = Math.max(1, this.width - margin * 2);
    const availH = Math.max(1, this.height - margin * 2);

    const sx = availW / Math.max(1, bounds.w);
    const sy = availH / Math.max(1, bounds.h);
    const scale = Math.min(sx, sy);

    Painter.useCtx((ctx) => {
      ctx.globalCompositeOperation = CONFIG.render.blendMode;
      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(scale, scale);

      // Draw wires behind gates
      for (let i = 0; i < this.edges.length; i++) {
        const e = this.edges[i];
        const fromVal = evalCircuit(e.from, env);
        const toVal = evalCircuit(e.to, env);
        const hot = fromVal && toVal;
        const stroke = hot ? CONFIG.colors.wireHot : (fromVal ? CONFIG.colors.wireOn : CONFIG.colors.wireOff);
        const lw = hot ? CONFIG.render.wireWidthHot : CONFIG.render.wireWidth;

        const path = this.getWirePath(e);
        this.drawPolyline(path, stroke, lw);

        // Packets moving along the wire
        const baseT = this.time * CONFIG.animation.packetSpeed - i * CONFIG.animation.packetSpacing;
        const pT = fract(baseT);
        const pos = this.samplePolyline(path, pT);
        const dot = hot ? CONFIG.colors.signalHot : (fromVal ? CONFIG.colors.signalOn : CONFIG.colors.signalOff);
        Painter.shapes.fillCircle(pos.x, pos.y, CONFIG.render.signalRadius, dot);
      }

      // Draw gates on top
      for (const n of this.nodes) {
        this.drawGate(n, env);
      }

    }, { saveState: true });

    this.ctx.globalCompositeOperation = "source-over";
  }

  /**
   * Get circuit bounds in local layout space.
   * @returns {{ minX:number, maxX:number, minY:number, maxY:number, w:number, h:number }}
   */
  getCircuitBounds() {
    const halfW = CONFIG.layout.nodeW / 2;
    const halfH = CONFIG.layout.nodeH / 2;
    const minX = Math.min(...this.nodes.map((n) => n.x - halfW));
    const maxX = Math.max(...this.nodes.map((n) => n.x + halfW));
    const minY = Math.min(...this.nodes.map((n) => n.y - halfH));
    const maxY = Math.max(...this.nodes.map((n) => n.y + halfH));
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
  }

  /**
   * Build an orthogonal wire polyline from child output to parent input port.
   * @param {CircuitEdge} e
   * @returns {Array<{x:number,y:number}>}
   */
  getWirePath(e) {
    const halfW = CONFIG.layout.nodeW / 2;
    const portY =
      e.to.inputs.length === 1
        ? 0
        : (e.portIndex === 0 ? -CONFIG.layout.portOffsetY : CONFIG.layout.portOffsetY);

    const x0 = e.from.x + halfW;
    const y0 = e.from.y;
    const x1 = e.to.x - halfW;
    const y1 = e.to.y + portY;

    const midX = lerp(x0, x1, 0.5);
    const elbowA = Math.min(midX, x0 + CONFIG.layout.elbowX);
    const elbowB = Math.max(midX, x1 - CONFIG.layout.elbowX);

    return [
      { x: x0, y: y0 },
      { x: elbowA, y: y0 },
      { x: elbowB, y: y1 },
      { x: x1, y: y1 },
    ];
  }

  /**
   * Draw a polyline.
   * @param {Array<{x:number,y:number}>} pts
   * @param {string} color
   * @param {number} lineWidth
   */
  drawPolyline(pts, color, lineWidth) {
    for (let i = 0; i < pts.length - 1; i++) {
      Painter.lines.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, color, lineWidth);
    }
  }

  /**
   * Sample a polyline at normalized t (0..1) by arc length.
   * @param {Array<{x:number,y:number}>} pts
   * @param {number} t
   * @returns {{x:number,y:number}}
   */
  samplePolyline(pts, t) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i].x;
      const ay = pts[i].y;
      const bx = pts[i + 1].x;
      const by = pts[i + 1].y;
      const len = Math.hypot(bx - ax, by - ay);
      segs.push({ ax, ay, bx, by, len });
      total += len;
    }
    const target = t * total;
    let acc = 0;
    for (const s of segs) {
      if (acc + s.len >= target) {
        const local = (target - acc) / (s.len || 1);
        return {
          x: lerp(s.ax, s.bx, local),
          y: lerp(s.ay, s.by, local),
        };
      }
      acc += s.len;
    }
    const last = pts[pts.length - 1];
    return { x: last.x, y: last.y };
  }

  /**
   * Draw a gate as a rounded rectangle with a minimal label.
   * @param {CircuitNode} n
   * @param {Record<string, boolean>} env
   */
  drawGate(n, env) {
    const halfW = CONFIG.layout.nodeW / 2;
    const halfH = CONFIG.layout.nodeH / 2;
    const x = n.x - halfW;
    const y = n.y - halfH;

    const on = evalCircuit(n, env);
    const pulse = Motion.pulse(0, 1, this.time, 1.0, true, true).value;
    const glow = on ? (0.35 + 0.65 * easeInOut(pulse)) : 0.05;

    // Gate body
    const fill = `rgba(0,255,0,${0.04 + glow * 0.08})`;
    const stroke = on ? CONFIG.colors.wireOn : CONFIG.colors.gateStroke;
    Painter.shapes.fillRoundRect(x, y, CONFIG.layout.nodeW, CONFIG.layout.nodeH, CONFIG.render.gateRadius, fill);
    Painter.shapes.strokeRoundRect(x, y, CONFIG.layout.nodeW, CONFIG.layout.nodeH, CONFIG.render.gateRadius, stroke, 2);

    // Ports
    const outX = n.x + halfW;
    const outY = n.y;
    Painter.shapes.fillCircle(outX, outY, 2.6, on ? CONFIG.colors.signalOn : CONFIG.colors.signalOff);

    if (n.inputs.length === 1) {
      Painter.shapes.fillCircle(n.x - halfW, n.y, 2.6, "rgba(0,255,0,0.35)");
    } else if (n.inputs.length === 2) {
      Painter.shapes.fillCircle(n.x - halfW, n.y - CONFIG.layout.portOffsetY, 2.6, "rgba(0,255,0,0.35)");
      Painter.shapes.fillCircle(n.x - halfW, n.y + CONFIG.layout.portOffsetY, 2.6, "rgba(0,255,0,0.35)");
    }

    // Label
    const label =
      n.type === "var"
        ? n.name
        : n.type === "const"
          ? (n.value ? "1" : "0")
          : n.type.toUpperCase();

    Painter.useCtx((ctx) => {
      ctx.font = CONFIG.render.font;
      ctx.fillStyle = CONFIG.colors.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, n.x, n.y);
    });
  }
}

/**
 * Mount Day 07 into the provided canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ stop: () => void, game: LogicCircuitDemo }}
 */
export default function day07(canvas) {
  const game = new LogicCircuitDemo(canvas);
  game.start();
  return { stop: () => game.stop(), game };
}


