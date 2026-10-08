// The check command: checks Chinese text in files, directories or stdin against STC.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { lintText, loadDictionary, PROFILES } from './core.mjs';
import { isCodeFile } from './extract.mjs';
import { formatReport } from './report.mjs';
import { reviewAntiEcho } from './anti-echo.mjs';

// Directories skipped when walking a directory: dependencies, build output, and names that start with ".".
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'target']);
const isTextFile = (path) => /\.(md|mdx|markdown|txt)$/i.test(path) || isCodeFile(path);

export const checkHelp = (usage) => `用法：${usage} [选项] <文件或目录...>
  不给路径时读标准输入。
  给目录时，逐层检查其中的 Markdown、文本和代码文件，
  跳过以“.”开头的目录和 node_modules、dist、build 等目录。

选项：
  --profile <场景>   for-chat | for-document | for-web-dev | for-instruction-writing
                     不指定时按文件判断：AGENTS.md、CLAUDE.md、SKILL.md 用 for-instruction-writing，
                     代码文件用 for-web-dev（只查字符串和 JSX 文字），其余用 for-document
  --format <格式>    text（默认）或 markdown；Markdown 可保存为审查报告
  --json             输出 JSON，供程序或 agent 读取
  --max-errors <n>   错误超过 n 个时返回退出码 1，默认 0
  --no-warnings      只显示错误
  --anti-echo        有未复核的 G20 疑点时返回 1
  --review-decisions <文件>  读取 Anti-Echo 保留理由，与 --anti-echo 一起用
  --help             显示本说明

跳过检查：在要跳过的那一行上方写一行含 stc-disable-next-line 的注释。
Markdown 里含“✗”的行（STC 文档里的反例）不检查。`;

function parseArgs(argv) {
  const opts = { paths: [], json: false, maxErrors: 0, warnings: true, format: 'text' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--no-warnings') opts.warnings = false;
    else if (a === '--anti-echo') opts.antiEcho = true;
    else if (a === '--review-decisions') {
      opts.reviewDecisions = argv[++i];
      if (!opts.reviewDecisions || opts.reviewDecisions.startsWith('--')) opts.error = '--review-decisions 后面必须写文件路径。';
    }
    else if (a === '--profile') {
      opts.profile = argv[++i];
      if (!opts.profile) opts.error = '--profile 后面必须写场景。';
    }
    else if (a === '--format') {
      opts.format = argv[++i];
      if (!['text', 'markdown'].includes(opts.format)) opts.error = '--format 必须为 text 或 markdown。';
    }
    else if (a === '--max-errors') opts.maxErrors = Number(argv[++i]);
    else if (a.startsWith('-')) opts.error = `未知选项：${a}`;
    else opts.paths.push(a);
  }
  if (!Number.isInteger(opts.maxErrors) || opts.maxErrors < 0) opts.error = '--max-errors 必须为非负整数。';
  if (opts.reviewDecisions && !opts.antiEcho) opts.error = '--review-decisions 必须与 --anti-echo 一起使用。';
  return opts;
}

function collectFiles(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const info = lstatSync(path);
    // A selected directory must not expand through a symlink into unrelated files.
    if (info.isSymbolicLink()) continue;
    if (info.isDirectory()) {
      if (!name.startsWith('.') && !SKIP_DIRS.has(name)) collectFiles(path, out);
    } else if (isTextFile(name)) {
      out.push(path);
    }
  }
  return out;
}

// Returns the exit code: 0 passed, 1 more errors than --max-errors, 2 bad arguments or paths.
export function runCheck(argv, { usage = 'stc check' } = {}) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(checkHelp(usage));
    return 0;
  }
  if (opts.error) {
    console.error(opts.error);
    return 2;
  }
  if (opts.profile && !PROFILES.includes(opts.profile)) {
    console.error(`未知场景：${opts.profile}。可选：${PROFILES.join('、')}`);
    return 2;
  }

  let inputs;
  if (opts.paths.length) {
    const missing = opts.paths.filter((p) => !existsSync(p));
    if (missing.length) {
      console.error(`找不到：${missing.join('、')}`);
      return 2;
    }
    const files = [...new Set(opts.paths.flatMap((p) => (statSync(p).isDirectory() ? collectFiles(p, []) : [p])))];
    inputs = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  } else if (process.stdin.isTTY) {
    console.error(`请指定要检查的文件或目录，或通过标准输入传入文字。\n\n${checkHelp(usage)}`);
    return 2;
  } else {
    inputs = [{ path: 'stdin.md', text: readFileSync(0, 'utf8') }];
  }

  const dictionary = loadDictionary();
  let decisions;
  if (opts.reviewDecisions) {
    try {
      decisions = JSON.parse(readFileSync(opts.reviewDecisions, 'utf8'));
      reviewAntiEcho([], decisions);
    } catch (error) {
      console.error(`无法读取 Anti-Echo 复核文件：${error.message}`);
      return 2;
    }
  }
  let errors = 0;
  let warnings = 0;
  const report = [];
  for (const { path, text } of inputs) {
    const { profile, issues } = lintText(text, { path, profile: opts.profile, dictionary });
    const shown = opts.warnings ? issues : issues.filter((x) => x.level === 'error' || (opts.antiEcho && x.rule === 'G20'));
    errors += issues.filter((x) => x.level === 'error').length;
    warnings += issues.filter((x) => x.level === 'warning').length;
    report.push({ path, profile, issues: shown, ...(opts.antiEcho ? { contentHash: createHash('sha256').update(text).digest('hex') } : {}) });
  }

  const antiEcho = opts.antiEcho ? reviewAntiEcho(report, decisions) : undefined;
  const result = { errors, warnings, files: report, ...(antiEcho ? { antiEcho } : {}) };
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReport(result, { format: opts.format, showWarnings: opts.warnings }));
  }
  return errors > opts.maxErrors || antiEcho?.pending.length ? 1 : 0;
}
