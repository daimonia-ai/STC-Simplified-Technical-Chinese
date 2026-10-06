// The check command: checks Chinese text in files, directories or stdin against STC.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lintText, loadDictionary, PROFILES } from './core.mjs';
import { isCodeFile } from './extract.mjs';

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
  --json             输出 JSON
  --max-errors <n>   错误超过 n 个时返回退出码 1，默认 0
  --no-warnings      只显示错误
  --help             显示本说明

跳过检查：在要跳过的那一行上方写一行含 stc-disable-next-line 的注释。
Markdown 里含“✗”的行（STC 文档里的反例）不检查。`;

function parseArgs(argv) {
  const opts = { paths: [], json: false, maxErrors: 0, warnings: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--no-warnings') opts.warnings = false;
    else if (a === '--profile') opts.profile = argv[++i];
    else if (a === '--max-errors') opts.maxErrors = Number(argv[++i]);
    else opts.paths.push(a);
  }
  return opts;
}

function collectFiles(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
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
    const files = opts.paths.flatMap((p) => (statSync(p).isDirectory() ? collectFiles(p, []) : [p]));
    inputs = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  } else if (process.stdin.isTTY) {
    console.error(`请指定要检查的文件或目录，或通过标准输入传入文字。\n\n${checkHelp(usage)}`);
    return 2;
  } else {
    inputs = [{ path: 'stdin.md', text: readFileSync(0, 'utf8') }];
  }

  const dictionary = loadDictionary();
  let errors = 0;
  let warnings = 0;
  const report = [];
  for (const { path, text } of inputs) {
    const { profile, issues } = lintText(text, { path, profile: opts.profile, dictionary });
    const shown = opts.warnings ? issues : issues.filter((x) => x.level === 'error');
    errors += issues.filter((x) => x.level === 'error').length;
    warnings += issues.filter((x) => x.level === 'warning').length;
    report.push({ path, profile, issues: shown });
  }

  if (opts.json) {
    console.log(JSON.stringify({ errors, warnings, files: report }, null, 2));
  } else {
    for (const { path, profile, issues } of report) {
      if (!issues.length) continue;
      console.log(`${path}（${profile}）`);
      for (const x of issues) {
        const level = x.level === 'error' ? '错误' : '警告';
        console.log(`  ${x.line}:${x.col}  ${level}  ${x.rule}  ${x.message}  “${x.match}”`);
      }
    }
    console.log(`检查了 ${inputs.length} 个文件，共 ${errors} 个错误，${warnings} 个警告。`);
  }
  return errors > opts.maxErrors ? 1 : 0;
}
