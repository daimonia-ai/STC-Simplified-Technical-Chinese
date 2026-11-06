# STC evaluation: methods, results, and limitations

[中文](README.md) | English

**This report documents sampled comparisons of historical STC revisions on Chinese writing, constraint following, and sentence simplification.**

The initial pilot injected the full STC 0.2.3 rules at once and covered 60 writing and constraint-following tasks. A later experiment tested a separate rewrite candidate on 40 Chinese sentences. Both included a short “natural, concise, accurate” instruction as a control.

On these tested configurations and samples, the full-rules revision scored lower in general writing. The later rewrite candidate did not meet its predefined acceptance conditions and did not establish a stable advantage over the brief instruction.

The sections below provide methods, individual outputs, judgments, and limitations for inspection. These are project-run evaluations on subsets of public datasets. No complete benchmark dataset was evaluated, and v0.4.1 was not tested.

## Coverage

| Evaluation | Pinned source | Evaluated subset | Completed work |
|---|---|---|---|
| WritingBench Chinese writing | 1,000 tasks, including 445 Chinese tasks | 5 tasks from each of 6 Chinese domains: 30 tasks | 3 arms, 90 answers, 450 criterion-level judgments |
| CFBench constraint following | 1,000 tasks | 15 easy and 15 hard tasks: 30 tasks | 3 arms, 90 answers, 90 judgments |
| MCTS sentence simplification | 357 test sentences, with 5 references per sentence | 40 fixed test sentences | 2 arms, 80 answers; character-SARI scoring followed by a position-swapped preference check |

The initial 540 judgments are `30 × 3 × 5 + 30 × 3`. They cover 60 distinct questions, not 540 independent samples. The usage examples under [`evals/`](../evals/) are separate from these results.

## Initial pilot: full rules did not improve scores

Run date: October 21, 2026. Tested STC revision: [21ec800](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese/tree/21ec8007cdba765d7d4914395831651a517693f6), package version 0.2.3.

| Metric | Neutral instructions | Neutral + brief instruction | Neutral + full STC |
|---|---:|---:|---:|
| WritingBench mean, 1–10 | 7.26 | 7.28 | 6.89 |
| CFBench mean constraint satisfaction, CSR | 86.9% | 89.1% | 82.7% |
| CFBench all-constraints satisfaction, ISR | 63.3% | 70.0% | 63.3% |
| CFBench priority satisfaction, PSR | 66.7% | 70.0% | 63.3% |

The brief instruction was: “请用自然、简短、准确的中文回答，保留必要信息。” It asks for natural, concise, accurate Chinese while retaining necessary information. Exact inputs for all three arms are in [instructions/](pilot-20261021/instructions/).

Against the brief arm, STC's WritingBench difference was −0.39 points, with a paired 95% sampling interval of −0.59 to −0.21. Its CFBench CSR difference was −6.4 percentage points, with an interval of −16.13 to +1.90. The latter interval includes zero.

Answers did not become consistently shorter. Mean character counts were 4,732.5 versus 4,210.6 for WritingBench, and 470.1 versus 477.2 for CFBench, comparing STC with the brief arm. Counts include punctuation, whitespace, and Markdown. Some short responses asked a question instead of completing the task.

Observed failures included excessive placeholders (`wb_895`), stopping for clarification on conflicting requirements (`cf_8`, `cf_83`), and missing an explicit sentence-count requirement (`cf_846`). These observations do not isolate the causal effect of any one rule.

All generated answers are in [answers.jsonl](pilot-20261021/answers.jsonl); per-question scores are in [scores.json](pilot-20261021/scores.json).

## Simplification: some gains, acceptance conditions not met

Run dates: October 21–22, 2026. The experimental candidate was commit `3015327513686d71e89220ff6cb155946a37b638`; its exact input is preserved in [instructions/](rewrite-20261022/instructions/). It had been adjusted on the same 12 development sentences before using 40 different test sentences. Test row IDs were frozen, but the sampling seed and selection script were not recorded. The selected set can be reused; the selection procedure cannot be reproduced from the record. This candidate differs from the initial full-rules configuration.

| Metric | Brief instruction | STC rewrite candidate | Difference |
|---|---:|---:|---:|
| Mean character-SARI across 40 sentences | 46.43 | 47.76 | +1.33 |

The paired 95% interval was −0.37 to +3.09. The predefined conditions required at least a 2-point gain and a lower interval bound above zero. Neither was met, so the conditional repeat-generation run was not started.

A subsequent exploratory check judged the same 40 answer pairs twice, reversing A/B positions. A win, loss, or tie required agreement across both positions:

| Outcome | Sentences |
|---|---:|
| STC preferred | 9 |
| Brief preferred | 2 |
| Tie | 22 |
| Position-dependent judgment | 7 |

Eight judge calls covered the 40 pairs in both orders. Order consistency was 82.5%, below the predefined 85%; net preference was 17.5%, below 20%. This exploratory check followed SARI scoring and does not replace the failed primary criterion.

SARI used Unicode characters as tokens. The original MCTS paper used Stanford CoreNLP tokenization, so absolute scores cannot be compared directly with its leaderboard. See [metric results](rewrite-20261022/summary.json) and [raw preference judgments](rewrite-20261022/preference-grades.jsonl).

## Method and limitations

- **Model control:** generation and model judging requested `gpt-6.1-sol`, with `medium` reasoning effort, through Codex CLI 0.162.1 using subscription authentication. These are recorded request identifiers; the underlying server-side model snapshot was not independently attested.
- **Sampling:** the pilot used Python random seed `20261021`. Five tasks were drawn per sorted Chinese WritingBench domain, followed by 15 tasks per CFBench difficulty level. IDs, pinned revisions, and hashes are published. WritingBench domains are equally weighted here, rather than weighted by their frequency in the full Chinese pool.
- **Scoring:** the pilot retained the pinned upstream rubrics, judge prompts, and metric formulas but substituted the judge model. WritingBench averages five criterion scores per answer. CFBench rounds per-question CSR to two decimals before aggregation; ISR and PSR use the upstream decisions. See [the formulas](recompute.py).
- **Rule delivery:** the initial pilot injected the full STC text at once. Local skills, memory, hooks, and model tools were disabled. It tested text instructions, not current skill discovery or task-based loading. Codex's generic system instructions remained; the baseline was not a bare model.
- **Judge bias:** judging sessions were separate and arm names were hidden. Using the same model for generation and judging can still introduce shared preferences. MCTS preference judgments were model-generated, not third-party human ratings.
- **Uncertainty:** 10,000 paired bootstrap resamples were used, within domain/difficulty strata for the pilot and across sentences for MCTS. Intervals cover question sampling, not generation or judge rerun variability.
- **Dataset issues:** the reference price ordering in `cf_183` conflicts with its listed prices; some tasks contain contradictory or very long requirements. Main scores retain the original tasks and judgments.
- **Later exploration:** later development trials changed rules, tasks, and grading methods and had mixed outcomes. They are not pooled into an overall win rate. Private product examples are not included in the public evidence package.

## Verify the numbers

With Python 3.9 or later, run from the repository root:

```bash
python3 benchmarks/recompute.py
```

The script verifies file hashes and recomputes pilot scores, means, and sampling intervals, plus MCTS aggregate scores, intervals, and order-consistent preference counts. It is offline and makes no model calls.

Recomputing each MCTS SARI score requires the upstream source and reference sentences. See [EVIDENCE.md](EVIDENCE.md) for source locations and verification scope. Correct aggregation does not establish that model judgments are correct. New generation requires access to the recorded model and runtime; service changes can affect results.

## Evidence and sources

- [Pilot protocol](pilot-20261021/protocol.json), [pre-scoring analysis plan](pilot-20261021/analysis-plan.json), and [all pilot records](pilot-20261021/).
- [MCTS generation and preference records](rewrite-20261022/), including both display orders and label mappings.
- [Evidence format and upstream sources](EVIDENCE.md).
- Original projects: [WritingBench](https://github.com/X-PLUG/WritingBench), [CFBench](https://github.com/PKU-Baichuan-MLSystemLab/CFBench), [MCTS](https://github.com/blcuicall/mcts), [EASSE](https://github.com/feralvam/easse).

Published November 6, 2026. Experiment dates and rule revisions are recorded separately in each protocol.
