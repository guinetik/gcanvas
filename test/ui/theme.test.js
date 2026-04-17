import { describe, it, expect, beforeEach } from "vitest";
import {
  UI_THEME,
  createTheme,
  setTheme,
  getTheme,
  registerTheme,
  THEMES,
} from "../../src/game/ui/theme.js";

describe("Theme registry", () => {
  beforeEach(() => {
    setTheme("default");
  });

  it("THEMES contains default and monochrome", () => {
    expect(THEMES.default).toBeDefined();
    expect(THEMES.monochrome).toBeDefined();
  });

  it("getTheme returns current theme", () => {
    const theme = getTheme();
    expect(theme).toBe(UI_THEME);
    expect(theme.colors).toBeDefined();
  });

  it("setTheme with string switches to named theme", () => {
    setTheme("monochrome");
    expect(UI_THEME.colors.neonGreen).not.toBe("#0f0");
  });

  it("setTheme with object applies custom theme", () => {
    const custom = createTheme("#ff0000");
    setTheme(custom);
    expect(UI_THEME.colors.neonGreen).toContain("255");
  });

  it("setTheme mutates UI_THEME in place (same reference)", () => {
    const ref = UI_THEME;
    setTheme("monochrome");
    expect(ref).toBe(UI_THEME);
  });

  it("registerTheme adds a new named theme", () => {
    const custom = createTheme("#ff6600");
    registerTheme("orange", custom);
    expect(THEMES.orange).toBeDefined();
    setTheme("orange");
    expect(UI_THEME.colors.neonGreen).toContain("255");
  });

  it("monochrome theme has white accent", () => {
    const mono = THEMES.monochrome;
    expect(mono.colors.neonGreen).toContain("255");
  });

  it("createTheme derives accordion header tints from accent", () => {
    const t = createTheme("#ffffff");
    expect(t.colors.accordionRowBorder).toMatch(/rgba\(255,\s*255,\s*255/);
  });
});
