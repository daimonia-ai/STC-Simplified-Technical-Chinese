// The init command: installs STC into the current project.
// Skill files go to .claude/skills/stc/. Project instructions register the skill;
// --defaults enables the writing rules after the user chooses them.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CMD } from '../../meta.mjs';
import { skillFiles } from '../../skill-files.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
export const DEFAULT_DIR = '.claude/skills/stc';
const START = '<!-- stc:start -->';
const END = '<!-- stc:end -->';

export const initHelp = () => `用法：${CMD} init [选项]

把 STC 装进当前目录下的项目：
  1. skill 文件放进 ${DEFAULT_DIR}/
  2. 按需使用入口写进项目里的 AGENTS.md 和 CLAUDE.md；两个都没有时，新建 AGENTS.md
用户确认后，加 --defaults 设置默认输出规则。
再次运行会更新文件并保留已经启用的默认规则。

选项：
  --defaults     设置为当前项目的默认输出规则
  --dir <目录>   skill 文件放在哪个目录，默认 ${DEFAULT_DIR}
  --dry-run      只列出要改的文件，不写入
  --help         显示本说明`;

const toPosix = (p) => p.split(sep).join('/');

// Takes the core rules from snippets/agents-md.md and points them at the skill's path in the project.
export function snippetBlock(skillPath, { defaults = true } = {}) {
  const file = defaults ? 'agents-md.md' : 'available-md.md';
  const text = readFileSync(join(ROOT, 'snippets', file), 'utf8');
  const match = text.match(/```markdown\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`snippets/${file} 里没有找到规则代码块`);
  const body = match[1].replaceAll('STC 规则所在位置', `\`${skillPath}/SKILL.md\``);
  return `${START}\n<!-- stc:mode=${defaults ? 'default' : 'available'} -->\n${body}\n${END}`;
}

// Replaces the STC block if the file has one; otherwise appends it.
export function upsertBlock(content, block) {
  const start = content.indexOf(START);
  const end = start === -1 ? -1 : content.indexOf(END, start);
  if (start !== -1 && end !== -1) return content.slice(0, start) + block + content.slice(end + END.length);
  const trimmed = content.replace(/\s+$/, '');
  return trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`;
}

// Rule files to write: the existing AGENTS.md and CLAUDE.md, or a new AGENTS.md when neither exists.
// If CLAUDE.md imports AGENTS.md with @AGENTS.md, only AGENTS.md is written, so agents do not read the block twice.
function ruleTargets(cwd) {
  const agents = join(cwd, 'AGENTS.md');
  const claude = join(cwd, 'CLAUDE.md');
  const hasAgents = existsSync(agents);
  const hasClaude = existsSync(claude);
  const claudeImportsAgents = hasClaude && /^@AGENTS\.md\s*$/m.test(readFileSync(claude, 'utf8'));
  const targets = [];
  if (hasAgents || !hasClaude || claudeImportsAgents) targets.push(agents);
  if (hasClaude && !claudeImportsAgents) targets.push(claude);
  // When CLAUDE.md is a link to AGENTS.md, both names are one file: write it once.
  if (targets.length === 2 && hasAgents && realpathSync(agents) === realpathSync(claude)) targets.pop();
  return targets;
}

export function planInit({ cwd = process.cwd(), dir = DEFAULT_DIR, defaults = false } = {}) {
  const target = resolve(cwd, dir);
  const rel = toPosix(relative(cwd, target));
  const skillPath = !rel ? '.' : rel.startsWith('..') || isAbsolute(rel) ? toPosix(target) : rel;
  const sameAsSource = existsSync(target) && realpathSync(target) === realpathSync(ROOT);

  const files = sameAsSource ? [] : skillFiles(ROOT).map((file) => {
    const to = join(target, file);
    const data = readFileSync(join(ROOT, file));
    const status = !existsSync(to) ? 'create' : readFileSync(to).equals(data) ? 'unchanged' : 'update';
    return { to, data, status };
  });

  const targets = ruleTargets(cwd);
  const previous = targets.map((path) => existsSync(path) ? readFileSync(path, 'utf8') : '');
  const priorDefaults = previous.map((text) => {
    const start = text.indexOf(START);
    const end = text.indexOf(END, start);
    if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
      throw new Error('STC 配置标记不完整。请先检查 stc:start 和 stc:end。');
    }
    const managed = start === -1 ? '' : text.slice(start, end);
    return managed.includes('stc:mode=default') || managed.includes('写中文时必须按 STC 写。');
  });
  const defaultEnabled = defaults || priorDefaults.some(Boolean);
  const block = snippetBlock(skillPath, { defaults: defaultEnabled });
  const rules = targets.map((path) => {
    const exists = existsSync(path);
    const before = exists ? readFileSync(path, 'utf8') : '';
    const after = upsertBlock(before, block);
    const status = !exists ? 'create' : before === after ? 'unchanged' : 'update';
    return { path, name: toPosix(relative(cwd, path)), after, status, hadBlock: before.includes(START) };
  });

  return { skillPath, sameAsSource, files, rules, defaultEnabled };
}

function describeFiles({ skillPath, sameAsSource, files }) {
  if (sameAsSource) return `skill 文件就在 ${skillPath}/，不用复制。`;
  const count = (s) => files.filter((f) => f.status === s).length;
  const parts = [];
  if (count('create')) parts.push(`新建 ${count('create')} 个文件`);
  if (count('update')) parts.push(`更新 ${count('update')} 个文件`);
  return `${skillPath}/：${parts.length ? parts.join('，') : '文件已是最新'}。`;
}

function describeRule({ name, status, hadBlock }, defaultEnabled) {
  const label = defaultEnabled ? '默认输出规则' : '按需使用入口';
  if (status === 'create') return `${name}：新建，写入了${label}。`;
  if (status === 'unchanged') return `${name}：${label}已是最新。`;
  return `${name}：${hadBlock ? '更新了' : '写入了'}${label}。`;
}

// Returns the exit code: 0 done, 1 write failed, 2 bad arguments.
export function runInit(argv, { cwd = process.cwd(), command = CMD, log = console.log, error = console.error } = {}) {
  const opts = { dir: DEFAULT_DIR, dryRun: false, defaults: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      log(initHelp());
      return 0;
    }
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--defaults') opts.defaults = true;
    else if (a === '--dir') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) {
        error('--dir 后面要写目录。');
        return 2;
      }
      opts.dir = argv[++i];
    } else {
      error(`未知选项：${a}\n\n${initHelp()}`);
      return 2;
    }
  }

  try {
    const plan = planInit({ cwd, dir: opts.dir, defaults: opts.defaults });
    if (opts.dryRun) {
      log('预演，不写入文件：');
      log(`  ${describeFiles(plan)}`);
      for (const r of plan.rules) log(`  ${describeRule(r, plan.defaultEnabled)}`);
      return 0;
    }
    for (const f of plan.files) {
      if (f.status === 'unchanged') continue;
      mkdirSync(dirname(f.to), { recursive: true });
      writeFileSync(f.to, f.data);
    }
    for (const r of plan.rules) {
      if (r.status !== 'unchanged') writeFileSync(r.path, r.after);
    }
    log(`STC 已装好。\n${describeFiles(plan)}`);
    for (const r of plan.rules) log(describeRule(r, plan.defaultEnabled));
    const dirOption = opts.dir === DEFAULT_DIR ? '' : ` --dir ${JSON.stringify(opts.dir)}`;
    log(plan.defaultEnabled
      ? '\nSTC 已准备好，当前项目已启用默认输出规则。'
      : `\nSTC 已准备好。建议设为当前项目的默认输出规则，确认后运行 ${command} init --defaults${dirOption}。`);
    log('首次体验：选一份文档，或授权 agent 从当前项目挑一份来审阅。');
    log(`命令行检查用 ${command} check <文件>。`);
    log(`Agent 安装后的引导见 ${plan.skillPath}/ONBOARDING.md。`);
    return 0;
  } catch (e) {
    error(`安装失败：${e.message}`);
    return 1;
  }
}
