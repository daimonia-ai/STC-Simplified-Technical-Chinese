// Reads JSX element trees from .tsx and .jsx text for the title echo check (W9).
// It does not run or fully parse the code. A region it cannot read is skipped, never guessed.
//
// Node shapes:
//   element { type: 'element', tag, props: [{ name, value }], children, nested, start, end }
//   text    { type: 'text', text, start }
//   expr    { type: 'expr', strings, tokens, nested, start, end }   a { ... } container
// `nested` holds elements found inside attribute values and containers. They are separate
// trees, not children of the element. `strings` lists the string literals at the container's
// own level, and `tokens` counts its tokens (0 for a comment-only container).

const TAG = /[A-Za-z_$][\w$.:-]*/y;
const NAME = /[A-Za-z_$][\w$:.-]*/y;
const WORD = /[\w$]+/y;
const CLOSING = /<\/\s*([A-Za-z_$][\w$.:-]*)?\s*>/y;
// After these words a "<" starts JSX. After any other word it is a comparison or a type argument.
const JSX_AFTER = new Set(['return', 'case', 'default', 'else', 'do', 'yield', 'await', 'throw', 'typeof', 'void', 'in', 'of']);
// After these a "/" starts a regular expression. After a name, a number or ")" it divides.
const REGEX_AFTER = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'yield', 'await']);
const BEFORE_REGEX = '(,=:[!&|?{};~+-*%<>^';
const BEFORE_JSX = '(,=:?[!&|{;';

const fail = () => { throw new Error('unreadable JSX'); };

// Every attempt to read an element or a container costs one unit. A "<" that is not JSX can send the
// reader ahead through the rest of the file again and again, so the work has a limit.
const USED_UP = new Error('JSX reading limit reached');
let budget = 0;
let failed = new Set();
const spend = () => { budget -= 1; if (budget < 0) throw USED_UP; };

function skipSpace(text, from) {
  let i = from;
  while (i < text.length) {
    if (/\s/.test(text[i])) i += 1;
    else if (text.startsWith('//', i)) { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end; }
    else if (text.startsWith('/*', i)) { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 2; }
    else break;
  }
  return i;
}

// Index of the closing quote, or -1 when the string does not end on its line.
function endOfString(text, start) {
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === '\\') i += 1;
    else if (text[i] === text[start]) return i;
    else if (text[i] === '\n') return -1;
  }
  return -1;
}

// Index after the flags of a regular expression literal, or -1 when it does not end on its line.
function endOfRegex(text, start) {
  let inClass = false;
  for (let i = start + 1; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\n') return -1;
    if (c === '\\') i += 1;
    else if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) {
      let end = i + 1;
      while (/[a-z]/.test(text[end] ?? '')) end += 1;
      return end;
    }
  }
  return -1;
}

// Scans JavaScript from `from`. With `inBraces`, stops at the "}" that closes the container.
// Returns the index of that "}" and what the region holds.
function scanJs(text, from, inBraces, out = { end: text.length, elements: [], strings: [], tokens: 0 }) {
  spend();
  let depth = 0;
  let prev = { char: '', word: '' };
  let i = from;
  while (i < text.length) {
    const next = skipSpace(text, i);
    if (next !== i) { i = next; continue; }
    const c = text[i];
    if (c === '}' && inBraces && depth === 0) { out.end = i; return out; }
    out.tokens += 1;
    if (c === '"' || c === "'") {
      const end = endOfString(text, i);
      if (end > 0) {
        out.strings.push({ value: text.slice(i + 1, end), start: i + 1, template: false });
        i = end + 1;
        prev = { char: c, word: '' };
        continue;
      }
    } else if (c === '`') {
      try {
        i = scanTemplate(text, i, out);
        prev = { char: c, word: '' };
        continue;
      } catch (error) {
        if (error === USED_UP) throw error;
        /* an unreadable template: go on character by character */
      }
    } else if (c === '/' && (prev.char === '' || BEFORE_REGEX.includes(prev.char) || REGEX_AFTER.has(prev.word))) {
      const end = endOfRegex(text, i);
      if (end > 0) { i = end; prev = { char: ')', word: '' }; continue; }
    } else if (c === '<' && (prev.char === '' || BEFORE_JSX.includes(prev.char) || JSX_AFTER.has(prev.word))
      && /[A-Za-z_$>]/.test(text[i + 1] ?? '')) {
      try {
        const element = parseElement(text, i);
        out.elements.push(element);
        i = element.end;
        prev = { char: ')', word: '' };
        continue;
      } catch (error) {
        if (error === USED_UP) throw error;
        /* not JSX: a type argument or an operator */
      }
    } else if (/[\w$]/.test(c)) {
      WORD.lastIndex = i;
      const word = WORD.exec(text)[0];
      i += word.length;
      prev = { char: word.at(-1), word: /^\d/.test(word) ? '' : word };
      continue;
    } else if (c === '=' && text[i + 1] === '>') {
      i += 2;
      prev = { char: '=', word: '' };
      continue;
    } else if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
    }
    prev = { char: c, word: '' };
    i += 1;
  }
  if (inBraces) fail();
  return out;
}

// Reads a template literal and the expressions inside it. Returns the index after the closing backtick.
function scanTemplate(text, start, out) {
  let hasExpression = false;
  for (let i = start + 1; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\\') i += 1;
    else if (c === '`') {
      out.strings.push({ value: text.slice(start + 1, i), start: start + 1, template: hasExpression });
      return i + 1;
    } else if (c === '$' && text[i + 1] === '{') {
      hasExpression = true;
      const inner = scanJs(text, i + 2, true);
      out.elements.push(...inner.elements);
      i = inner.end;
    }
  }
  return fail();
}

// Skips the type arguments in <Select<string> ...>. Returns the index after the closing ">".
function skipTypeArguments(text, start) {
  let depth = 0;
  for (let i = start; i < text.length && i - start < 300; i += 1) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const end = endOfString(text, i);
      if (end < 0) fail();
      i = end;
    } else if (c === '<') {
      depth += 1;
    } else if (c === '>' && text[i - 1] !== '=') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return fail();
}

// Reading depends only on the text and the start, so a start that failed once fails again.
// Remembering it keeps a run of "<T extends X>" type parameters from being read again and again.
function parseElement(text, start) {
  if (failed.has(start)) fail();
  spend();
  try {
    return readElement(text, start);
  } catch (error) {
    if (error !== USED_UP) failed.add(start);
    throw error;
  }
}

function readElement(text, start) {
  const node = { type: 'element', tag: '', props: [], children: [], nested: [], start, end: 0 };
  let i = start + 1;
  if (text[i] === '>') {
    i += 1;
  } else {
    TAG.lastIndex = i;
    const tag = TAG.exec(text);
    if (!tag) fail();
    node.tag = tag[0];
    i += node.tag.length;
    if (text[i] === '<') i = skipTypeArguments(text, i);
    for (;;) {
      i = skipSpace(text, i);
      if (text.startsWith('/>', i)) { node.end = i + 2; return node; }
      if (text[i] === '>') { i += 1; break; }
      if (text[i] === '{') {
        // A spread attribute, { ...props }.
        const inner = scanJs(text, i + 1, true);
        node.nested.push(...inner.elements);
        i = inner.end + 1;
        continue;
      }
      NAME.lastIndex = i;
      const name = NAME.exec(text);
      if (!name) fail();
      i += name[0].length;
      const prop = { name: name[0], value: null };
      const equals = skipSpace(text, i);
      if (text[equals] === '=') {
        i = skipSpace(text, equals + 1);
        if (text[i] === '"' || text[i] === "'") {
          const end = text.indexOf(text[i], i + 1);
          if (end < 0) fail();
          prop.value = { kind: 'string', text: text.slice(i + 1, end), start: i + 1 };
          i = end + 1;
        } else if (text[i] === '{') {
          const inner = scanJs(text, i + 1, true);
          prop.value = { kind: 'expr', strings: inner.strings, tokens: inner.tokens, start: i + 1 };
          node.nested.push(...inner.elements);
          i = inner.end + 1;
        } else if (text[i] === '<') {
          const child = parseElement(text, i);
          node.nested.push(child);
          i = child.end;
        } else fail();
      }
      node.props.push(prop);
    }
  }
  for (;;) {
    if (i >= text.length) fail();
    if (text.startsWith('</', i)) {
      CLOSING.lastIndex = i;
      const closing = CLOSING.exec(text);
      if (!closing || (closing[1] ?? '') !== node.tag) fail();
      node.end = i + closing[0].length;
      return node;
    }
    if (text[i] === '<') {
      const child = parseElement(text, i);
      node.children.push(child);
      i = child.end;
    } else if (text[i] === '{') {
      const inner = scanJs(text, i + 1, true);
      node.children.push({ type: 'expr', strings: inner.strings, tokens: inner.tokens, nested: inner.elements, start: i + 1, end: inner.end });
      i = inner.end + 1;
    } else {
      let end = i;
      while (end < text.length && text[end] !== '<' && text[end] !== '{') end += 1;
      node.children.push({ type: 'text', text: text.slice(i, end), start: i });
      i = end;
    }
  }
}

/**
 * The JSX element trees in `text`. Unreadable regions give no tree. When the work limit is
 * reached, the trees read so far are returned.
 */
export function jsxRoots(text) {
  const found = { end: text.length, elements: [], strings: [], tokens: 0 };
  budget = 1000 + text.length * 2;
  failed = new Set();
  try {
    scanJs(text, 0, false, found);
  } catch { /* keep the trees read before the failure */ }
  return found.elements;
}
