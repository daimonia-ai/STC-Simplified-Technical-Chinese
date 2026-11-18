import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsxRoots } from '../check/src/jsx.mjs';

const tags = (nodes) => nodes.filter((node) => node.type === 'element').map((node) => node.tag);

test('reads elements, attributes, text and containers with their source offsets', () => {
  const code = '<section id="a" hidden><h2>团队成员</h2><p>{t("查看", "View")}</p></section>';
  const [root] = jsxRoots(code);
  assert.equal(root.tag, 'section');
  assert.deepEqual(root.props.map((prop) => prop.name), ['id', 'hidden']);
  assert.equal(root.props[0].value.text, 'a');
  assert.equal(root.props[1].value, null);
  assert.deepEqual(tags(root.children), ['h2', 'p']);
  const [heading, paragraph] = root.children;
  assert.equal(heading.children[0].text, '团队成员');
  assert.equal(heading.children[0].start, code.indexOf('团队成员'));
  const [container] = paragraph.children;
  assert.equal(container.type, 'expr');
  assert.deepEqual(container.strings.map((item) => [item.value, item.start]), [['查看', code.indexOf('查看')], ['View', code.indexOf('View')]]);
});

test('reads fragments, self-closing tags and member tags', () => {
  const [root] = jsxRoots('<><Icon name="x" /><DialogPrimitive.Title>标题</DialogPrimitive.Title></>');
  assert.equal(root.tag, '');
  assert.deepEqual(tags(root.children), ['Icon', 'DialogPrimitive.Title']);
  assert.deepEqual(root.children[0].children, []);
});

test('a ">" or a nested element inside an attribute value does not end the tag', () => {
  const [root] = jsxRoots('<Btn onClick={() => go(1)} icon={<Icon name="x" />} {...rest} disabled>保存</Btn>');
  assert.deepEqual(root.props.map((prop) => prop.name), ['onClick', 'icon', 'disabled']);
  assert.equal(root.children[0].text, '保存');
  // The element inside the attribute is a separate tree, not a child.
  assert.deepEqual(tags(root.nested), ['Icon']);
  assert.deepEqual(tags(root.children), []);
});

test('elements inside containers are separate trees: .map, && and ternaries', () => {
  const [root] = jsxRoots('<ul>{rows.map((r) => <li key={r}>项</li>)}{ok && <b>好</b>}{x ? <i>甲</i> : <u>乙</u>}</ul>');
  const containers = root.children.filter((node) => node.type === 'expr');
  assert.deepEqual(containers.map((node) => tags(node.nested)), [['li'], ['b'], ['i', 'u']]);
});

test('a comment-only container has no tokens, a container with code has some', () => {
  const [root] = jsxRoots('<p>{/* note */}{count}{"文字"}</p>');
  assert.deepEqual(root.children.map((node) => node.tokens > 0), [false, true, true]);
  assert.deepEqual(root.children[2].strings.map((item) => item.value), ['文字']);
});

test('type arguments, generics, comparisons and regular expressions do not start JSX', () => {
  const code = [
    "const [a, setA] = useState<string>('');",
    'const f = <T,>(x: T) => x;',
    'function g<T extends object>(x: T) { return x; }',
    'if (a < b && c > d) { s = s.replace(/"/g, \'\'); }',
    'const el = <Select<string> value="a"><Opt>甲</Opt></Select>;',
  ].join('\n');
  const roots = jsxRoots(code);
  assert.deepEqual(tags(roots), ['Select']);
  assert.deepEqual(tags(roots[0].children), ['Opt']);
  assert.deepEqual(roots[0].props.map((prop) => prop.name), ['value']);
});

test('a regular expression can hold a backtick or a brace without opening a template or closing a container', () => {
  assert.deepEqual(tags(jsxRoots('const re = /`/g;\nconst a = <h2>团队成员</h2>;')), ['h2']);
  const [root] = jsxRoots('<p>{s.replace(/}/g, "")}</p>');
  assert.equal(root.children.length, 1);
  assert.deepEqual(root.children[0].strings.map((item) => item.value), ['']);
  // After a name or a closing parenthesis, a slash divides.
  assert.deepEqual(tags(jsxRoots('const n = a / b / c;\nconst m = (a + b) / 2;\nconst x = <h2>团队成员</h2>;')), ['h2']);
});

test('JSX can follow return, an arrow, a ternary, a logical operator or an assignment', () => {
  const code = [
    'function A() { return <h1>甲</h1>; }',
    'const B = () => <h2>乙</h2>;',
    'const C = ok ? <h3>丙</h3> : <h4>丁</h4>;',
    'const D = ok && <h5>戊</h5>;',
    'const E = (<h6>己</h6>);',
  ].join('\n');
  assert.deepEqual(tags(jsxRoots(code)), ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
});

test('strings, templates and comments hide JSX-like text', () => {
  const code = "const s = '<h2>团队成员</h2>'; // <p>x</p>\n/* <b>y</b> */\nconst t = `<i>${a}</i> <u>`;";
  assert.deepEqual(jsxRoots(code), []);
});

test('a template literal with ${} can hold JSX', () => {
  const code = 'const t = `a ${ok ? <b>好</b> : null} b`;';
  assert.deepEqual(tags(jsxRoots(code)), ['b']);
});

test('apostrophes, quotes, slashes and ">" in JSX text do not break the reader', () => {
  const code = 'const a = cond ? <p>Don\'t "panic" http://example.com > 3 &amp; more</p> : null;\nconst b = <h2>团队成员</h2>;';
  const roots = jsxRoots(code);
  assert.deepEqual(tags(roots), ['p', 'h2']);
  assert.equal(roots[0].children[0].text, 'Don\'t "panic" http://example.com > 3 &amp; more');
});

test('comments inside tags and between children are skipped', () => {
  const [root] = jsxRoots('<a /* c */ href="x" // line\n>文字{/* note */}</a>');
  assert.deepEqual(root.props.map((prop) => prop.name), ['href']);
  assert.equal(root.children[0].text, '文字');
});

test('unreadable markup gives no tree and no error', () => {
  for (const code of ['<div><p>x</div>', '<div', '<a b=>x</a>', '<div>{open', 'const t = `abc', '<div></span>', '<>x</div>']) {
    assert.deepEqual(jsxRoots(code), [], code);
  }
});

test('an unreadable element does not hide the elements after it', () => {
  const code = 'const a = <div><p>x</div>;\nconst b = <h2>团队成员</h2>;';
  assert.deepEqual(tags(jsxRoots(code)), ['h2']);
});

test('many type parameters that look like tags are read in linear time', () => {
  const generics = 'const f = <T extends object>(x: T) => x;\n'.repeat(5000);
  const started = performance.now();
  assert.deepEqual(jsxRoots(`${generics}const A = () => <h2>团队成员</h2>;`).map((node) => node.tag), ['h2']);
  assert.ok(performance.now() - started < 1500);
});

test('a large file is read quickly', () => {
  const row = '<div className="card" onClick={() => go(1)}><h2>{t("团队成员", "Team")}</h2><p>查看和管理团队成员</p>{ok && <b>好</b>}</div>\n';
  const started = performance.now();
  const [root] = jsxRoots(`export const A = () => (\n<section>\n${row.repeat(4000)}</section>);`);
  assert.equal(root.children.filter((node) => node.type === 'element').length, 4000);
  assert.ok(performance.now() - started < 1500);
});
