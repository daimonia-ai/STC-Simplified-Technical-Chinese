import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lintText } from '../check/src/core.mjs';

const check = (text, path = 'card.html', profile = 'for-web-dev') => lintText(text, { path, profile }).issues;
const pronouns = (text, path, profile) => check(text, path, profile).filter((issue) => ['W2', 'W10'].includes(issue.rule));

for (const [name, markup] of [
  ['HTML', (title, body) => `<section>\n<h2>${title}</h2>\n<p>${body}</p>\n</section>`],
  ['Markdown', (title, body) => `## ${title}\n\n${body}`],
]) {
  const path = name === 'HTML' ? 'card.html' : 'card.md';
  test(`${name}: reader-voice titles and mixed descriptions require changes`, () => {
    for (const [title, body] of [
      ['发给我的 Agent', '交给你的 Agent 来读'],
      ['我的订单', '你还没有下过单'],
      ['我的订单', '您还没有下过单'],
      ['My orders', 'View your orders.'],
    ]) {
      const issues = pronouns(markup(title, body), path);
      assert.deepEqual(issues.map((x) => [x.rule, x.level]), [['W2', 'error'], ['W10', 'error']]);
      assert.ok(issues[1].related.line < issues[1].line);
    }
  });
  test(`${name}: corrected titles and descriptions pass`, () => {
    for (const [title, body] of [
      ['发给你的 Agent', '交给你常用的 Agent 来读'],
      ['你的订单', '还没有订单'],
      ['订单', '你还没有下过单'],
      ['Your orders', 'View your orders.'],
    ]) assert.deepEqual(check(markup(title, body), path), []);
  });
  test(`${name}: different headings do not share a reader-voice check`, () => {
    assert.equal(pronouns(markup('我', '产品助手') + '\n' + markup('设置', '选择你的偏好'), path)
      .filter((x) => x.rule === 'W10').length, 0);
  });
  test(`${name}: direct user quotations retain their pronouns`, () => {
    const text = markup('你的输入', '用户写道：“我想查看我的订单”。');
    assert.deepEqual(pronouns(text, path), []);
  });
}

test('menus and code strings reject unquoted reader possessives without a description', () => {
  assert.deepEqual(pronouns('<nav><a>我的订单</a></nav>').map((x) => x.rule), ['W2']);
  assert.deepEqual(pronouns('const label = "我的订单";', 'menu.tsx').map((x) => x.rule), ['W2']);
  assert.deepEqual(pronouns('const label = "My orders";', 'menu.tsx').map((x) => x.rule), ['W2']);
  assert.deepEqual(check('<nav><a>你的订单</a><a>订单</a></nav>'), []);
});

test('HTML units stop at their parent, nested cards, and the next sibling heading', () => {
  const html = '<h1>我</h1><section><h2>设置</h2><p>你的设置</p></section>'
    + '<section><h2>我</h2></section><p>你的设置</p>'
    + '<section><h2>我</h2><h3>设置</h3><p>你的设置</p></section>';
  assert.deepEqual(pronouns(html), []);
});

test('inline markup, nested description elements, and encoded text retain source positions', () => {
  const html = '<section>\r\n  <h2>我<strong>的</strong>订单</h2>\r\n  <div><p>&#20320;的订单</p></div>\r\n</section>';
  const [first, mixed] = pronouns(html);
  assert.equal(first.rule, 'W2');
  assert.deepEqual([first.line, first.col], [2, 7]);
  assert.equal(mixed.rule, 'W10');
  assert.deepEqual([mixed.line, mixed.col], [3, 11]);
});

test('HTML ignores attributes, comments, scripts, styles, code, and user quote elements', () => {
  const html = '<section data-title="我的订单"><h2>你的订单</h2><!-- 我的订单 -->'
    + '<script>const example = "<h2>我的订单</h2>";</script><style>.my { color: red }</style>'
    + '<pre>我的订单</pre><code>my</code><q>我的订单</q><blockquote>my orders</blockquote>'
    + '<p>&ldquo;我的订单&rdquo; &quot;My orders&quot;</p></section>';
  assert.deepEqual(pronouns(html), []);
});

test('Markdown ignores fences, inline code, links, comments, disabled lines, and bad examples', () => {
  const md = '## 你的订单\n\n`我的订单`\n```html\n<h2>我的订单</h2>\n```\n'
    + '[订单](https://example.com/my)\n<!-- 我的订单 -->\n✗ 我的订单\n'
    + '<!-- stc-disable-next-line -->\n我的订单';
  assert.deepEqual(pronouns(md, 'card.md'), []);
});

test('setext headings and English-only headings form separate Markdown units', () => {
  assert.deepEqual(pronouns('我\n===\n\nAccount\n---\n\nyour account', 'card.md'), []);
  assert.ok(pronouns('My orders\n---\n\nYour orders', 'card.md').some((x) => x.rule === 'W10'));
});

test('English pronouns match complete words without case sensitivity', () => {
  assert.equal(pronouns('<h2>MY orders</h2><p>YOUR orders</p>').length, 2);
  assert.deepEqual(pronouns('<h2>MySQL and my_orders</h2><p>Yourself</p>'), []);
  assert.equal(pronouns("<h2>It's my order</h2><p>Your order isn't ready.</p>").length, 2);
});

test('standalone 我 and second-person text are checked in either order', () => {
  for (const [title, body] of [['我', '你的设置'], ['你的设置', '我']]) {
    assert.deepEqual(pronouns(`<h2>${title}</h2><p>${body}</p>`).map((x) => x.rule), ['W10']);
  }
});

test('HTML disable-next-line applies to the rendered copy in both rules', () => {
  assert.deepEqual(pronouns('<section>\n<!-- stc-disable-next-line -->\n<h2>我的订单</h2>\n<p>你的订单</p>\n</section>'), []);
});

test('the publisher can use 我们 while addressing the reader as 你', () => {
  assert.deepEqual(check('<section><h2>你的订单</h2><p>我们会在 3 个工作日内回复。</p></section>'), []);
});

test('UI reader-voice checks do not change chat or document pronoun handling', () => {
  for (const profile of ['for-chat', 'for-document', 'for-instruction-writing']) {
    assert.deepEqual(pronouns('## 我的订单\n\n你的订单', 'note.md', profile), []);
  }
});

test('CLI reports mixed reader voice as 需修改 with both locations and actionable advice', () => {
  const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'check', '--profile', 'for-web-dev'], {
    input: '## 发给我的 Agent\n\n交给你的 Agent 来读', encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /2 处需修改/);
  assert.match(result.stdout, /W10/);
  assert.match(result.stdout, /另一处在第 1 行/);
  assert.match(result.stdout, /改法：/);
});
