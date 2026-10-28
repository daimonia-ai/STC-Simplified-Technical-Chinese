import test from 'node:test';
import assert from 'node:assert/strict';
import { lintText } from '../check/src/core.mjs';

const check = (text) => lintText(text, { path: 'page.md', profile: 'for-web-dev' }).issues;
const quotes = (text) => check(text).filter((issue) => issue.rule === 'G17');

test('Markdown frontmatter and embedded HTML do not report syntax quotes as Chinese punctuation', () => {
  const source = `---
title: "中文规范"
description: "给 AI 用的中文写作规范。"
lead: "写清操作与结果。"
og_image_alt: "中文规范的介绍"
---
<img src="/cover.webp" alt="中文规范的介绍" />
<video aria-label="规范介绍视频"></video>
<video aria-label="使用方法视频"></video>`;
  assert.deepEqual(quotes(source), []);
});

test('Real punctuation and word problems inside quoted metadata still have source positions', () => {
  const source = `---
title: "进行配置"
description: '点击 "保存"'
lead: "点击「保存」"
---`;
  const issues = check(source);
  assert.ok(issues.some((x) => x.rule === 'G4' && x.line === 2 && x.col === 9));
  assert.deepEqual(quotes(source).map((x) => [x.line, x.col, x.match]), [
    [3, 18, '"保存"'], [4, 10, '「'], [4, 13, '」'],
  ]);
});

test('HTML attribute values and adjacent prose keep literal quotation checks', () => {
  const line = `<span title='点击 "保存"'>正文说"完成"。</span>`;
  assert.deepEqual(quotes(line).map((x) => [x.line, x.col, x.match]), [
    [1, line.indexOf('"保存"') + 1, '"保存"'],
    [1, line.indexOf('"完成"') + 1, '"完成"'],
  ]);
});

test('Multiline HTML tags mask only attribute delimiters and preserve body offsets', () => {
  const source = `<img
  alt="中文说明"
  title="条件 > 结果"
/>
请点击"保存"。`;
  assert.deepEqual(quotes(source).map((x) => [x.line, x.col, x.match]), [[5, 4, '"保存"']]);
});

test('YAML-looking body text and prose after frontmatter are not treated as metadata', () => {
  const source = `---
title: "规范"
---
说明: "保存"

---
label: "中文按钮"
---`;
  assert.deepEqual(quotes(source).map((x) => [x.line, x.col, x.match]), [
    [4, 5, '"保存"'], [7, 8, '"中文按钮"'],
  ]);
});

test('Quoted text inside YAML block scalars remains reader-facing text', () => {
  const source = `---
lead: |
  label: "保存"
description: >-
  title: "取消"
title: "规范"
---`;
  assert.deepEqual(quotes(source).map((x) => [x.line, x.col, x.match]), [
    [3, 10, '"保存"'], [5, 10, '"取消"'],
  ]);
});
