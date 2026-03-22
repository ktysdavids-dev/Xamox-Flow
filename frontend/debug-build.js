const cp = require('child_process');
const origSpawnSync = cp.spawnSync;
cp.spawnSync = function(cmd, args, opts) {
  console.error(`[SPAWNSYNC] cmd=${cmd} args=${JSON.stringify(args)} cwd=${opts && opts.cwd || 'inherit'}`);
  const r = origSpawnSync.call(this, cmd, args, opts);
  console.error(`[SPAWNSYNC] → status=${r.status} signal=${r.signal}`);
  return r;
};

const origExecSync = cp.execSync;
cp.execSync = function(cmd, opts) {
  console.error(`[EXECSYNC] cmd=${cmd}`);
  const r = origExecSync.call(this, cmd, opts);
  console.error(`[EXECSYNC] → done`);
  return r;
};

require('@craco/craco/dist/scripts/build');
