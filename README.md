# Nexora — Intelligent Autocomplete & Information Retrieval Engine

[![Language: C++17](https://img.shields.io/badge/C%2B%2B-17-00599C?style=flat&logo=c%2B%2B)](src/cpp/)
[![Language: TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript)](src/)
[![Framework: React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](src/App.tsx)
[![Styling: Tailwind v4](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?style=flat&logo=tailwind-css)](src/index.css)
[![Tests: Passing](https://img.shields.io/badge/Tests-All%20Checkpoints%20Passed-success)](tests/test_nexora.cpp)
[![MRR: 1.000](https://img.shields.io/badge/IR%20MRR-1.000-brightgreen)](benchmarks/evaluate.cpp)

> **Zero hallucinations. All receipts.** A miniature information-retrieval engine demonstrating how five fundamental data structures—**Trie, Hash Map, Bounded Binary Min-Heap, Weighted Graph, and FIFO Queue**—power real-time autocomplete, inverted indexing, BM25 relevance ranking, related-document discovery, and deterministic query scheduling.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [The 5 Core Data Structures](#the-5-core-data-structures)
3. [Search & Ranking Pipeline](#search--ranking-pipeline)
4. [Repository Structure](#repository-structure)
5. [Quickstart — C++17 Engine](#quickstart--c17-engine)
6. [Quickstart — Full-Stack Web Application](#quickstart--full-stack-web-application)
7. [Benchmarks & Evaluation](#benchmarks--evaluation)
8. [GitHub Setup & Pushing Guide (Troubleshooting)](#github-setup--pushing-guide)
9. [Architecture Decisions](#architecture-decisions)
10. [License](#license)

---

## Project Overview

Nexora is designed as an educational, inspectable search engine for local document collections. Unlike opaque vector-search wrappers, every algorithm in Nexora has a transparent responsibility and satisfies strict theoretical invariants:

- **Autocomplete**: Multi-way Trie suggesting vocabulary words and adjacent multi-word phrases by corpus frequency in $O(L)$ time.
- **Inverted Index**: Hash Map mapping terms to document postings `{docId -> termFrequency}`, supporting both **OR** (union) and **AND** (intersection) candidate retrieval in average $O(1)$ time.
- **Top-K Ranking**: Manual Bounded Binary Min-Heap retaining only the best $K$ documents. Root stores the worst kept candidate, rejecting suboptimal documents in $O(1)$ and inserting in $O(\log K)$.
- **Document Graph**: Adjacency list connecting documents via TF-IDF vector cosine similarity ($\text{sim} \ge 0.05$) to discover related documents and Breadth-First Search (BFS) clusters.
- **Query Queue**: Manual singly-linked-list FIFO queue assigning request IDs (`req-<timestamp>-<id>`) and processing search jobs in arrival order.

Nexora includes both a **C++17 native engine** (header-only modules, plain `Makefile`, zero third-party dependencies) and a **TypeScript / React 19** full-stack web application styled with a neo-brutalist fact-checking theme inspired by `DESIGN.md`.

---

## The 5 Core Data Structures

| Data Structure | Role in Engine | Key Operations | Asymptotic Complexity |
|---|---|---|---|
| **Multi-way Trie** | Prefix-based autocomplete | `insert(term, freq)`, `complete(prefix, limit)` | $O(L)$ where $L$ = prefix length |
| **Hash Map** | Inverted Index & Postings | `build(docs)`, `getCandidates(terms, mode)` | $O(1)$ average term lookup |
| **Bounded Min-Heap** | Top-$K$ relevance ranking | `push(item)`, `extractSorted()`, `replaceRoot()` | $O(M \log K)$ vs $O(M \log M)$ full sort |
| **Weighted Graph** | Related documents & BFS clusters | `build(docs, index)`, `getRelated(id)`, `getReachable(id, depth)` | $O(V + E)$ BFS traversal |
| **Singly-Linked Queue** | FIFO query job scheduling | `enqueue(job)`, `dequeue()` | $O(1)$ arrival-order scheduling |

---

## Search & Ranking Pipeline

### 1. Text Preprocessing
- **Tokenization:** Deterministic lowercase splitting on non-alphanumeric characters (`/[^a-z0-9]+/i`).
- **Stop Words:** 120+ standard English stop words filtered during graph vector construction and candidate generation.
- **Deduplication:** Normalized token stream fingerprinting (`tokens.join(" ")`). Duplicate documents are reported and skipped.

### 2. Lexical Ranking (Okapi BM25)
Nexora uses the probabilistic Okapi BM25 scoring function with Robertson-Spärck Jones IDF:

$$\text{score}(D, Q) = \sum_{t \in Q} \text{IDF}(t) \cdot \frac{f(t, D) \cdot (k_1 + 1)}{f(t, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

Where:
- $f(t, D)$ is the frequency of term $t$ in document $D$.
- $|D|$ is the token length of document $D$.
- $\text{avgdl}$ is the average document length across the collection.
- $k_1 = 1.2$ (term frequency saturation parameter).
- $b = 0.75$ (document length penalization parameter).
- $\text{IDF}(t) = \ln\left(1 + \frac{N - df(t) + 0.5}{df(t) + 0.5}\right)$ increases the weight of rare discriminative terms.

---

## Repository Structure

```text
nexora/
├── Makefile                       # C++ build system (all, test, bench, eval, demo, check)
├── package.json                   # Node.js dependencies & full-stack scripts
├── tsconfig.json                  # TypeScript compiler configuration
├── vite.config.ts                 # Vite frontend build pipeline
├── server.ts                      # Express server mounting API & Vite middlewares
├── README.md                      # Project documentation
├── docs/                          # Architecture & design specifications
│   ├── architecture.md            # Detailed structural and data flow documentation
│   ├── design-decisions.md        # 11 engineering decisions & rationale
│   └── evaluation.md              # Retrieval quality & latency benchmark report
├── data/
│   └── sample/                    # 12 CC0 reference documents
│       ├── 01-machine-learning-basics.md
│       ├── 02-deep-learning-architectures.md
│       ├── ...
│       ├── 12-cryptography-and-security.md
│       └── queries.tsv            # Annotated test queries for P@K / Recall@K / MRR
├── src/
│   ├── cpp/                       # C++17 Header-Only Engine & CLI
│   │   ├── text_processor.hpp     # Tokenizer, stop words, phrase extraction, snippets
│   │   ├── document_loader.hpp    # Stable ID assignment, title extraction, deduplication
│   │   ├── inverted_index.hpp     # Hash Map postings list & OR/AND retrieval
│   │   ├── autocomplete_trie.hpp  # Manual Trie with frequency ranking & unique_ptr safety
│   │   ├── ranker.hpp             # Okapi BM25 & baseline TF scoring
│   │   ├── top_k.hpp              # Manual Bounded Binary Min-Heap
│   │   ├── document_graph.hpp     # TF-IDF cosine similarity graph & BFS
│   │   ├── query_queue.hpp        # Manual linked-list FIFO queue
│   │   ├── search_service.hpp     # Integrated engine facade
│   │   └── cli.cpp                # Native command-line application (./nexora)
│   ├── backend/                   # TypeScript Engine & API Services
│   │   ├── types.ts               # Data structure interfaces & contracts
│   │   ├── textProcessor.ts       # Tokenizer & high-contrast snippet generator
│   │   ├── documentLoader.ts      # Document parser & deduplication
│   │   ├── invertedIndex.ts       # TypeScript Hash Map inverted index
│   │   ├── autocompleteTrie.ts    # TypeScript Trie implementation
│   │   ├── ranker.ts              # TypeScript BM25 & TF scorer
│   │   ├── topKHeap.ts            # TypeScript Bounded Min-Heap with step trace
│   │   ├── documentGraph.ts       # TypeScript similarity graph & BFS
│   │   ├── queryQueue.ts          # TypeScript FIFO queue
│   │   ├── searchService.ts       # Search orchestration service
│   │   ├── evaluation.ts          # Precision@K, Recall@K, and MRR evaluator
│   │   └── benchmarks.ts          # Latency & throughput benchmark runner
│   ├── components/                # React 19 Frontend Components
│   │   ├── Navbar.tsx             # Header, controls, and sound effects toggle
│   │   ├── SearchTab.tsx          # Omnibox, Trie suggestions, and receipt cards
│   │   ├── GraphTab.tsx           # Interactive SVG document relationship graph
│   │   ├── DsaLabTab.tsx          # 5 interactive DSA visualizers + C++ console
│   │   ├── EvalTab.tsx            # Scoreboard (P@K, Recall, MRR, latency, downloads)
│   │   ├── CorpusTab.tsx          # Document repository & custom document indexer
│   │   └── DocumentModal.tsx      # Full document reader with connected graph neighbors
│   ├── utils/
│   │   └── sound.ts               # Web Audio API retro arcade sound synthesizer
│   ├── App.tsx                    # Main React application entry point
│   └── index.css                  # Neo-brutalist theme & high-contrast styling
├── tests/
│   └── test_nexora.cpp            # 6-phase C++ unit & integration test suite
└── benchmarks/
    ├── benchmark.cpp              # C++ latency percentiles & heap vs sort benchmark
    └── evaluate.cpp               # C++ evaluation on queries.tsv
```

---

## Quickstart — C++17 Engine

### Requirements
- GCC / G++ supporting C++17 (`g++ >= 9.0`)
- GNU Make

### Build and Test
```bash
# Compile all C++ binaries (nexora, run_tests, benchmark, evaluate)
make all

# Run the 6-phase test suite
make test

# Run the full spec demo walkthrough
make demo

# Measure autocomplete and search latencies (p50 / p95)
make bench

# Evaluate Precision@K, Recall@K, and MRR on queries.tsv
make eval

# Run all verification checks consecutively
make check
```

### CLI Usage
```bash
# Autocomplete prefix suggestions
./nexora suggest mach

# Search documents using BM25 and Top-K heap
./nexora search "machine learning" --ranking BM25 -k 3

# Search documents in AND mode (strict intersection)
./nexora search "neural networks deep" --mode AND

# View graph neighbors for Document #0
./nexora related 0

# Test FIFO queue scheduling
./nexora queue-demo

# View corpus and engine statistics
./nexora stats
```

---

## Quickstart — Full-Stack Web Application

### Requirements
- Node.js (`>= 18.x`)
- npm or bun

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack dev server (Express + Vite on Port 3000)
npm run dev

# 3. Build production bundle
npm run build

# 4. Run type check and linter
npm run lint
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Benchmarks & Evaluation

### Information Retrieval Evaluation (`data/sample/queries.tsv`)

Evaluated against 10 ground-truth human-annotated test queries:

| Metric | Measured Value | Target Standard |
|---|---|---|
| **Mean Reciprocal Rank (MRR)** | **1.000** | Every query returned its relevant document at rank #1 |
| **Mean Recall@3** | **85.0%** | Retained 85% of all relevant corpus files within Top-3 |
| **Mean Precision@3** | **40.0%** | 40% of all top-3 retrieved slots were relevant |

### Latency Profiles (C++17 Engine, Linux x86_64)

| Task | Algorithm | Median (p50) | 95th Percentile (p95) |
|---|---|---|---|
| **Autocomplete** | Multi-way Trie $O(L)$ | **25.34 µs** | **212.22 µs** |
| **Search Query** | Postings + BM25 + Min-Heap | **0.153 ms** | **0.378 ms** |
| **Index Construction** | Inverted Index + Graph Build | **20.14 ms** | — |

### Bounded Min-Heap vs. Full Sort ($M = 500, K = 5$)

- **Bounded Min-Heap $O(M \log K)$:** **~8.9 µs**
- **Full Sort Baseline $O(M \log M)$:** **~317.8 µs**
- **Speedup:** **35.45x faster** using Bounded Min-Heap.

---

## GitHub Setup & Pushing Guide

If you encountered an error while trying to push this repository to GitHub, follow the diagnostics below to identify and fix the issue.

### 1. Initialize Git & Configure Identity (First Time Setup)
If Git was not previously initialized in the folder:
```bash
# Initialize git repository
git init

# Configure your git author name and email
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set the default branch to main
git branch -M main
```

### 2. Stage & Commit Clean Source Files
Compiled binaries (`nexora`, `run_tests`, `benchmark`, `evaluate`) and `node_modules` are automatically ignored by `.gitignore`:
```bash
# Stage all tracked files
git add .

# Create the initial commit
git commit -m "feat: initial commit of Nexora IR engine with C++17 and TypeScript stack"
```

### 3. Connect to Your GitHub Repository
Create a new empty repository on [GitHub](https://github.com/new) (without adding a README or `.gitignore`):
```bash
# Add your remote repository URL (replace with your repo URL)
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Verify remote configuration
git remote -v
```

### 4. Push to GitHub
```bash
git push -u origin main
```

---

### Common GitHub Push Failures & Fixes

#### A. Error: `fatal: not a git repository`
- **Cause:** `git init` has not been run in the directory.
- **Fix:** Run `git init && git branch -M main`.

#### B. Error: `fatal: empty ident name (for <root@...>) not allowed`
- **Cause:** Git does not know your author name or email.
- **Fix:** Run:
  ```bash
  git config user.name "Your GitHub Username"
  git config user.email "your_email@example.com"
  ```

#### C. Error: `fatal: could not read Username for 'https://github.com'` / Authentication Failed
- **Cause:** GitHub discontinued password authentication for Git operations. You must use a **Personal Access Token (PAT)** or **SSH key**.
- **Fix Option 1 (Personal Access Token):**
  1. Go to **GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**.
  2. Generate a token with the `repo` scope.
  3. When prompted for password in terminal, paste the Personal Access Token instead of your password.
  4. Or set remote URL directly with the token:
     ```bash
     git remote set-url origin https://<YOUR_TOKEN>@github.com/<your-username>/<your-repo-name>.git
     git push -u origin main
     ```
- **Fix Option 2 (SSH Key):**
  ```bash
  # Check if you have an SSH key
  ls -al ~/.ssh/id_ed25519.pub

  # If not, generate one
  ssh-keygen -t ed25519 -C "your_email@example.com"

  # Copy public key and add it to GitHub Settings -> SSH and GPG keys
  cat ~/.ssh/id_ed25519.pub

  # Set remote to use SSH
  git remote set-url origin git@github.com:<your-username>/<your-repo-name>.git
  git push -u origin main
  ```

#### D. Error: `Updates were rejected because the remote contains work that you do not have locally`
- **Cause:** The remote repository on GitHub was created with a README or license file.
- **Fix:** Pull and merge the remote history:
  ```bash
  git pull origin main --allow-unrelated-histories
  git push -u origin main
  ```

#### E. Error: `remote: error: GH001: Large files detected`
- **Cause:** Executable binaries or `node_modules` were accidentally committed.
- **Fix:** Our `.gitignore` already excludes `nexora`, `run_tests`, `run_tests_dbg`, `benchmark`, `evaluate`, and `node_modules/`. Run `make clean` before staging.

---

## Architecture Decisions

See [`docs/design-decisions.md`](docs/design-decisions.md) for full context on:
1. Why the Trie autocomplete is separated from the inverted index.
2. How candidate pairs are found through shared postings to prevent $O(N^2)$ graph builds.
3. Why the Bounded Min-Heap's root is the *worst* kept element.
4. Okapi BM25 scoring with term frequency saturation.
5. Strict single-threaded FIFO query queue semantics.

---

## License

Code is licensed under the Apache 2.0 License. The 12 reference documents in `data/sample/` are dedicated to the public domain under Creative Commons CC0.
