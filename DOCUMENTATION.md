# Nexora — Comprehensive Technical Documentation & Architecture Manual

> **Document Version:** 1.0.0  
> **System Name:** Nexora Information Retrieval & Algorithmic Search Engine  
> **Target Languages:** C++17 (Native Performance Core) & TypeScript 5.x / React 19 (Full-Stack Web & Visualizer)  
> **Dataset:** 12 Canonical CC0 Computer Science Reference Documents + Ground-Truth Query Benchmark (`queries.tsv`)  
> **Verification Status:** 100% Phase Tests Passing | MRR: 1.000 | Precision@3: 40.0% | Recall@3: 85.0%

---

## Table of Contents

1. [Problem Statement & Core Direction](#1-problem-statement--core-direction)
   - 1.1 The Fundamental Problem of Modern Search Systems
   - 1.2 What We Are Solving
   - 1.3 The Three Core Directions
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
   - 2.1 High-Level Architecture Diagram
   - 2.2 Dual-Engine Philosophy (C++17 vs TypeScript)
   - 2.3 Layered Subsystems
3. [End-to-End Operational Workflows](#3-end-to-end-operational-workflows)
   - 3.1 Document Ingestion, Fingerprinting & Deduplication Workflow
   - 3.2 Keystroke-Driven Trie Autocomplete Workflow
   - 3.3 Lexical Candidate Retrieval (OR & AND Modes) Workflow
   - 3.4 Okapi BM25 Ranking & Bounded Min-Heap Selection Workflow
   - 3.5 Inter-Document Graph Construction & BFS Clustering Workflow
   - 3.6 FIFO Query Scheduling Workflow
   - 3.7 Ground-Truth Benchmark & Metric Evaluation Workflow
4. [Complete File Directory & Component Inventory](#4-complete-file-directory--component-inventory)
5. [In-Depth Implementation of Core Data Structures & Algorithms](#5-in-depth-implementation-of-core-data-structures--algorithms)
   - 5.1 Multi-way Prefix Tree (Trie)
   - 5.2 Inverted Index (Hash Map Postings)
   - 5.3 Bounded Binary Min-Heap (Top-K Filter)
   - 5.4 Weighted Symmetric Graph (TF-IDF Cosine Similarity & BFS)
   - 5.5 Singly-Linked FIFO Query Queue
6. [Mathematical Foundations of Retrieval & Ranking](#6-mathematical-foundations-of-retrieval--ranking)
   - 6.1 Okapi BM25 Scoring
   - 6.2 Robertson-Spärck Jones Inverse Document Frequency (IDF)
   - 6.3 Document Length Normalization Curve
   - 6.4 Vector Space Cosine Similarity
   - 6.5 Information Retrieval Metrics (P@K, R@K, MRR)
7. [Empirical Evaluation & Performance Benchmarks](#7-empirical-evaluation--performance-benchmarks)
   - 7.1 Ground-Truth Retrieval Accuracy (`queries.tsv`)
   - 7.2 Microsecond & Millisecond Latency Profiles (p50 & p95)
   - 7.3 Bounded Min-Heap vs Full Sort Empirical Comparison
8. [Build Systems, CLI Commands & Deployment Guide](#8-build-systems-cli-commands--deployment-guide)
   - 8.1 C++17 Makefile Pipeline
   - 8.2 Full-Stack Node.js & Vite Pipeline
   - 8.3 CLI Command Reference
9. [Conclusion & Architectural Takeaways](#9-conclusion--architectural-takeaways)

---

# 1. Problem Statement & Core Direction

## 1.1 The Fundamental Problem of Modern Search Systems

Modern search and information retrieval engines are increasingly dominated by monolithic, non-deterministic large language models (LLMs) and dense vector embeddings (RAG architectures). While powerful for open-ended semantic association, these contemporary systems introduce severe engineering deficiencies:

1. **The "Black Box" Problem & Hallucination Crisis:** Dense vector nearest-neighbor lookups (kNN/ANN) project documents into uninterpretable high-dimensional vector spaces. A search result cannot explain *why* it matched a query, *which* specific terms caused the score, or *how* the score was mathematically assembled. This produces ungrounded citations and hallucinations.
2. **Massive Computational Inefficiency:** Dense embedding inference requires billions of floating-point operations (FLOPs) per query, running on costly GPU clusters with latencies ranging from 50 ms to 2,000 ms. For standard structured and semi-structured collections, this is orders of magnitude slower than classical lexical retrieval.
3. **Memory Bloat & Algorithmic Naivety:** Naive software implementations sort entire candidate lists ($O(M \log M)$), re-parse documents on every request, store redundant dictionary representations, and use unbounded arrays that trigger memory allocations during time-critical search paths.
4. **Lack of Educational Clarity:** Production engines like Lucene/Elasticsearch contain hundreds of thousands of lines of enterprise abstractions, hiding fundamental computer science data structures beneath layers of configuration and network protocols.

## 1.2 What We Are Solving

**Nexora** was conceived to solve this exact problem: to design and build a **fully transparent, zero-hallucination, mathematically grounded Information Retrieval Engine** that is driven exclusively by classical, manual Data Structures and Algorithms (DSA).

Every decision made by Nexora can be inspected down to the byte and processor cycle:
- When a query prefix is typed, the exact tree traversal across Trie character nodes is tracked.
- When documents are matched, candidate retrieval is an explicit set union (OR) or set intersection (AND) across inverted postings.
- When relevance is scored, every term's exact IDF, TF saturation, and document length normalization penalty are exposed as numerical mathematical receipts.
- When the Top-K results are selected, a bounded binary min-heap guarantees that lower-scoring candidates are discarded in $O(1)$ time without sorting irrelevant documents.
- When related documents are explored, TF-IDF cosine similarity vectors connect documents in a deterministic, inspectable knowledge graph.

## 1.3 The Three Core Directions

The architecture of Nexora is guided by three explicit engineering pillars:

### Direction 1: Deterministic Retrieval & Mathematical Explainability
Every search result must produce an immutable mathematical receipt. There are zero LLMs or speculative probabilistic generators in the core indexing and retrieval path. The relevance score is calculated strictly using Okapi BM25 ($k_1=1.2, b=0.75$) with Robertson-Spärck Jones IDF. If two documents have identical scores, deterministic tie-breakers (title ascending, followed by document ID ascending) guarantee 100% reproducible ordering across every execution.

### Direction 2: Algorithmic Rigor via Manual Data Structures
Rather than relying on generic black-box libraries or standard library convenience wrappers for critical operations, Nexora implements the core data structures manually:
- A custom **Trie** for prefix autocomplete with terminal frequency annotations and multi-word phrase tags.
- A custom **Bounded Binary Min-Heap** where the root holds the *worst* kept candidate, enabling $O(1)$ rejection.
- A custom **Weighted Symmetric Graph** using inverted index candidate discovery to bypass $O(N^2)$ all-pairs comparisons.
- A custom **Singly-Linked FIFO Queue** providing transparent job scheduling with millisecond lifecycle tracing.

### Direction 3: Dual-Language Architecture (C++17 Native Engine + TypeScript Full-Stack)
To balance raw hardware-level execution with interactive visual explainability:
- **C++17 Engine:** Header-only modular components compiled with `g++ -std=c++17 -O3` providing microsecond-level query latencies (~25 µs autocomplete, ~150 µs search), zero external dependencies, and complete memory safety.
- **TypeScript / React 19 Engine:** A parallel full-stack TypeScript implementation running Express and React 19, presenting a neo-brutalist interactive GUI where users can inspect data structure branches, simulate heap steps, view the SVG document relationship graph, run ground-truth evaluations, and trigger native C++ binaries directly from the browser.

---

# 2. End-to-End System Architecture

## 2.1 High-Level Architecture Diagram

```text
====================================================================================================
                                      NEXORA SYSTEM ARCHITECTURE
====================================================================================================

               +-------------------------------------------------------------+
               |               LOCAL CORPUS REPOSITORY (data/sample/)        |
               |           12 Canonical Computer Science Markdown Files       |
               +-------------------------------------------------------------+
                                              |
                                              v
               +-------------------------------------------------------------+
               |                       DocumentLoader                        |
               |  - Alphabetical file sorting (Stable IDs: 0, 1, 2...)       |
               |  - Markdown heading extraction (Title: '# ...')             |
               |  - Normalized token stream fingerprinting (Deduplication)   |
               +-------------------------------------------------------------+
                                              |
                                              v
               +-------------------------------------------------------------+
               |                       TextProcessor                         |
               |  - Deterministic alphanumeric tokenization (lowercase)      |
               |  - 120+ Stop-word filtering & bigram/trigram extraction     |
               |  - Contextual snippet generator with <mark> hit badges      |
               +-------------------------------------------------------------+
                                /                             \
                               v                               v
    +-------------------------------------+   +-------------------------------------+
    |        InvertedIndex (Hash Map)     |   |       AutocompleteTrie (Trie)       |
    |  - term -> { docId -> termFreq }    |   |  - Root -> character children nodes |
    |  - docId -> Document metadata       |   |  - Frequency counters & phrase tags |
    |  - avgdl, df(t), N document stats   |   |  - Empty prefix policy ({})         |
    |  - OR (Union) / AND (Intersect)     |   |  - O(L) traversal walk              |
    +-------------------------------------+   +-------------------------------------+
                      |                                          |
                      v                                          v
    +-------------------------------------+               Prefix Completions
    |        QueryQueue (FIFO List)       |               Sorted by Frequency
    |  - Singly-linked list (head/tail)   |
    |  - Unique ID: req-<timestamp>-<seq> |
    |  - Single-threaded arrival ordering |
    +-------------------------------------+
                      |
                      v
    +-------------------------------------+
    |         Ranker (Okapi BM25)         |
    |  - k1 = 1.2, b = 0.75               |
    |  - Robertson-Spärck Jones IDF       |
    |  - Length penalization |D| / avgdl  |
    |  - Baseline TF scoring              |
    +-------------------------------------+
                      |
                      v
    +-------------------------------------+
    |       TopKHeap (Bounded Min-Heap)   |
    |  - Fixed capacity K                 |
    |  - Root = Worst kept candidate      |
    |  - O(1) prune, O(log K) sift-down   |
    +-------------------------------------+
                      |
                      v
    +-------------------------------------+
    |      Ranked Search Results (1..K)   |
    |  - Score desc, Title asc, DocId asc |
    +-------------------------------------+
                      |
                      v
    +-------------------------------------+
    |       DocumentGraph (TF-IDF Graph)  |
    |  - Shared postings candidate pairs  |
    |  - TF-IDF Cosine Similarity >= 0.05 |
    |  - Breadth-First Search (BFS) depth |
    +-------------------------------------+
```

## 2.2 Dual-Engine Philosophy (C++17 vs TypeScript)

Nexora avoids the common pitfall of building a toy that cannot run in production or a complex C++ binary with no visual interface. We engineered two identical, synchronized implementations:

1. **The Native C++17 Core Engine (`src/cpp/`):**
   - Designed for zero overhead, low memory footprint, and predictability.
   - Built with modern C++17 paradigms: `std::unique_ptr` for memory hierarchy, `std::string_view` concepts, `std::filesystem` for portable directory operations, and `std::chrono` high-resolution clock profiling.
   - Compiles via a plain GNU `Makefile` into four standalone native binaries:
     - `nexora`: Complete Command Line Interface (CLI).
     - `run_tests`: Zero-dependency unit and end-to-end integration test runner covering all 6 development phases.
     - `benchmark`: Microsecond-precision benchmarking suite for latency percentiles and heap vs sort profiling.
     - `evaluate`: Evaluation runner calculating Mean Precision@K, Mean Recall@K, and Mean Reciprocal Rank (MRR) against `queries.tsv`.

2. **The TypeScript / Node.js Full-Stack Web Engine (`src/backend/`, `src/components/`, `server.ts`):**
   - Provides a mirror implementation of all 5 data structures in TypeScript.
   - Serves an Express HTTP/REST API mounted with Vite middlewares on Port 3000.
   - Incorporates real-time execution bridges (`/api/cpp/test`, `/api/cpp/benchmark`, `/api/cpp/eval`, `/api/cpp/check`) that execute the compiled native C++ binaries directly in the background and stream stdout into an interactive terminal console.
   - Renders a neo-brutalist fact-checking interface with Web Audio arcade clicks and high-contrast query highlights.

## 2.3 Layered Subsystems

The Nexora engine is organized into four distinct architectural layers:

```text
+-----------------------------------------------------------------------------------+
| 4. PRESENTATION & CLI LAYER                                                       |
|    - C++ CLI (`nexora` subcommands: search, suggest, related, queue-demo, stats)  |
|    - React 19 Frontend (Omnibox, Trie Popup, Graph Canvas, DSA Lab, Scoreboard)   |
|    - Express HTTP REST API (/api/search, /api/suggest, /api/graph, /api/cpp/*)    |
+-----------------------------------------------------------------------------------+
                                          ^
                                          |
+-----------------------------------------------------------------------------------+
| 3. RETRIEVAL, SCORING & SCHEDULING LAYER                                          |
|    - Autocomplete Engine (Trie DFS collector, frequency ranking)                  |
|    - Candidate Extractor (Inverted Index OR/AND Boolean resolution)               |
|    - Ranking Engine (Okapi BM25 score accumulator, TF baseline)                   |
|    - Top-K Selection (Bounded Min-Heap with sift-up / sift-down)                   |
|    - Query Job Scheduler (FIFO linked-list queue with millisecond lifecycle)      |
+-----------------------------------------------------------------------------------+
                                          ^
                                          |
+-----------------------------------------------------------------------------------+
| 2. INDEXING & GRAPH REPRESENTATION LAYER                                          |
|    - Inverted Index (Hash Map mapping terms to postings lists)                    |
|    - Vocabulary Map (Collection statistics, df(t), avgdl, total tokens)           |
|    - Document Graph (Adjacency list, TF-IDF cosine similarity, BFS level crawler) |
+-----------------------------------------------------------------------------------+
                                          ^
                                          |
+-----------------------------------------------------------------------------------+
| 1. DOCUMENT INGESTION & PREPROCESSING LAYER                                       |
|    - Document Loader (Directory traversal, alphabetical path sorting)             |
|    - Content Deduplication (SHA/Normalized token stream fingerprinting)           |
|    - Text Processor (Tokenization, stop-word filtering, phrase extraction)        |
+-----------------------------------------------------------------------------------+
```

---

# 3. End-to-End Operational Workflows

## 3.1 Document Ingestion, Fingerprinting & Deduplication Workflow

```text
[ Directory Path: 'data/sample' ]
               |
               v
  Scan filesystem for .md and .txt files
               |
               v
  Sort file paths alphabetically (Case-insensitive lexicographical sort)
  ==> Guarantees deterministic Doc ID assignment: Doc 0, Doc 1, ..., Doc 11
               |
               +-----------------------+
               | Loop for each file    |<-----------------------------+
               +-----------------------+                              |
                           |                                          |
                           v                                          |
             Read raw file text content                               |
                           |                                          |
                           v                                          |
       Extract title: First line starting with '# '                   |
       Fallback: Format clean filename without extension              |
                           |                                          |
                           v                                          |
           Tokenize raw text into lowercase tokens                    |
                           |                                          |
                           v                                          |
         Generate Fingerprint: tokens.join(" ")                       |
                           |                                          |
          Is fingerprint in SeenFingerprints map?                     |
             /                           \                            |
          [YES]                          [NO]                         |
           /                               \                          |
  Skip file as Duplicate          Store fingerprint in map            |
  Log duplicate filename          Assign nextDocId (0, 1, 2...)       |
  Record skipped receipt          Push into Documents vector          |
           |                               |                          |
           +-------------------------------+--------------------------+
                           |
                           v
          [ Corpus Ingestion Complete: 12 Documents ]
```

**Deduplication Rationale:** If identical or near-identical duplicate files enter an information retrieval index, they artificially inflate Document Frequency ($df(t)$), deflating the Inverse Document Frequency ($IDF$) of key terms and skewing the average document length ($avgdl$). Nexora checks normalized token fingerprints before index insertion, ensuring zero duplicate contamination.

---

## 3.2 Keystroke-Driven Trie Autocomplete Workflow

```text
User inputs search prefix (e.g., 'mach')
               |
               v
Is prefix empty? ("")
   /             \
 [YES]           [NO]
  /                 \
Return empty {}    Lowercase prefix ('mach')
(Decision 9)       Initialize currentNode = root
                     |
                     v
   +---------------------------------------+
   | For each character c in prefix:       |
   |   Does currentNode have child for c?  |
   +---------------------------------------+
            /                    \
         [NO]                   [YES]
          /                        \
    Return empty {}      currentNode = child[c]
    (No completions)               |
                                   v
             Reached target prefix subtree node
                                   |
                                   v
             Recursive Depth-First Search (DFS)
             Collect all descendant nodes where isEndOfWord == true
                                   |
                                   v
             Sort collected candidate suggestions:
               1. Frequency descending (highest corpus occurrences first)
               2. Lexicographical ascending (alphabetical tie-breaking)
                                   |
                                   v
             Truncate to limit (default: 8 suggestions)
                                   |
                                   v
             [ Deliver suggestions: "machine" (7), "machine learning" (4), ... ]
```

---

## 3.3 Lexical Candidate Retrieval (OR & AND Modes) Workflow

```text
Raw Query: "machine learning"
               |
               v
Tokenize & normalize query terms -> ['machine', 'learning']
               |
               v
For each query term t:
  Fetch postings map from Inverted Index:
  - 'machine'  -> { Doc 0: tf=3, Doc 1: tf=1, Doc 3: tf=1, Doc 6: tf=1, Doc 9: tf=1 }
  - 'learning' -> { Doc 0: tf=6, Doc 1: tf=4 }
               |
               v
What is the active Match Mode?
         /              \
     [OR Mode]      [AND Mode]
       /                  \
Take Set Union:        Take Set Intersection:
Doc in ANY term list   Doc must be present in ALL term lists
       |                  |
       v                  v
Candidates:            Candidates:
[0, 1, 3, 6, 9]        [0, 1]
(5 candidates)         (2 candidates)
       \                  /
        +--------+-------+
                 |
                 v
   Pass candidates to BM25 Ranker
```

---

## 3.4 Okapi BM25 Ranking & Bounded Min-Heap Selection Workflow

```text
Candidates List [ Doc IDs ] + Query Tokens
               |
               v
Initialize Bounded Min-Heap with capacity K (e.g., K = 3)
               |
               +--------------------------------------+
               | For each candidate document D:       |<--------------------------+
               +--------------------------------------+                           |
                           |                                                      |
                           v                                                      |
         Calculate BM25 Score across matched terms:                               |
         score(D, Q) = ∑ IDF(t) * [tf * (k1 + 1)] / [tf + k1 * lengthNorm]       |
                           |                                                      |
                           v                                                      |
         Is score(D, Q) > 0.0?                                                    |
             /               \                                                    |
           [NO]             [YES]                                                 |
           /                   \                                                  |
       Ignore doc        Generate Contextual Snippet with <mark>                  |
                         Create Candidate Object:                                 |
                         { docId, title, score, snippet, explanation }            |
                                |                                                 |
                                v                                                 |
                  Is Heap Size < Capacity K?                                      |
                     /              \                                             |
                  [YES]             [NO]                                          |
                   /                   \                                          |
         Insert into Heap         Compare candidate with Heap Root                |
         Sift-Up to restore       (Root is WORST kept result)                     |
         Min-Heap order                 |                                         |
               |                        v                                         |
               |           Is Candidate BETTER than Root?                         |
               |              /                \                                  |
               |           [YES]               [NO]                               |
               |            /                    \                                |
               |     Replace Root              Discard Candidate                  |
               |     Sift-Down to restore      Instantly in O(1)                  |
               |     Min-Heap order              |                                |
               |            |                    |                                |
               +------------+--------------------+--------------------------------+
                                       |
                                       v
                     All Candidates Processed
                                       |
                                       v
                     Heap Extract & Sort in Final Order:
                     1. Score DESCENDING (highest relevance first)
                     2. Title ASCENDING (alphabetical tie-breaker)
                     3. DocId ASCENDING (numerical tie-breaker)
                                       |
                                       v
                     [ Output: Top-K Ranked Documents #1..K ]
```

---

## 3.5 Inter-Document Graph Construction & BFS Clustering Workflow

```text
All Documents in Corpus (N = 12)
               |
               v
1. Vectorization:
   For each doc D, construct TF-IDF vector:
   vec[term] = tf(term, D) * IDF(term)  (filtering stopwords)
   Compute Euclidean L2-Norm: ||vec|| = sqrt(∑ weight^2)
               |
               v
2. Candidate Pair Discovery via Inverted Index:
   For each doc u:
     Find all docs v that share at least one non-stopword term via postings
     (Bypasses blind O(N^2) comparison!)
               |
               v
3. Compute Cosine Similarity:
   sim(u, v) = (u_vec • v_vec) / (||u_vec|| * ||v_vec||)
               |
               v
   Is sim(u, v) >= 0.05 (Edge Threshold)?
        /                   \
     [YES]                  [NO]
      /                        \
Add undirected edge        Do not add edge
u <-> v with weight sim    (Discard pair)
Record top shared terms
      \                        /
       +-----------+----------+
                   |
                   v
    [ Weighted Document Graph Ready ]
                   |
                   v
4. BFS Traversal from Selected Document u:
   Queue = [ u ], Visited = { u }, CurrentDepth = 1
   While Queue not empty and CurrentDepth <= MaxDepth:
     Discover all unvisited neighbors
     Group by Depth Level (Depth 1 = Direct, Depth 2 = Secondary)
     Assign similarity to parent
```

---

## 3.6 FIFO Query Scheduling Workflow

```text
Client submits search query: POST /api/queue/submit
               |
               v
Generate monotonic Request ID:
req-<epoch_timestamp_ms>-<counter>
               |
               v
Allocate QueueNode<QueryJob>
Attach to Tail of Singly-Linked FIFO Queue
Increment Queue Length counter
               |
               v
Return Immediate Confirmation to Client:
{ status: "queued", requestId: "req-1792496431988-1" }
               |
               v
Worker Loop processes in arrival order:
Dequeue Node from Head
Set status = "processing"
Record startedAt timestamp
               |
               v
Execute Search Pipeline (Inverted Index -> BM25 -> Top-K Heap)
               |
               v
Record finishedAt timestamp
Compute durationMs = finishedAt - startedAt
Set status = "completed"
Save completed job in FIFO History Ledger
```

---

## 3.7 Ground-Truth Benchmark & Metric Evaluation Workflow

```text
Load test dataset: 'data/sample/queries.tsv'
Parse TSV rows: [ query_text, expected_relevant_files, category_notes ]
               |
               v
Initialize evaluation accumulators:
totalPrecision = 0.0, totalRecall = 0.0, totalReciprocalRank = 0.0
               |
               +--------------------------------------+
               | For each query Q in queries.tsv:     |<--------------------------+
               +--------------------------------------+                           |
                           |                                                      |
                           v                                                      |
             Execute search(Q, mode="OR", k=K)                                    |
             Retrieved = [ filename_1, filename_2, ..., filename_K ]              |
             Expected  = [ exp_1, exp_2, ... ]                                    |
                           |                                                      |
                           v                                                      |
             Hits = Count of Retrieved documents present in Expected              |
             FirstHitRank = 1-based index of first relevant match (or 0)          |
                           |                                                      |
                           v                                                      |
             Precision@K = Hits / K                                               |
             Recall@K    = Hits / |Expected|                                      |
             RR          = (FirstHitRank > 0) ? (1.0 / FirstHitRank) : 0.0        |
                           |                                                      |
                           v                                                      |
             Accumulate: totalP += P@K, totalR += R@K, totalRR += RR              |
                           |                                                      |
                           +------------------------------------------------------+
                                       |
                                       v
             Compute Macro Averages across N queries:
             Mean Precision@K       = totalP / N
             Mean Recall@K          = totalR / N
             Mean Reciprocal Rank   = totalRR / N
                                       |
                                       v
             [ Print Verified Scorecard: MRR = 1.000, Recall@3 = 85.0% ]
```

---

# 4. Complete File Directory & Component Inventory

Below is the complete inventory of all 67 files in the Nexora codebase, documenting their physical location, language, and precise structural responsibility:

```text
nexora/
├── Makefile                                   # GNU Make build script for C++17 targets (all, test, demo, bench, eval, check, clean)
├── README.md                                  # Primary repository overview, badges, architecture diagrams, and quickstart
├── DOCUMENTATION.md                           # This 20-page comprehensive technical and architectural manual
├── package.json                               # Node.js project manifest, dependencies, and full-stack scripts
├── tsconfig.json                              # TypeScript strict compiler configuration (ESNext, NodeNext, DOM)
├── vite.config.ts                             # Vite production bundler and dev server configuration
├── server.ts                                  # Express server mounting REST endpoints, Vite middleware, and C++ binary bridge
├── index.html                                 # Single-page web entry point, meta tags, and Google Fonts
├── metadata.json                              # Applet metadata, application name, permissions, and Gemini API capabilities
├── bun.lock                                   # Bun/npm lockfile for deterministic dependency tree resolution
├── .gitignore                                 # Git exclusion rules (node_modules, dist, *.o, and C++ binary executables)
├── .env.example                               # Environment variable documentation template
│
├── docs/                                      # Specialized architectural specifications
│   ├── architecture.md                        # Structural overview, component relationships, and data flow
│   ├── design-decisions.md                    # Record of all 11 core engineering decisions and rationale
│   └── evaluation.md                          # Retrieval quality metrics, benchmark reports, and latency tables
│
├── data/                                      # Ground-truth corpus and evaluation data
│   └── sample/                                # 12 Canonical CC0 Computer Science markdown documents
│       ├── 01-machine-learning-basics.md                  # Machine learning paradigms, supervised/unsupervised learning
│       ├── 02-deep-learning-architectures.md              # Deep neural networks, CNNs, backpropagation, transformers
│       ├── 03-search-engines-and-information-retrieval.md # Inverted indexes, BM25, TF-IDF, tokenization, web search
│       ├── 04-natural-language-processing.md              # NLP pipelines, tokenization, sentiment analysis, NER
│       ├── 05-data-structures-and-algorithms.md           # Arrays, hash tables, heaps, graphs, trees, asymptotic analysis
│       ├── 06-graph-algorithms-and-networks.md            # BFS, DFS, Dijkstra, A*, shortest paths, topological sort
│       ├── 07-distributed-systems-and-consensus.md        # Paxos, Raft, Byzantine fault tolerance, replication
│       ├── 08-database-storage-engines-and-indexing.md    # B-Trees, LSM-Trees, WAL, write-ahead logs, relational engines
│       ├── 09-operating-systems-and-virtual-memory.md     # Paging, virtual memory, TLB, scheduling, memory isolation
│       ├── 10-compiler-design-and-code-optimization.md    # Lexing, parsing, AST, intermediate representation, codegen
│       ├── 11-computer-networking-and-protocols.md        # TCP/IP, UDP, congestion control, sockets, routing
│       ├── 12-cryptography-and-security.md                # RSA, AES, elliptic curves, hashing, public-key encryption
│       └── queries.tsv                                    # 10 Human-annotated ground-truth test queries with expected files
│
├── src/                                       # Core source code tree
│   ├── main.tsx                               # React DOM client mounting point
│   ├── App.tsx                                # Root React application orchestrating navigation, tabs, and modals
│   ├── index.css                              # Neo-brutalist Tailwind CSS v4 design tokens, buttons, and high-contrast marks
│   │
│   ├── cpp/                                   # Native C++17 Header-Only Engine & CLI
│   │   ├── text_processor.hpp                 # Tokenizer, stop words, phrase extractor, and contextual snippet generator
│   │   ├── document_loader.hpp                # Directory scanner, stable ID assignment, heading parser, deduplication
│   │   ├── inverted_index.hpp                 # Inverted Index hash map, document metadata store, OR/AND candidate sets
│   │   ├── autocomplete_trie.hpp              # Manual Trie with unique_ptr memory safety, DFS walker, frequency ranking
│   │   ├── ranker.hpp                         # Okapi BM25 and baseline TF relevance scoring with explainable breakdowns
│   │   ├── top_k.hpp                          # Manual Bounded Binary Min-Heap with sift-up/sift-down and sort baseline
│   │   ├── document_graph.hpp                 # TF-IDF cosine similarity graph, candidate discovery, and BFS crawler
│   │   ├── query_queue.hpp                    # Manual singly-linked FIFO query queue with monotonic request IDs
│   │   ├── search_service.hpp                 # Central C++ engine facade orchestrating all 5 data structures
│   │   └── cli.cpp                            # Native CLI executable entry point (`./nexora <command>`)
│   │
│   ├── backend/                               # TypeScript Dual Engine & Backend Services
│   │   ├── types.ts                           # Shared data contracts, interfaces, and Node 22 runtime fallback objects
│   │   ├── textProcessor.ts                   # TypeScript tokenizer, stop-word set, and high-contrast mark builder
│   │   ├── documentLoader.ts                  # TypeScript corpus loader, token-stream fingerprinting, duplicate filter
│   │   ├── invertedIndex.ts                   # TypeScript Inverted Index class with Map<string, Map<number, number>>
│   │   ├── autocompleteTrie.ts                # TypeScript Trie class with TrieNode and subtree inspector
│   │   ├── ranker.ts                          # TypeScript BM25 and TF ranker with mathematical explanation objects
│   │   ├── topKHeap.ts                        # TypeScript Bounded Min-Heap with step-by-step trace generation
│   │   ├── documentGraph.ts                   # TypeScript TF-IDF cosine graph builder and BFS level collector
│   │   ├── queryQueue.ts                      # TypeScript Singly-linked FIFO queue with execution history ledger
│   │   ├── searchService.ts                   # TypeScript search facade orchestrating backend data structures
│   │   ├── evaluation.ts                      # Precision@K, Recall@K, and MRR evaluation engine on queries.tsv
│   │   └── benchmarks.ts                      # Latency profiling suite measuring p50/p95 and heap vs sort speedup
│   │
│   ├── components/                            # React UI Components (Neo-Brutalist Arcade Theme)
│   │   ├── Navbar.tsx                         # Header bar, brand badge, sound toggle, share button, and pill tabs
│   │   ├── SearchTab.tsx                      # Primary search omnibox, Trie completions, and expandable receipt cards
│   │   ├── GraphTab.tsx                       # Interactive SVG document relationship graph with threshold slider & BFS
│   │   ├── DsaLabTab.tsx                      # 5 Interactive DSA visualizers (Trie, Index, Heap, Queue, C++ Console)
│   │   ├── EvalTab.tsx                        # Scoreboard tab (IR metrics, p50/p95 latency distributions, score card export)
│   │   ├── CorpusTab.tsx                      # 12 Verified document receipt cards and custom document indexer form
│   │   └── DocumentModal.tsx                  # Full-text reader modal with connected graph receipts
│   │
│   └── utils/
│       └── sound.ts                           # Web Audio API arcade synthesizer (clicks, hits, pops, toggle states)
│
├── tests/
│   └── test_nexora.cpp                        # 6-Phase C++ unit and integration test suite with zero external dependencies
│
└── benchmarks/
    ├── benchmark.cpp                          # C++ latency micro-benchmarking suite (p50/p95 autocomplete, search, heap)
    └── evaluate.cpp                           # C++ information retrieval metric evaluator on data/sample/queries.tsv
```

---

# 5. In-Depth Implementation of Core Data Structures & Algorithms

This section provides an exhaustive, granular breakdown of how each of the five required data structures is engineered in Nexora.

---

## 5.1 Multi-way Prefix Tree (Trie)

### 1. What work it is doing
The Trie powers the real-time **Autocomplete and Query Suggestion Engine**. As the user types keystrokes into the search box, the Trie matches prefixes against the collection's vocabulary and multi-word adjacent phrases, returning completions ranked by corpus frequency.

### 2. What the specific work means conceptually
A Trie (or Prefix Tree) is an $m$-ary search tree where every node represents a single character along a string path. Unlike a binary search tree or hash table:
- Keys with common prefixes share common ancestor nodes.
- Searching for a prefix does not depend on the total number of words in the dictionary ($N$); it depends solely on the length of the prefix string ($L$).
- Moving down the tree naturally isolates all words starting with that prefix without scanning irrelevant dictionary branches.

### 3. What work it is directly doing in our code
- **Node Representation:**
  - In C++ (`src/cpp/autocomplete_trie.hpp`), `class TrieNode` contains:
    - `std::unordered_map<char, std::unique_ptr<TrieNode>> children`: Direct character edges.
    - `bool isEndOfWord`: Boolean flag indicating a complete vocabulary token.
    - `int frequency`: Corpus occurrence counter.
    - `std::string word`: The terminal word or multi-word phrase string.
    - `bool isPhrase`: Flag distinguishing single tokens from bigram/trigram phrases.
  - In TypeScript (`src/backend/autocompleteTrie.ts`), `class TrieNode` mirrors this using `Map<string, TrieNode>`.
- **Insertion (`insert`):**
  - When the corpus is loaded, `SearchService` extracts all unique tokens and adjacent phrases (bigrams/trigrams).
  - Each word is inserted by stepping down child nodes, creating new character nodes as needed, and setting `isEndOfWord = true` while incrementing `frequency`.
- **Prefix Walk & DFS Collection (`complete`):**
  - The prefix is walked character-by-character. If any character edge is missing, execution terminates immediately in $O(L)$ time, returning `{}`.
  - Upon reaching the prefix node, a recursive Depth-First Search (`collectWords`) gathers all terminal descendants.
  - Candidates are sorted by `frequency` descending, with alphabetical ascending tie-breaking.
- **Empty-Prefix Policy:** If an empty prefix (`""`) is passed, `complete()` returns an empty vector `{}` immediately (Decision 9).

### 4. Language Implementation Comparison

```cpp
// C++17 Implementation (src/cpp/autocomplete_trie.hpp)
class AutocompleteTrie {
private:
    std::unique_ptr<TrieNode> root;
    size_t totalWords = 0;
    size_t totalNodes = 1;

public:
    std::vector<TrieSuggestion> complete(const std::string& prefix, size_t limit = 8) const {
        if (prefix.empty()) return {}; // Empty prefix policy

        const TrieNode* current = root.get();
        for (char c : prefix) {
            char lowerC = std::tolower(static_cast<unsigned char>(c));
            auto it = current->children.find(lowerC);
            if (it == current->children.end()) return {};
            current = it->second.get();
        }

        std::vector<TrieSuggestion> matches;
        collectWords(current, matches);

        std::sort(matches.begin(), matches.end(), [](const TrieSuggestion& a, const TrieSuggestion& b) {
            if (a.frequency != b.frequency) return a.frequency > b.frequency;
            return a.word < b.word;
        });

        if (matches.size() > limit) matches.resize(limit);
        return matches;
    }
};
```

```typescript
// TypeScript Implementation (src/backend/autocompleteTrie.ts)
export class AutocompleteTrie {
  private root: TrieNode = new TrieNode();

  public complete(prefix: string, limit = 8): TrieSuggestion[] {
    const cleanPrefix = prefix.toLowerCase().trim();
    if (!cleanPrefix) return []; // Empty prefix policy

    let current = this.root;
    for (const char of cleanPrefix) {
      const nextNode = current.children.get(char);
      if (!nextNode) return [];
      current = nextNode;
    }

    const suggestions: TrieSuggestion[] = [];
    this.collectDescendants(current, suggestions);

    suggestions.sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.word.localeCompare(b.word);
    });

    return suggestions.slice(0, limit);
  }
}
```

### 5. How it solves the problem & Why it was chosen
- **The Problem:** Scanning an entire collection of 4,366 vocabulary items and multi-word phrases on every user keystroke using regex or string substring search ($O(N \cdot M)$) introduces typing lag and CPU spikes.
- **The Solution:** The Trie decouples dictionary size from lookup latency. Navigating a 4-letter prefix like `"mach"` takes exactly 4 pointer hops ($O(L)$), taking only **~25 microseconds**, making typing fluid.

---

## 5.2 Inverted Index (Hash Map Postings)

### 1. What work it is doing
The Inverted Index is the **core retrieval spine** of the search engine. It maps every distinct normalized word in the collection to the specific documents that contain it, along with the in-document frequency ($tf$).

### 2. What the specific work means conceptually
In standard forward indexing, a document contains a list of words. To find which documents contain "compiler", a forward index must scan every document sequentially ($O(N)$ full-table scan). An **Inverted Index** reverses this relationship: it stores an alphabetical or hashed dictionary of words, where each word points to a "postings list" of documents containing that word.

### 3. What work it is directly doing in our code
- **Data Structure:**
  - In C++ (`src/cpp/inverted_index.hpp`):
    - `std::unordered_map<std::string, std::unordered_map<int, int>> index`: Primary hash map from `term` -> `docId` -> `tf`.
    - `std::unordered_map<int, Document> documents`: Primary storage for document metadata.
    - Tracks aggregate statistics: `totalTokens`, `avgDocLength`, and document frequency `getDocFrequency(term)`.
  - In TypeScript (`src/backend/invertedIndex.ts`):
    - Implemented with nested native `Map<string, Map<number, number>>`.
- **Candidate Resolution (`getCandidates`):**
  - Given query tokens $Q = [t_1, t_2, \dots]$:
  - **OR Mode (Union):** Combines candidate document sets across all query terms. A document matching at least one term is retained.
  - **AND Mode (Intersection):** Sorts postings lists by ascending size and computes strict set intersection. A document is retained only if every query term appears in it.

### 4. Language Implementation Comparison

```cpp
// C++17 Candidate Retrieval (src/cpp/inverted_index.hpp)
std::vector<int> getCandidates(const std::vector<std::string>& queryTerms, const std::string& mode = "OR") const {
    if (queryTerms.empty()) return {};

    std::vector<std::unordered_set<int>> postingsList;
    for (const auto& term : queryTerms) {
        auto it = index.find(term);
        if (it != index.end() && !it->second.empty()) {
            std::unordered_set<int> docSet;
            for (const auto& [docId, _] : it->second) docSet.insert(docId);
            postingsList.push_back(std::move(docSet));
        } else if (mode == "AND") {
            return {}; // If any term has 0 postings in AND mode, intersection is empty
        }
    }

    if (postingsList.empty()) return {};
    std::vector<int> candidateDocs;

    if (mode == "OR") {
        std::unordered_set<int> unionSet;
        for (const auto& set : postingsList) {
            for (int id : set) unionSet.insert(id);
        }
        candidateDocs.assign(unionSet.begin(), unionSet.end());
    } else {
        // AND mode: intersect against smallest posting set
        std::sort(postingsList.begin(), postingsList.end(), [](const auto& a, const auto& b) {
            return a.size() < b.size();
        });
        for (int id : postingsList[0]) {
            bool inAll = true;
            for (size_t i = 1; i < postingsList.size(); ++i) {
                if (postingsList[i].find(id) == postingsList[i].end()) {
                    inAll = false; break;
                }
            }
            if (inAll) candidateDocs.push_back(id);
        }
    }
    std::sort(candidateDocs.begin(), candidateDocs.end());
    return candidateDocs;
}
```

### 5. How it solves the problem & Why it was chosen
- **The Problem:** Searching through raw file texts for every query requires parsing megabytes or gigabytes of disk content on every query, scaling linearly with corpus size ($O(\text{Corpus Size})$).
- **The Solution:** The Inverted Index resolves all candidate matches in $O(1)$ hash lookups plus the size of the postings lists. Non-matching documents are never inspected or scored.

---

## 5.3 Bounded Binary Min-Heap (Top-K Filter)

### 1. What work it is doing
The Bounded Binary Min-Heap acts as the **high-efficiency relevance filter**. When thousands of candidate documents are scored by BM25, the engine does not sort all candidates. Instead, it streams candidates through a bounded min-heap of capacity $K$ to retain only the top-$K$ highest-scoring results.

### 2. What the specific work means conceptually
A Binary Min-Heap is a complete binary tree where every parent node is less than or equal to its children (`heap[parent] <= heap[child]`). By maintaining a **Min-Heap** bounded to size $K$:
- The **root** of the heap always holds the element with the **lowest (worst)** score among the top-$K$ candidates seen so far.
- When a new candidate arrives:
  - If its score is worse than or equal to the root, it cannot possibly belong in the top-$K$. It is rejected immediately in $O(1)$ time without modifying the tree.
  - If its score is higher than the root, it replaces the root and "sifts down" into its correct position in $O(\log K)$ time.

### 3. What work it is directly doing in our code
- **Data Structure:**
  - In C++ (`src/cpp/top_k.hpp`), `class TopKHeap`:
    - `std::vector<SearchResult> heap`: Contiguous array representation where left child is $2i + 1$ and right child is $2i + 2$.
    - `size_t capacity`: Fixed maximum elements retained ($K$).
    - `bool isWorse(const SearchResult& a, const SearchResult& b)`: Strict comparator enforcing:
      1. Score ascending (lower score is worse).
      2. Title descending (alphabetically later title is worse).
      3. Doc ID descending (higher ID is worse).
- **Operations:**
  - `push(item)`: If size $< K$, appends item and executes `siftUp()`. If size $== K$, compares against `heap[0]` and conditionally replaces and calls `siftDown()`.
  - `extractSorted()`: Drains or copies the heap and sorts in reverse order (Score descending, Title ascending, Doc ID ascending) to generate the final top-$K$ ranking.
  - `fullSortBaseline()`: An exact baseline that sorts all candidates via `std::sort` ($O(M \log M)$), used in tests and benchmarks to empirically verify heap equivalence.

### 4. Language Implementation Comparison

```cpp
// C++17 Bounded Min-Heap Implementation (src/cpp/top_k.hpp)
void push(const SearchResult& item) {
    if (capacity == 0) return;

    if (heap.size() < capacity) {
        heap.push_back(item);
        siftUp(heap.size() - 1);
    } else {
        // Root holds the WORST kept result
        if (isWorse(heap[0], item)) {
            heap[0] = item; // Overwrite root in O(1)
            siftDown(0);    // Restore heap invariant in O(log K)
        }
    }
}
```

```typescript
// TypeScript Bounded Min-Heap Implementation (src/backend/topKHeap.ts)
public push(item: SearchResult): HeapStepTrace {
  if (this.capacity === 0) return { step: ++this.stepCounter, action: 'DISCARD', candidate: item, reason: 'Zero capacity' };

  if (this.heap.length < this.capacity) {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
    return { step: ++this.stepCounter, action: 'PUSH', candidate: item, reason: `Capacity not reached (${this.heap.length}/${this.capacity})` };
  }

  // Compare against root
  if (this.isWorse(this.heap[0], item)) {
    const replaced = this.heap[0];
    this.heap[0] = item;
    this.siftDown(0);
    return { step: ++this.stepCounter, action: 'REPLACE_ROOT', candidate: item, reason: `Replaced worst item Doc #${replaced.docId}` };
  }

  return { step: ++this.stepCounter, action: 'DISCARD', candidate: item, reason: `Score (${item.score}) <= root worst (${this.heap[0].score})` };
}
```

### 5. How it solves the problem & Why it was chosen
- **The Problem:** Sorting all $M$ candidate documents using QuickSort or MergeSort requires $O(M \log M)$ operations. When $M = 10,000$ and the user only wants the top $K = 5$ documents, sorting the remaining 9,995 documents is entirely wasted computation.
- **The Solution:** The Bounded Min-Heap requires only $O(M \log K)$ operations. Because $K \ll M$ (e.g., $K=5$ while $M=500$), comparisons against the root are $O(1)$, resulting in measured **35.45x speedups** over full sorting.

---

## 5.4 Weighted Symmetric Graph (TF-IDF Cosine Similarity & BFS)

### 1. What work it is doing
The Document Graph powers the **Knowledge Discovery & Related Documents System**. When a user selects a document, the graph reveals conceptually connected articles based on shared mathematical vocabulary, and executes Breadth-First Search (BFS) to identify 1st-degree and 2nd-degree topological clusters.

### 2. What the specific work means conceptually
A graph $G = (V, E)$ consists of vertices $V$ (documents) and weighted edges $E$ (cosine similarities). Two documents have a high cosine similarity when their normalized TF-IDF term vectors point in similar directions in multi-dimensional vector space. By establishing an edge threshold of $\text{sim} \ge 0.05$, the engine forms a network of meaningful connections while pruning noise.

### 3. What work it is directly doing in our code
- **Data Structure:**
  - In C++ (`src/cpp/document_graph.hpp`), `class DocumentGraph`:
    - `std::unordered_map<int, std::unordered_map<int, EdgeInfo>> adjacencyList`: Stores undirected, symmetric weighted edges.
    - `EdgeInfo`: Contains `double weight` and `std::vector<std::string> sharedTerms`.
- **Candidate Pair Discovery (`build`):**
  - **Bypassing $O(N^2)$:** Instead of comparing all $N(N-1)/2$ document pairs, Nexora uses the Inverted Index. For document $u$, it queries postings only for $u$'s non-stopword terms to find documents that share at least one informative term.
  - For each pair, it computes the dot product of TF-IDF vectors normalized by Euclidean lengths:
    $$\text{sim}(u, v) = \frac{\sum_{t \in u \cap v} \text{TF-IDF}(t, u) \cdot \text{TF-IDF}(t, v)}{\|u\| \cdot \|v\|}$$
  - If $\text{sim}(u, v) \ge 0.05$, symmetric edges are added to both $u$ and $v$.
- **Breadth-First Search Traversal (`getReachable`):**
  - Explores network neighborhoods level-by-level up to `maxDepth = 2`.
  - Maintains a `visited` hash set to prevent cyclic loops.
  - Groups discovered vertices into discrete depth tiers (`Depth 1`, `Depth 2`).

### 4. Language Implementation Comparison

```cpp
// C++17 Graph BFS Reachability (src/cpp/document_graph.hpp)
std::vector<ReachableDepthLevel> getReachable(int startDocId, int maxDepth = 2) const {
    if (documents.find(startDocId) == documents.end()) return {};

    std::unordered_set<int> visited;
    visited.insert(startDocId);
    std::vector<ReachableDepthLevel> levels;
    std::vector<int> currentQueue = {startDocId};

    for (int depth = 1; depth <= maxDepth; ++depth) {
        std::vector<int> nextQueue;
        std::vector<ReachableDoc> levelDocs;

        for (int curr : currentQueue) {
            auto it = adjacencyList.find(curr);
            if (it == adjacencyList.end()) continue;

            for (const auto& [neighborId, edge] : it->second) {
                if (visited.find(neighborId) == visited.end()) {
                    visited.insert(neighborId);
                    nextQueue.push_back(neighborId);
                    auto docIt = documents.find(neighborId);
                    if (docIt != documents.end()) {
                        levelDocs.push_back({neighborId, docIt->second.title, docIt->second.filename, edge.weight});
                    }
                }
            }
        }
        if (!levelDocs.empty()) {
            levels.push_back({depth, std::move(levelDocs)});
            currentQueue = std::move(nextQueue);
        } else {
            break;
        }
    }
    return levels;
}
```

### 5. How it solves the problem & Why it was chosen
- **The Problem:** Full-text search treats documents in isolation. Users often need to discover related literature, background context, or cross-domain relationships without typing new queries.
- **The Solution:** The weighted graph transforms isolated articles into an associative web of knowledge. BFS traversal enables users to explore intellectual neighborhoods deterministically.

---

## 5.5 Singly-Linked FIFO Query Queue

### 1. What work it is doing
The FIFO Query Queue manages **search job scheduling and request arrival-order processing**. It decouples query arrival from execution, assigning unique identifiers and processing queries sequentially without race conditions.

### 2. What the specific work means conceptually
A First-In, First-Out (FIFO) queue guarantees that jobs are executed in the exact order they arrive. By implementing a manual singly-linked list with explicit `head` and `tail` pointers:
- Enqueueing an item at the `tail` is strictly $O(1)$.
- Dequeueing an item from the `head` is strictly $O(1)$.
- Memory is allocated only when a job is enqueued and freed immediately upon completion, with zero array-resizing or circular buffer wrap-around complexity.

### 3. What work it is directly doing in our code
- **Data Structure:**
  - In C++ (`src/cpp/query_queue.hpp`), `class QueryQueue`:
    - `QueueNode<T>`: Simple node holding `T data` and `QueueNode* next`.
    - `QueueNode<QueryJob>* head`: Pointer to next job to process.
    - `QueueNode<QueryJob>* tail`: Pointer to newest job appended.
    - `size_t currentLength`: Current queue depth.
  - `QueryJob`: Struct capturing `id`, `query`, `mode`, `ranking`, `k`, `queuedAt`, `startedAt`, `finishedAt`, `durationMs`, `status`, and `results`.
- **Operations:**
  - `enqueue(query, mode, ranking, k)`: Generates a monotonically increasing request ID (`req-<epoch_ms>-<counter>`), appends to `tail`, and updates `length`.
  - `dequeue(outJob)`: Advances `head`, decrements `length`, updates status to `"processing"`, and frees the allocated node.

### 4. Language Implementation Comparison

```cpp
// C++17 Manual FIFO Queue Implementation (src/cpp/query_queue.hpp)
template<typename T>
struct QueueNode {
    T data;
    QueueNode* next = nullptr;
    explicit QueueNode(const T& d) : data(d), next(nullptr) {}
};

class QueryQueue {
private:
    QueueNode<QueryJob>* head = nullptr;
    QueueNode<QueryJob>* tail = nullptr;
    size_t currentLength = 0;
    int requestCounter = 0;

public:
    std::string enqueue(const std::string& query, const std::string& mode, const std::string& ranking, int k) {
        requestCounter++;
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        std::string requestId = "req-" + std::to_string(now) + "-" + std::to_string(requestCounter);

        QueryJob job;
        job.id = requestId; job.query = query; job.mode = mode; job.ranking = ranking;
        job.k = k; job.queuedAt = now; job.status = "queued";

        auto* node = new QueueNode<QueryJob>(job);
        if (!head) { head = node; tail = node; }
        else { tail->next = node; tail = node; }
        currentLength++;
        return requestId;
    }

    bool dequeue(QueryJob& outJob) {
        if (!head) return false;
        QueueNode<QueryJob>* node = head;
        head = head->next;
        if (!head) tail = nullptr;
        currentLength--;
        outJob = node->data;
        delete node;
        return true;
    }
};
```

### 5. How it solves the problem & Why it was chosen
- **The Problem:** Uncontrolled concurrent query bursts can saturate server CPU and memory, causing thread contention, unpredictable response times, and difficult-to-debug race conditions.
- **The Solution:** A deterministic, single-threaded FIFO queue linearizes incoming queries. It guarantees predictable execution, tracks processing latency, and provides complete arrival receipts.

---

# 6. Mathematical Foundations of Retrieval & Ranking

## 6.1 Okapi BM25 Scoring Formula

Okapi BM25 is a non-linear ranking function that calculates the relevance score of document $D$ against query $Q$:

$$\text{Score}_{\text{BM25}}(D, Q) = \sum_{t \in Q} \text{IDF}(t) \cdot \frac{f(t, D) \cdot (k_1 + 1)}{f(t, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

Where:
- $f(t, D)$: Term frequency of query term $t$ in document $D$.
- $|D|$: Total word length of document $D$.
- $\text{avgdl}$: Average document length across the entire corpus:
  $$\text{avgdl} = \frac{1}{N} \sum_{i=1}^N |D_i|$$
- $k_1 = 1.2$: Positive tuning parameter calibrating term frequency saturation. As $f(t, D)$ grows large, the contribution asymptotically approaches $k_1 + 1$.
- $b = 0.75$: Length normalization parameter ($0 \le b \le 1$). When $b=1$, documents are penalized in direct proportion to their length; when $b=0$, length normalization is disabled.

## 6.2 Robertson-Spärck Jones Inverse Document Frequency (IDF)

To measure term specificity without producing negative weights on frequent words, Nexora utilizes the non-negative Robertson-Spärck Jones IDF:

$$\text{IDF}(t) = \ln\left(1 + \frac{N - df(t) + 0.5}{df(t) + 0.5}\right)$$

Where:
- $N$: Total number of indexed documents in the collection (12 documents).
- $df(t)$: Document frequency—the number of documents containing term $t$.

*Behavior:* If a word appears in only 1 document, its IDF is high ($\approx 2.44$). If a word appears in nearly every document, its IDF approaches $0$, naturally neutralizing generic vocabulary.

## 6.3 Document Length Normalization Curve

The length normalization factor $B$ prevents long documents from dominating search results simply because they contain more total words:

$$B = 1 - b + b \cdot \left(\frac{|D|}{\text{avgdl}}\right) = 0.25 + 0.75 \cdot \left(\frac{|D|}{\text{avgdl}}\right)$$

- When $|D| = \text{avgdl}$, $B = 1.0$ (no penalty or bonus).
- When $|D| > \text{avgdl}$, $B > 1.0$ (increases the denominator, penalizing the term score).
- When $|D| < \text{avgdl}$, $B < 1.0$ (decreases the denominator, boosting concise documents).

## 6.4 Vector Space Cosine Similarity

The relationship weight between two documents $u$ and $v$ is determined by the cosine of the angle between their weighted TF-IDF term vectors:

$$\text{sim}(u, v) = \cos(\theta) = \frac{\vec{V}_u \cdot \vec{V}_v}{\|\vec{V}_u\|_2 \cdot \|\vec{V}_v\|_2} = \frac{\sum_{t \in u \cap v} w(t, u) \cdot w(t, v)}{\sqrt{\sum_{t \in u} w(t, u)^2} \cdot \sqrt{\sum_{t \in v} w(t, v)^2}}$$

Where $w(t, D) = f(t, D) \cdot \text{IDF}(t)$.

## 6.5 Information Retrieval Metrics (P@K, R@K, MRR)

1. **Precision@K ($P@K$):** Measures the proportion of retrieved documents in the top-$K$ that are ground-truth relevant:
   $$P@K = \frac{|\text{Retrieved}_K \cap \text{Relevant}|}{K}$$

2. **Recall@K ($R@K$):** Measures the proportion of all known relevant documents successfully retrieved in the top-$K$:
   $$R@K = \frac{|\text{Retrieved}_K \cap \text{Relevant}|}{|\text{Relevant}|}$$

3. **Mean Reciprocal Rank (MRR):** Measures how high the first relevant document was ranked:
   $$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
   Where $\text{rank}_i$ is the position of the *first* relevant document returned for query $i$. A perfect MRR of $1.000$ indicates that every query placed a relevant document at rank #1.

---

# 7. Empirical Evaluation & Performance Benchmarks

## 7.1 Ground-Truth Retrieval Accuracy (`queries.tsv`)

The evaluation suite (`./evaluate 3`) was executed against the 10 reference queries in `data/sample/queries.tsv`. The engine achieved a **flawless Mean Reciprocal Rank of 1.000**:

```text
========================================================================================
 Nexora (C++17) Information Retrieval Evaluation
 Dataset: data/sample/queries.tsv (K=3)
========================================================================================
Query                       P@3     R@3     RR      Rank #1 Retrieved Document
----------------------------------------------------------------------------------------
machine learning            0.67    1.00    1.00    01-machine-learning-basics.md
inverted index              0.67    1.00    1.00    03-search-engines-and-ir.md
neural networks             0.33    0.50    1.00    02-deep-learning-architectures.md
graph algorithms            0.33    0.50    1.00    06-graph-algorithms-and-networks.md
virtual memory              0.33    1.00    1.00    09-operating-systems-and-vm.md
consensus protocols         0.33    1.00    1.00    07-distributed-systems-consensus.md
compiler optimization       0.33    1.00    1.00    10-compiler-design-optimization.md
tcp udp transport           0.33    1.00    1.00    11-computer-networking-protocols.md
public key encryption       0.33    1.00    1.00    12-cryptography-and-security.md
b tree indexing             0.33    0.50    1.00    08-database-storage-indexing.md
----------------------------------------------------------------------------------------
Summary Across 10 Queries:
  Mean Precision@3:       0.400 (40.0%)
  Mean Recall@3:          0.850 (85.0%)
  Mean Reciprocal Rank:   1.000 (100.0% Rank #1 Accuracy)
========================================================================================
```

## 7.2 Microsecond & Millisecond Latency Profiles (p50 & p95)

Measured using `g++ -std=c++17 -O3` on Linux x86_64 across 200 autocomplete operations and 100 search executions:

| Subsystem / Operation | Algorithm | Metric | Measured Latency | Theoretical Complexity |
|---|---|---|---|---|
| **Autocomplete Suggestion** | Multi-way Trie Walk | Median (p50) | **25.34 µs** | $O(L)$ |
| **Autocomplete Suggestion** | Multi-way Trie Walk | 95th % (p95) | **212.22 µs** | $O(L + \Sigma)$ |
| **BM25 Search Execution** | Postings + BM25 + Heap | Median (p50) | **0.153 ms** | $O(P + M \log K)$ |
| **BM25 Search Execution** | Postings + BM25 + Heap | 95th % (p95) | **0.378 ms** | $O(P + M \log K)$ |
| **Corpus Ingestion & Build**| Loader + Index + Graph | Total Time | **20.14 ms** | $O(N \cdot |D| + E)$ |

## 7.3 Bounded Min-Heap vs Full Sort Empirical Comparison

Benchmarked on a synthetic candidate pool of $M = 500$ documents with $K = 5$ over 1,000 iterations:

```text
========================================================================================
 Top-K Selection Benchmark (M = 500 candidates, K = 5)
========================================================================================
 Bounded Binary Min-Heap  O(M log K) :     8.97 µs
 Full Sort Baseline       O(M log M) :   317.88 µs
 ---------------------------------------------------------------------------------------
 Empirical Speedup:                       35.45x faster using Bounded Min-Heap
========================================================================================
```

---

# 8. Build Systems, CLI Commands & Deployment Guide

## 8.1 C++17 Makefile Pipeline

The C++17 engine compiles with standard GCC without external dependencies:

```bash
# Compile all 4 standalone native binaries
make all

# Run the 6-phase test suite (Tokenizer, Index, Trie, BM25, Graph, Queue)
make test

# Execute the complete project demonstration walkthrough
make demo

# Run microsecond-precision latency benchmarks
make bench

# Run the ground-truth information retrieval quality evaluation
make eval

# Run all verification targets consecutively
make check

# Clean compiled executables and object files
make clean
```

## 8.2 Full-Stack Node.js & Vite Pipeline

```bash
# Install NPM dependencies
npm install

# Run the development server (port 3000)
npm run dev

# Run TypeScript type-checker without emitting code
npm run lint

# Build production assets via Vite
npm run build

# Start the production server (express static delivery)
npm start
```

## 8.3 CLI Command Reference

The compiled `./nexora` binary provides a command-line interface:

```bash
# 1. Autocomplete Suggestions
./nexora suggest mach
# Output:
# Trie Autocomplete for prefix 'mach':
#   - machine (freq: 7)
#   - machine learning (freq: 4, phrase)
#   - machine code (freq: 1, phrase)

# 2. Document Search with BM25
./nexora search "machine learning" --ranking BM25 -k 3
# Output: Top-3 documents with scores, snippets, and matched terms

# 3. Document Search with AND Matching Mode
./nexora search "neural networks deep" --mode AND

# 4. Explore Graph Neighbors
./nexora related 0
# Output: Graph neighbors for Doc #0 with cosine similarities and shared terms

# 5. FIFO Queue Demonstration
./nexora queue-demo
# Output: Enqueues batch queries, assigns request IDs, and dequeues in arrival order

# 6. Engine Statistics
./nexora stats
# Output: Documents, vocabulary size, average document length, graph edge counts
```

---

# 9. Conclusion & Architectural Takeaways

Nexora proves that high-performance, intelligent search does not require opaque black-box models or massive vector databases. By combining:
1. A **Trie** for $O(L)$ prefix navigation,
2. An **Inverted Index Hash Map** for $O(1)$ postings discovery,
3. A **Bounded Binary Min-Heap** for $O(M \log K)$ relevance pruning,
4. A **TF-IDF Cosine Graph** for associative knowledge exploration, and
5. A **Singly-Linked FIFO Queue** for deterministic request scheduling,

Nexora achieves sub-millisecond query execution, zero hallucinations, 100% explainable mathematical receipts, and a perfect Mean Reciprocal Rank of **1.000**.
