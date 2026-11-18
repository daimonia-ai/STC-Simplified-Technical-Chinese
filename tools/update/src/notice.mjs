// The reminder that a newer STC release exists, shown by `stc check`.
//
// The check command only reads a small cache file. When the cache is old, it starts a background job
// that asks npm for the newest version, and it does not wait for the answer. A slow or missing network
// never slows a check, and every failure is silent: the reminder is optional.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOMEPAGE, PACKAGE, VERSION } from '../../meta.mjs';
import { compareVersions } from './version.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const LOOKUP = fileURLToPath(new URL('./latest-version.mjs', import.meta.url));
const HOUR = 60 * 60 * 1000;
// The cache is trusted for a day after a successful lookup, and for an hour after a failed one.
const FRESH_AFTER_SUCCESS = 24 * HOUR;
const FRESH_AFTER_FAILURE = HOUR;
const VERSION_FORMAT = /^\d+\.\d+\.\d+$/;
const OFF = new Set(['0', 'off', 'false', 'no']);
const ON = new Set(['1', 'on', 'true', 'yes']);

/**
 * Whether the reminder runs. STC_UPDATE_CHECK=0 turns it off and STC_UPDATE_CHECK=1 turns it on.
 * Without either, it runs everywhere except in a source checkout, which is for development.
 */
export function updateCheckEnabled(env = process.env, root = ROOT) {
  const setting = String(env.STC_UPDATE_CHECK ?? '').trim().toLowerCase();
  if (OFF.has(setting)) return false;
  if (ON.has(setting)) return true;
  if (env.NO_UPDATE_NOTIFIER) return false;
  return !existsSync(join(root, '.git'));
}

export const cacheFile = (env = process.env) => join(env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'stc', 'update-check.json');

/** Reads the cache. A missing or damaged file reads as "never checked". */
export function readCache(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return {
      checkedAt: Number(data.checkedAt) || 0,
      latest: VERSION_FORMAT.test(data.latest) ? data.latest : null,
      ok: data.ok === true,
    };
  } catch {
    return { checkedAt: 0, latest: null, ok: false };
  }
}

/** Writes the cache through a temporary file. Returns false when the folder cannot be written. */
export function writeCache(file, data) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}`;
    writeFileSync(temporary, JSON.stringify(data));
    renameSync(temporary, file);
    return true;
  } catch {
    return false;
  }
}

/** The reminder for a person: both versions, where to read what changed, and how to update. */
export function noticeFor(current, latest) {
  const notes = `${HOMEPAGE}/releases/tag/v${latest}`;
  const command = `npx --yes ${PACKAGE}@latest update`;
  return {
    current,
    latest,
    notes,
    command,
    message: [
      `STC 有新版本：${latest}，当前是 ${current}。`,
      `发布说明：${notes}`,
      `是否更新由用户决定。更新命令：${command}`,
      '更新会替换全局命令和个人目录里的 skill，旧目录备份在 ~/.stc-backups/。',
    ].join('\n'),
  };
}

function lookUpInBackground(file, env) {
  try {
    const job = spawn(process.execPath, [LOOKUP, file], { detached: true, stdio: 'ignore', env, windowsHide: true });
    job.on('error', () => {});
    job.unref();
  } catch { /* The reminder is optional. */ }
}

/**
 * Returns the reminder when the cache knows a newer release than `current`, and null otherwise.
 * It never waits for the network, never throws, and has no effect on the check result.
 */
export function updateNotice({
  env = process.env, now = Date.now(), current = VERSION, file = cacheFile(env), root = ROOT,
  lookUp = (target) => lookUpInBackground(target, env),
} = {}) {
  try {
    if (!updateCheckEnabled(env, root)) return null;
    const cache = readCache(file);
    const age = now - cache.checkedAt;
    // A cache dated in the future comes from a wrong clock, so it is old as well.
    const old = age >= (cache.ok ? FRESH_AFTER_SUCCESS : FRESH_AFTER_FAILURE) || age < -5 * 60 * 1000;
    // Record the attempt as a failure before the lookup starts: later runs do not start another one, and
    // a lookup that never finishes is tried again after an hour. A cache that cannot be written is
    // never looked up, because the answer could not be kept.
    if (old && writeCache(file, { checkedAt: now, latest: cache.latest, ok: false })) {
      try { lookUp(file); } catch { /* The reminder is optional. */ }
    }
    return cache.latest && compareVersions(cache.latest, current) > 0 ? noticeFor(current, cache.latest) : null;
  } catch {
    return null;
  }
}
