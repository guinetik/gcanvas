#!/usr/bin/env node
/**
 * inject-seo.js
 *
 * Batch-injects SEO meta tags and Google Analytics into all demo HTML files.
 * Skips files that already have full hand-managed SEO (index.html, home.html, 404.html).
 *
 * Re-runs replace the previous injected block. Existing description / canonical /
 * Open Graph / Twitter tags are reused instead of duplicated.
 *
 * Usage:  node scripts/inject-seo.js
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEMOS_DIR = join(import.meta.dirname, "..", "demos");
const BASE_URL = "https://gcanvas.guinetik.com";
const OG_IMAGE = `${BASE_URL}/og_image.png`;
const GA_ID = "G-1GHJD0LM4Z";
const TWITTER_CREATOR = "@guinetik";

const SKIP_FILES = new Set(["index.html", "home.html", "404.html"]);
const SEO_MARKER = "<!-- SEO:injected -->";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip HTML tags from a string */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate to maxLen chars on a word boundary, adding ellipsis if needed */
function truncate(str, maxLen = 160) {
  if (str.length <= maxLen) return str;
  const cut = str.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + "...";
}

/** Escape double-quotes for use inside HTML attribute values */
function escAttr(str) {
  return str.replace(/"/g, "&quot;");
}

/** Extract content of the <title> tag */
function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : null;
}

/** Extract text content from the #info div (if present) */
function extractInfoText(html) {
  const m = html.match(/<div\s+id=["']info["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return null;
  return stripHtml(m[1]);
}

function hasTag(html, { tag, attr, value }) {
  const re = new RegExp(
    `<${tag}\\b[^>]*\\s${attr}\\s*=\\s*["']${escapeRegExp(value)}["']`,
    "i"
  );
  return re.test(html);
}

function extractTagAttr(html, { tag, attr, value, capture }) {
  const re = new RegExp(
    `<${tag}\\b[^>]*\\s${attr}\\s*=\\s*["']${escapeRegExp(value)}["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  if (!m) return null;
  const cap = m[0].match(new RegExp(`${capture}\\s*=\\s*["']([^"']*)["']`, "i"));
  return cap ? cap[1] : null;
}

function hasGa(html) {
  return /googletagmanager\.com\/gtag\/js\?id=G-1GHJD0LM4Z/i.test(html);
}

function countAttr(html, pattern) {
  return (html.match(pattern) || []).length;
}

/** True when a page is missing SEO, or has duplicate description/canonical/OG tags. */
export function needsSeoUpdate(html) {
  const descriptions = countAttr(html, /<meta\b[^>]*\sname\s*=\s*["']description["']/gi);
  const canonicals = countAttr(html, /<link\b[^>]*\srel\s*=\s*["']canonical["']/gi);
  const ogUrls = countAttr(html, /property\s*=\s*["']og:url["']/gi);
  const ogDescriptions = countAttr(html, /property\s*=\s*["']og:description["']/gi);
  if (descriptions > 1 || canonicals > 1 || ogUrls > 1 || ogDescriptions > 1) return true;
  if (!html.includes(SEO_MARKER)) return true;
  if (!hasGa(html)) return true;
  if (descriptions === 0 || canonicals === 0) return true;
  return false;
}

export function stripInjectedBlock(html) {
  return html
    .replace(/\r?\n?[ \t]*<!-- SEO:injected -->[\s\S]*?(?=\s*<\/head>)/i, "")
    .replace(/\s*(<\/head>)/i, "\n$1");
}

function buildGaSnippet() {
  return `<!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>`;
}

function fallbackDescription(title, infoText) {
  return infoText
    ? truncate(`${title} - ${infoText}`, 160)
    : `${title} - Interactive demo built with GCanvas, a modular 2D canvas rendering and game framework.`;
}

/**
 * Insert or refresh the injected SEO/GA block without duplicating tags
 * that already exist on the page.
 */
export function injectSeo(html, filename) {
  const descBeforeStrip = extractTagAttr(html, {
    tag: "meta",
    attr: "name",
    value: "description",
    capture: "content",
  });
  const page = stripInjectedBlock(html);
  const title = extractTitle(page) || filename.replace(/\.html$/i, "");
  const existingDesc =
    extractTagAttr(page, {
      tag: "meta",
      attr: "name",
      value: "description",
      capture: "content",
    }) || descBeforeStrip;
  const existingCanonical = extractTagAttr(page, {
    tag: "link",
    attr: "rel",
    value: "canonical",
    capture: "href",
  });
  const description = existingDesc || fallbackDescription(title, extractInfoText(page));
  const canonicalUrl = existingCanonical || `${BASE_URL}/${filename}`;

  const lines = [SEO_MARKER];

  const addMeta = (attr, value, content) => {
    if (hasTag(page, { tag: "meta", attr, value })) return;
    lines.push(`  <meta ${attr}="${value}" content="${escAttr(content)}" />`);
  };

  addMeta("name", "description", description);
  addMeta("property", "og:type", "website");
  addMeta("property", "og:url", canonicalUrl);
  addMeta("property", "og:title", title);
  addMeta("property", "og:description", description);
  addMeta("property", "og:image", OG_IMAGE);
  addMeta("name", "twitter:card", "summary_large_image");
  addMeta("name", "twitter:title", title);
  addMeta("name", "twitter:description", description);
  addMeta("name", "twitter:image", OG_IMAGE);
  addMeta("name", "twitter:creator", TWITTER_CREATOR);

  if (!hasTag(page, { tag: "link", attr: "rel", value: "canonical" })) {
    lines.push(`  <link rel="canonical" href="${escAttr(canonicalUrl)}" />`);
  }

  if (!hasGa(page)) {
    lines.push(`  ${buildGaSnippet()}`);
  }

  if (!/<\/head>/i.test(page)) return page;

  const injection = `\n  ${lines.join("\n")}\n`;
  return page.replace(/<\/head>/i, `${injection}</head>`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const entries = await readdir(DEMOS_DIR);
  const htmlFiles = entries
    .filter((f) => f.endsWith(".html") && !SKIP_FILES.has(f))
    .sort();

  console.log(`Found ${htmlFiles.length} demo HTML files to process.\n`);

  let injected = 0;
  let skipped = 0;

  for (const file of htmlFiles) {
    const filepath = join(DEMOS_DIR, file);
    const html = await readFile(filepath, "utf-8");
    if (!needsSeoUpdate(html)) {
      console.log(`  SKIP (clean): ${file}`);
      skipped++;
      continue;
    }

    const next = injectSeo(html, file);
    if (next === html) {
      console.log(`  SKIP (unchanged): ${file}`);
      skipped++;
      continue;
    }

    await writeFile(filepath, next, "utf-8");
    console.log(`  DONE: ${file}  (title: "${extractTitle(next) || basename(file)}")`);
    injected++;
  }

  console.log(`\nComplete: ${injected} updated, ${skipped} unchanged.`);
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      resolve(fileURLToPath(import.meta.url)).toLowerCase() ===
      resolve(entry).toLowerCase()
    );
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
