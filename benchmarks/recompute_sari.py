#!/usr/bin/env python3
"""Recompute recorded SARI from local, hash-pinned upstream files. No downloads."""
import argparse
import ast
import collections
import json
from pathlib import Path
import statistics
import typing

from recompute import ROOT, digest, equal, lines, read, require


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mcts', type=Path, required=True, help='Pinned MCTS checkout root')
    parser.add_argument('--easse', type=Path, required=True, help='Pinned EASSE checkout root')
    args = parser.parse_args()
    evidence = ROOT / 'rewrite-20261022'
    manifest = read(evidence / 'sources.json')
    needed = ['dataset/mcts.test.orig'] + [f'dataset/mcts.test.simp.{i}' for i in range(5)]
    for item in manifest:
        if item['path'] in needed or item['path'] == 'easse/sari.py':
            root = args.mcts if item['source'] == 'mcts' else args.easse
            require(digest((root / item['path']).read_bytes()) == item['sha256'], 'Upstream hash: ' + item['path'])
    # Evaluate only named functions from the exact pinned source, without its imports.
    names = {'compute_precision_recall', 'compute_f1', 'compute_micro_sari',
             'extract_ngrams', 'multiply_counter', 'compute_ngram_stats',
             'compute_precision_recall_f1', 'compute_macro_sari'}
    source = args.easse / 'easse/sari.py'
    tree = ast.parse(source.read_text())
    nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
    require({n.name for n in nodes} == names, 'SARI functions')
    scope = {'Counter': collections.Counter, 'List': typing.List, 'NGRAM_ORDER': 4}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), 'exec'), scope)
    tokens = lambda s: ' '.join(c.lower() for c in s if not c.isspace())
    original = (args.mcts / needed[0]).read_text().splitlines()
    references = [(args.mcts / p).read_text().splitlines() for p in needed[1:]]
    require(len(original) == 357 and all(len(r) == 357 for r in references), 'MCTS test coverage')
    answers = {(a['case_id'], a['arm']): a for a in lines(evidence / 'answers.jsonl')}
    scores = {s['id']: s for s in read(evidence / 'scores.json')}
    cases = read(evidence / 'cases.json')
    for case in cases:
        i = case['source_line_1based'] - 1
        require(digest(original[i].encode()) == case['source_sha256'], 'Original sentence')
        for ref, expected in zip(references, case['reference_sha256']):
            require(digest(ref[i].encode()) == expected, 'Reference sentence')
        for arm in ['brief', 'rewrite_examples']:
            answer = answers[(case['id'], arm)]
            require(digest(answer['text'].encode()) == answer['sha256'], 'Answer hash')
            stats = scope['compute_ngram_stats']([tokens(original[i])], [tokens(answer['text'].strip())], [[tokens(r[i])] for r in references])
            sari = 100 * statistics.mean(scope['compute_macro_sari'](*stats, use_f1_for_deletion=True))
            equal(sari, scores[case['id']]['arms'][arm]['char_sari'], 'Per-sentence SARI')
    summary = read(evidence / 'summary.json')
    for arm in ['brief', 'rewrite_examples']:
        indices = [c['source_line_1based'] - 1 for c in cases]
        stats = scope['compute_ngram_stats']([tokens(original[i]) for i in indices], [tokens(answers[(c['id'], arm)]['text'].strip()) for c in cases], [[tokens(r[i]) for i in indices] for r in references])
        value = 100 * statistics.mean(scope['compute_macro_sari'](*stats, use_f1_for_deletion=True))
        equal(value, summary['sensitivity_corpus_sari'][arm], 'Corpus SARI sensitivity')
    print('Verified all 80 per-sentence SARI scores and both corpus sensitivity scores from pinned upstream files.')


if __name__ == '__main__':
    main()
