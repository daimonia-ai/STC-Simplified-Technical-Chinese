import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintText } from '../check/src/core.mjs';

const effectIssues = (text, path = 'report.md') => lintText(text, {
  path, profile: 'for-document',
}).issues.filter(issue => issue.rule === 'G5' && /^(优化|提升|改善)$/.test(issue.match));

test('文档主题标题中的评估和计划不当作效果宣称', () => {
  for (const text of [
    '# 数据库性能优化评估',
    '## 查询性能提升计划',
    '### 网络连接改善方案 ###',
  ]) assert.deepEqual(effectIssues(text), [], text);
});

test('标题中的效果宣称与具体动作仍须复核', () => {
  for (const text of [
    '# 数据库性能已显著优化',
    '# 已完成查询性能优化方案',
    '# 优化评估流程',
    '# 自动优化评估',
  ]) assert.ok(effectIssues(text).length > 0, text);
});

test('标题例外不扩大到正文或 JSON 字符串', () => {
  assert.ok(effectIssues('数据库性能优化评估').length > 0);
  assert.ok(effectIssues('{"title":"# 数据库性能优化评估"}', 'copy.json').length > 0);
});
