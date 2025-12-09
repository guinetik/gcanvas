#!/usr/bin/env node

/**
 * bundle4llm
 * -------------
 * Create a comprehensive, single-file, import/export-free JavaScript bundle
 * ideal for feeding into LLMs without worrying about dependencies.
 *
 * Features:
 * - Recursively resolves and includes all exported modules
 * - Flattens directory structure
 * - Orders files by export order in index files
 * - Sanitizes code based on selected preset (defaults to ES2020)
 * - Skips index.js files from output (used only for ordering)
 * - Ensures comprehensive module inclusion
 * - Supports verbose logging with --verbose or -v
 * - Optional comment stripping with --strip-comments
 * - Accurate token estimation for various LLM models
 *
 * Usage:
 *   bundle4llm --src ./src --out ./dist --file bundle.js --preset es2020 --strip-comments --model claude -v
 */

import fs from 'fs';
import path from 'path';
import { argv } from 'process';

const args = Object.fromEntries(
  argv.slice(2).map(arg => {
    const [key, val] = arg.replace(/^--?/, '').split('=');
    return [key, val ?? true];
  })
);

const srcDir = path.resolve(args.src || './src');
const outDir = path.resolve(args.out || './dist');
const outFile = args.file || 'llm-bundle.js';
const verbose = args.v || args.verbose;
const stripComments = args['strip-comments'] || false;
const preset = args.preset || 'es2020';
const model = args.model || 'claude'; // Default to Claude model

// Deep file collection with recursive export resolution
function collectModules(indexPath, fileMap = {}, visited = new Set(), depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return fileMap;
  
  // Prevent revisiting the same index file
  if (visited.has(indexPath)) return fileMap;
  visited.add(indexPath);

  // Read index file contents
  if (!fs.existsSync(indexPath)) return fileMap;
  const content = fs.readFileSync(indexPath, 'utf-8');

  // Find all export declarations
  const exportMatches = [
    ...content.matchAll(/export\s+(?:\*|{[^}]*})\s*from\s+['"](.+)['"]/g),
    ...content.matchAll(/export\s+{[^}]*}\s*from\s+['"](.+)['"]/g)
  ];

  // Resolve and process each exported module
  for (const match of exportMatches) {
    const rawPath = match[1];
    const modulePath = rawPath.startsWith('.') 
      ? path.resolve(path.dirname(indexPath), rawPath)
      : path.resolve(srcDir, rawPath);
    
    // Normalize path
    const normalizedPath = modulePath.replace(/\.js$/, '');
    const jsPath = normalizedPath + '.js';

    // If it's a directory, look for its index file
    const indexInDir = path.join(normalizedPath, 'index.js');
    
    if (fs.existsSync(jsPath) && !fileMap[jsPath]) {
      // Add the module file
      fileMap[jsPath] = jsPath;
      
      // If it's a directory with an index, recursively collect its exports
      if (fs.existsSync(indexInDir)) {
        collectModules(indexInDir, fileMap, visited, depth + 1);
      }
    } else if (fs.existsSync(indexInDir)) {
      // Recursively collect exports from subdirectory index
      collectModules(indexInDir, fileMap, visited, depth + 1);
    }
  }

  return fileMap;
}

// Order modules based on index file export order
function orderModules(srcDir) {
  const indexPath = path.join(srcDir, 'index.js');
  const fileMap = collectModules(indexPath);
  
  // Convert to array and sort
  return Object.values(fileMap)
    .filter(filePath => !filePath.endsWith('index.js'));
}

// Sanitization presets
const sanitizationPresets = {
  // ES2020 sanitization - strips imports and optionally comments
  es2020: (code, options = {}) => {
    let result = code;
    
    // Strip import statements
    result = result
      .split('\n')
      .filter(line => !/^\s*import\b/.test(line))
      .join('\n');
    
    // Optionally strip comments
    if (options.stripComments) {
      // Strip block comments
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      // Strip line comments
      result = result.replace(/\/\/.*$/gm, '');
    }
    
    return result.trim();
  },
  
  // ES2015 sanitization - more conservative approach
  es2015: (code, options = {}) => {
    let result = code;
    
    // Strip import statements
    result = result
      .split('\n')
      .filter(line => !/^\s*import\b/.test(line))
      .join('\n');
      
    // Optionally strip comments
    if (options.stripComments) {
      // Strip block comments
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      // Strip line comments
      result = result.replace(/\/\/.*$/gm, '');
    }
    
    return result.trim();
  },
  
  // Minimal sanitization - only strips imports
  minimal: (code, options = {}) => {
    let result = code
      .split('\n')
      .filter(line => !/^\s*import\b/.test(line))
      .join('\n');
      
    return result.trim();
  }
};

// Generic sanitize function that uses the selected preset
function sanitizeCode(code, presetName, options = {}) {
  const sanitizer = sanitizationPresets[presetName] || sanitizationPresets.es2020;
  return sanitizer(code, options);
}

/**
 * Improved token estimation function supporting multiple LLM models
 * 
 * @param {string} text - The text to estimate tokens for
 * @param {string} model - Model identifier ('claude', 'gpt3', 'gpt4', etc.)
 * @return {number} Estimated token count
 */
function estimateTokens(text, model = 'claude') {
  // Basic character counting
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  
  // Model-specific token ratio estimations
  const modelRatios = {
    // Anthropic Claude models
    'claude': { 
      charRatio: 3.5,      // ~3.5 chars per token for Claude
      wordRatio: 0.75,     // ~0.75 words per token for Claude
    },
    // OpenAI models
    'gpt3': {
      charRatio: 4.0,      // ~4 chars per token for GPT-3
      wordRatio: 0.75,     // ~0.75 words per token for GPT-3
    },
    'gpt4': {
      charRatio: 3.8,      // ~3.8 chars per token for GPT-4
      wordRatio: 0.7,      // ~0.7 words per token for GPT-4
    },
    // Default fallback
    'default': {
      charRatio: 4.0,
      wordRatio: 0.75,
    }
  };
  
  // Get the appropriate ratio for the model
  const ratio = modelRatios[model] || modelRatios.default;
  
  // Estimate based on character count and word count, using an average of both methods
  const charBasedEstimate = Math.ceil(charCount / ratio.charRatio);
  const wordBasedEstimate = Math.ceil(wordCount / ratio.wordRatio);
  
  // Language features that tend to increase token count
  const codeFeatures = {
    symbols: (text.match(/[{}[\]()<>:;,."'`~!@#$%^&*+=|\\/?-]/g) || []).length,
    indentation: (text.match(/^ +/gm) || []).length,
    camelCase: (text.match(/[a-z][A-Z]/g) || []).length,
  };
  
  // Adjustment for code-specific features (symbols, indentation, camelCase)
  const codeAdjustment = codeFeatures.symbols * 0.1 + 
                          codeFeatures.indentation * 0.05 + 
                          codeFeatures.camelCase * 0.2;
  
  // Calculate weighted average with more weight on char-based for code
  const weightedEstimate = (charBasedEstimate * 0.7) + (wordBasedEstimate * 0.3);
  
  // Add code-specific adjustment
  const finalEstimate = Math.ceil(weightedEstimate + codeAdjustment);
  
  return finalEstimate;
}

// Main bundling function
function bundleLLMBuild(srcDir, outDir, outFile, options = {}) {
  const orderedFiles = orderModules(srcDir);
  const { verbose, stripComments, preset, model } = options;

  let output = '/**\n * bundle4llm Output\n';
  output += ` * Generated: ${new Date().toISOString()}\n`;
  output += ` * Source: ${srcDir}\n`;
  output += ` * Preset: ${preset}\n`;
  if (stripComments) output += ` * Comments: Stripped\n`;
  output += ` */\n\n`;

  let currentDir = '';
  for (const file of orderedFiles) {
    const fileDir = path.dirname(file).replace(srcDir, '');
    if (fileDir !== currentDir) {
      currentDir = fileDir;
      output += `\n// =========================================\n`;
      output += `// DIRECTORY: ${currentDir || '/'}\n`;
      output += `// =========================================\n\n`;
    }

    let contents = fs.readFileSync(file, 'utf-8');
    contents = sanitizeCode(contents, preset, { stripComments });
    
    if (verbose) console.log('📦 Including:', file);
    output += contents + '\n\n';
  }

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });
  
  // Write the bundled file
  const fullOutputPath = path.join(outDir, outFile);
  fs.writeFileSync(fullOutputPath, output);

  const totalTokens = estimateTokens(output, model).toLocaleString();
  console.log(`✅ Created LLM build → ${fullOutputPath}`);
  console.log(`📊 Total modules included: ${orderedFiles.length}`);
  console.log(`🔧 Preset: ${preset}${stripComments ? ', comments stripped' : ''}`);
  console.log(`🔍 Estimated tokens (${model}): ${totalTokens}`);
}

// Execute the bundle
bundleLLMBuild(srcDir, outDir, outFile, {
  verbose,
  stripComments,
  preset,
  model
});