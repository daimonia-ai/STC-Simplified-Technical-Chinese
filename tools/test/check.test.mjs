import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintText } from '../check/src/core.mjs';

const rules = (text, opts) => lintText(text, opts).issues.filter((x) => x.level === 'error').map((x) => x.rule);

test('合格的文档没有错误', () => {
  assert.deepEqual(rules('本周上线了导出功能。导出 1 万行数据用时 3 秒。', { profile: 'for-document' }), []);
});

test('文档里的虚动词、程度词、套话和“我们”报错', () => {
  const found = rules('本周我们进行了大量工作，值得注意的是错误率显著下降。', { profile: 'for-document' });
  for (const rule of ['D1', 'G4', 'G5', 'G6']) assert.ok(found.includes(rule), `缺少 ${rule}：${found}`);
});

test('“进行中”不算虚动词', () => {
  assert.deepEqual(rules('同步进行中，完成后会通知。', { profile: 'for-web-dev' }), []);
});

test('界面文字里的复数人称和第三人称代词报错', () => {
  const code = "toast('账号已停用，请联系我们');\nconst tip = '当前账号没有它的查看权限';";
  const found = rules(code, { path: 'App.tsx' });
  assert.equal(found.filter((r) => r === 'W1').length, 2);
});

test('代码注释不检查', () => {
  assert.deepEqual(rules('// 我们在这里进行一些优化\nconst label = "保存";', { path: 'App.tsx' }), []);
});

test('JSX 文字里的代词报错', () => {
  assert.ok(rules('<p>大家分的是同一块蛋糕</p>', { path: 'Card.jsx' }).includes('W1'));
});

test('规则文件里的非标准强度词和“必须尽量”报错', () => {
  const found = rules('提交前应运行测试。必须尽量写单元测试。改完应该更新文档。不要直接推送。', { path: 'AGENTS.md' });
  assert.ok(found.includes('I2'));
  assert.ok(found.filter((r) => r === 'I1').length >= 4);
});

test('“必须、不得、宜”和“应用、对应”不报强度词', () => {
  assert.deepEqual(rules('提交前必须运行测试。不得直接推送。宜写单元测试。在应用里打开对应的页面。', { path: 'AGENTS.md' }), []);
});

test('直角引号报错', () => {
  assert.ok(rules('点击「保存」。', { profile: 'for-document' }).includes('G17'));
});

test('对话里的感叹号报错', () => {
  assert.ok(rules('已经改好了！', { profile: 'for-chat' }).includes('C3'));
});

test('Markdown 里的代码、链接和反例不检查', () => {
  const md = '运行 `进行测试` 命令。\n- ✗ 对数据进行分析。\n```\n我们进行优化\n```\n见[文档](https://example.com/进行)。';
  assert.deepEqual(rules(md, { profile: 'for-document' }), []);
});

test('stc-disable-next-line 跳过下一行', () => {
  const md = '<!-- stc-disable-next-line -->\n我们进行了大量工作。\n本周上线了导出功能。';
  assert.deepEqual(rules(md, { profile: 'for-document' }), []);
});

test('引号里的词视为引用，不查词表', () => {
  assert.deepEqual(rules('常见的程度词有“非常、显著、大幅”。', { profile: 'for-document' }), []);
});

const warnings = (text, opts) => lintText(text, opts).issues.filter((x) => x.rule === 'G20').map((x) => x.match);

test('括号里的排除说明和结尾自证给 G20 警告', () => {
  assert.deepEqual(warnings('午餐：西红柿炒鸡蛋（没有东坡肉）。', { profile: 'for-document' }), ['（没有东坡肉）']);
  assert.deepEqual(warnings('本次改用 A 方案（没有用 B 方案）。', { profile: 'for-document' }), ['（没有用 B 方案）']);
  assert.deepEqual(warnings('文件已清理，已确认不含客户信息。', { profile: 'for-document' }), ['已确认不含']);
});

test('不在括号里的排除说明和引号里的提法不报 G20', () => {
  assert.deepEqual(warnings('报价 1200 元，不含税。', { profile: 'for-document' }), []);
  assert.deepEqual(warnings('常见的多余说明有“（没有东坡肉）”这种写法。', { profile: 'for-document' }), []);
  assert.deepEqual(warnings('导出完成（共 320 行）。', { profile: 'for-document' }), []);
});

test('“不仅是……更是”口号句式报错', () => {
  assert.ok(rules('这不仅是一次更新，更是一次蜕变。', { profile: 'for-document' }).includes('G7'));
});
