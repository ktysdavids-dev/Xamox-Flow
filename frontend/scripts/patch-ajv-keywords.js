#!/usr/bin/env node
'use strict';
const path = require('path');
const fs   = require('fs');

const nodeModules = path.join(__dirname, '../node_modules');
if (!fs.existsSync(nodeModules)) process.exit(0);

// ── 1. Patch _formatLimit.js (ajv-keywords 3.x) ────────────────────────
// Prevents "Cannot read properties of undefined (reading 'date')"
function walkDir(dir, cb) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walkDir(full, cb);
      else cb(full);
    }
  } catch (_) {}
}

walkDir(nodeModules, (file) => {
  if (!file.endsWith(path.join('ajv-keywords', 'keywords', '_formatLimit.js'))) return;
  try {
    let c = fs.readFileSync(file, 'utf8');
    if (c.includes("if (!formats || typeof formats !== 'object') return;")) return;
    c = c.replace(
      /function extendFormats\(ajv\) \{\s*\n\s*var formats = ajv\._formats;/,
      "function extendFormats(ajv) {\n  var formats = ajv._formats;\n  if (!formats || typeof formats !== 'object') return;"
    );
    fs.writeFileSync(file, c);
    console.log('[patch-ajv] Patched _formatLimit.js:', file);
  } catch (_) {}
});

// ── 2. Patch ajv-keywords 3.x index.js ─────────────────────────────────
// Wraps the `get()` function so unknown keywords (like formatMinimum on
// ajv 8) don't crash the build — they just become no-ops.
walkDir(nodeModules, (file) => {
  if (!/ajv-keywords[/\\]index\.js$/.test(file)) return;
  // Only patch the v3.x CommonJS entry (not dist/index.js from v5)
  if (file.includes(path.join('dist', 'index.js'))) return;
  try {
    let c = fs.readFileSync(file, 'utf8');
    if (c.includes('PATCHED_UNKNOWN_KW')) return;
    // The original throws: throw new Error("Unknown keyword " + keyword)
    // We replace with a silent skip.
    c = c.replace(
      /throw new Error\("Unknown keyword " \+ keyword\)/g,
      '/* PATCHED_UNKNOWN_KW */ return'
    );
    if (c.includes('PATCHED_UNKNOWN_KW')) {
      fs.writeFileSync(file, c);
      console.log('[patch-ajv] Patched unknown-keyword throw:', file);
    }
  } catch (_) {}
});

// Also patch the dist/ variant (ajv-keywords 5.x bundled via schema-utils)
walkDir(nodeModules, (file) => {
  if (!file.endsWith(path.join('ajv-keywords', 'dist', 'index.js'))) return;
  try {
    let c = fs.readFileSync(file, 'utf8');
    if (c.includes('PATCHED_UNKNOWN_KW')) return;
    c = c.replace(
      /throw new Error\("Unknown keyword " \+ keyword\)/g,
      '/* PATCHED_UNKNOWN_KW */ return'
    );
    c = c.replace(
      /throw new Error\(`Unknown keyword `\s*\+\s*keyword\)/g,
      '/* PATCHED_UNKNOWN_KW */ return'
    );
    if (c.includes('PATCHED_UNKNOWN_KW')) {
      fs.writeFileSync(file, c);
      console.log('[patch-ajv] Patched dist/index.js:', file);
    }
  } catch (_) {}
});

console.log('[patch-ajv] Done.');
