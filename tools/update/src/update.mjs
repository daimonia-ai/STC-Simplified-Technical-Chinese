// The update command: updates the global CLI, then refreshes global skill copies and the current project's skill.
// Old skill folders are moved to ~/.stc-backups before the new files take their place.
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CMD, PACKAGE, VERSION } from '../../meta.mjs';
import { skillFiles } from '../../skill-files.mjs';
import { applyInit, describeFiles, planInit } from '../../init/src/init.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
export const GLOBAL_SKILL_DIRS = ['.agents/skills/stc', '.claude/skills/stc', '.codex/skills/stc', '.hermes/skills/stc'];
const START = '<!-- stc:start -->';
const END = '<!-- stc:end -->';

export const updateHelp = () => `用法：${CMD} update [选项]

把 STC 更新到 npm 上的最新版本：
  1. 全局安装的 ${CMD} 命令有新版本时，用 npm 更新
  2. 更新个人目录里的全局 skill：${GLOBAL_SKILL_DIRS.map((d) => `~/${d}`).join('、')}
  3. 当前目录装过 STC 时，刷新项目里的 skill，保留默认规则设置
旧的 skill 目录移到 ~/.stc-backups/。目录里不属于 STC 的文件会复制到新目录。

选项：
  --check          只核对版本，不修改；有需要更新的内容时返回 1
  --dry-run        列出要做的修改，不写入
  --skills <目录>  另外更新一个 skill 目录，可重复使用
  --no-cli         不更新全局命令
  --help           显示本说明`;

const toPosix = (p) => p.split(sep).join('/');

export function compareVersions(a, b) {
  const pa = String(a).split('-')[0].split('.').map(Number);
  const pb = String(b).split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

// Returns the version of an installed STC skill, or null when the folder is not an STC skill.
export function skillVersion(dir) {
  const skill = join(dir, 'SKILL.md');
  const meta = join(dir, 'tools/meta.mjs');
  if (!existsSync(skill) || !existsSync(meta)) return null;
  if (!/^name:\s*stc\s*$/m.test(readFileSync(skill, 'utf8').split('\n---')[0])) return null;
  return readFileSync(meta, 'utf8').match(/VERSION = '([^']+)'/)?.[1] ?? null;
}

const npmDefault = (args) => spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
  encoding: 'utf8', timeout: 120000, shell: process.platform === 'win32',
});

// Finds the skill path that init wrote into AGENTS.md or CLAUDE.md of the project.
export function findProjectSkill(cwd) {
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const path = join(cwd, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    const start = text.indexOf(START);
    const end = start === -1 ? -1 : text.indexOf(END, start);
    if (end === -1) continue;
    const found = text.slice(start, end).match(/`([^`\n]+)\/SKILL\.md`/);
    if (found) return found[1];
  }
  return null;
}

// Plans the replacement of one skill folder. Files that STC does not ship are kept.
function planSkill(dir, label, { root, home, stamp }) {
  const base = { dir, label };
  if (!existsSync(dir)) return { ...base, status: 'missing' };
  if (lstatSync(dir).isSymbolicLink()) return { ...base, status: 'link' };
  if (realpathSync(dir) === realpathSync(root)) return { ...base, status: 'source' };
  const from = skillVersion(dir);
  if (!from) return { ...base, status: 'not-stc' };
  if (compareVersions(from, VERSION) > 0) return { ...base, status: 'newer', from };
  const shipped = skillFiles(root);
  const changed = shipped.some((file) => {
    const to = join(dir, file);
    return !existsSync(to) || !readFileSync(to).equals(readFileSync(join(root, file)));
  });
  if (!changed) return { ...base, status: 'current', from };
  const shippedSet = new Set(shipped.map(toPosix));
  const walk = (rel) => readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? join(rel, e.name) : e.name;
    return e.isDirectory() ? walk(r) : [r];
  });
  const extras = walk('').filter((file) => !shippedSet.has(toPosix(file)));
  const backup = join(home, '.stc-backups', `stc-${from}-${stamp}`, label.replace(/^~\//, '').replaceAll('/', '-'));
  return { ...base, status: 'update', from, extras, backup };
}

function applySkill(plan, root) {
  const fresh = `${plan.dir}.stc-update-${process.pid}`;
  rmSync(fresh, { recursive: true, force: true });
  for (const file of skillFiles(root)) {
    mkdirSync(dirname(join(fresh, file)), { recursive: true });
    writeFileSync(join(fresh, file), readFileSync(join(root, file)));
  }
  for (const file of plan.extras) {
    mkdirSync(dirname(join(fresh, file)), { recursive: true });
    cpSync(join(plan.dir, file), join(fresh, file));
  }
  if (existsSync(plan.backup)) plan.backup += `-${process.pid}`;
  mkdirSync(dirname(plan.backup), { recursive: true });
  try {
    renameSync(plan.dir, plan.backup);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    cpSync(plan.dir, plan.backup, { recursive: true });
    rmSync(plan.dir, { recursive: true, force: true });
  }
  renameSync(fresh, plan.dir);
}

function describeSkill(plan, { dryRun, tilde }) {
  const name = plan.label;
  switch (plan.status) {
    case 'link': return `${name}：是链接，未改动。`;
    case 'source': return `${name}：就是当前程序目录，不用更新。`;
    case 'not-stc': return `${name}：不是 STC skill，未改动。`;
    case 'newer': return `${name}：已是 ${plan.from}，比当前程序新，未改动。`;
    case 'current': return `${name}：已是 ${VERSION}。`;
    default: {
      const kept = plan.extras.length ? `；保留 ${plan.extras.length} 个自有文件` : '';
      return dryRun
        ? `${name}：${plan.from} → ${VERSION}，旧版将移到 ${tilde(plan.backup)}${kept}。`
        : `${name}：${plan.from} → ${VERSION}，旧版已移到 ${tilde(plan.backup)}${kept}。`;
    }
  }
}

// Returns the exit code: 0 done, 1 failed or (with --check) outdated, 2 bad arguments.
export function runUpdate(argv, {
  cwd = process.cwd(), home = homedir(), root = ROOT, npm = npmDefault,
  reexec = (args) => spawnSync(process.execPath, [join(root, 'tools/cli.mjs'), 'update', ...args], { stdio: 'inherit' }).status ?? 1,
  log = console.log, error = console.error,
} = {}) {
  const opts = { check: false, dryRun: false, cli: true, skills: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      log(updateHelp());
      return 0;
    }
    if (a === '--check') opts.check = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--no-cli') opts.cli = false;
    else if (a === '--skills') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) {
        error('--skills 后面要写目录。');
        return 2;
      }
      opts.skills.push(argv[++i]);
    } else {
      error(`未知选项：${a}\n\n${updateHelp()}`);
      return 2;
    }
  }
  const readOnly = opts.check || opts.dryRun;
  const tilde = (p) => {
    const rel = relative(home, p);
    return rel && !rel.startsWith('..') && !isAbsolute(rel) ? `~/${toPosix(rel)}` : toPosix(p);
  };
  let outdated = false;
  // One backup folder per run, named by local time.
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  try {
    // 1. Global command.
    if (opts.cli) {
      const latestRun = npm(['view', PACKAGE, 'version']);
      const latest = latestRun.status === 0 ? latestRun.stdout.trim() : '';
      const rootRun = npm(['root', '-g']);
      const globalRoot = rootRun.status === 0 && existsSync(rootRun.stdout.trim()) ? realpathSync(rootRun.stdout.trim()) : '';
      const isGlobal = Boolean(globalRoot) && realpathSync(root).startsWith(globalRoot + sep);
      if (!latest) {
        log(`命令行：${VERSION}。查不到 npm 上的最新版本，按当前版本刷新 skill。`);
      } else if (compareVersions(latest, VERSION) <= 0) {
        log(`命令行：已是 ${VERSION}。`);
      } else if (!isGlobal) {
        outdated = true;
        log(`命令行：当前程序 ${VERSION} 不是全局安装，npm 上有 ${latest}。运行 npx --yes ${PACKAGE}@latest update 可用新版完成更新。`);
      } else if (readOnly) {
        outdated = true;
        log(`命令行：${VERSION} → ${latest}${opts.dryRun ? '，将用 npm 更新' : '，可以更新'}。`);
      } else {
        const install = npm(['install', '-g', `${PACKAGE}@${latest}`]);
        if (install.status !== 0) {
          error(`命令行更新失败：${(install.stderr || install.stdout || '').trim().split('\n').pop()}`);
          return 1;
        }
        log(`命令行：${VERSION} → ${latest}，已更新。`);
        // The installed package now holds the new files; let the new version refresh the skills.
        const rest = opts.skills.flatMap((dir) => ['--skills', dir]);
        return reexec(['--no-cli', ...rest]);
      }
    }

    // 2. Global skills.
    const candidates = [
      ...GLOBAL_SKILL_DIRS.map((d) => ({ dir: join(home, d), label: `~/${d}` })),
      ...opts.skills.map((d) => ({ dir: resolve(cwd, d), label: tilde(resolve(cwd, d)) })),
    ];
    const seen = new Set();
    const skills = candidates
      .filter(({ dir }) => !seen.has(dir) && seen.add(dir))
      .map(({ dir, label }) => planSkill(dir, label, { root, home, stamp }))
      .filter((p) => p.status !== 'missing' || opts.skills.some((d) => resolve(cwd, d) === p.dir));
    log(skills.length ? '全局 skill：' : '全局 skill：个人目录里没有安装。');
    for (const plan of skills) {
      if (plan.status === 'missing') {
        log(`  ${plan.label}：目录不存在。`);
        continue;
      }
      if (plan.status === 'update') {
        outdated = true;
        if (!readOnly) applySkill(plan, root);
      }
      log(`  ${describeSkill(plan, { dryRun: readOnly, tilde })}`);
    }

    // 3. Current project.
    const skillPath = findProjectSkill(cwd);
    if (!skillPath) {
      log('当前项目：没有安装 STC。');
    } else if (compareVersions(skillVersion(resolve(cwd, skillPath)) ?? '0.0.0', VERSION) > 0) {
      log(`当前项目：${skillPath}/ 已是 ${skillVersion(resolve(cwd, skillPath))}，比当前程序新，未改动。`);
    } else {
      const plan = planInit({ cwd, dir: skillPath });
      const changed = plan.files.some((f) => f.status !== 'unchanged') || plan.rules.some((r) => r.status !== 'unchanged');
      if (!changed) log(`当前项目：${plan.skillPath}/ 已是 ${VERSION}。`);
      else {
        outdated = true;
        if (!readOnly) applyInit(plan);
        log(`当前项目：${readOnly ? '待更新，' : ''}${describeFiles(plan)}`);
      }
    }

    if (opts.check) return outdated ? 1 : 0;
    if (opts.dryRun) log('\n预演，未写入文件。');
    else if (outdated) log('\n已打开的 Agent 会话要重新读取 skill，才会用上新规则。');
    return 0;
  } catch (e) {
    error(`更新失败：${e.message}`);
    return 1;
  }
}
