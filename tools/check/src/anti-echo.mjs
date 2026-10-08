import { createHash } from 'node:crypto';

// These patterns identify review candidates. Necessity depends on the reader and task.
export function antiEchoCandidates(text, profile) {
  const found = [];
  const scan = (pattern, message, accept = () => true) => {
    for (const m of text.matchAll(pattern)) {
      if (!accept(m[0])) continue;
      if (found.some((f) => m.index < f.index + f.match.length && m.index + m[0].length > f.index)) continue;
      found.push({ index: m.index, match: m[0], message });
    }
  };
  scan(/（(?:不|没有?|并非|不是|也没有?)[^）\n]{0,40}）|\((?:不|没有?|并非|不是|也没有?)[^)\n]{0,40}\)/g,
    '括号中的排除说明需要读者依据：删掉后会造成什么具体误解');
  scan(/已(?:确认|确保)(?:不含|不包含|不涉及|没有|无)|已确认未(?:使用|采用|添加)/g,
    '交付结尾的自证可能多余：核对读者是否要求这项检查结果');
  scan(/(?<=^|[，,。；;\n])\s*(?:没有(?!权限|网络|数据|结果|记录|报告|找到|足够|可用|(?:提交|保存|发送|上传|下载|导入|导出|同步|登录|付款|支付)(?:成功|完成))|未(?:使用|采用|添加|设置|启用)|不(?:涉及|包含|包括))[^。！？；;\n]{1,40}/g,
    '排除说明可能来自讨论过程：核对是否影响读者当前的理解、判断或操作',
    (clause) => !/^\s*没有[^，。]{0,16}(?:的|时|就|则|也|可以|可|能|必须|不得|不能)/.test(clause));
  if (profile === 'for-web-dev') {
    scan(/[\u4e00-\u9fff]{0,8}(?:流程|布局|界面|交互|结构)(?:示意|演示)(?:图)?/g,
      '界面中可能混入制作标签：核对访客是否需要这句话');
    scan(/(?:本页|本页面|此处|这里)(?:仅|只|主要)?(?:用于|展示|呈现|演示)[^。！？\n]{0,28}/g,
      '界面在解释自身设计：改为用户需要的对象、结果或操作');
  }
  if (profile === 'for-chat') {
    scan(/(?:按|采用)\s*for[ -](?:web[ -]dev|chat|document|instruction[ -]writing)\s*(?:写|处理|审阅)/gi,
      '默认汇报所用规则可能多余：用户询问方法时再说明');
  }
  return found.sort((a, b) => a.index - b.index);
}

export function antiEchoFingerprint(path, issue, contentHash = '') {
  // Bind a decision to its source and complete excerpt, not a global phrase allowlist.
  return createHash('sha256').update(JSON.stringify([
    String(path).replaceAll('\\', '/'), contentHash, issue.field ?? '', issue.line, issue.col,
    issue.context ?? issue.match, issue.match,
  ])).digest('hex');
}

export function reviewAntiEcho(files, document = { version: 1, decisions: [] }) {
  if (document?.version !== 1 || !Array.isArray(document.decisions)) {
    throw new Error('Anti-Echo 复核文件必须包含 version: 1 和 decisions 数组。');
  }
  const decisions = new Map();
  for (const item of document.decisions) {
    if (!/^[a-f0-9]{64}$/.test(item?.id ?? '') || item.decision !== 'keep' || typeof item.reason !== 'string' || !item.reason.trim()) {
      throw new Error('每条复核记录必须包含有效的 id、decision: keep 和具体 reason。');
    }
    if (decisions.has(item.id)) throw new Error(`复核编号重复：${item.id}`);
    decisions.set(item.id, item.reason.trim());
  }
  const pending = [];
  const accepted = [];
  for (const file of files) {
    for (const issue of file.issues.filter((i) => i.rule === 'G20')) {
      const id = antiEchoFingerprint(file.path, issue, file.contentHash);
      const finding = { id, path: file.path, line: issue.line, col: issue.col, match: issue.match, context: issue.context ?? issue.match };
      if (decisions.has(id)) accepted.push({ ...finding, reason: decisions.get(id) });
      else pending.push(finding);
    }
  }
  return { pending, accepted };
}
