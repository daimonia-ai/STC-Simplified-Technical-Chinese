import { createHash } from 'node:crypto';

// W9 sorts explanatory interface sentences into three tiers: stay on the screen, move into a hint, delete.
// The patterns below mark candidates for the last two tiers. The right tier depends on the screen,
// so every match goes to review.
const HAN = '\\u4e00-\\u9fff';
const CLAUSE = '[^。！？；;\\n|]';
const TO_COMMA = '[^。！？；;，,\\n|]';
// 点 as a verb. 点击率, 要点 and 节点 are nouns, and 点评 and 点赞 are other actions.
const TAP = `(?:点击(?![率量数次])|点按|点选|单击|双击|轻点|(?:(?<![${HAN}])|(?<=[请可再先接需也就并或能]|只要))点(?![击评数位赞阵名率量按选]))`;
const TAP_RESULT = '(?:可以|即可|就能|才能|能够|可(?=[查进打展收编修切跳了筛排下复看选管])|进去|进入|查看|打开|展开|收起|编辑|切换|跳转|了解|筛选|排序|下载|复制|看到)';

const OPERATION_TIPS = [
  // 点击任意一行可以查看明细；点任一环节进去
  new RegExp(`${TAP}${CLAUSE}{0,24}?${TAP_RESULT}${TO_COMMA}{0,12}`, 'g'),
  // 可拖动排序；支持拖拽调整顺序
  new RegExp(`(?<!不)(?:可以|可|能|支持|允许)(?:拖动|拖拽|拖曳|拖放|滑动|滚动|翻页|悬停|长按|缩放)${TO_COMMA}{0,8}`, 'g'),
  // 左右滑动查看更多；向下滚动查看
  new RegExp(`(?:左右|上下|向[上下左右])(?:滑动|滚动|拖动)${CLAUSE}{0,12}?(?:查看|浏览|切换|了解|更多)${TO_COMMA}{0,8}`, 'g'),
  // 悬停查看说明
  new RegExp(`悬停(?!提示)${CLAUSE}{0,12}?(?:查看|显示|了解)${TO_COMMA}{0,8}`, 'g'),
];

const POSITION_WORDS = [
  // 下面是你的报告；右上角的头像；左侧导航
  /上面|下面|上方|下方|[左右]边(?![界距框缘栏])|[左右]侧|[左右][上下]角/g,
  // 点击这里开始；在这里可以设置；这里是你的报告。W6 要求的空状态“报告会出现在这里”不匹配。
  // 分句中间的“在这里是 0 次”指范围，不指位置，所以“这里是”只在分句开头匹配。
  new RegExp(`${TAP}(?:这里|此处)|在(?:这里|此处)(?:可以|即可|能|设置|查看|管理|编辑|选择|输入|填写|添加|上传|修改|找到|看到)|(?<=^|[，。；：、\\s（(])(?:这里|此处)(?:是|可以|即可|能)`, 'g'),
];

const INTERNAL_VOICE = [
  // 当前页面仅用于展示功能布局
  /(?:当前页面|当前页|该页面|此页面|本区块|本模块|本卡片)(?:仅|只|主要)?(?:用于|展示|呈现|演示)[^。！？\n]{0,28}/g,
  // 仅用于展示；仅供演示；仅作示意
  /仅(?:用于|供|作|为)(?:展示|演示|示意|预览|占位)[^。！？\n]{0,20}/g,
  // 示意；示意图。表示意思、显示意外这类词里的“示意”不算。
  new RegExp(`(?<![表提指显暗揭标宣告展演批请启昭])示意(?:图|稿|用|效果|数据)?(?![${HAN}])`, 'g'),
  // 设计意图；制作说明
  /设计意图|制作说明/g,
];

const UI_ECHO = [
  [OPERATION_TIPS, '操作提示可能多余：按 W9，控件本身能表达的操作删掉，读者必须知道的规则收进提示'],
  [POSITION_WORDS, '指位置的话可能多余：按 W9，改成直接写对象，或删掉'],
  [INTERNAL_VOICE, '写给内部看的话可能留在界面上：按 W9 删掉，或改成用户需要的对象、结果和操作'],
];

// The report shows this as the fix for every interface echo candidate.
export const UI_ECHO_ADVICE = '按 W9 定档。每次都要看的留在界面上，解释这一块是什么、怎么读的收进提示，复述标题、控件或位置的删掉。';

// These patterns identify review candidates. Necessity depends on the reader and task.
export function antiEchoCandidates(text, profile) {
  const found = [];
  const scan = (pattern, message, accept = () => true, suggestion) => {
    for (const m of text.matchAll(pattern)) {
      if (!accept(m[0])) continue;
      if (found.some((f) => m.index < f.index + f.match.length && m.index + m[0].length > f.index)) continue;
      found.push({ index: m.index, match: m[0], message, ...(suggestion ? { suggestion } : {}) });
    }
  };
  scan(/（(?:不|没有?|并非|不是|也没有?)[^）\n]{0,40}）|\((?:不|没有?|并非|不是|也没有?)[^)\n]{0,40}\)/g,
    '括号中的排除说明需要读者依据：删掉后会造成什么具体误解');
  scan(/已(?:确认|确保)(?:不含|不包含|不涉及|没有|无)|已确认未(?:使用|采用|添加)/g,
    '交付结尾的自证可能多余：核对读者是否要求这项检查结果');
  // Negation alone also reports missing configuration, failures and scope.
  // Require both a described surface and an excluded production action.
  scan(/(?:本页|本页面|页面|界面|正文|文案|配图|插画|动画|视频)[^。！？；;\n|]{0,40}?[，,]\s*(?:没有|未)(?:添加|加入|使用|采用|引入)[^。！？；;\n|]{1,32}/g,
    '制作取舍可能多余：结合整句判断读者是否需要这项使用边界');
  if (profile === 'for-web-dev') {
    scan(/[\u4e00-\u9fff]{0,8}(?:流程|布局|界面|交互|结构)(?:示意|演示)(?:图)?/g,
      '界面中可能混入制作标签：核对访客是否需要这句话', undefined, UI_ECHO_ADVICE);
    scan(/(?:本页|本页面|此处|这里)(?:仅|只|主要)?(?:用于|展示|呈现|演示)[^。！？\n]{0,28}/g,
      '界面在解释自身设计：改为用户需要的对象、结果或操作', undefined, UI_ECHO_ADVICE);
    // The order decides which message a phrase gets: overlapping matches keep the first one.
    for (const [patterns, message] of UI_ECHO) {
      for (const pattern of patterns) scan(pattern, message, undefined, UI_ECHO_ADVICE);
    }
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
