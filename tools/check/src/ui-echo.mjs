// Title echo: the first description under a block title that repeats the title (W9, G20).
// HTML and Markdown keep titles apart from the text below them. Strings in code and JSON files
// have no title level, so they are not read here.
import { isCodeFile, isJsonFile, segmentsFromMarkdown } from './extract.mjs';
import { antiEchoCandidates, UI_ECHO_ADVICE } from './anti-echo.mjs';
import { htmlUnits, markdownUnits } from './ui-pronouns.mjs';

const HAN = '\\u4e00-\\u9fff';
const HEADING = /^h[1-6]$/;
// A description is a one-line explanation. A longer paragraph is body copy.
const MAX_DESCRIPTION = 80;
// W9 keeps these on the screen: readings, empty states, errors, risks, and limits such as price or permission.
const KEEP = /[0-9０-９]|还没有|没有|暂无|尚无|尚未|无法|不能|不可|不含|不包含|仅|只有|失败|错误|出错|异常|恢复|撤销|风险|警告|注意|权限|必须/;
// Block-level tags that hold a description. A button or list item under a title is not one.
const DESCRIPTION_TAGS = new Set(['p', 'div']);
const MESSAGE = '区块标题下的说明可能复述标题：按 W9，删掉；只解释这块是什么、怎么读的，收进提示';

const runs = (text) => text.match(new RegExp(`[${HAN}]+`, 'g')) ?? [];
const words = (text) => {
  const grams = new Set();
  for (const run of runs(text)) {
    for (let i = 0; i + 1 < run.length; i += 1) grams.add(run.slice(i, i + 2));
  }
  return grams;
};

// Compare two-character words, so "设置通知" still matches the title "通知设置".
// A description repeats its title when both hold:
// 1. It holds at least 60% of the title's words. Latin words in the title count in the total only.
// 2. Those words make up at least 30% of the description. A sentence that only mentions the title
//    among new information is not a repeat.
export function repeatsTitle(title, description) {
  const wanted = words(title);
  if (!wanted.size) return false;
  const total = wanted.size + new Set(title.toLowerCase().match(/[a-z][a-z0-9]+/g) ?? []).size;
  const given = words(description);
  if ([...wanted].filter((word) => given.has(word)).length < Math.ceil(total * 0.6)) return false;
  let covered = 0;
  let length = 0;
  for (const run of runs(description)) {
    const marked = new Set();
    for (let i = 0; i + 1 < run.length; i += 1) {
      if (wanted.has(run.slice(i, i + 2))) marked.add(i).add(i + 1);
    }
    covered += marked.size;
    length += run.length;
  }
  return covered / length >= 0.3;
}

const size = (text) => (text.match(new RegExp(`[${HAN}A-Za-z0-9]`, 'g')) ?? []).length;
const firstSentence = (text) => text.split(/(?<=[。！？!?])/)[0].trim();

function markdownPairs(text, lines) {
  const pairs = [];
  const segments = segmentsFromMarkdown(text, { includeEnglish: true });
  for (const unit of markdownUnits(segments).units) {
    const [first, second, third] = unit;
    const setext = second && second.line === first.line + 1 && /^ {0,3}(?:=+|-+)\s*$/.test(second.text);
    if (!first.markdownHeading && !setext) continue;
    const body = setext ? third : second;
    // Plain paragraph lines only: lists, tables, quotes and markup are not descriptions.
    if (!body || body.markdownHeading || /^\s*(?:[-*+]\s|\d+[.)]\s|\||>|<|!\[)/.test(body.text)) continue;
    // A skipped or disabled line between the title and this line means the description is not adjacent.
    let next = (setext ? second : first).line;
    while (next < lines.length && !lines[next].trim()) next += 1;
    if (next + 1 !== body.line) continue;
    const atx = first.markdownHeading;
    const start = atx ? first.text.match(/^ {0,3}#{1,6}\s*/)[0].length : first.text.search(/\S/);
    pairs.push({
      title: (atx ? first.text.slice(start).replace(/\s+#+\s*$/, '') : first.text.slice(start)).trim(),
      titleAt: { line: first.line, col: first.col + start },
      description: body.text.trim(),
      at: { line: body.line, col: body.col + body.text.search(/\S/) },
    });
  }
  return pairs;
}

function htmlPairs(text, locate) {
  const pairs = [];
  for (const unit of htmlUnits(text).units) {
    const opening = unit[0];
    if (!HEADING.test(opening?.tag ?? '')) continue;
    // collect() wraps a block in two copies of the same boundary node.
    const end = unit.indexOf(opening, 1);
    if (end < 0) continue;
    const title = unit.slice(1, end).map((node) => node.text).join('').replace(/\s+/g, ' ').trim();
    let tag;
    let nodes = [];
    for (const node of unit.slice(end + 1)) {
      if (node.tag === undefined) { nodes.push(node); continue; }
      if (nodes.some((item) => item.text.trim())) break;
      tag = node.tag;
      nodes = [];
    }
    const start = nodes.find((node) => node.text.trim());
    if (!start || !DESCRIPTION_TAGS.has(tag)) continue;
    pairs.push({
      title,
      titleAt: locate(unit[1].offset + (unit[1].text.length - unit[1].text.trimStart().length)),
      description: nodes.map((node) => node.text).join('').replace(/\s+/g, ' ').trim(),
      at: locate(start.offset + (start.text.length - start.text.trimStart().length)),
    });
  }
  return pairs;
}

export function uiEchoIssues(text, path) {
  const markup = /\.html?$/i.test(path);
  if (isJsonFile(path) || (isCodeFile(path) && !markup)) return [];
  const lines = text.split('\n');
  const starts = [];
  const disabled = new Set();
  let offset = 0;
  lines.forEach((line, i) => {
    starts.push(offset);
    if (line.includes('stc-disable-next-line')) disabled.add(i + 2);
    offset += line.length + 1;
  });
  const locate = (position) => {
    const row = starts.findLastIndex((start) => start <= position);
    return { line: row + 1, col: position - starts[row] + 1 };
  };
  const issues = [];
  for (const { title, titleAt, description, at } of markup ? htmlPairs(text, locate) : markdownPairs(text, lines)) {
    if (disabled.has(at.line) || disabled.has(titleAt.line)) continue;
    if (!new RegExp(`[${HAN}]`).test(description) || size(description) > MAX_DESCRIPTION || KEEP.test(description)) continue;
    const match = firstSentence(description);
    if (!repeatsTitle(title, match)) continue;
    // Another Anti-Echo pattern already reports this text. Like that check, ignore quoted words.
    const unquoted = description.replace(/“[^”\n]*”|‘[^’\n]*’/g, (quoted) => ' '.repeat(quoted.length));
    if (antiEchoCandidates(unquoted, 'for-web-dev').length) continue;
    issues.push({
      ...at, rule: 'G20', level: 'warning', match, message: MESSAGE, suggestion: UI_ECHO_ADVICE,
      related: { ...titleAt, match: title },
    });
  }
  return issues;
}
