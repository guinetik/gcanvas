import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { injectSeo, needsSeoUpdate } from "../../scripts/inject-seo.js";

const demosDir = join(dirname(fileURLToPath(import.meta.url)), "../../demos");
const SKIP = new Set(["index.html", "home.html", "404.html"]);

function count(html, pattern) {
  return (html.match(pattern) || []).length;
}

const BARE = `<!DOCTYPE html>
<html><head>
  <title>Lorenz Attractor 3D</title>
</head>
<body>
  <div id="info"><h1>Lorenz Attractor</h1><p>The Butterfly Effect.</p></div>
</body></html>`;

describe("injectSeo", () => {
  it("injects description, open graph, canonical, and GA into a bare page", () => {
    const out = injectSeo(BARE, "lorenz.html");
    expect(out).toContain("<!-- SEO:injected -->");
    expect(count(out, /<meta\s+name="description"/g)).toBe(1);
    expect(count(out, /property="og:url"/g)).toBe(1);
    expect(count(out, /<link\s+rel="canonical"/g)).toBe(1);
    expect(out).toContain("googletagmanager.com/gtag/js?id=G-1GHJD0LM4Z");
    expect(out).toContain("https://gcanvas.guinetik.com/lorenz.html");
  });

  it("reuses an existing description instead of injecting a second one", () => {
    const html = `<!DOCTYPE html>
<html><head>
  <title>Fluid Dynamics · GCanvas</title>
  <meta name="description" content="Stir a living canvas of ink." />
</head>
<body>
  <div id="info"><h1>Ink Flow</h1><p>Push the fluid.</p></div>
</body></html>`;

    const out = injectSeo(html, "fluid-dynamics.html");
    expect(count(out, /<meta\s+name="description"/g)).toBe(1);
    expect(out).toContain('content="Stir a living canvas of ink."');
    expect(out).toContain('property="og:description" content="Stir a living canvas of ink."');
    expect(out).not.toMatch(/name="description"[^>]*Push the fluid/);
    expect(out).not.toMatch(/og:description"[^>]*Push the fluid/);
  });

  it("keeps an existing injected description instead of scraping #info again", () => {
    const html = `<!DOCTYPE html>
<html><head>
  <title>Lorenz Attractor 3D</title>
  <!-- SEO:injected -->
  <meta name="description" content="Keep this description." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://gcanvas.guinetik.com/lorenz.html" />
  <meta property="og:title" content="Lorenz Attractor 3D" />
  <meta property="og:description" content="Keep this description." />
  <meta property="og:image" content="https://gcanvas.guinetik.com/og_image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Lorenz Attractor 3D" />
  <meta name="twitter:description" content="Keep this description." />
  <meta name="twitter:image" content="https://gcanvas.guinetik.com/og_image.png" />
  <meta name="twitter:creator" content="@guinetik" />
  <link rel="canonical" href="https://gcanvas.guinetik.com/lorenz.html" />
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1GHJD0LM4Z"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-1GHJD0LM4Z');
  </script>
</head>
<body>
  <div id="info"><h1>Should not appear in meta</h1></div>
</body></html>`;

    const out = injectSeo(html, "lorenz.html");
    expect(out).toContain("Keep this description.");
    expect(out).not.toMatch(/name="description"[^>]*Should not appear/);
    expect(needsSeoUpdate(html)).toBe(false);
  });

  it("keeps an existing canonical and uses it for og:url", () => {
    const html = `<!DOCTYPE html>
<html><head>
  <title>Navier–Stokes Vortex · GCanvas</title>
  <link rel="canonical" href="https://gcanvas.guinetik.com/nsvortex.html" />
  <script>location.replace("./nsvortex.html");</script>
</head>
<body><a href="nsvortex.html">Open</a></body></html>`;

    const out = injectSeo(html, "singularity.html");
    expect(count(out, /<link\s+rel="canonical"/g)).toBe(1);
    expect(out).toContain('href="https://gcanvas.guinetik.com/nsvortex.html"');
    expect(out).toContain('property="og:url" content="https://gcanvas.guinetik.com/nsvortex.html"');
    expect(out).not.toMatch(/og:url" content="https:\/\/gcanvas\.guinetik\.com\/singularity\.html"/);
    expect(out).not.toMatch(/rel="canonical" href="https:\/\/gcanvas\.guinetik\.com\/singularity\.html"/);
  });

  it("does not duplicate open graph tags that were written by hand", () => {
    const html = `<!DOCTYPE html>
<html><head>
  <title>Galaxy Playground</title>
  <meta name="description" content="Interactive galaxy visualization." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://gcanvas.guinetik.com/galaxy-playground.html" />
  <meta property="og:title" content="Galaxy Playground" />
  <meta property="og:description" content="Interactive galaxy visualization." />
  <meta property="og:image" content="https://gcanvas.guinetik.com/og_image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Galaxy Playground" />
  <meta name="twitter:description" content="Interactive galaxy visualization." />
  <meta name="twitter:image" content="https://gcanvas.guinetik.com/og_image.png" />
  <link rel="canonical" href="https://gcanvas.guinetik.com/galaxy-playground.html" />
</head><body></body></html>`;

    const out = injectSeo(html, "galaxy-playground.html");
    expect(count(out, /<meta\s+name="description"/g)).toBe(1);
    expect(count(out, /property="og:url"/g)).toBe(1);
    expect(count(out, /property="og:title"/g)).toBe(1);
    expect(count(out, /name="twitter:card"/g)).toBe(1);
    expect(count(out, /<link\s+rel="canonical"/g)).toBe(1);
    expect(out).toContain('name="twitter:creator"');
    expect(out).toContain("googletagmanager.com/gtag/js?id=G-1GHJD0LM4Z");
  });

  it("replaces a previous injected block so a hand-written description wins", () => {
    const html = `<!DOCTYPE html>
<html><head>
  <title>Lab</title>
  <meta name="description" content="Hand written." />
  <!-- SEO:injected -->
  <meta name="description" content="Injected duplicate." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://gcanvas.guinetik.com/ns-lab.html" />
  <meta property="og:title" content="Lab" />
  <meta property="og:description" content="Injected duplicate." />
  <meta property="og:image" content="https://gcanvas.guinetik.com/og_image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Lab" />
  <meta name="twitter:description" content="Injected duplicate." />
  <meta name="twitter:image" content="https://gcanvas.guinetik.com/og_image.png" />
  <meta name="twitter:creator" content="@guinetik" />
  <link rel="canonical" href="https://gcanvas.guinetik.com/ns-lab.html" />
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1GHJD0LM4Z"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-1GHJD0LM4Z');
  </script>
</head><body></body></html>`;

    const out = injectSeo(html, "ns-lab.html");
    expect(count(out, /<meta\s+name="description"/g)).toBe(1);
    expect(count(out, /<link\s+rel="canonical"/g)).toBe(1);
    expect(out).toContain("Hand written.");
    expect(out).not.toContain("Injected duplicate.");
    expect(count(out, /googletagmanager\.com\/gtag\/js/g)).toBe(1);
  });

  it("is idempotent across re-runs", () => {
    const once = injectSeo(BARE, "lorenz.html");
    const twice = injectSeo(once, "lorenz.html");
    expect(twice).toBe(once);
  });

  it("leaves at most one description and canonical on every demo page", async () => {
    const files = (await readdir(demosDir)).filter((f) => f.endsWith(".html") && !SKIP.has(f));
    for (const file of files) {
      const src = await readFile(join(demosDir, file), "utf8");
      const out = injectSeo(src, file);
      expect(count(out, /<meta\s+name=["']description["']/gi), file).toBeLessThanOrEqual(1);
      expect(count(out, /<link\s+rel=["']canonical["']/gi), file).toBeLessThanOrEqual(1);
      expect(count(out, /property=["']og:url["']/gi), file).toBeLessThanOrEqual(1);
      expect(count(out, /property=["']og:description["']/gi), file).toBeLessThanOrEqual(1);
    }
  });
});

describe("demo HTML on disk", () => {
  it("has no duplicate description or canonical tags", async () => {
    const files = (await readdir(demosDir)).filter((f) => f.endsWith(".html"));
    for (const file of files) {
      const html = await readFile(join(demosDir, file), "utf8");
      expect(count(html, /<meta\s+name=["']description["']/gi), file).toBeLessThanOrEqual(1);
      expect(count(html, /<link\s+rel=["']canonical["']/gi), file).toBeLessThanOrEqual(1);
      expect(count(html, /property=["']og:url["']/gi), file).toBeLessThanOrEqual(1);
      expect(count(html, /property=["']og:description["']/gi), file).toBeLessThanOrEqual(1);
    }
  });
});
