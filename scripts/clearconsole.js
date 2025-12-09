#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const targetDir = process.argv[2] || "./src"; // default to ./src

function isLineCommented(line) {
  return /^\s*\/\/.*console\.log/.test(line);
}

function isInsideBlockComment(lines, index) {
  for (let i = index; i >= 0; i--) {
    if (lines[i].includes("*/")) break;
    if (lines[i].includes("/*")) return true;
  }
  return false;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const modified = lines.map((line, i) => {
    if (
      line.includes("console.log") &&
      !isLineCommented(line) &&
      !isInsideBlockComment(lines, i)
    ) {
      return line.replace(/(.*?)(console\.log.*)/, "$1// $2");
    }
    return line;
  });
  fs.writeFileSync(filePath, modified.join("\n"), "utf8");
  console.log(`✔ Commented console.log in: ${filePath}`);
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(js|ts|jsx|tsx)$/.test(fullPath)) {
      processFile(fullPath);
    }
  });
}

walkDir(targetDir);
