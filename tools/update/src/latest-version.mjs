// Background job of the update reminder: asks npm for the newest STC version and records it.
// `stc check` starts this job and does not wait for it. It prints nothing and fails silently.
// Usage: node latest-version.mjs <cache-file>
import { spawnSync } from 'node:child_process';
import { PACKAGE } from '../../meta.mjs';
import { writeCache } from './notice.mjs';

const file = process.argv[2];
if (file) {
  // The same command as `stc update`, so npm's registry and proxy settings apply.
  const run = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['view', PACKAGE, 'version'], {
    encoding: 'utf8', timeout: 60000, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'],
  });
  const latest = run.status === 0 ? String(run.stdout).trim() : '';
  if (/^\d+\.\d+\.\d+$/.test(latest)) writeCache(file, { checkedAt: Date.now(), latest, ok: true });
}
