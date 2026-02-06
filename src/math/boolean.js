/**
 * Boolean Algebra Utilities
 *
 * Pure math helpers for:
 * - Logic gates (AND/OR/XOR/NOT + NAND/NOR/XNOR)
 * - Parsing boolean expressions into an AST
 * - Evaluating expressions with a variable assignment
 * - Building truth tables (optionally in Gray-code order)
 *
 * This module is intentionally **rendering-agnostic**.
 */

const CONFIG = {
  tokens: {
    // Supported operator aliases. Words are case-insensitive.
    unaryNot: ["!", "~", "¬", "NOT"],
    and: ["&", "∧", "AND"],
    nand: ["NAND"],
    or: ["|", "∨", "OR"],
    nor: ["NOR"],
    xor: ["^", "⊕", "XOR"],
    xnor: ["XNOR"],
  },
  precedence: {
    // Higher number = higher precedence
    OR: 1,
    NOR: 1,
    XOR: 2,
    XNOR: 2,
    AND: 3,
    NAND: 3,
    NOT: 4,
  },
  constants: {
    true: ["1", "TRUE"],
    false: ["0", "FALSE"],
  },
};

/**
 * @typedef {Object} BooleanAst
 * @property {"const"|"var"|"not"|"and"|"or"|"xor"|"nand"|"nor"|"xnor"} type
 * @property {boolean} [value]
 * @property {string} [name]
 * @property {BooleanAst} [left]
 * @property {BooleanAst} [right]
 */

/**
 * @typedef {Object.<string, boolean|0|1>} BooleanEnv
 */

/**
 * Normalize a truthy-ish value to boolean.
 * @param {boolean|number} v
 * @returns {boolean}
 */
function toBool(v) {
  return Boolean(v);
}

/**
 * @param {string} s
 * @returns {string}
 */
function upper(s) {
  return String(s).toUpperCase();
}

/**
 * @param {string} src
 * @returns {Array<{type:"lp"|"rp"|"op"|"ident"|"const", value:string}>}
 */
function tokenize(src) {
  const out = [];
  const s = String(src ?? "");
  let i = 0;

  const isWs = (c) => c === " " || c === "\n" || c === "\t" || c === "\r";
  const isAlpha = (c) =>
    (c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || c === "_";
  const isAlnum = (c) => isAlpha(c) || (c >= "0" && c <= "9");

  while (i < s.length) {
    const c = s[i];
    if (isWs(c)) {
      i++;
      continue;
    }

    if (c === "(") {
      out.push({ type: "lp", value: c });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ type: "rp", value: c });
      i++;
      continue;
    }

    // Single-char operators
    if (c === "!" || c === "~" || c === "¬" || c === "&" || c === "∧" || c === "|" || c === "∨" || c === "^" || c === "⊕") {
      out.push({ type: "op", value: c });
      i++;
      continue;
    }

    // Identifiers / word-operators / constants
    if (isAlpha(c) || (c >= "0" && c <= "9")) {
      let j = i + 1;
      while (j < s.length && isAlnum(s[j])) j++;
      const raw = s.slice(i, j);
      const u = upper(raw);

      if (CONFIG.constants.true.includes(u) || CONFIG.constants.false.includes(u)) {
        out.push({ type: "const", value: u });
      } else if (
        CONFIG.tokens.unaryNot.includes(u) ||
        CONFIG.tokens.and.includes(u) ||
        CONFIG.tokens.nand.includes(u) ||
        CONFIG.tokens.or.includes(u) ||
        CONFIG.tokens.nor.includes(u) ||
        CONFIG.tokens.xor.includes(u) ||
        CONFIG.tokens.xnor.includes(u)
      ) {
        out.push({ type: "op", value: u });
      } else {
        out.push({ type: "ident", value: raw });
      }

      i = j;
      continue;
    }

    throw new Error(`[BooleanAlgebra] Unexpected character "${c}" at ${i}`);
  }

  return out;
}

/**
 * Map an operator token to a canonical operator name.
 * @param {string} op
 * @returns {"NOT"|"AND"|"NAND"|"OR"|"NOR"|"XOR"|"XNOR"}
 */
function normalizeOperator(op) {
  const u = upper(op);
  if (CONFIG.tokens.unaryNot.map(upper).includes(u)) return "NOT";
  if (CONFIG.tokens.and.map(upper).includes(u)) return "AND";
  if (CONFIG.tokens.nand.map(upper).includes(u)) return "NAND";
  if (CONFIG.tokens.or.map(upper).includes(u)) return "OR";
  if (CONFIG.tokens.nor.map(upper).includes(u)) return "NOR";
  if (CONFIG.tokens.xor.map(upper).includes(u)) return "XOR";
  if (CONFIG.tokens.xnor.map(upper).includes(u)) return "XNOR";
  throw new Error(`[BooleanAlgebra] Unknown operator "${op}"`);
}

/**
 * @param {string} opName
 * @returns {number}
 */
function precedence(opName) {
  return CONFIG.precedence[opName] ?? 0;
}

/**
 * Parse boolean expression tokens into an AST using precedence climbing.
 * @param {ReturnType<typeof tokenize>} tokens
 * @returns {BooleanAst}
 */
function parseTokens(tokens) {
  let idx = 0;

  const peek = () => tokens[idx];
  const next = () => tokens[idx++];

  /**
   * @returns {BooleanAst}
   */
  function parsePrimary() {
    const t = next();
    if (!t) throw new Error("[BooleanAlgebra] Unexpected end of input");

    if (t.type === "const") {
      const u = upper(t.value);
      return { type: "const", value: CONFIG.constants.true.includes(u) };
    }

    if (t.type === "ident") {
      return { type: "var", name: t.value };
    }

    if (t.type === "lp") {
      const expr = parseExpr(0);
      const r = next();
      if (!r || r.type !== "rp") {
        throw new Error("[BooleanAlgebra] Missing closing ')'");
      }
      return expr;
    }

    if (t.type === "op") {
      const opName = normalizeOperator(t.value);
      if (opName !== "NOT") {
        throw new Error(`[BooleanAlgebra] Unexpected binary operator "${t.value}"`);
      }
      return { type: "not", left: parsePrimary() };
    }

    throw new Error(`[BooleanAlgebra] Unexpected token "${t.type}"`);
  }

  /**
   * @param {number} minPrec
   * @returns {BooleanAst}
   */
  function parseExpr(minPrec) {
    let left = parsePrimary();

    while (true) {
      const t = peek();
      if (!t || t.type !== "op") break;
      const opName = normalizeOperator(t.value);
      if (opName === "NOT") break; // unary NOT handled in primary

      const prec = precedence(opName);
      if (prec < minPrec) break;

      // Consume operator
      next();

      // Left-associative for all binary ops here
      const right = parseExpr(prec + 1);

      /** @type {BooleanAst["type"]} */
      const type =
        opName === "AND"
          ? "and"
          : opName === "OR"
            ? "or"
            : opName === "XOR"
              ? "xor"
              : opName === "NAND"
                ? "nand"
                : opName === "NOR"
                  ? "nor"
                  : "xnor";

      left = { type, left, right };
    }

    return left;
  }

  const ast = parseExpr(0);
  if (idx < tokens.length) {
    throw new Error("[BooleanAlgebra] Unexpected trailing tokens");
  }
  return ast;
}

/**
 * @param {BooleanAst} ast
 * @param {BooleanEnv} env
 * @returns {boolean}
 */
function evalAst(ast, env) {
  switch (ast.type) {
    case "const":
      return Boolean(ast.value);
    case "var": {
      const v = env?.[ast.name] ?? false;
      return toBool(v);
    }
    case "not":
      return !evalAst(ast.left, env);
    case "and":
      return evalAst(ast.left, env) && evalAst(ast.right, env);
    case "nand":
      return !(evalAst(ast.left, env) && evalAst(ast.right, env));
    case "or":
      return evalAst(ast.left, env) || evalAst(ast.right, env);
    case "nor":
      return !(evalAst(ast.left, env) || evalAst(ast.right, env));
    case "xor": {
      const a = evalAst(ast.left, env);
      const b = evalAst(ast.right, env);
      return (a && !b) || (!a && b);
    }
    case "xnor": {
      const a = evalAst(ast.left, env);
      const b = evalAst(ast.right, env);
      return a === b;
    }
    default:
      throw new Error(`[BooleanAlgebra] Unknown AST node type "${ast.type}"`);
  }
}

/**
 * Collect variables from an AST.
 * @param {BooleanAst} ast
 * @param {Set<string>} out
 */
function collectVars(ast, out) {
  if (!ast) return;
  if (ast.type === "var" && ast.name) out.add(ast.name);
  if (ast.left) collectVars(ast.left, out);
  if (ast.right) collectVars(ast.right, out);
}

/**
 * Return Gray-code ordering for integers in [0..2^n-1].
 * @param {number} n
 * @returns {number[]}
 */
function grayOrder(n) {
  const size = 1 << n;
  const out = new Array(size);
  for (let i = 0; i < size; i++) {
    out[i] = i ^ (i >> 1);
  }
  return out;
}

export class BooleanAlgebra {
  /**
   * Basic gates.
   * @param {boolean|number} a
   * @param {boolean|number} b
   * @returns {boolean}
   */
  static and(a, b) {
    return toBool(a) && toBool(b);
  }

  /**
   * @param {boolean|number} a
   * @param {boolean|number} b
   * @returns {boolean}
   */
  static nand(a, b) {
    return !(toBool(a) && toBool(b));
  }

  /**
   * @param {boolean|number} a
   * @param {boolean|number} b
   * @returns {boolean}
   */
  static or(a, b) {
    return toBool(a) || toBool(b);
  }

  /**
   * @param {boolean|number} a
   * @param {boolean|number} b
   * @returns {boolean}
   */
  static nor(a, b) {
    return !(toBool(a) || toBool(b));
  }

  /**
   * @param {boolean|number} a
   * @param {boolean|number} b
   * @returns {boolean}
   */
  static xor(a, b) {
    const aa = toBool(a);
    const bb = toBool(b);
    return (aa && !bb) || (!aa && bb);
  }

  /**
   * @param {boolean|number} a
   * @param {boolean|number} b
   * @returns {boolean}
   */
  static xnor(a, b) {
    return toBool(a) === toBool(b);
  }

  /**
   * @param {boolean|number} a
   * @returns {boolean}
   */
  static not(a) {
    return !toBool(a);
  }

  /**
   * Parse an expression string into an AST.
   *
   * Supported operators:
   * - NOT: `!`, `~`, `¬`, `NOT`
   * - AND: `&`, `∧`, `AND`
   * - OR: `|`, `∨`, `OR`
   * - XOR: `^`, `⊕`, `XOR`
   * - NAND/NOR/XNOR as words (case-insensitive)
   *
   * Constants: `0/1`, `false/true` (case-insensitive)
   *
   * @param {string} expr
   * @returns {BooleanAst}
   */
  static parse(expr) {
    return parseTokens(tokenize(expr));
  }

  /**
   * Evaluate an expression string or AST against an environment.
   * @param {string|BooleanAst} expr
   * @param {BooleanEnv} env
   * @returns {boolean}
   */
  static evaluate(expr, env = {}) {
    const ast = typeof expr === "string" ? BooleanAlgebra.parse(expr) : expr;
    return evalAst(ast, env);
  }

  /**
   * Get sorted variable names used by an expression.
   * @param {string|BooleanAst} expr
   * @returns {string[]}
   */
  static variables(expr) {
    const ast = typeof expr === "string" ? BooleanAlgebra.parse(expr) : expr;
    const vars = new Set();
    collectVars(ast, vars);
    return [...vars].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Gray-code ordering for n bits.
   * @param {number} n
   * @returns {number[]}
   */
  static grayCode(n) {
    return grayOrder(n);
  }

  /**
   * Build a truth table for an expression.
   * @param {string|BooleanAst} expr
   * @param {string[]} [variables] - Optional variable ordering. If omitted, derived from expression.
   * @param {{ order?: "binary"|"gray" }} [options]
   * @returns {{
   *  variables: string[],
   *  order: "binary"|"gray",
   *  rows: Array<{ index: number, inputs: Record<string, boolean>, output: boolean }>
   * }}
   */
  static truthTable(expr, variables, options = {}) {
    const ast = typeof expr === "string" ? BooleanAlgebra.parse(expr) : expr;
    const vars = (variables && variables.length > 0) ? [...variables] : BooleanAlgebra.variables(ast);
    const n = vars.length;
    const size = 1 << n;
    const order = options.order === "gray" ? "gray" : "binary";
    const indices = order === "gray" ? grayOrder(n) : Array.from({ length: size }, (_, i) => i);

    const rows = indices.map((idx) => {
      /** @type {Record<string, boolean>} */
      const inputs = {};
      for (let bit = 0; bit < n; bit++) {
        const mask = 1 << (n - 1 - bit);
        inputs[vars[bit]] = Boolean(idx & mask);
      }
      return {
        index: idx,
        inputs,
        output: evalAst(ast, inputs),
      };
    });

    return { variables: vars, order, rows };
  }
}


