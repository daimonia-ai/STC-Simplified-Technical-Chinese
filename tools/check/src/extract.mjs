// Turns a file into text segments to check. Each segment keeps its position in the file.

const CJK = /[一-鿿]/;
const DISABLE = 'stc-disable-next-line';

const mask = (s) => ' '.repeat(s.length);

function markdownQuotationLines(text) {
  const syntaxQuotes = new Set();
  // Metadata delimiters are source syntax; the text inside them still needs review.
  const header = text.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/);
  if (header) {
    const start = header[0].indexOf('\n') + 1;
    let blockIndent = null;
    for (const row of header[1].matchAll(/([^\r\n]*)(?:\r?\n|$)/g)) {
      const raw = row[1];
      const indent = raw.match(/^[ \t]*/)[0].length;
      if (blockIndent !== null) {
        if (!raw.trim() || indent > blockIndent) continue;
        blockIndent = null;
      }
      if (/^[ \t]*[\w.-]+:[ \t]*[|>][+-]?[1-9]?[+-]?[ \t]*(?:#.*)?$/.test(raw)) {
        blockIndent = indent;
        continue;
      }
      const scalar = raw.match(/^([ \t]*[\w.-]+:[ \t]*)("(?:\\[^\r\n]|[^"\\\r\n])*"|'(?:''|[^'\r\n])*')[ \t]*(?:#[^\r\n]*)?$/);
      if (!scalar) continue;
      const first = start + row.index + scalar[1].length;
      syntaxQuotes.add(first);
      syntaxQuotes.add(first + scalar[2].length - 1);
    }
  }

  // A quoted attribute may contain > or span lines. Only its outer quotes are syntax.
  const tags = /<[A-Za-z][\w:-]*(?:\s+(?:[^\s<>"'=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?))*\s*\/?>/g;
  const attributes = /(\s+[^\s<>"'=]+\s*=\s*)(["'])([\s\S]*?)\2/g;
  for (const tag of text.matchAll(tags)) {
    if (header && tag.index < header[0].length) continue;
    for (const attribute of tag[0].matchAll(attributes)) {
      const first = tag.index + attribute.index + attribute[1].length;
      syntaxQuotes.add(first);
      syntaxQuotes.add(first + attribute[3].length + 1);
    }
  }
  const chars = text.split('');
  for (const offset of syntaxQuotes) chars[offset] = ' ';
  return chars.join('').split(/\r?\n/);
}

/** Markdown and plain text: skip code, URLs, comments, and STC's own bad examples (lines with ✗). */
export function segmentsFromMarkdown(text, { includeEnglish = false } = {}) {
  const segments = [];
  const quotationLines = markdownQuotationLines(text);
  let fence = null;
  let inComment = false;
  let skipNext = false;
  text.split(/\r?\n/).forEach((raw, i) => {
    const trimmed = raw.trim();
    if (fence) {
      if (trimmed.startsWith(fence)) fence = null;
      return;
    }
    const open = trimmed.match(/^(```|~~~)/);
    if (open) {
      fence = open[1];
      return;
    }
    if (inComment) {
      if (raw.includes('-->')) inComment = false;
      return;
    }
    if (raw.includes(DISABLE)) {
      skipNext = true;
      return;
    }
    if (skipNext) {
      skipNext = false;
      return;
    }
    if (trimmed.startsWith('<!--')) {
      if (!raw.includes('-->')) inComment = true;
      return;
    }
    if (raw.includes('✗')) return;
    const line = raw
      .replace(/`[^`]*`/g, mask)
      .replace(/https?:\/\/\S+/g, mask)
      .replace(/\]\([^)]*\)/g, (s) => ']' + mask(s.slice(1)));
    if (CJK.test(line) || (includeEnglish && line.trim())) {
      const segment = { line: i + 1, col: 1, text: line };
      const quotationText = line.split('').map((ch, col) => quotationLines[i][col] !== raw[col] ? ' ' : ch).join('');
      if (quotationText !== line) segment.quotationText = quotationText;
      segments.push(segment);
    }
  });
  return segments;
}

/** Code files: keep string literals and JSX text that contain Chinese; skip comments. */
export function segmentsFromCode(text, { includeEnglish = false } = {}) {
  const segments = [];
  let line = 1;
  let col = 1;
  let disabledLine = -1;
  let i = 0;

  const advance = (ch) => {
    if (ch === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  };
  const push = (startLine, startCol, value) => {
    if ((CJK.test(value) || (includeEnglish && value.trim())) && startLine !== disabledLine) segments.push({ line: startLine, col: startCol, text: value });
  };

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      const comment = text.slice(i, end === -1 ? text.length : end);
      if (comment.includes(DISABLE)) disabledLine = line + 1;
      for (const c of comment) advance(c);
      i += comment.length;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const comment = text.slice(i, end === -1 ? text.length : end + 2);
      if (comment.includes(DISABLE)) disabledLine = line + comment.split('\n').length;
      for (const c of comment) advance(c);
      i += comment.length;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const startLine = line;
      const startCol = col;
      let value = '';
      advance(ch);
      i += 1;
      while (i < text.length && text[i] !== ch) {
        if (text[i] === '\\') {
          value += text[i + 1] ?? '';
          advance(text[i]);
          advance(text[i + 1] ?? '');
          i += 2;
          continue;
        }
        if (ch === '`' && text[i] === '$' && text[i + 1] === '{') {
          let depth = 0;
          while (i < text.length) {
            if (text[i] === '{') depth += 1;
            if (text[i] === '}') depth -= 1;
            advance(text[i]);
            i += 1;
            if (depth === 0) break;
          }
          value += '{}';
          continue;
        }
        if (ch !== '`' && text[i] === '\n') break;
        value += text[i];
        advance(text[i]);
        i += 1;
      }
      advance(ch);
      i += 1;
      push(startLine, startCol + 1, value);
      continue;
    }
    if (ch === '>') {
      const startLine = line;
      const startCol = col + 1;
      let j = i + 1;
      while (j < text.length && !'<{};'.includes(text[j])) j += 1;
      const value = text.slice(i + 1, j);
      if ((CJK.test(value) || (includeEnglish && value.trim())) && text[j] === '<') {
        push(startLine, startCol, value);
      }
    }
    advance(ch);
    i += 1;
  }
  return segments;
}

export function isCodeFile(path) {
  return /\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro|html?)$/i.test(path);
}
