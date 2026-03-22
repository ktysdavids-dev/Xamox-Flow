#!/usr/bin/env node
/**
 * Craco usa lodash.mergeWith; si lodash quedó vacío/corrupto en node_modules, craco start falla.
 * Este script se ejecuta desde arranque_node.sh y reinstala lodash si hace falta.
 */
const { execSync } = require("child_process");
const path = require("path");

function mergeWithOk() {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const _ = require("lodash");
    return typeof _.mergeWith === "function";
  } catch {
    return false;
  }
}

if (mergeWithOk()) {
  process.exit(0);
}

console.warn("[xamox] lodash.mergeWith no disponible — reinstalando lodash…");
const root = path.join(__dirname, "..");
try {
  execSync("npm install lodash@4.17.21 --no-fund --no-audit --ignore-scripts", {
    cwd: root,
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}

if (!mergeWithOk()) {
  console.error("[xamox] Sigue fallando lodash. Prueba: cd frontend && rm -rf node_modules && npm install");
  process.exit(1);
}
