// Reader voice checks. Structural units keep unrelated cards and headings apart.
import { isCodeFile, segmentsFromCode, segmentsFromMarkdown } from './extract.mjs';

const HEADING = /^h[1-6]$/;
const REGION = new Set(['section', 'article', 'aside', 'nav', 'form', 'dialog', 'li', 'td', 'th']);
const WRAPPER = new Set(['html', 'body', 'main', 'div']);
const BLOCK = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav', 'form', 'dialog', 'li', 'ul', 'ol', 'table', 'tr', 'td', 'th', 'button', 'br', 'hr']);
const OMIT = new Set(['script', 'style', 'pre', 'code', 'q', 'blockquote']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const mask = (value) => ' '.repeat(value.length);
const unquoted = (value) => value.replace(/“[^”]*”|‘[^’]*’|"[^"\n]*"|(?<!\w)'[^'\n]*'(?!\w)/g, mask);

function htmlUnits(text) {
  const root = { tag: '', children: [] };
  const stack = [root];
  // Quoted attributes may contain >. Their values are never treated as visible text.
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^\s<>"'=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?))*\s*\/?>|[^<]+|</g;
  for (const token of text.matchAll(tokens)) {
    const raw = token[0];
    const closing = raw.match(/^<\/([\w:-]+)/);
    const parent = stack.at(-1);
    if (OMIT.has(parent.tag)) {
      if (closing?.[1].toLowerCase() === parent.tag) stack.pop();
      continue;
    }
    if (raw.startsWith('<!')) continue;
    if (closing) {
      const tag = closing[1].toLowerCase();
      const index = stack.findLastIndex((node) => node.tag === tag);
      if (index > 0) stack.length = index;
    } else if (raw.startsWith('<') && raw !== '<') {
      const tag = raw.match(/^<([\w:-]+)/)[1].toLowerCase();
      const node = { tag, children: [], offset: token.index };
      parent.children.push(node);
      if (!VOID.has(tag) && !raw.endsWith('/>')) stack.push(node);
    } else {
      parent.children.push({ text: raw, offset: token.index });
    }
  }
  const collect = (node) => {
    if (node.text !== undefined) return [node];
    if (OMIT.has(node.tag)) return [];
    const contents = node.children.flatMap(collect);
    const boundary = { text: '\n', offset: node.offset };
    return BLOCK.has(node.tag) ? [boundary, ...contents, boundary] : contents;
  };
  const hasHeading = (node) => HEADING.test(node.tag) || node.children?.some(hasHeading);
  const hasRegion = (node) => REGION.has(node.tag) || node.children?.some(hasRegion);
  const units = [];
  const visit = (node) => {
    if (!node.children || OMIT.has(node.tag)) return;
    // A headingless card or dialog still has a reader perspective. Nested
    // semantic regions remain separate; plain layout wrappers stay together.
    if (node.tag && !['html', 'body', 'main'].includes(node.tag)
      && !hasHeading(node) && !node.children.some(hasRegion)) {
      units.push(collect(node));
      return;
    }
    let current;
    for (const child of node.children) {
      if (HEADING.test(child.tag)) {
        current = collect(child);
        units.push(current);
      } else if (hasHeading(child) || hasRegion(child)) {
        // A nested card starts a separate unit, even without a heading.
        current = undefined;
        visit(child);
      } else if (current) {
        current.push(...collect(child));
      } else if (WRAPPER.has(child.tag)) {
        visit(child);
      } else if (child.text?.trim() || child.children) {
        current = collect(child);
        units.push(current);
      }
    }
  };
  visit(root);
  return { segments: collect(root), units };
}

function markdownUnits(segments) {
  const units = [];
  let current;
  let headed = false;
  let previousLine = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const underline = segments[i + 1];
    const heading = /^ {0,3}#{1,6}\s/.test(segment.text)
      || (underline?.line === segment.line + 1 && /^ {0,3}(?:=+|-+)\s*$/.test(underline.text));
    if (heading || !current || (!headed && segment.line > previousLine + 1)) {
      current = [];
      units.push(current);
      headed = heading;
    }
    current.push(segment);
    previousLine = segment.line;
  }
  return { segments, units };
}

export function uiPronounIssues(text, path) {
  const lines = text.split('\n');
  const starts = [];
  let offset = 0;
  const disabled = new Set();
  lines.forEach((line, i) => {
    starts.push(offset);
    if (line.includes('stc-disable-next-line')) disabled.add(i + 2);
    offset += line.length + 1;
  });
  const locate = (position) => {
    let lo = 0;
    let hi = starts.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= position) lo = mid;
      else hi = mid;
    }
    return { line: lo + 1, col: position - starts[lo] + 1 };
  };
  const markup = /\.html?$/i.test(path);
  const extracted = markup ? htmlUnits(text)
    : isCodeFile(path)
      ? { segments: segmentsFromCode(text, { includeEnglish: true }), units: [] }
      : markdownUnits(segmentsFromMarkdown(text, { includeEnglish: true }));
  const render = (segments) => {
    let value = '';
    const positions = [];
    for (const segment of segments) {
      const start = segment.offset ?? starts[segment.line - 1] + segment.col - 1;
      for (const token of segment.text.matchAll(/&(?:quot|apos|ldquo|rdquo|lsquo|rsquo|#\d+|#x[\da-f]+);|[\s\S]/gi)) {
        const raw = token[0];
        const entities = { '&quot;': '"', '&apos;': "'", '&ldquo;': '“', '&rdquo;': '”', '&lsquo;': '‘', '&rsquo;': '’' };
        let decoded = markup ? entities[raw.toLowerCase()] ?? raw : raw;
        if (markup && /^&#/i.test(raw)) {
          const hex = /^&#x/i.test(raw);
          const code = parseInt(raw.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
          decoded = code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : raw;
        }
        value += disabled.has(locate(start + token.index).line) ? mask(decoded) : decoded;
        positions.push(...Array(decoded.length).fill(start + token.index));
      }
      // Markdown lines and code strings are separate pieces of copy.
      if (!markup) { value += '\n'; positions.push(start + segment.text.length); }
    }
    return { text: unquoted(value), positions };
  };
  const issues = [];
  const add = (copy, index, rule, match, message, related) => {
    issues.push({ ...locate(copy.positions[index]), rule, level: 'error', match, message,
      ...(related ? { related } : {}) });
  };
  const visible = render(extracted.segments);
  for (const match of visible.text.matchAll(/我的|\bmy\b/gi)) {
    add(visible, match.index, 'W2', match[0], '界面不得用“我的 / my”替读者说话；读者称“你”，引用用户原话时加引号');
  }
  for (const segments of extracted.units) {
    const copy = render(segments);
    // 我们 names the publishing party; it is not the reader's first-person voice.
    const first = /我(?!们)(?:的)?|\bmy\b/i.exec(copy.text);
    const second = /你(?:的)?|您|\byour\b/i.exec(copy.text);
    if (!first || !second) continue;
    const later = first.index > second.index ? first : second;
    const earlier = later === first ? second : first;
    const related = { ...locate(copy.positions[earlier.index]), match: earlier[0] };
    add(copy, later.index, 'W10', later[0],
      `同一处界面混用了“${first[0]}”和“${second[0]}”（另一处在第 ${related.line} 行）；指读者必须统一用“你 / your”，说明也可省略代词`, related);
  }
  return issues;
}
