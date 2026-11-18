import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintText } from '../check/src/core.mjs';
import { repeatsTitle } from '../check/src/ui-echo.mjs';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const echoes = (text, opts = {}) => lintText(text, { profile: 'for-web-dev', ...opts }).issues.filter((i) => i.rule === 'G20');
const html = (title, body) => `<section>\n<h2>${title}</h2>\n<p>${body}</p>\n</section>`;
const markdown = (title, body) => `## ${title}\n\n${body}`;

// Each kind starts its message with a fixed label, so a test can tell which check fired.
const LABEL = { operation: '操作提示', position: '指位置的话', internal: '写给内部看的话', title: '区块标题下的说明' };
const assertCandidate = (text, kind, opts) => {
  const found = echoes(text, opts);
  assert.equal(found.length, 1, text);
  assert.ok(found[0].message.startsWith(LABEL[kind]), `${text}: ${found[0].message}`);
  assert.match(found[0].suggestion, /W9/, text);
};
const assertClear = (texts, opts) => {
  for (const text of texts) assert.equal(echoes(text, opts).length, 0, text);
};

const OPERATION_TIPS = [
  '点击任意一行可以查看明细', '点任一环节进去', '点击图表查看当天的明细', '单击行即可展开', '双击可以编辑',
  '请点击右上角的按钮进入设置', '轻点标签可以筛选', '只需点任一卡片查看明细', '点击后跳转到登录页',
  '可拖动排序', '支持拖拽调整顺序', '左右滑动查看更多', '向下滚动查看更多', '悬停查看说明',
];
const POSITION_WORDS = [
  '下面是你的报告', '详情见右边的面板', '右上角的头像', '上方的筛选条件', '左侧导航可以切换页面',
  '下方表格列出了所有成员', '点击这里开始', '在这里可以设置通知', '这里是你的品牌报告', '此处可以上传文件',
];
const INTERNAL_VOICE = [
  '当前页面仅用于展示功能布局。', '该页面用于演示导出流程', '仅用于展示', '仅供演示', '仅作示意，以实际为准',
  '示意图', '（示意）', '设计意图：突出核心指标', '制作说明',
];

test('operation tips such as “点……可以……” and “点击……查看……” are candidates', () => {
  for (const text of OPERATION_TIPS) assertCandidate(text, 'operation');
});

test('operation tips ignore nouns that contain 点, plain instructions and controls named by quotation', () => {
  assertClear([
    '点击率提升 12%。', '点击率可以在报告中查看', '要点可以在报告中查看', '节点可以查看', '热点话题', '点赞数可以查看',
    '保存后设置立即生效。', '选择月份后导出。', '按住 Shift 可以多选。', '查看明细', '点击导出', '点击“导出”',
    '拖拽文件到此处上传', '不可拖动', '没有报告。完成诊断后可查看报告。',
  ]);
});

test('position words and “点击这里” are candidates', () => {
  for (const text of POSITION_WORDS) assertCandidate(text, 'position');
});

test('position words leave the empty state of W6 and fixed terms alone', () => {
  assertClear([
    '还没有报告。完成第一次诊断后，报告会出现在这里。', '这里没有数据', '没进过报表页的人在这里是 0 次', '右边距', '左边框',
    '上下文', '以下情况不支持退款', '图表中的虚线表示估算值。',
  ]);
});

test('words written for the team, such as 仅用于展示 and 示意, are candidates', () => {
  for (const text of INTERNAL_VOICE) assertCandidate(text, 'internal');
});

test('internal-voice patterns ignore the W9 example that readers need and words that contain 示意', () => {
  assertClear([
    '示例数据，仅用于说明报表格式。', '表示意思', '显示意外', '提示意见', '删除后无法恢复。',
  ]);
});

test('quoted mentions and the bad examples in rule documents are not checked', () => {
  assertClear(['删掉“点击任意一行可以查看明细”这句话。', '把“下面是你的报告”改成“你的报告”。', '删掉“仅用于展示”这个标签。']);
  assertClear(['- ✗ 点击任意一行可以查看明细\n- ✗ 当前页面仅用于展示功能布局'], { path: 'rule.md' });
});

test('the same checks run on code strings and JSON values', () => {
  assertCandidate('const hint = "点击任意一行可以查看明细";', 'operation', { path: 'App.tsx' });
  assertCandidate('<p>当前页面仅用于展示功能布局</p>', 'internal', { path: 'Card.jsx' });
  assertCandidate('{"tip": "详情见右边的面板"}', 'position', { path: 'zh-CN.json' });
});

test('interface echo checks apply only to the web-dev profile', () => {
  for (const profile of ['for-chat', 'for-document', 'for-instruction-writing']) {
    assertClear([...OPERATION_TIPS, ...POSITION_WORDS, ...INTERNAL_VOICE, markdown('团队成员', '查看和管理团队成员')], { profile });
  }
});

test('every interface echo candidate carries the W9 reason and the three-tier fix', () => {
  for (const text of [...OPERATION_TIPS, ...POSITION_WORDS, ...INTERNAL_VOICE, '本页用于展示诊断流程。', '诊断流程示意']) {
    const [issue] = echoes(text);
    assert.equal(issue.level, 'warning', text);
    assert.match(issue.reason, /W9|访客|自身设计/, text);
    assert.match(issue.suggestion, /按 W9 定档/, text);
  }
  // Other G20 candidates keep the general advice.
  assert.doesNotMatch(echoes('午餐：西红柿炒鸡蛋（没有东坡肉）。')[0].suggestion, /W9/);
});

test('overlapping matches become one candidate with the first message', () => {
  const found = echoes('请点击右上角的按钮查看详情');
  assert.equal(found.length, 1);
  assert.ok(found[0].message.startsWith(LABEL.operation));
  assert.equal(found[0].match, '点击右上角的按钮查看详情');
});

for (const [name, path, make] of [['HTML', 'card.html', html], ['Markdown', 'card.md', markdown]]) {
  test(`${name}: a description that repeats its block title is a candidate`, () => {
    for (const [title, body] of [
      ['团队成员', '查看和管理团队成员'],
      ['通知设置', '设置通知的方式和时间'],
      ['最近诊断', '最近的诊断记录'],
      ['订单', '全部订单'],
    ]) {
      assertCandidate(make(title, body), 'title', { path });
      const [issue] = echoes(make(title, body), { path });
      assert.equal(issue.match, body);
      assert.equal(issue.related.match, title);
    }
  });

  test(`${name}: descriptions with readings, limits, risks or an empty state stay`, () => {
    assertClear([
      ['通知设置', '每周一 9 点发送汇总邮件。'],
      ['价格', '价格不含税。'],
      ['删除团队', '删除团队后无法恢复。'],
      ['导出失败', '导出失败：网络连接中断。检查网络后重试。'],
      ['报告', '还没有报告。完成第一次诊断后，报告会出现在这里。'],
      ['团队成员', '仅管理员可以编辑团队成员。'],
    ].map(([title, body]) => make(title, body)), { path });
  });

  test(`${name}: a description that adds its own words is not a repeat`, () => {
    assertClear([
      ['团队成员', '邀请成员加入前，邮箱必须已验证。'],
      ['你的订单', '还没有订单'],
      ['发给你的 Agent', '交给你常用的 Agent 来读'],
      ['通知设置', '选择邮件、短信或站内信。'],
    ].map(([title, body]) => make(title, body)), { path });
  });

  test(`${name}: a sentence that only mentions the title among new information is not a repeat`, () => {
    assertClear([
      ['五步闭环', '多个营销专家自我编排、分工协作，沿五步闭环持续运转，量效数据回流修正下一轮策略。'],
      ['预发基线', '改版从最新分支建立独立工作目录，并合入预发基线。'],
      ['官网 Backlog', '官网优化事项的唯一落点。'],
    ].map(([title, body]) => make(title, body)), { path });
  });

  test(`${name}: a paraphrase that reuses too few of the title's words is left to the agent's W9 review`, () => {
    assertClear([
      make('视觉风格', '长什么样：色彩、字体、标识与版式'),
      make('团队成员', '谁在团队里：姓名、角色和邀请状态'),
    ], { path });
  });

  test(`${name}: only the first plain paragraph under a title is read`, () => {
    assertClear([make('团队成员', '邀请成员加入前，邮箱必须已验证。\n\n查看和管理团队成员')], { path });
  });

  test(`${name}: a long paragraph is body copy, not a description`, () => {
    assertClear([make('团队成员', `团队成员在这里加入、离开和调整角色。${'每位成员都有自己的权限。'.repeat(8)}`)], { path });
  });
}

test('Markdown: lists, tables and quotes under a title are not descriptions', () => {
  for (const body of ['- 查看和管理团队成员', '1. 查看和管理团队成员', '| 查看和管理团队成员 |', '> 查看和管理团队成员']) {
    assertClear([markdown('团队成员', body)], { path: 'card.md' });
  }
});

test('Markdown: setext titles and closing hashes are read as titles', () => {
  assertCandidate('团队成员\n------\n\n查看和管理团队成员', 'title', { path: 'card.md' });
  assertCandidate('## 团队成员 ##\n\n查看和管理团队成员', 'title', { path: 'card.md' });
});

test('Markdown: a disabled description line is skipped and does not hand its place to the next line', () => {
  assertClear([
    '## 团队成员\n\n<!-- stc-disable-next-line -->\n查看和管理团队成员',
    '## 团队成员\n\n<!-- stc-disable-next-line -->\n查看和管理团队成员\n邀请成员加入前，邮箱必须已验证。',
  ], { path: 'card.md' });
});

test('HTML: buttons, lists and a description under another title are not read as descriptions', () => {
  assertClear([
    '<section><h2>导出</h2><button>导出</button></section>',
    '<section><h2>团队成员</h2><ul><li>查看和管理团队成员</li></ul></section>',
    '<section><h2>团队成员</h2></section><section><h2>邀请</h2><p>查看和管理团队成员</p></section>',
    '<section>\n<h2>团队成员</h2>\n<!-- stc-disable-next-line -->\n<p>查看和管理团队成员</p>\n</section>',
  ], { path: 'card.html' });
});

test('HTML: nested wrappers and inline markup still pair a description with its title', () => {
  assertCandidate('<section><h2>团队成员</h2><div class="hint"><p>查看和管理团队成员</p></div></section>', 'title', { path: 'a.html' });
  assertCandidate('<section><h2>团队<strong>成员</strong></h2><p>查看和管理<em>团队成员</em></p></section>', 'title', { path: 'a.html' });
});

test('title echo reports the description and the title with source positions', () => {
  const [fromHtml] = echoes(html('团队成员', '查看和管理团队成员'), { path: 'card.html' });
  assert.deepEqual([fromHtml.line, fromHtml.col, fromHtml.related.line, fromHtml.related.col], [3, 4, 2, 5]);
  assert.equal(fromHtml.context, '<p>查看和管理团队成员</p>');
  const [fromMarkdown] = echoes(markdown('团队成员', '查看和管理团队成员'), { path: 'card.md' });
  assert.deepEqual([fromMarkdown.line, fromMarkdown.col, fromMarkdown.related.line, fromMarkdown.related.col], [3, 1, 1, 4]);
});

const tsx = (body) => `export const View = () => (\n  <section>\n${body}\n  </section>\n);`;

test('JSX: a description under a title element or a title prop that repeats the title is a candidate', () => {
  for (const body of [
    '<h2>团队成员</h2>\n<p>查看和管理团队成员</p>',
    "<h2>{t('团队成员', 'Team')}</h2><p>{t('查看和管理团队成员', 'View and manage')}</p>",
    '<h2>团队成员</h2>{/* 说明 */}<p>查看和管理团队成员</p>',
    '<CardHeader><CardTitle>团队成员</CardTitle><CardDescription>查看和管理团队成员</CardDescription></CardHeader>',
    '<D><DialogPrimitive.Title>团队成员</DialogPrimitive.Title><DialogPrimitive.Description>查看和管理团队成员</DialogPrimitive.Description></D>',
    '<PageHeader title="团队成员" description="查看和管理团队成员" />',
    "<PageHeader title={t('团队成员', 'Team')} subtitle={t('查看和管理团队成员', 'View')} />",
    '<ul>{rows.map((row) => <li key={row}><h3>团队成员</h3><p>查看和管理团队成员</p></li>)}</ul>',
    '<div className="head"><h2 className="t"><Icon />团队成员</h2><div className="d">查看和管理团队成员</div></div>',
  ]) {
    assertCandidate(tsx(body), 'title', { path: 'View.tsx' });
    assertCandidate(tsx(body), 'title', { path: 'View.jsx' });
  }
});

test('JSX: variables, templates, conditions, other elements and keep-on-screen text are not repeats', () => {
  assertClear([
    '<h2>团队成员</h2><p>{summary}</p>',
    // A sentence with a variable part is not fixed text, even when the rest repeats the title.
    '<h2>团队成员</h2><p>查看和管理团队成员{suffix}</p>',
    '<h2>团队成员</h2><p>查看和管理<b>{label}</b></p>',
    '<h2>团队成员</h2><p>{`查看 ${count} 位团队成员`}</p>',
    '<h2>团队成员</h2><p>{ok ? "查看团队成员" : "管理团队成员"}</p>',
    '<h2>团队成员</h2>{hint && <p>查看和管理团队成员</p>}',
    '<h2>团队成员</h2><MemberTable /><p>查看和管理团队成员</p>',
    '<h2>团队成员</h2><span>查看和管理团队成员</span>',
    '<h2>通知设置</h2><p>每周一 9 点发送汇总邮件。</p>',
    '<DialogTitle>删除团队</DialogTitle><DialogDescription>删除团队后无法恢复。</DialogDescription>',
    '<h2>团队成员</h2><p>谁在团队里：姓名、角色和邀请状态</p>',
    // The hint prop of a panel is already the text inside the info icon.
    '<PanelHead title="团队成员" hint="查看和管理团队成员" />',
    '<PageHeader title="团队成员" description={summary} />',
  ].map(tsx), { path: 'View.tsx' });
});

test('JSX: positions point at the description and the title in the source', () => {
  const [element] = echoes(tsx('<h2>团队成员</h2>\n<p>查看和管理团队成员</p>'), { path: 'View.tsx' });
  assert.deepEqual([element.line, element.col, element.related.line, element.related.col], [4, 4, 3, 5]);
  assert.equal(element.context, '<p>查看和管理团队成员</p>');
  const props = 'const a = <Page title="团队成员" description="查看和管理团队成员" />;';
  const [prop] = echoes(props, { path: 'View.tsx' });
  assert.deepEqual([prop.line, prop.col, prop.related.col], [1, props.indexOf('查看和管理团队成员') + 1, props.indexOf('团队成员') + 1]);
  assert.equal(prop.match, '查看和管理团队成员');
});

test('JSX: generics, comparisons, regular expressions and markup inside strings do not hide or invent a pair', () => {
  const code = [
    "const [a, setA] = useState<string>('');",
    'const pick = <T,>(items: T[]) => items[0];',
    'if (a < b && c > d) { text = text.replace(/`/g, ""); }',
    "const sample = '<h2>团队成员</h2><p>查看和管理团队成员</p>'; // <h2>团队成员</h2><p>查看和管理团队成员</p>",
    'export const View = () => <Box><Select<string> value="a"><Opt>甲</Opt></Select><h2>团队成员</h2><p>查看和管理团队成员</p></Box>;',
  ].join('\n');
  const found = echoes(code, { path: 'View.tsx' });
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 5);
});

test('JSX: unreadable markup is skipped without an error', () => {
  assertClear(['export const View = () => <div><h2>团队成员</h2><p>查看和管理团队成员</div>;'], { path: 'View.tsx' });
});

test('JSX: a directive comment skips the description line', () => {
  assertClear([tsx('<h2>团队成员</h2>\n{/* stc-disable-next-line */}\n<p>查看和管理团队成员</p>')], { path: 'View.tsx' });
  assertClear([tsx('<h2>团队成员</h2>\n// stc-disable-next-line\n<p>查看和管理团队成员</p>')], { path: 'View.tsx' });
});

test('JSX: the other checks and the title check report a description once', () => {
  assertCandidate(tsx('<h2>团队成员</h2><p>点击团队成员可以查看明细</p>'), 'operation', { path: 'View.tsx' });
});

test('title echo skips JSON, plain scripts and template languages', () => {
  const markup = '<section><h2>团队成员</h2><p>查看和管理团队成员</p></section>';
  assertClear(['{"title": "团队成员", "hint": "查看和管理团队成员"}'], { path: 'zh-CN.json' });
  for (const path of ['view.ts', 'view.mjs', 'View.vue', 'View.svelte', 'View.astro']) {
    assertClear([`const view = ${JSON.stringify(markup)};`, markup], { path });
  }
});

test('a description that another pattern already reports is listed once', () => {
  assertCandidate(markdown('团队成员', '点击团队成员可以查看明细'), 'operation', { path: 'card.md' });
  // A quoted mention is not reported by the operation check, so the title echo still applies.
  assertCandidate(markdown('团队成员', '删掉“点击团队成员可以查看明细”和团队成员'), 'title', { path: 'card.md' });
});

test('repeatsTitle compares two-character words and ignores word order', () => {
  assert.equal(repeatsTitle('通知设置', '设置通知的方式和时间'), true);
  assert.equal(repeatsTitle('订单', '全部订单'), true);
  assert.equal(repeatsTitle('品牌画像', '品牌画像展示品牌的基本信息'), true);
  assert.equal(repeatsTitle('你的订单', '还没有订单'), false);
  assert.equal(repeatsTitle('发给你的 Agent', '交给你常用的 Agent 来读'), false);
  assert.equal(repeatsTitle('Your orders', 'View your orders.'), false);
  assert.equal(repeatsTitle('视觉风格', '长什么样：色彩、字体、标识与版式'), false);
});

test('repeatsTitle needs the title words to make up a share of the description', () => {
  const long = '多个专家自我编排、分工协作，沿五步闭环持续运转，量效数据回流修正下一轮策略。';
  assert.equal(repeatsTitle('五步闭环', long), false);
  assert.equal(repeatsTitle('五步闭环', '五步闭环'), true);
  // Latin words in the title count in the total only, so a mixed title is harder to match.
  assert.equal(repeatsTitle('官网 Backlog', '官网优化事项的唯一落点。'), false);
});

test('--anti-echo holds a page until each interface echo is rewritten or kept with a reason', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stc-ui-echo-'));
  const page = join(dir, 'team.html');
  writeFileSync(page, [
    '<section>', '<h2>团队成员</h2>', '<p>查看和管理团队成员</p>', '<p>点击任意一行可以查看明细。</p>',
    '<p>邀请链接在右上角的按钮里。</p>', '<p>当前页面仅用于展示功能布局。</p>', '<p>删除后无法恢复。</p>', '</section>',
  ].join('\n'));
  const run = (...args) => spawnSync(process.execPath, [cli, 'check', page, '--json', ...args], { encoding: 'utf8' });

  assert.equal(run().status, 0);
  const strict = run('--anti-echo');
  assert.equal(strict.status, 1);
  const { antiEcho } = JSON.parse(strict.stdout);
  assert.deepEqual(antiEcho.pending.map((item) => item.match), [
    '查看和管理团队成员', '点击任意一行可以查看明细', '右上角', '当前页面仅用于展示功能布局',
  ]);

  const review = join(dir, 'review.json');
  writeFileSync(review, JSON.stringify({
    version: 1,
    decisions: antiEcho.pending.map((item) => ({ id: item.id, decision: 'keep', reason: '评审确认这句话是读者首次使用时必须看到的。' })),
  }));
  assert.equal(run('--anti-echo', '--review-decisions', review).status, 0);
  // A decision belongs to the exact file. Any change to the page asks for a new review.
  writeFileSync(page, `<p>新增一行</p>\n${readFileSync(page, 'utf8')}`);
  assert.equal(run('--anti-echo', '--review-decisions', review).status, 1);
});
