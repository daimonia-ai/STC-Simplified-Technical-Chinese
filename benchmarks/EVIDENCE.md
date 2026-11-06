# Evidence format and reproduction

The reports describe historical experiments. This directory supports independent inspection and offline arithmetic verification. It does not launch new generation or model judging.

## Public records

| Record | Contents |
|---|---|
| `pilot-20261021/protocol.json` | Frozen model requests, rule revision, sampling seed and selected IDs; completion status added at publication |
| `pilot-20261021/cases.json` | Upstream IDs, strata, prompt and source-row hashes; CF criterion priorities in original order |
| `pilot-20261021/answers.jsonl` | All 180 final answers, unchanged, with their original SHA-256 hashes and timestamps |
| `pilot-20261021/grades.jsonl` | 450 WritingBench final judge JSON outputs; 90 CF numeric judgment vectors and hashes of their original text |
| `pilot-20261021/scores.json` | Recorded per-question scores and answer lengths |
| `pilot-20261021/summary.json` | Recorded aggregates, paired intervals, strata and prespecified example selection |
| `rewrite-20261022/` | All 80 final answers; per-sentence SARI; original protocols; eight raw preference judgments, mappings and outcomes |
| Both `instructions/` directories | Actual baseline, brief, and candidate instructions used, rather than current rules |
| Both `sources.json` files | Upstream repositories, exact revisions, file paths and SHA-256 hashes |
| `checksums.json` | SHA-256 hashes of the public evidence files |

The export excludes local account/configuration paths, credentials, event streams, internal reasoning, and private product source files. Final judge explanations are retained where specified; they are distinct from internal model reasoning.

Upstream task, rubric and reference-answer files are obtained from the pinned source URLs rather than duplicated here. CF judge output repeats upstream criterion text; its public projection retains numeric decisions in criterion order, priority labels and the original raw-output hash. These fields suffice to recompute CSR, ISR and PSR. The original CF text hash cannot be checked from the numeric projection alone.

Each pilot `original_record_sha256` uses UTF-8 JSON with `ensure_ascii=False`, sorted keys, and separators `(',', ':')`. `prompt_sha256` hashes the unmodified UTF-8 prompt. `wb_` IDs use the source `index` field; `cf_` IDs use `idx`, not list positions.

MCTS IDs use one-based lines in `dataset/mcts.test.orig`; matching lines in `.simp.0` through `.simp.4` provide the five references. Sentence hashes exclude line terminators. Generation used the exact template in `input-format.json`, including literal backslash-n separators. No reference answers were included in generation prompts.

## Verify recorded scores

Python 3.9 or later is sufficient; no third-party package is required:

```bash
python3 benchmarks/recompute.py
```

The script fails on missing records, duplicate identities, altered hashes, invalid score ranges, or mismatched aggregates. It checks all pilot criterion scores, recomputes means and intervals, and derives MCTS order-consistent outcomes directly from the eight judge outputs and label mappings. MCTS bootstrap intervals are recomputed from recorded per-sentence SARI scores.

For the pilot, bootstrap seed `20261021` and 10,000 resamples match the historical analysis. Percentile endpoints are sorted elements 250 and 9749, using zero-based indexing. Each question's arms remain paired; resampling is within its original domain/difficulty stratum. MCTS uses seed `2026102113` for bootstrap only. The MCTS selection seed was not recorded.

## Recompute individual SARI scores

Obtain the upstream files at the revisions below, retaining their repository structure:

| Source | Revision | Required files |
|---|---|---|
| [MCTS](https://github.com/blcuicall/mcts/tree/0cae0aa45381b738c00a18af68e2c36156382160) | `0cae0aa45381b738c00a18af68e2c36156382160` | `dataset/mcts.test.orig`, `dataset/mcts.test.simp.0` through `.4` |
| [EASSE](https://github.com/feralvam/easse/tree/6a4352ec299ed03fda8ee45445ca43d9c7673e89) | `6a4352ec299ed03fda8ee45445ca43d9c7673e89` | `easse/sari.py` |

```bash
python3 benchmarks/recompute_sari.py \
  --mcts /path/to/mcts \
  --easse /path/to/easse
```

The script verifies upstream hashes before evaluating the named SARI functions. It checks each source/reference sentence against the selected IDs, recomputes all 80 per-sentence scores, and verifies the corpus-level sensitivity calculation. It performs no downloads or model calls.

SARI uses EASSE macro n-gram computation, orders 1–4, with F1 for deletion. Whitespace is removed, remaining Unicode characters are lowercased and separated by ASCII spaces. Each final answer is stripped of leading/trailing whitespace before scoring. This differs from the MCTS paper's Stanford CoreNLP segmentation.

## Reconstructing model inputs

For the initial pilot, select upstream rows using `cases.json`, then use each task prompt with its matching arm instruction file. The frozen sample used Python `random.Random(20261021)`: sorted Chinese domain names, rows sorted by `index`, five samples per domain; then CF `easy` and `hard`, rows sorted by `idx`, 15 samples per split. Sort the final selected cases lexically by their prefixed IDs.

For WritingBench judging, the pinned `prompt.py` supplies `evaluate_system` and `evaluate_prompt`. Format the latter with one checklist criterion, the original query, and the generated answer; judge all five criteria separately. For CFBench, the pinned `code/evalaute.py` supplies `gpt_judge_for_cfbench`. Its inputs are the prompt, original `gold`, generated answer, and criterion texts joined by two newlines. The local CF judge system instruction was `You are an assistant. Follow the evaluation task exactly.`

MCTS preference instructions are in `rewrite-20261022/instructions/judge-pref.txt`. The body is a JSON list with each source sentence and its A/B answers, ordered according to `preference-mapping.json`; the same ten items are presented again with A/B reversed. The system instruction is in `judge-system.txt`. This check was planned after the SARI results and remains exploratory.

All generation and judging requested `gpt-6.1-sol` at `medium` through Codex CLI 0.162.1. The initial pilot used a neutral replacement model-instruction file, disabled project rules, local skills, memory, hooks and model tools, and ran independent ephemeral sessions from an empty directory. Generic Codex system context remained. CLI sampling/output limits were not API overrides. Recorded aliases do not independently attest a server model version, and availability or future output equivalence is not guaranteed.

The published scripts verify existing results. Reconstructing inputs and obtaining access to a compatible model/runtime are separate steps. New runs should receive their own run IDs; their outputs must not replace these historical records.

## Attribution and scope

- WritingBench: [X-PLUG/WritingBench at ae2d517](https://github.com/X-PLUG/WritingBench/tree/ae2d5176449b7b769815482641d35926f26793eb), including its [Apache-2.0 license](https://github.com/X-PLUG/WritingBench/blob/ae2d5176449b7b769815482641d35926f26793eb/LICENSE).
- CFBench: [PKU-Baichuan-MLSystemLab/CFBench at 0bcbf9b](https://github.com/PKU-Baichuan-MLSystemLab/CFBench/tree/0bcbf9b0bcf21113a9813f86ed51a2135b328e41). Upstream task/rubric text is not relicensed by STC.
- MCTS: [blcuicall/mcts at 0cae0aa](https://github.com/blcuicall/mcts/tree/0cae0aa45381b738c00a18af68e2c36156382160), the dataset for [MCTS: Multi-Reference Chinese Text Simplification Dataset](https://aclanthology.org/2024.lrec-main.969/).
- EASSE: [feralvam/easse at 6a4352e](https://github.com/feralvam/easse/tree/6a4352ec299ed03fda8ee45445ca43d9c7673e89). Its source is obtained separately under its upstream license.

Model-written MCTS rewrites and judge passages that quote those sentences are distributed under the MCTS upstream GPL-3.0 terms; see [NOTICE.md](rewrite-20261022/NOTICE.md) and [LICENSE-MCTS](rewrite-20261022/LICENSE-MCTS). STC's rule snapshots retain their existing CC BY 4.0 license. Numeric evaluation records and original report text follow the repository's content license; original utility scripts follow its code license. Upstream material is not relicensed by these statements.
