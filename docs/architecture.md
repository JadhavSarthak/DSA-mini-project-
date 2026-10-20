# Nexora System Architecture

> Detailed structural breakdown of Nexora's dual-engine (C++17 native engine + TypeScript full-stack web application).

## 1. High-Level Architecture

Nexora is designed as an educational information retrieval (IR) and data-structures-and-algorithms (DSA) system. Every data structure has a dedicated, testable responsibility in the document discovery lifecycle:

```text
                  Local Document Corpus (data/sample/*.md)
                                    |
                                    v
                     DocumentLoader (Deduplication & Stable IDs)
                                    |
                                    v
                     TextProcessor (Tokenize, Filter, Snippets)
                       /                           \
                      v                             v
           InvertedIndex (Hash Map)        AutocompleteTrie (Trie)
                      |                             |
                      v                             v
             QueryQueue (FIFO Jobs)         Prefix Completions
                      |
                      v
             Candidate Retrieval (OR / AND)
                      |
                      v
             Ranker (Okapi BM25 / TF Baseline)
                      |
                      v
             TopKHeap (Bounded Min-Heap)
                      |
                      v
             Ranked Search Results
                      |
                      v
             DocumentGraph (TF-IDF Cosine Similarity)
                      |
                      v
             Related Documents & BFS Clusters
```

---

## 2. Core Data Structures & Responsibilities

| Component | Responsibility | Underlying Structure | Time Complexity |
|---|---|---|---|
| **AutocompleteTrie** | Prefix-based query completion | Multi-way Trie (Prefix Tree) with end markers & frequencies | $O(L)$ walk, where $L$ = prefix length |
| **InvertedIndex** | Full-text indexing and postings lookup | Hash Map (`term -> {docId -> tf}`) | $O(1)$ average term lookup |
| **TopKHeap** | Maintaining the top-K best documents | Bounded Binary Min-Heap (root is worst kept candidate) | $O(M \log K)$ vs $O(M \log M)$ full sort |
| **DocumentGraph** | Inter-document similarity & related docs | Weighted Adjacency List graph with TF-IDF cosine similarity | $O(V + E)$ BFS traversal |
| **QueryQueue** | Enforcing strict arrival-order request processing | Singly linked list FIFO queue | $O(1)$ enqueue / dequeue |

---

## 3. Dual-Engine Layout

Nexora contains two parallel implementations sharing the same data files (`data/sample/`):

1. **C++17 Native Engine (`src/cpp/`)**:
   - Header-only modular design (`text_processor.hpp`, `document_loader.hpp`, `inverted_index.hpp`, `autocomplete_trie.hpp`, `ranker.hpp`, `top_k.hpp`, `document_graph.hpp`, `query_queue.hpp`, `search_service.hpp`).
   - Binaries built via `Makefile`: `nexora` (CLI), `run_tests` (test suite), `benchmark` (latency profiling), `evaluate` (precision/recall/MRR).
   - Zero third-party library dependencies (pure C++ standard library).

2. **TypeScript & React Full-Stack (`src/backend/`, `src/components/`, `server.ts`)**:
   - Express server on Node.js / Vite serving on port 3000.
   - Interactive Neo-brutalist fact-checking UI styled per `DESIGN.md`.
   - Real-time API bridge to execute native C++ binaries (`/api/cpp/test`, `/api/cpp/benchmark`, `/api/cpp/eval`, `/api/cpp/check`).
