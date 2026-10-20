# Nexora (C++17) — Implementation Plan

Derived from `Nexora_Project_Specification.md`. This file is the executable plan:
each phase lists deliverables and a **checkpoint command**. `make check` runs
every checkpoint in order; the status table at the bottom is updated as phases pass.

## 0. Decisions (recorded up front, expanded in `docs/design-decisions.md`)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Language / standard | C++17, `g++`, plain `Makefile`, no third-party libraries |
| 2 | Code layout | Header-only modules in `src/` (one structure per header), thin `.cpp` entry points |
| 3 | Manual vs. std | **Manual:** Trie, binary heap, FIFO linked-list queue, weighted graph. **std:** `unordered_map`, `vector`, `string`, `filesystem`, `chrono` |
| 4 | Matching modes | OR (default) and AND |
| 5 | Ranking | Baseline TF score **and** BM25 (`k1=1.2`, `b=0.75`); BM25 is the default |
| 6 | Heap ordering | Bounded **min-heap** whose root is the *worst* kept result; order = score desc, then title asc, then doc id asc |
| 7 | Graph edges | Cosine similarity over TF-IDF vectors; edge if `sim >= 0.05` (tuned by inspecting edges on the 12-doc sample; 0.08 left 4 docs isolated, <0.05 admitted incidental words); candidate pairs come from shared postings (no blind all-pairs) |
| 8 | Queue | Single-threaded FIFO job layer. **No concurrency claims.** |
| 9 | Autocomplete | Trie holds vocabulary terms + adjacent-word phrases; ranked by corpus frequency, then alphabetical |
| 10 | Duplicates | Documents with identical normalized token streams are skipped and reported |
| 11 | Benchmarks | Measured only; environment is printed with the numbers |

## 1. Repository layout

```
nexora/
├── PLAN.md                    <- this file
├── README.md
├── Makefile
├── docs/{architecture.md, design-decisions.md, evaluation.md}
├── data/sample/*.md           <- 12 original CC0 sample documents
├── data/sample/queries.tsv    <- labelled queries for Precision/Recall/MRR
├── src/
│   ├── text_processor.hpp     tokenize, stop words, snippets
│   ├── document_loader.hpp    load .md/.txt, stable IDs, titles, dedupe
│   ├── inverted_index.hpp     Hash Map: term -> {doc -> tf}, doc metadata
│   ├── autocomplete_trie.hpp  Trie
│   ├── ranker.hpp             baseline TF + BM25
│   ├── top_k.hpp              manual binary heap
│   ├── document_graph.hpp     weighted graph + related docs + BFS
│   ├── query_queue.hpp        FIFO linked-list queue
│   ├── search_service.hpp     wires everything together
│   └── cli.cpp                command-line interface
├── tests/test_nexora.cpp      unit + end-to-end tests (tiny assert framework)
└── benchmarks/{benchmark.cpp, evaluate.cpp}
```

## 2. Phases

### Phase 1 — Corpus and preprocessing
- `TextProcessor::tokenize`: lowercase, split on non-alphanumerics, deterministic.
- `DocumentLoader`: recursive scan, sorted paths -> stable IDs, title = first `# ` heading else filename, readable-file errors reported not swallowed.
- **Checkpoint:** tokenizing the same text twice yields identical sequences; loader returns 12 docs from `data/sample`.

### Phase 2 — Inverted index (Hash Map)
- `term -> {doc_id -> tf}`, `doc_id -> {title, path, length, text}`, `df(term)`, `avgdl`.
- Single- and multi-term candidate retrieval with OR / AND.
- **Checkpoint:** unit tests on a hand-built 3-document corpus.

### Phase 3 — Autocomplete (Trie)
- insert(term, freq), complete(prefix, limit), deterministic order.
- Empty-prefix policy: returns nothing (documented).
- **Checkpoint:** prefixes return only valid terms; `mach` returns `machine` and `machine learning`.

### Phase 4 — Ranking and top-K (Heap)
- BM25 + TF baseline; manual bounded min-heap.
- **Checkpoint:** hand-calculated BM25 value matches; heap result equals full-sort baseline on randomised inputs; K=0, K=1, K>N, ties covered.

### Phase 5 — Document graph
- Build TF-IDF vectors, enumerate candidate pairs from postings, add symmetric weighted edges.
- `related(doc, n)` plus shared-term explanation; `reachable(doc, depth)` BFS.
- **Checkpoint:** isolated documents have no neighbours; no duplicate edges; neighbours sorted by weight.

### Phase 6 — Queue + service integration
- Linked-list FIFO queue; `submit()` returns request id, `process_all()` drains in order, results stored by id.
- **Checkpoint:** end-to-end search touches Trie, Hash Map, Heap, Graph and Queue.

### Phase 7 — CLI, benchmarks, docs
- CLI commands: `suggest`, `search`, `related`, `queue-demo`, `stats`, `demo`.
- `benchmark`: index build, autocomplete latency, search median/p95 on a declared synthetic corpus.
- `evaluate`: Precision@K, Recall@K, MRR on `queries.tsv`.
- **Checkpoint:** `make check` passes from a clean tree.

## 3. Execution procedure

```bash
make clean
make all          # builds nexora, run_tests, benchmark, evaluate
make test         # Phases 1-6 checkpoints
make demo         # Phase 7 demo, covers the spec's recommended demo script
make bench        # latency numbers (measured, environment printed)
make eval         # retrieval quality
make check        # all of the above
```

## 4. Definition of done (from spec §14)

Mapped to concrete evidence in the status table below.

## 5. Status

| Phase | Status | Evidence |
|------:|--------|----------|
| 1 | done | tokenizer/loader tests; 12 docs load from `data/sample`; dup/empty/binary files reported |
| 2 | done | hash-map index tests (OR/AND, duplicates, absent terms) |
| 3 | done | trie tests; `mach` -> machine, machine learning, machine translation |
| 4 | done | hand-calculated BM25 (1.348640); heap equals full-sort baseline on randomised tie-heavy inputs |
| 5 | done | graph tests; hand-computed cosine 3/7; sample graph: 7 edges, threshold 0.05 |
| 6 | done | FIFO queue tests; end-to-end search/queue/graph path; results tied to request IDs |
| 7 | done | CLI, `make eval` (P@3 0.533, R@3 1.000, MRR 0.950), `make bench`, docs written |

### Deviations from the plan, found while executing
- Graph threshold changed from 0.08 to **0.05** after inspecting edges (see decision 7).
- BM25 and TF scored identically on the 12-document sample; reported as-is in `docs/evaluation.md`.
- Graph build at 5,000 synthetic docs takes ~15 s: documented as a scaling limit rather than optimised.
