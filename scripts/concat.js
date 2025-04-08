// concat.js
import fs from 'fs';
import path from 'path';

const srcDir = './src';
const outputFile = './dist/bundle.js';

function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllJsFiles(fullPath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function concatFiles(files, dest) {
  let output = '';
  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf-8');
    output += `\n// FILE: ${file}\n` + contents + '\n';
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, output);
  console.log(`✅ Concatenated ${files.length} files to ${dest}`);
}

const jsFiles = getAllJsFiles(srcDir);
concatFiles(jsFiles, outputFile);
