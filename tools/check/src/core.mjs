// Checks text segments against STC rules and the avoid list.
import { readFileSync } from 'node:fs';
import { issueAdvice } from './advice.mjs';
import { segmentsFromCode, segmentsFromMarkdown, isCodeFile } from './extract.mjs';
import { antiEchoCandidates } from './anti-echo.mjs';

export const PROFILES = ['for-chat', 'for-document', 'for-web-dev', 'for-instruction-writing'];

const TYPE_RULE = {
  虚动词: 'G4',
  程度词: 'G5',
  模糊量词: 'G5',
  含糊动词: 'G5',
  营销词: 'G6',
  行话: 'G6',
  套话: 'G6',
  口号句式: 'G7',
  翻译腔: 'G3',
  冗余: 'G3',
  强度词: 'I1',
};

// These entries depend on context (for example 部分 meaning "a section"), so they are warnings.
const CONTEXT_DEPENDENT = ['部分', '优化', '实现', '相关'];

const MAX_SENTENCE = 40;
const CJK = '\\u4e00-\\u9fff';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function loadDictionary() {
  const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
  return { avoid: read('avoid') };
}

function compileEntry(entry) {
  const patterns = [];
  for (let alt of entry.avoid.split(' / ')) {
    alt = alt.replace(/（[^）]*）/g, '').trim();
    alt = alt.split(' + ')[0].trim();
    if (alt.startsWith('不是 X')) {
      patterns.push(/不是[^。！？\n]{1,30}?而是/g);
    } else if (alt.includes('……')) {
      const [head, tail] = alt.split('……');
      patterns.push(new RegExp(`${escape(head)}[^。！？\\n]{0,30}?${escape(tail)}`, 'g'));
    } else if (alt === '进行') {
      patterns.push(/进行(?!中)/g);
    } else if (alt === '应') {
      // Modal 应 only: skip 应用、对应、响应、应对 and the like, and 不应 (its own entry).
      patterns.push(/(?<![不对相响适回供答呼反])应(?![用对答急聘该当变])/g);
    } else {
      patterns.push(new RegExp(escape(alt), 'g'));
    }
  }
  return patterns;
}

export function detectProfile(path) {
  const base = path.split(/[\\/]/).pop() ?? '';
  if (/^(AGENTS|CLAUDE|SKILL)\.md$/i.test(base)) return 'for-instruction-writing';
  if (isCodeFile(base)) return 'for-web-dev';
  return 'for-document';
}

export function segmentsFor(path, text) {
  return isCodeFile(path) ? segmentsFromCode(text) : segmentsFromMarkdown(text);
}

function locate(segment, index) {
  const before = segment.text.slice(0, index);
  const newlines = before.split('\n').length - 1;
  if (newlines === 0) return { line: segment.line, col: segment.col + index };
  return { line: segment.line + newlines, col: index - before.lastIndexOf('\n') };
}

function sentenceLength(sentence) {
  const cjk = (sentence.match(new RegExp(`[${CJK}]`, 'g')) || []).length;
  const words = (sentence.match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + words;
}

/** Returns a sorted list of issues: { line, col, rule, level, message, match }. */
export function lintSegments(segments, profile, dictionary) {
  const issues = [];
  const entries = dictionary.avoid
    .filter((e) => !e.profiles || e.profiles.includes(profile))
    .map((e) => ({ entry: e, patterns: compileEntry(e), soft: CONTEXT_DEPENDENT.some((p) => e.avoid.startsWith(p)) }));

  const add = (segment, index, rule, level, message, match, entry) => {
    issues.push({ ...locate(segment, index), rule, level, message, match, ...issueAdvice(rule, message, entry, match) });
  };
  const scan = (segment, regex, fn, text = segment.text) => {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text))) fn(m);
  };

  let usesNi = false;
  let usesNin = false;

  for (const original of segments) {
    // Text inside “” or ‘’ is a quotation or a mention of a word, so word-level rules skip it.
    const segment = { ...original, text: original.text.replace(/“[^”\n]*”|‘[^’\n]*’/g, (s) => ' '.repeat(s.length)) };
    for (const { entry, patterns, soft } of entries) {
      const rule = entry.type === '人称代词' ? (profile === 'for-web-dev' ? 'W1' : 'D1') : TYPE_RULE[entry.type] ?? 'G3';
      for (const pattern of patterns) {
        scan(segment, pattern, (m) =>
          add(segment, m.index, rule, soft ? 'warning' : 'error', `${entry.type}：${entry.why}。推荐写法：${entry.use}`, m[0], entry),
        );
      }
    }

    if (profile === 'for-web-dev') {
      scan(segment, /他们|她们|它们|咱们|(?<!其)[他她它](?!们)/g, (m) =>
        add(segment, m.index, 'W1', 'error', '界面文字不得使用复数人称代词和第三人称代词，要写名称', m[0]),
      );
      if (/您/.test(segment.text)) usesNin = true;
      if (/你(?!们)/.test(segment.text)) usesNi = true;
    }
    if (profile === 'for-document') {
      scan(segment, /(?<!其)[他她它]们?/g, (m) =>
        add(segment, m.index, 'D1', 'error', '文档的主语必须写名称，不写“他、她、它”', m[0]),
      );
    }
    if (profile === 'for-instruction-writing') {
      scan(segment, /必须(?:尽量|尽可能|考虑|避免)/g, (m) =>
        add(segment, m.index, 'I2', 'error', '“必须”不得与“尽量、尽可能、考虑、避免”连用；表达推荐写“宜”', m[0]),
      );
    }
    if (profile === 'for-chat') {
      scan(segment, /[！!]/g, (m) => add(segment, m.index, 'C3', 'error', '对话里不得使用感叹号', m[0]));
    }

    for (const candidate of antiEchoCandidates(segment.text, profile)) {
      add(segment, candidate.index, 'G20', 'warning', candidate.message, candidate.match);
    }

    scan(original, /[「」『』]/g, (m) =>
      add(segment, m.index, 'G17', 'error', '引号必须使用全角双引号“”和单引号‘’，不使用直角引号', m[0]),
    );
    scan(original, new RegExp(`"[^"\\n]*[${CJK}][^"\\n]*"`, 'g'), (m) =>
      add(segment, m.index, 'G17', 'warning', '中文里的引号宜使用全角双引号“”', m[0]),
    );
    scan(original, new RegExp(`[${CJK}][A-Za-z0-9]|[A-Za-z0-9][${CJK}]`, 'g'), (m) =>
      add(segment, m.index, 'G19', 'warning', '中文与英文、数字之间宜空一格', m[0]),
    );

    let start = 0;
    for (const part of original.text.split(/[。！？；|\n]/)) {
      const length = sentenceLength(part);
      if (length > MAX_SENTENCE) {
        add(segment, start, 'G12', 'warning', `这一句 ${length} 个字，宜不超过 ${MAX_SENTENCE} 个字`, part.trim().slice(0, 12) + '……');
      }
      start += part.length + 1;
    }
  }

  if (usesNi && usesNin) {
    issues.push({ line: segments[0]?.line ?? 1, col: 1, rule: 'W2', level: 'warning', message: '“你”和“您”必须二选一，全站统一', match: '你 / 您' });
  }

  return issues.sort((a, b) => a.line - b.line || a.col - b.col);
}

export function lintText(text, { path = 'stdin.md', profile, dictionary = loadDictionary() } = {}) {
  const chosen = profile ?? detectProfile(path);
  const lines = text.split(/\r?\n/);
  const issues = lintSegments(segmentsFor(path, text), chosen, dictionary).map((issue) => ({
    ...issueAdvice(issue.rule, issue.message, undefined, issue.match), ...issue, context: lines[issue.line - 1] ?? '',
  }));
  return { profile: chosen, issues };
}
