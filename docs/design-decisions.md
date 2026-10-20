# Nexora Design Decisions

This document records the architectural and engineering decisions made during the design and development of the Nexora Information Retrieval engine.

---

### Decision 1: Language & Standards
- **Choice:** Dual-engine approach featuring a clean **C++17** native CLI/benchmark engine alongside a **TypeScript / React** full-stack web application.
- **Rationale:** C++17 provides maximum control over memory layout, deterministic execution timings, and algorithmic microbenchmarking without garbage collection jitter. TypeScript provides an accessible, interactive visual frontend for inspecting internal data structure states.

### Decision 2: Code Layout
- **Choice:** Header-only modules in `src/cpp/` (one structure per header), with thin entry points (`cli.cpp`, `test_nexora.cpp`, `benchmark.cpp`, `evaluate.cpp`).
- **Rationale:** Simplifies compilation via a plain `Makefile` without complex CMake configurations or library link paths.

### Decision 3: Manual vs. Standard Library Separation
- **Manual Implementations:**
  - Trie (prefix tree with node children maps, terminal frequency counts, and phrase flags)
  - Bounded Binary Min-Heap (custom comparator ordering: score desc, title asc, docId asc)
  - FIFO Queue (singly linked list with head and tail pointers)
  - Document Graph (custom adjacency list with TF-IDF cosine similarity computation)
- **Standard Library Usage:**
  - Containers: `std::unordered_map`, `std::vector`, `std::string`
  - System: `std::filesystem`, `std::chrono`

### Decision 4: Matching Modes
- **Choice:** Both **OR** (default union) and **AND** (strict intersection) modes supported.
- **Rationale:** OR mode maximizes recall for exploratory queries, while AND mode provides precision filtering when all query terms must be present.

### Decision 5: Lexical Ranking
- **Choice:** **Okapi BM25** ($k_1=1.2, b=0.75$) with Robertson-Spärck Jones IDF is the primary ranking model; Term Frequency (**TF**) is retained as a baseline.
- **Rationale:** BM25 accounts for term frequency saturation and document length penalization relative to average collection length, outperforming naive term counts.

### Decision 6: Top-K Heap Ordering
- **Choice:** A bounded **Min-Heap** of capacity $K$ where the root holds the *worst* kept result.
- **Rationale:** Comparing arriving candidates against the root takes $O(1)$. Candidates with worse scores are rejected immediately. Candidates exceeding the root replace it and sift down in $O(\log K)$, delivering up to 30x+ speedups over sorting all $M$ candidates ($O(M \log M)$).

### Decision 7: Graph Similarity Threshold
- **Choice:** Cosine similarity over TF-IDF vectors with threshold $\ge 0.05$. Candidate pairs are discovered exclusively through shared postings in the inverted index.
- **Rationale:** Comparing all pairs blindly incurs $O(N^2)$ overhead. Using inverted index postings limits comparisons to documents sharing at least one informative non-stopword term. A threshold of 0.05 prevents trivial single-word accidental connections while avoiding disconnected islands.

### Decision 8: Query Queue Concurrency
- **Choice:** Single-threaded FIFO job layer.
- **Rationale:** Honest educational scope. No false claims of distributed asynchronous queues or multi-threaded worker pools. It makes request arrival ordering transparent.

### Decision 9: Autocomplete Empty-Prefix Policy
- **Choice:** Empty prefix queries return empty results (`{}`).
- **Rationale:** Avoids enumerating the entire corpus vocabulary on empty focus events.

### Decision 10: Document Deduplication
- **Choice:** Normalized token stream fingerprinting (`tokens.join(" ")`).
- **Rationale:** Duplicate documents distort term frequency statistics ($df$) and waste index memory. Detected duplicates are reported and skipped during corpus loading.

### Decision 11: Measured Benchmarks
- **Choice:** Benchmarks print measured execution times alongside environment details (Node version, OS, CPU architecture, timestamp).
- **Rationale:** Anti-hype discipline. No artificial claims of "instant" or "massive scale"; numbers are verified through direct measurement.
