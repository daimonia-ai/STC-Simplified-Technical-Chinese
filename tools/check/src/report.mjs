// Render findings for readers; JSON keeps the full structured findings.
const PROFILES = {
  'for-chat': '对话回复', 'for-document': '文档',
  'for-web-dev': '网页和应用界面', 'for-instruction-writing': 'Agent 规则',
};
const clean = (text) => String(text).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
const md = (text) => clean(text).replace(/([\\`*_[\]<>#|])/g, '\\$1');
const sentence = (text) => /[。！？]$/.test(text) ? text : text + '。';
const inlineCode = (text) => {
  const value = clean(text);
  const fence = '`'.repeat(Math.max(0, ...(value.match(/`+/g) ?? []).map((x) => x.length)) + 1);
  return `${fence} ${value} ${fence}`;
};

function excerpt(issue) {
  const text = clean(issue.context ?? issue.match);
  const start = Math.max(0, issue.col - 1 - 38);
  const end = Math.min(text.length, Math.max(start + 120, issue.col + issue.match.length));
  return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export function formatReport(report, { format = 'text', showWarnings = true } = {}) {
  const markdown = format === 'markdown';
  const escape = markdown ? md : clean;
  const out = [markdown ? '# STC 中文审查' : 'STC 中文审查', ''];
  out.push(`检查了 ${report.files.length} 个文件：${report.errors} 处需修改，${report.warnings} 处待确认。`);
  if (!showWarnings && report.warnings) out.push('本次只展示需修改项。');
  const issues = report.files.flatMap((f) => f.issues);
  if (!issues.length) {
    out.push(report.errors + report.warnings === 0
      ? '机器检查未发现问题。事实准确性、术语一致性仍需结合上下文审阅。'
      : '当前筛选条件下没有待展示的问题。');
    return out.join('\n');
  }
  out.push('检查方式：只读。报告中的建议由作者决定是否采用。');
  const priority = issues.some((x) => x.level === 'error') ? issues.filter((x) => x.level === 'error') : issues;
  const counts = new Map();
  for (const issue of priority) counts.set(issue.title, (counts.get(issue.title) ?? 0) + 1);
  out.push('', (report.errors ? '主要问题：' : '待确认项：') + [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([title, count]) => `${title}（${count} 处）`).join('；') + '。');
  for (const file of report.files) {
    if (!file.issues.length) continue;
    const path = file.path === 'stdin.md' ? '输入的文字' : file.path;
    out.push('', `${markdown ? '## ' : ''}${markdown ? inlineCode(path) : escape(path)} · ${PROFILES[file.profile] ?? file.profile}`);
    const groups = new Map();
    for (const issue of file.issues) {
      if (!groups.has(issue.line)) groups.set(issue.line, []);
      groups.get(issue.line).push(issue);
    }
    for (const [line, group] of groups) {
      out.push('', `${markdown ? '### ' : ''}第 ${line} 行`);
      const contexts = [...new Set(group.map(excerpt))];
      for (const context of contexts) {
        if (markdown) {
          const longest = Math.max(2, ...(context.match(/`+/g) ?? []).map((x) => x.length));
          const fence = '`'.repeat(longest + 1);
          out.push('原句：', '', fence + 'text', context, fence);
        } else out.push(`原文：“${context}”`);
      }
      for (const issue of group) {
        const level = issue.level === 'error' ? '需修改' : '待确认';
        out.push('', `${markdown ? '- **' : '· '}${level}：${escape(issue.title)}${markdown ? '**' : ''}（${issue.rule}，第 ${issue.col} 列）`);
        out.push(`${markdown ? '  - ' : '  '}触发文字：${markdown ? inlineCode(issue.match) : `“${escape(issue.match)}”`}`);
        out.push(`${markdown ? '  - ' : '  '}原因：${sentence(escape(issue.reason))}`);
        out.push(`${markdown ? '  - ' : '  '}改法：${sentence(escape(issue.suggestion))}`);
      }
    }
  }
  out.push('', '下一步：补齐标为“【待补】”的事实，再决定采用哪些改法。');
  return out.join('\n');
}
