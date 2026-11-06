#!/usr/bin/env python3
"""Verify published evidence and recompute aggregates. No network or model calls."""
import collections
import hashlib
import json
from pathlib import Path
import random
import statistics

ROOT = Path(__file__).resolve().parent


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def lines(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def equal(actual, expected, label):
    require(abs(actual - expected) < 1e-9, f"{label}: {actual} != {expected}")


def bootstrap(groups, seed, choices=False):
    rng = random.Random(seed)
    samples = []
    for _ in range(10000):
        sample = []
        for group in groups:
            sample.extend(rng.choices(group, k=len(group)) if choices
                          else [rng.choice(group) for _ in group])
        samples.append(statistics.mean(sample))
    samples.sort()
    return [samples[250], samples[9749]]


def cf_metrics(priorities, values):
    require(len(priorities) == len(values), "CF constraint count")
    require(all(type(v) is int and v in (0, 1) for v in values), "CF score range")
    require(set(priorities) <= {"主需", "次需"}, "CF priority")
    csr = round(statistics.mean(values), 2)
    primary = [v for p, v in zip(priorities, values) if p == "主需"]
    secondary = [v for p, v in zip(priorities, values) if p == "次需"]
    if 0 in primary:
        psr = 0
    elif not primary:
        psr = int(csr > .8)
    elif not secondary:
        psr = 1
    else:
        psr = int(.5 + .5 * round(statistics.mean(secondary), 2) > .8)
    return {"CSR": csr, "ISR": int(csr >= 1), "PSR": psr}


def pilot():
    root = ROOT / "pilot-20261021"
    protocol, summary = read(root / "protocol.json"), read(root / "summary.json")
    cases, answers, grades = read(root / "cases.json"), lines(root / "answers.jsonl"), lines(root / "grades.jsonl")
    require(len(cases) == 60 and len(answers) == 180 and len(grades) == 540, "Pilot coverage")
    require(len({c['id'] for c in cases}) == 60, "Duplicate case")
    require([c['id'] for c in cases] == protocol['sample_ids'], "Pilot sample IDs")
    require(collections.Counter(c['benchmark'] for c in cases) == {'cfbench': 30, 'writingbench_zh': 30}, "Benchmark sizes")
    ai = {(a['case_id'], a['arm']): a for a in answers}
    gi = {g['id']: g for g in grades}
    recorded = {r['id']: r for r in read(root / 'scores.json')}
    require(len(ai) == 180 and len(gi) == 540 and len(recorded) == 60, "Duplicate output")
    for arm in protocol['arms']:
        require(digest((root / 'instructions' / f'{arm}.txt').read_bytes()) == protocol['instruction_hashes'][arm], "Instruction hash")
    rows = []
    for case in cases:
        row = {**case, 'arms': {}}
        for arm in protocol['arms']:
            a = ai[(case['id'], arm)]
            require(digest(a['text'].encode()) == a['sha256'], "Answer hash")
            equal(len(a['text']), a['chars'], "Answer length")
            key = case['id'] + '_' + arm
            if case['benchmark'] == 'writingbench_zh':
                scores = []
                for i in range(5):
                    g = gi[key + f'_criterion{i}']
                    require(g['case_id'] == case['id'] and g['arm'] == arm and g['criterion_index'] == i, "Judge assignment")
                    require(digest(g['text'].encode()) == g['raw_sha256'], "Judge hash")
                    text = g['text'].strip()
                    if text.startswith('```'):
                        text = text.split('\n', 1)[1].rsplit('```', 1)[0]
                    parsed = json.loads(text)
                    require(parsed == g['parsed'], "Judge parsing")
                    require(type(parsed['score']) is int and 1 <= parsed['score'] <= 10, "WB score range")
                    scores.append(parsed['score'])
                require(scores == recorded[case['id']]['arms'][arm]['criterion_scores'], "WB criterion scores")
                values = {'score': statistics.mean(scores)}
            else:
                g = gi[key]
                require(g['case_id'] == case['id'] and g['arm'] == arm, "Judge assignment")
                scores = g['parsed']['scores']
                require(scores == recorded[case['id']]['arms'][arm]['constraint_scores'], "CF constraint scores")
                values = cf_metrics(case['priorities'], scores)
            values['answer_chars'] = len(a['text'])
            for name, value in values.items():
                equal(value, recorded[case['id']]['arms'][arm][name], name)
            row['arms'][arm] = values
        rows.append(row)
    output = {}
    for benchmark, expected in summary['benchmarks'].items():
        group = [r for r in rows if r['benchmark'] == benchmark]
        metrics = ['score'] if benchmark == 'writingbench_zh' else ['CSR', 'ISR', 'PSR']
        output[benchmark] = {}
        for arm in protocol['arms']:
            means = {m: statistics.mean(r['arms'][arm][m] for r in group) for m in metrics}
            for name, value in means.items():
                equal(value, expected['arms'][arm]['means'][name], benchmark + '/' + arm + '/' + name)
            output[benchmark][arm] = means
        for reference in ['baseline', 'brief']:
            for metric in metrics + ['answer_chars']:
                strata = collections.defaultdict(list)
                for r in group:
                    strata[r['stratum']].append(r['arms']['stc'][metric] - r['arms'][reference][metric])
                diffs = [d for values in strata.values() for d in values]
                e = expected['paired_differences']['stc-' + reference][metric]
                equal(statistics.mean(diffs), e['mean_difference'], 'Paired difference')
                for actual, value in zip(bootstrap(list(strata.values()), 20261021), e['bootstrap_95_percentile']):
                    equal(actual, value, 'Pilot bootstrap')
    return output


def rewrite():
    root = ROOT / 'rewrite-20261022'
    scores, summary = read(root / 'scores.json'), read(root / 'summary.json')
    answers = lines(root / 'answers.jsonl')
    require(len(scores) == 40 and len(answers) == 80, 'Rewrite coverage')
    require(len({r['id'] for r in scores}) == 40, 'Duplicate rewrite case')
    require(len({(r['case_id'], r['arm']) for r in answers}) == 80, 'Duplicate rewrite answer')
    for a in answers:
        require(digest(a['text'].encode()) == a['sha256'], 'Rewrite answer hash')
    means = {a: statistics.mean(r['arms'][a]['char_sari'] for r in scores) for a in ['brief', 'rewrite_examples']}
    for arm, mean in means.items():
        equal(mean, summary['means'][arm], 'SARI mean')
    diffs = [r['arms']['rewrite_examples']['char_sari'] - r['arms']['brief']['char_sari'] for r in scores]
    equal(statistics.mean(diffs), summary['paired_difference'], 'SARI difference')
    for actual, expected in zip(bootstrap([diffs], 2026102113, choices=True), summary['paired_bootstrap_95']):
        equal(actual, expected, 'SARI bootstrap')
    mapping = read(root / 'preference-mapping.json')
    ratings = collections.defaultdict(list)
    judges = lines(root / 'preference-grades.jsonl')
    require(len(judges) == 8, 'Preference batches')
    for j in judges:
        require(digest(j['text'].encode()) == j['sha256'], 'Preference judge hash')
        text = j['text'].strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[1].rsplit('```', 1)[0]
        items = json.loads(text)['items']
        require(len(items) == 10 and {i['id'] for i in items} == set(mapping[j['id']]), 'Preference items')
        for item in items:
            require(item['winner'] in ['A', 'B', 'tie'], 'Preference winner')
            arm = 'tie' if item['winner'] == 'tie' else mapping[j['id']][item['id']][item['winner']]
            ratings[item['id']].append(arm)
    require(set(ratings) == {r['id'] for r in scores}, 'Preference coverage')
    require(all(len(v) == 2 for v in ratings.values()), 'Two positions per pair')
    outcomes = collections.Counter(v[0] if v[0] == v[1] else 'order_inconsistent' for v in ratings.values())
    expected = read(root / 'preference-summary.json')
    require(dict(outcomes) == expected['stable_outcomes'], 'Preference counts')
    equal((40 - outcomes['order_inconsistent']) / 40, expected['order_consistency'], 'Order consistency')
    equal((outcomes['rewrite_examples'] - outcomes['brief']) / 40, expected['conservative_net_preference'], 'Net preference')
    return {'means': means, 'difference': statistics.mean(diffs), 'preference_outcomes': dict(outcomes)}


def main():
    hashes = read(ROOT / 'checksums.json')
    for relative, expected in hashes.items():
        path = (ROOT / relative).resolve()
        require(path.is_relative_to(ROOT), 'Invalid manifest path')
        require(digest(path.read_bytes()) == expected, 'Checksum: ' + relative)
    print(json.dumps({'pilot': pilot(), 'rewrite': rewrite()}, ensure_ascii=False, indent=2))
    print('Verified: 60 pilot cases, 180 answers, 540 grades; 40 rewrite pairs, 80 answers, 8 paired-order judging batches.')
    print('Aggregates verified from recorded scores. This does not validate model judgments or rerun generation.')


if __name__ == '__main__':
    main()
