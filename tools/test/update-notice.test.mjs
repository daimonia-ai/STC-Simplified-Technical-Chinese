import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../meta.mjs';
import { noticeFor, readCache, updateCheckEnabled, updateNotice } from '../update/src/notice.mjs';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const job = fileURLToPath(new URL('../update/src/latest-version.mjs', import.meta.url));
const NOW = Date.UTC(2026, 10, 18, 12);
const HOUR = 60 * 60 * 1000;

const folder = (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-notice-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const seed = (file, data) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};
// Runs updateNotice as an installed copy of 0.4.1 would, and records the lookups it starts.
const ask = (file, extra = {}) => {
  const lookups = [];
  const notice = updateNotice({
    env: {}, root: join(tmpdir(), 'stc-no-such-checkout'), file, now: NOW, current: '0.4.1',
    lookUp: (target) => lookups.push(target), ...extra,
  });
  return { notice, lookups };
};
// A stand-in for npm: it records its arguments and prints `output`.
const fakeNpm = (dir, output = '', status = 0) => {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  const log = join(dir, 'npm-arguments.txt');
  writeFileSync(join(bin, 'npm'), `#!/bin/sh\necho "$@" >> "${log}"\n${output ? `echo '${output}'\n` : ''}exit ${status}\n`);
  chmodSync(join(bin, 'npm'), 0o755);
  return { bin, log };
};
const skipWindows = { skip: process.platform === 'win32' ? 'the stand-in for npm is a shell script' : false };

test('the reminder is on by default, off with STC_UPDATE_CHECK=0 or in a source checkout', (t) => {
  const installed = folder(t);
  const checkout = folder(t);
  mkdirSync(join(checkout, '.git'));
  assert.equal(updateCheckEnabled({}, installed), true);
  for (const off of ['0', 'off', 'false', 'no', 'OFF']) assert.equal(updateCheckEnabled({ STC_UPDATE_CHECK: off }, installed), false, off);
  assert.equal(updateCheckEnabled({ NO_UPDATE_NOTIFIER: '1' }, installed), false);
  assert.equal(updateCheckEnabled({}, checkout), false);
  assert.equal(updateCheckEnabled({ STC_UPDATE_CHECK: '1' }, checkout), true);
  assert.equal(updateCheckEnabled({ STC_UPDATE_CHECK: '1' }, installed), true);
});

test('a cold cache starts one background lookup, records the attempt and shows nothing yet', (t) => {
  const file = join(folder(t), 'cache/update-check.json');
  const { notice, lookups } = ask(file);
  assert.equal(notice, null);
  assert.deepEqual(lookups, [file]);
  assert.deepEqual(readCache(file), { checkedAt: NOW, latest: null, ok: false });
});

test('a recorded attempt is not repeated for an hour and is then tried again', (t) => {
  const file = join(folder(t), 'update-check.json');
  seed(file, { checkedAt: NOW, latest: null, ok: false });
  assert.equal(ask(file, { now: NOW + 59 * 60 * 1000 }).lookups.length, 0);
  assert.equal(ask(file, { now: NOW + 61 * 60 * 1000 }).lookups.length, 1);
});

test('a successful lookup is trusted for a day, and the old answer still shows while a new lookup runs', (t) => {
  const file = join(folder(t), 'update-check.json');
  seed(file, { checkedAt: NOW - 23 * HOUR, latest: '0.5.0', ok: true });
  const fresh = ask(file);
  assert.equal(fresh.notice.latest, '0.5.0');
  assert.equal(fresh.lookups.length, 0);

  seed(file, { checkedAt: NOW - 25 * HOUR, latest: '0.5.0', ok: true });
  const old = ask(file);
  assert.equal(old.notice.latest, '0.5.0');
  assert.equal(old.lookups.length, 1);
  // The attempt is recorded as a failure first, and keeps the old answer.
  assert.deepEqual(readCache(file), { checkedAt: NOW, latest: '0.5.0', ok: false });
});

test('there is no reminder when the running copy is current or newer', (t) => {
  const file = join(folder(t), 'update-check.json');
  for (const latest of ['0.4.1', '0.4.0', '0.3.9']) {
    seed(file, { checkedAt: NOW, latest, ok: true });
    assert.equal(ask(file).notice, null, latest);
  }
  seed(file, { checkedAt: NOW, latest: '0.10.0', ok: true });
  assert.equal(ask(file).notice.latest, '0.10.0');
});

test('damaged or odd cache content counts as never checked', (t) => {
  const file = join(folder(t), 'update-check.json');
  for (const content of ['not json', '[]', '{"latest":"abc"}', '{"latest":"1.2"}', '{"latest":"9.9.9; rm -rf /"}', '{"checkedAt":"x","latest":null}']) {
    seed(file, content);
    const { notice, lookups } = ask(file);
    assert.equal(notice, null, content);
    assert.equal(lookups.length, 1, content);
  }
});

test('a cache dated in the future comes from a wrong clock and is old', (t) => {
  const file = join(folder(t), 'update-check.json');
  seed(file, { checkedAt: NOW + 24 * HOUR, latest: '0.5.0', ok: true });
  assert.equal(ask(file).lookups.length, 1);
});

test('a cache folder that cannot be written is never looked up and does not fail', (t) => {
  const blocker = join(folder(t), 'a-file');
  writeFileSync(blocker, 'not a folder');
  const { notice, lookups } = ask(join(blocker, 'stc/update-check.json'));
  assert.equal(notice, null);
  assert.equal(lookups.length, 0);
});

test('a lookup that cannot start does not hide a reminder the cache already supports', (t) => {
  const file = join(folder(t), 'update-check.json');
  seed(file, { checkedAt: NOW - 30 * HOUR, latest: '0.5.0', ok: true });
  const { notice } = ask(file, { lookUp: () => { throw new Error('cannot start'); } });
  assert.equal(notice.latest, '0.5.0');
});

test('the reminder gives a person both versions, the release notes and the update command', () => {
  const notice = noticeFor('0.4.1', '0.5.0');
  assert.equal(notice.notes, 'https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/releases/tag/v0.5.0');
  assert.equal(notice.command, 'npx --yes @daimonia/stc@latest update');
  const lines = notice.message.split('\n');
  assert.equal(lines[0], 'STC 有新版本：0.5.0，当前是 0.4.1。');
  assert.ok(lines.some((line) => line.includes(notice.notes)));
  assert.ok(lines.some((line) => line.startsWith('是否更新由用户决定。') && line.includes(notice.command)));
  assert.ok(lines.some((line) => line.includes('~/.stc-backups/')));
});

test('the background job asks npm for the newest version and records it', skipWindows, (t) => {
  const dir = folder(t);
  const { bin, log } = fakeNpm(dir, '9.9.9');
  const file = join(dir, 'cache/update-check.json');
  const run = spawnSync(process.execPath, [job, file], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` } });
  assert.equal(run.status, 0);
  assert.equal(run.stdout + run.stderr, '');
  const cache = readCache(file);
  assert.equal(cache.latest, '9.9.9');
  assert.equal(cache.ok, true);
  assert.ok(Math.abs(cache.checkedAt - Date.now()) < 60 * 1000);
  assert.equal(readFileSync(log, 'utf8').trim(), 'view @daimonia/stc version');
});

test('the background job keeps the old record when npm fails or answers with something else', skipWindows, (t) => {
  const dir = folder(t);
  const file = join(dir, 'update-check.json');
  const before = { checkedAt: NOW, latest: '0.5.0', ok: false };
  for (const [output, status] of [['', 1], ['<html>blocked</html>', 0], ['1.2', 0], ['9.9.9 beta', 0], ['', 0]]) {
    seed(file, before);
    const { bin } = fakeNpm(join(dir, `${status}-${output.length}`), output, status);
    const run = spawnSync(process.execPath, [job, file], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` } });
    assert.equal(run.status, 0);
    assert.deepEqual(readCache(file), before, `${output}/${status}`);
  }
});

test('the background job without a cache path exits quietly', () => {
  const run = spawnSync(process.execPath, [job], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.equal(run.stdout + run.stderr, '');
});

// The command line, with a cache that already knows a newer release. STC_UPDATE_CHECK=1 turns the
// reminder on although the tests run in a source checkout.
const withCache = (t, extra = {}) => {
  const dir = folder(t);
  const cacheHome = join(dir, 'cache');
  seed(join(cacheHome, 'stc/update-check.json'), { checkedAt: Date.now(), latest: '99.0.0', ok: true });
  writeFileSync(join(dir, 'doc.md'), '本周上线了导出功能。\n');
  const env = { ...process.env, STC_UPDATE_CHECK: '1', XDG_CACHE_HOME: cacheHome, ...extra };
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env, cwd: dir });
  return { dir, cacheHome, env, run };
};

test('the text report shows the reminder in its first lines', (t) => {
  const { run } = withCache(t);
  const result = run('check', 'doc.md', '--profile', 'for-document');
  assert.equal(result.status, 0);
  const head = result.stdout.split('\n').slice(0, 9).join('\n');
  assert.match(head, new RegExp(`STC 有新版本：99\\.0\\.0，当前是 ${VERSION.replaceAll('.', '\\.')}。`));
  assert.match(head, /是否更新由用户决定。更新命令：npx --yes @daimonia\/stc@latest update/);
  assert.equal(result.stderr, '');
});

test('with findings in the text, the reminder still comes before them', (t) => {
  const { dir, run } = withCache(t);
  writeFileSync(join(dir, 'problem.md'), '本周我们进行了大量优化。\n');
  const result = run('check', 'problem.md', '--profile', 'for-document');
  assert.equal(result.status, 1);
  const reminder = result.stdout.indexOf('STC 有新版本');
  assert.ok(reminder > 0);
  assert.ok(reminder < result.stdout.indexOf('原文：'));
  assert.ok(reminder < result.stdout.indexOf('主要问题：'));
});

test('the JSON report carries the reminder as its first field and stays valid JSON', (t) => {
  const { run } = withCache(t);
  const result = run('check', 'doc.md', '--profile', 'for-document', '--json');
  const report = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(report).slice(0, 4), ['update', 'errors', 'warnings', 'files']);
  assert.equal(report.update.latest, '99.0.0');
  assert.equal(report.update.current, VERSION);
  assert.equal(report.update.command, 'npx --yes @daimonia/stc@latest update');
  assert.match(report.update.message, /^STC 有新版本：99\.0\.0/);
  assert.equal(result.stderr, '');
});

test('a Markdown report stays clean and the reminder goes to the terminal', (t) => {
  const { run } = withCache(t);
  const result = run('check', 'doc.md', '--profile', 'for-document', '--format', 'markdown');
  assert.doesNotMatch(result.stdout, /STC 有新版本/);
  assert.match(result.stderr, /STC 有新版本：99\.0\.0/);
});

test('the reminder never changes the exit code', (t) => {
  const { run } = withCache(t);
  const failing = spawnSync(process.execPath, [cli, 'check', '--profile', 'for-document'], {
    input: '本周我们进行了大量优化。\n', encoding: 'utf8', env: { ...process.env, STC_UPDATE_CHECK: '1', XDG_CACHE_HOME: join(folder(t), 'cache') },
  });
  assert.equal(failing.status, 1);
  assert.equal(run('check', 'doc.md', '--profile', 'for-document').status, 0);
  assert.equal(run('check', 'no-such-file.md').status, 2);
});

test('STC_UPDATE_CHECK=0 shows no reminder and adds no field', (t) => {
  const { run } = withCache(t, { STC_UPDATE_CHECK: '0' });
  assert.doesNotMatch(run('check', 'doc.md', '--profile', 'for-document').stdout, /STC 有新版本/);
  assert.equal('update' in JSON.parse(run('check', 'doc.md', '--profile', 'for-document', '--json').stdout), false);
});

test('other commands print no reminder, and the help names the switch', (t) => {
  const { run } = withCache(t);
  assert.equal(run('--version').stdout, `${VERSION}\n`);
  assert.doesNotMatch(run('--help').stdout, /STC 有新版本/);
  const help = run('check', '--help').stdout;
  assert.match(help, /STC_UPDATE_CHECK=0/);
  assert.doesNotMatch(help, /STC 有新版本：/);
});

test('in a source checkout the reminder is off by default and leaves no cache', (t) => {
  const dir = folder(t);
  const cacheHome = join(dir, 'cache');
  writeFileSync(join(dir, 'doc.md'), '本周上线了导出功能。\n');
  const env = { ...process.env, XDG_CACHE_HOME: cacheHome };
  delete env.STC_UPDATE_CHECK;
  const result = spawnSync(process.execPath, [cli, 'check', 'doc.md', '--profile', 'for-document', '--json'], { encoding: 'utf8', env, cwd: dir });
  assert.equal('update' in JSON.parse(result.stdout), false);
  assert.equal(existsSync(cacheHome), false);
});

test('from a cold cache the first run shows nothing, then the background lookup makes the next run show it', skipWindows, async (t) => {
  const dir = folder(t);
  const cacheHome = join(dir, 'cache');
  const { bin, log } = fakeNpm(dir, '99.0.0');
  writeFileSync(join(dir, 'doc.md'), '本周上线了导出功能。\n');
  const env = { ...process.env, STC_UPDATE_CHECK: '1', XDG_CACHE_HOME: cacheHome, PATH: `${bin}${delimiter}${process.env.PATH}` };
  const run = () => spawnSync(process.execPath, [cli, 'check', 'doc.md', '--profile', 'for-document'], { encoding: 'utf8', env, cwd: dir });
  const file = join(cacheHome, 'stc/update-check.json');

  const first = run();
  assert.equal(first.status, 0);
  assert.doesNotMatch(first.stdout, /STC 有新版本/);
  // The attempt is on record at once, whether or not the lookup has finished.
  assert.ok(existsSync(file));

  const deadline = Date.now() + 15000;
  while (!readCache(file).ok && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(readCache(file).latest, '99.0.0');

  const second = run();
  assert.match(second.stdout, /STC 有新版本：99\.0\.0/);
  // One lookup only: the later run used the cache.
  assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 1);
});
