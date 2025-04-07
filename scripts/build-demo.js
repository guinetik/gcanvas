import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..");
const DEMOS = path.join(ROOT, "demos");
const DIST = path.join(ROOT, "dist");
const PUBLIC = path.join(ROOT, "public");
const ESM_FILE = path.join(DIST, "gcanvas.es.min.js");

function cleanPublic() {
  if (fs.existsSync(PUBLIC)) fs.rmSync(PUBLIC, { recursive: true });
  fs.mkdirSync(PUBLIC);
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function rewriteImportsInPublic(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      rewriteImportsInPublic(fullPath);
    } else if (entry.isFile() && /\.(js|html)$/.test(entry.name)) {
      let content = fs.readFileSync(fullPath, "utf-8");

      // Replace all imports pointing to any form of src/
      content = content.replace(
        /from\s+["'](\.{1,2}\/)+src\/[^"']+["']/g,
        `from "/gcanvas/gcanvas.es.min.js"`
      );

      fs.writeFileSync(fullPath, content);
    }
  }
}

function buildAndCopy() {
  console.log("📦 Running build");
  execSync("npm run build", { stdio: "inherit" });

  console.log("📁 Copying demos → public/");
  copyRecursive(DEMOS, PUBLIC);

  console.log("📁 Copying gcanvas.es.min.js → public/");
  fs.copyFileSync(ESM_FILE, path.join(PUBLIC, "gcanvas.es.min.js"));

  console.log("✍️ Rewriting imports in public/...");
  rewriteImportsInPublic(PUBLIC);

  console.log("✅ build:demo complete");
}

function run() {
  console.log("🧹 Cleaning public/");
  cleanPublic();
  buildAndCopy();
}

run();
