import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../meta.mjs';
import { skillFiles } from '../skill-files.mjs';
import { runInit } from '../init/src/init.mjs';
import { compareVersions, findProjectSkill, runUpdate, skillVersion } from '../update/src/update.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = join(root, 'tools/cli.mjs');
const tmp = () => realpathSync(mkdtempSync(join(tmpdir(), 'stc-update-')));
const read = (...parts) => readFileSync(join(...parts), 'utf8');

// Installs a copy of the current skill and pretends it is another version.
function makeSkill(dir, version, extra = {}) {
  for (const file of skillFiles(root)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), readFileSync(join(root, file)));
  }
  const meta = join(dir, 'tools/meta.mjs');
  writeFileSync(meta, read(meta).replace(/VERSION = '[^']+'/, `VERSION = '${version}'`));
  for (const [file, text] of Object.entries(extra)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), text);
  }
}

// npm stand-in: latest is the version npm reports; globalRoot is what `npm root -g` prints.
function fakeNpm({ latest = VERSION, globalRoot = '/nonexistent-global-root', installStatus = 0 } = {}) {
  const calls = [];
  const npm = (args) => {
    calls.push(args.join(' '));
    if (args[0] === 'view') return latest ? { status: 0, stdout: `${latest}\n` } : { status: 1, stdout: '', stderr: 'network' };
    if (args[0] === 'root') return { status: 0, stdout: `${globalRoot}\n` };
    if (args[0] === 'install') return { status: installStatus, stdout: '', stderr: 'install failed' };
    return { status: 1, stdout: '' };
  };
  return { npm, calls };
}

function update(argv, opts) {
  const out = [];
  const code = runUpdate(argv, { root, log: (s) => out.push(s), error: (s) => out.push(s), ...opts });
  return { code, out: out.join('\n') };
}

test('outdated global skills are replaced, backed up, and keep files STC does not ship', () => {
  const home = tmp();
  const cwd = tmp();
  makeSkill(join(home, '.agents/skills/stc'), '0.2.2', { 'notes/team-terms.yaml': 'terms: []\n' });
  makeSkill(join(home, '.hermes/skills/stc'), '0.2.2');
  writeFileSync(join(home, '.hermes/skills/stc/rules/for-all.md'), '旧规则\n');
  makeSkill(join(home, '.claude/skills/stc'), VERSION);

  const { code, out } = update([], { home, cwd, npm: fakeNpm().npm });
  assert.equal(code, 0);
  for (const d of ['.agents/skills/stc', '.hermes/skills/stc', '.claude/skills/stc']) {
    assert.equal(skillVersion(join(home, d)), VERSION, d);
    assert.equal(read(home, d, 'rules/for-all.md'), read(root, 'rules/for-all.md'), d);
  }
  assert.equal(read(home, '.agents/skills/stc/notes/team-terms.yaml'), 'terms: []\n');
  assert.match(out, /~\/\.agents\/skills\/stc：0\.2\.2 → .*保留 1 个自有文件/);
  assert.match(out, new RegExp(`~/\\.claude/skills/stc：已是 ${VERSION.replaceAll('.', '\\.')}`));

  const backups = readdirSync(join(home, '.stc-backups'));
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^stc-0\.2\.2-\d{8}-\d{6}$/);
  const saved = join(home, '.stc-backups', backups[0]);
  assert.equal(read(saved, '.hermes-skills-stc/rules/for-all.md'), '旧规则\n');
  assert.equal(skillVersion(join(saved, '.agents-skills-stc')), '0.2.2');
  assert.ok(!existsSync(join(saved, '.claude-skills-stc')));
  assert.ok(!readdirSync(join(home, '.agents/skills')).some((n) => n.includes('stc-update-')));
});

test('links, unrelated folders, and newer skills are left unchanged', () => {
  const home = tmp();
  const target = tmp();
  makeSkill(target, '0.2.2');
  mkdirSync(join(home, '.claude/skills'), { recursive: true });
  symlinkSync(target, join(home, '.claude/skills/stc'));
  mkdirSync(join(home, '.agents/skills/stc'), { recursive: true });
  writeFileSync(join(home, '.agents/skills/stc/SKILL.md'), '---\nname: other\n---\n');
  makeSkill(join(home, '.codex/skills/stc'), '9.9.9');

  const { code, out } = update([], { home, cwd: tmp(), npm: fakeNpm().npm });
  assert.equal(code, 0);
  assert.equal(skillVersion(target), '0.2.2');
  assert.equal(read(home, '.agents/skills/stc/SKILL.md'), '---\nname: other\n---\n');
  assert.equal(skillVersion(join(home, '.codex/skills/stc')), '9.9.9');
  assert.match(out, /\.claude\/skills\/stc：是链接，未改动/);
  assert.match(out, /\.agents\/skills\/stc：不是 STC skill，未改动/);
  assert.match(out, /\.codex\/skills\/stc：已是 9\.9\.9，比当前程序新，未改动/);
  assert.ok(!existsSync(join(home, '.stc-backups')));
});

test('--check and --dry-run report outdated skills without writing', () => {
  const home = tmp();
  makeSkill(join(home, '.agents/skills/stc'), '0.2.2');
  const dry = update(['--dry-run'], { home, cwd: tmp(), npm: fakeNpm().npm });
  assert.equal(dry.code, 0);
  assert.match(dry.out, /将移到/);
  assert.match(dry.out, /预演，未写入文件/);
  assert.equal(update(['--check'], { home, cwd: tmp(), npm: fakeNpm().npm }).code, 1);
  assert.equal(skillVersion(join(home, '.agents/skills/stc')), '0.2.2');
  assert.ok(!existsSync(join(home, '.stc-backups')));

  update([], { home, cwd: tmp(), npm: fakeNpm().npm });
  assert.equal(update(['--check'], { home, cwd: tmp(), npm: fakeNpm().npm }).code, 0);
});

test('a global CLI with a newer npm version is installed, then the new version refreshes the skills', () => {
  const { npm, calls } = fakeNpm({ latest: '9.9.9', globalRoot: dirname(realpathSync(root)) });
  const reexecs = [];
  const { code, out } = update(['--skills', 'vendor/stc'], {
    home: tmp(), cwd: tmp(), npm, reexec: (args) => { reexecs.push(args); return 0; },
  });
  assert.equal(code, 0);
  assert.ok(calls.includes('install -g @daimonia/stc@9.9.9'));
  assert.deepEqual(reexecs, [['--no-cli', '--skills', 'vendor/stc']]);
  assert.match(out, new RegExp(`命令行：全局安装的 ${VERSION.replaceAll('.', '\\.')} → 9\\.9\\.9，已更新`));

  const failed = fakeNpm({ latest: '9.9.9', globalRoot: dirname(realpathSync(root)), installStatus: 1 });
  assert.equal(update([], { home: tmp(), cwd: tmp(), npm: failed.npm, reexec: () => 0 }).code, 1);
});

test('a run from npx also updates an older global command, then refreshes skills itself', () => {
  // A global install of an older version, next to the latest version running from npx.
  const globalRoot = tmp();
  const installed = (version) => {
    mkdirSync(join(globalRoot, '@daimonia/stc'), { recursive: true });
    writeFileSync(join(globalRoot, '@daimonia/stc/package.json'), JSON.stringify({ name: '@daimonia/stc', version }));
  };
  installed('0.3.1');
  const home = tmp();
  makeSkill(join(home, '.agents/skills/stc'), '0.3.1');

  const check = fakeNpm({ globalRoot });
  const checked = update(['--check'], { home, cwd: tmp(), npm: check.npm });
  assert.equal(checked.code, 1);
  assert.match(checked.out, new RegExp(`命令行：全局安装的 0\\.3\\.1 → ${VERSION.replaceAll('.', '\\.')}，可以更新`));
  assert.ok(!check.calls.some((c) => c.startsWith('install')));

  const run = fakeNpm({ globalRoot });
  const { code, out } = update([], { home, cwd: tmp(), npm: run.npm, reexec: () => assert.fail('must not re-run') });
  assert.equal(code, 0);
  assert.ok(run.calls.includes(`install -g @daimonia/stc@${VERSION}`));
  assert.match(out, new RegExp(`命令行：全局安装的 0\\.3\\.1 → ${VERSION.replaceAll('.', '\\.')}，已更新`));
  assert.equal(skillVersion(join(home, '.agents/skills/stc')), VERSION);

  installed(VERSION);
  const current = fakeNpm({ globalRoot });
  assert.match(update([], { home, cwd: tmp(), npm: current.npm }).out, new RegExp(`命令行：已是 ${VERSION.replaceAll('.', '\\.')}`));
  assert.ok(!current.calls.some((c) => c.startsWith('install')));

  // An npx run older than npm's latest hands the skills to the newly installed global version.
  installed('0.3.1');
  const roots = [];
  const older = update([], { home, cwd: tmp(), npm: fakeNpm({ latest: '9.9.9', globalRoot }).npm, reexec: (args, cliRoot) => { roots.push(cliRoot); return 0; } });
  assert.equal(older.code, 0);
  assert.deepEqual(roots, [join(globalRoot, '@daimonia/stc')]);
});

test('a non-global CLI does not install, and an unreachable registry still refreshes skills', () => {
  const home = tmp();
  makeSkill(join(home, '.agents/skills/stc'), '0.2.2');
  const local = fakeNpm({ latest: '9.9.9' });
  const first = update([], { home, cwd: tmp(), npm: local.npm, reexec: () => assert.fail('must not re-run') });
  assert.equal(first.code, 0);
  assert.ok(!local.calls.some((c) => c.startsWith('install')));
  assert.match(first.out, /不是全局安装.*npx --yes @daimonia\/stc@latest update/);
  assert.equal(skillVersion(join(home, '.agents/skills/stc')), VERSION);

  const home2 = tmp();
  makeSkill(join(home2, '.claude/skills/stc'), '0.2.2');
  const offline = update([], { home: home2, cwd: tmp(), npm: fakeNpm({ latest: '' }).npm });
  assert.equal(offline.code, 0);
  assert.match(offline.out, /查不到 npm 上的最新版本/);
  assert.equal(skillVersion(join(home2, '.claude/skills/stc')), VERSION);
});

test('the project skill is refreshed in its custom directory and keeps enabled default rules', () => {
  const cwd = tmp();
  assert.equal(runInit(['--defaults', '--dir', 'vendor/stc'], { cwd, log: () => {}, error: () => {} }), 0);
  assert.equal(findProjectSkill(cwd), 'vendor/stc');
  writeFileSync(join(cwd, 'vendor/stc/rules/for-all.md'), '旧规则\n');

  const { code, out } = update(['--no-cli'], { home: tmp(), cwd });
  assert.equal(code, 0);
  assert.equal(read(cwd, 'vendor/stc/rules/for-all.md'), read(root, 'rules/for-all.md'));
  assert.match(read(cwd, 'AGENTS.md'), /stc:mode=default/);
  assert.match(out, /当前项目：vendor\/stc\/：更新 1 个文件/);
  assert.match(update(['--no-cli'], { home: tmp(), cwd }).out, /当前项目：vendor\/stc\/ 已是/);
  assert.match(update(['--no-cli'], { home: tmp(), cwd: tmp() }).out, /当前项目：没有安装 STC/);
});

test('version comparison and CLI entry', () => {
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
  assert.equal(compareVersions('0.3.1', '0.3.1'), 0);
  assert.equal(compareVersions('0.2.2', '0.3.0'), -1);
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.match(help.stdout, /update/);
  const bad = spawnSync(process.execPath, [cli, 'update', '--skills'], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
});
