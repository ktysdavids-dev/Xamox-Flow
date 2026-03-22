/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const requiredFiles = [
  'index.html',
  'manifest.json',
  'sw.js',
  'logo-xamox.png',
  'dj-alka-logo.png',
  'icon-192.png',
  'icon-512.png',
  'music/electronic_main.mp3',
  'music/electronic_game.mp3',
  'music/electronic_victory.mp3',
  'music/pop_main.mp3',
  'music/pop_game.mp3',
  'music/pop_victory.mp3',
];

function exists(relPath) {
  return fs.existsSync(path.join(publicDir, relPath));
}

function readText(relPath) {
  return fs.readFileSync(path.join(publicDir, relPath), 'utf8');
}

let hasErrors = false;

console.log('== Xamox Flow Release Check ==\n');

for (const relPath of requiredFiles) {
  const ok = exists(relPath);
  console.log(`${ok ? 'OK ' : 'ERR'}  ${relPath}`);
  if (!ok) hasErrors = true;
}

console.log('\n-- Validating manifest --');
try {
  const manifest = JSON.parse(readText('manifest.json'));
  const iconList = Array.isArray(manifest.icons) ? manifest.icons : [];
  const has192 = iconList.some((icon) => icon.src === '/icon-192.png');
  const has512 = iconList.some((icon) => icon.src === '/icon-512.png');
  const displayMode = manifest.display;
  console.log(`${has192 ? 'OK ' : 'ERR'}  manifest icon 192`);
  console.log(`${has512 ? 'OK ' : 'ERR'}  manifest icon 512`);
  console.log(`${displayMode === 'standalone' ? 'OK ' : 'ERR'}  manifest display standalone`);
  if (!has192 || !has512 || displayMode !== 'standalone') hasErrors = true;
} catch (err) {
  console.log('ERR  manifest.json invalid:', err.message);
  hasErrors = true;
}

console.log('\n-- Validating service worker --');
try {
  const sw = readText('sw.js');
  const hasFetchHandler = sw.includes("self.addEventListener('fetch'");
  const hasStaticCache = sw.includes('STATIC_CACHE');
  console.log(`${hasFetchHandler ? 'OK ' : 'ERR'}  fetch strategy present`);
  console.log(`${hasStaticCache ? 'OK ' : 'ERR'}  cache versioning present`);
  if (!hasFetchHandler || !hasStaticCache) hasErrors = true;
} catch (err) {
  console.log('ERR  sw.js read failed:', err.message);
  hasErrors = true;
}

console.log('\n-- Environment sanity --');
const envLocal = path.join(root, '.env.local');
if (!fs.existsSync(envLocal)) {
  console.log('WARN  .env.local not found (needed for API base URL)');
} else {
  const env = fs.readFileSync(envLocal, 'utf8');
  const hasBackendUrl = /REACT_APP_BACKEND_URL=/.test(env);
  console.log(`${hasBackendUrl ? 'OK ' : 'WARN'}  REACT_APP_BACKEND_URL configured`);
}

console.log('\n==============================');
if (hasErrors) {
  console.log('Release check FAILED. Fix ERR items before Play submission.');
  process.exit(1);
}
console.log('Release check PASSED. Ready for production packaging.');
