#!/usr/bin/env node
/**
 * inject-seo.js
 *
 * Batch-injects SEO meta tags and Google Analytics into all demo HTML files.
 * Skips files that already have SEO (index.html, home.html, 404.html).
 *
 * Usage:  node scripts/inject-seo.js
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";

const DEMOS_DIR = join(import.meta.dirname, "..", "demos");
const BASE_URL = "https://gcanvas.guinetik.com";
const OG_IMAGE = `${BASE_URL}/og_image.png`;
const GA_ID = "G-1GHJD0LM4Z";
const TWITTER_CREATOR = "@guinetik";

// Files that already have full SEO — skip them
const SKIP_FILES = new Set(["index.html", "home.html", "404.html"]);

// Marker comment so we never double-inject
const SEO_MARKER = "<!-- SEO:injected -->";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SEO + GA snippet builders
// ---------------------------------------------------------------------------

function buildSeoBlock(filename, title, description) {
  const canonicalUrl = `${BASE_URL}/${filename}`;
  const safeTitle = escAttr(title);
  const safeDesc = escAttr(description);

  return `${SEO_MARKER}
  <meta name="description" content="${safeDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <meta name="twitter:creator" content="${TWITTER_CREATOR}" />
  <link rel="canonical" href="${canonicalUrl}" />`;
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

// ---------------------------------------------------------------------------
// Main
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
    let html = await readFile(filepath, "utf-8");

    // Already injected?
    if (html.includes(SEO_MARKER)) {
      console.log(`  SKIP (already injected): ${file}`);
      skipped++;
      continue;
    }

    const title = extractTitle(html) || file.replace(".html", "");
    const infoText = extractInfoText(html);
    const description = infoText
      ? truncate(`${title} - ${infoText}`, 160)
      : `${title} - Interactive demo built with GCanvas, a modular 2D canvas rendering and game framework.`;

    const seoBlock = buildSeoBlock(file, title, description);
    const gaBlock = buildGaSnippet();
    const injection = `\n  ${seoBlock}\n  ${gaBlock}\n`;

    // Insert right before </head>
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${injection}</head>`);
    } else {
      console.warn(`  WARN: no </head> in ${file}, skipping.`);
      skipped++;
      continue;
    }

    await writeFile(filepath, html, "utf-8");
    console.log(`  DONE: ${file}  (title: "${title}")`);
    injected++;
  }

  console.log(`\nComplete: ${injected} injected, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
