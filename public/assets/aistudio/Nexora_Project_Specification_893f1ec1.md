# Nexora — Intelligent Autocomplete & Search Engine

> A from-scratch information-retrieval project demonstrating how core data structures and ranking algorithms power document search, autocomplete, and related-document discovery.

## 1. Project overview

**Nexora** is a miniature search engine for a local collection of documents. It preprocesses documents, builds an index, suggests query completions as a user types, retrieves matching documents, ranks them by relevance, and recommends related documents.

The project is intentionally designed as a **data-structures-and-algorithms (DSA) system**, not a CRUD application. Each required data structure has a concrete responsibility and can be tested independently.

### One-line description

A miniature search engine using Trie, Hash Map, Heap, Graph, and Queue for autocomplete, document indexing, relevance ranking, related-document discovery, and query processing.

### Problem statement

Searching a folder of documents by manually opening files is slow. A basic keyword matcher also struggles to suggest queries, rank results, or reveal relationships between documents. Nexora provides a small, inspectable search pipeline that solves these problems with explicit data structures and algorithms.

### Goals

- Build a searchable local document collection.
- Support fast prefix-based autocomplete.
- Index terms so matching documents can be retrieved efficiently.
- Rank results instead of returning them in arbitrary order.
- Find related documents using shared terms or links.
- Keep the implementation explainable, measurable, and testable.

### Non-goals for the first version

- Competing with Google or production search infrastructure.
- Crawling the public web.
- Distributed indexing or real-time multi-user serving.
- Claiming semantic understanding from keyword matching alone.
- Training a custom language model.

---

## 2. Scope and MVP

The first complete version should work on a local corpus of plain-text or Markdown files.

### Core user flow

1. Load documents from a directory or a small supplied dataset.
2. Normalize and tokenize their text.
3. Build the inverted index, autocomplete Trie, and document relationship graph.
4. Let a user type a prefix and view suggestions.
5. Submit a query and retrieve matching documents.
6. Rank the matches and display the top K results with short snippets.
7. Open a result and view related documents.
8. Record query requests in a processing queue and report basic timing statistics.

### Example

User types `mach`.

Autocomplete might return:

- machine
- machine learning
- machine translation
- machinery

The user searches for `machine learning`. Nexora retrieves documents containing those terms and ranks them using a documented scoring method. Exact suggestions and results depend on the corpus.

---

## 3. Data structures and their real responsibilities

The five structures below are required architectural elements. Avoid adding a structure just to inflate the count: each one must have a meaningful operation and tests.

| Data structure | Responsibility | Main operations | Expected benefit |
|---|---|---|---|
| **Trie** | Prefix-based autocomplete | insert term, walk prefix, enumerate completions | Work depends primarily on prefix length and returned suggestions |
| **Hash Map** | Inverted index and metadata lookup | term → postings, document ID → document | Average-case fast lookup |
| **Heap / Priority Queue** | Maintain the best K search results | push candidate, replace worst/best candidate, extract in order | Efficient top-K selection when K is much smaller than all matches |
| **Graph** | Represent relationships between documents | add edge, traverse neighbors, rank or recommend neighbors | Enables related-document discovery |
| **Queue** | Process submitted search/indexing jobs in arrival order | enqueue, dequeue, inspect pending jobs | Separates request submission from processing and makes order explicit |

### 3.1 Trie — autocomplete

Each node stores character-to-child references and an end-of-term marker. A terminal node may also store the frequency of a term in the corpus.

- Insert normalized vocabulary terms.
- Walk the Trie to the node for the typed prefix.
- Enumerate terminal terms below that node.
- Sort or prioritize suggestions by corpus frequency, with alphabetical tie-breaking.

**Important:** A Trie is appropriate for prefix completion; it is not the document search index itself.

### 3.2 Hash Map — inverted index

Use a map such as:

`term -> { document_id -> term_frequency }`

Store document metadata separately:

`document_id -> { title, path, length, snippet data }`

This is an **inverted index** because a term points to the documents containing it. Store document frequency too, or calculate it from postings, for ranking.

For a query with multiple terms, retrieve the postings for each term and combine candidates according to the selected matching policy (OR or AND).

### 3.3 Heap — top-K ranking

Each candidate document receives a relevance score. Use a heap to retain or extract the top K results rather than sorting every document when the candidate set is large.

- Define clearly whether the heap exposes the highest or lowest score at its root.
- Specify tie-breaking, for example score descending then title ascending.
- Test empty results, K = 1, K larger than the result count, and equal scores.

A full sort is acceptable as a simple baseline for correctness tests, but the final top-K path should use the heap.

### 3.4 Graph — document relationships

Represent each document as a vertex. Add weighted edges between documents that share enough meaningful terms, or use explicit links if the corpus contains them.

A practical MVP approach:

1. Remove common stop words.
2. Find shared terms between documents.
3. Create an edge when the overlap passes a chosen threshold.
4. Weight edges using overlap or cosine similarity over TF-IDF vectors.
5. Recommend the strongest neighboring documents.

Do not compare every pair of documents blindly at large scale; that can become expensive. For the MVP, a small corpus is fine. Document the complexity and any corpus-size limit.

### 3.5 Queue — query processing

A FIFO queue stores pending search jobs, each containing a query, request ID, and optional timestamp.

- Submit a request by enqueueing it.
- A worker dequeues and processes requests in order.
- Return the result associated with its request ID.
- Track queue length and processing duration.

For a single-user synchronous command-line MVP, the queue can be a small explicit job-processing layer. Do not claim it provides concurrency or production-grade asynchronous processing unless those capabilities are implemented.

---

## 4. Search and ranking design

### Text preprocessing

Use the same preprocessing rules for indexing and queries:

1. Normalize case.
2. Tokenize text consistently.
3. Handle punctuation and repeated whitespace.
4. Optionally remove stop words.
5. Optionally apply stemming or lemmatization as a clearly documented extension.

Keep the original title and text for display. Avoid over-normalizing terms in ways that harm search quality.

### Baseline retrieval

Start with a simple, explainable term-frequency score. For each query term, accumulate its contribution for every document in that term's postings. Support OR matching first, then add AND matching as a filter or alternate mode.

### Recommended ranking upgrade: TF-IDF or BM25

**TF-IDF** is a good educational first step. **BM25** is a stronger practical lexical-ranking baseline because it accounts for term frequency saturation and document length.

For BM25, one common form is:

`score(D, Q) = sum over query terms t of IDF(t) * [ f(t,D) * (k1 + 1) ] / [ f(t,D) + k1 * (1 - b + b * |D| / avgdl) ]`

Where:
- `f(t,D)` is the frequency of term `t` in document `D`.
- `|D|` is the document length.
- `avgdl` is average document length across the corpus.
- `k1` and `b` are tunable parameters.
- `IDF(t)` increases the contribution of terms that are less common across documents.

Implement and test one ranking method before adding multiple alternatives. Use a reference implementation or hand-calculated examples to validate the formula.

### Ranking and related-document separation

Keep two concepts distinct:

- **Search ranking**: how well a document matches the query.
- **Related-document ranking**: how strongly a document is connected to another document in the graph.

A future hybrid ranker may combine lexical score, graph score, and recency, but every component should be measurable and its weight configurable. Do not combine arbitrary scores without evaluating whether results improve.

---

## 5. System architecture

```text
                 Local document corpus
                          |
                          v
                Document loader/parser
                          |
                          v
                Text preprocessing
                   /           \
                  v             v
          Inverted index       Trie
          (Hash Map)       (Autocomplete)
                  |
                  v
User query --> Query queue --> Query processor
                                  |
                                  v
                         Candidate retrieval
                                  |
                                  v
                         Relevance scoring
                                  |
                                  v
                         Top-K Heap
                                  |
                                  v
                        Ranked search results
                                  |
                                  v
                         Document Graph
                                  |
                                  v
                     Related-document suggestions
```

### Main modules

- `DocumentLoader`: discovers and reads supported files.
- `TextProcessor`: normalizes and tokenizes text.
- `InvertedIndex`: builds and queries term postings.
- `AutocompleteTrie`: inserts vocabulary and returns prefix suggestions.
- `DocumentGraph`: creates edges and returns related documents.
- `Ranker`: calculates TF-IDF/BM25 or baseline scores.
- `TopKSelector`: uses a heap to select the best results.
- `QueryQueue` / `SearchService`: processes requests and connects components.
- `CLI` or `UI`: accepts queries and renders results.
- `Evaluation`: runs tests and measures retrieval quality and speed.

Keep the data structures in their own modules. Avoid burying all logic in one large file or replacing the core structures with libraries that do the assignment for you.

---

## 6. Suggested repository structure

```text
nexora/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── design-decisions.md
│   └── evaluation.md
├── data/
│   ├── sample/
│   └── README.md
├── src/
│   └── nexora/
│       ├── __init__.py
│       ├── document_loader.py
│       ├── text_processor.py
│       ├── inverted_index.py
│       ├── autocomplete_trie.py
│       ├── document_graph.py
│       ├── ranker.py
│       ├── top_k.py
│       ├── query_queue.py
│       ├── search_service.py
│       └── cli.py
├── tests/
│   ├── test_text_processor.py
│   ├── test_inverted_index.py
│   ├── test_trie.py
│   ├── test_document_graph.py
│   ├── test_ranker.py
│   ├── test_top_k.py
│   └── test_search_service.py
├── benchmarks/
│   └── benchmark_search.py
└── pyproject.toml
```

This is a proposed Python structure, not a requirement. C++ is also suitable if the goal is to implement the structures manually and demonstrate systems-level skills. Choose one main language rather than splitting the core logic across languages without a reason.

---

## 7. Functional requirements

### Must-have

- **FR-01:** Load a collection of local text or Markdown documents.
- **FR-02:** Assign each document a stable ID and retain its title and source path.
- **FR-03:** Normalize and tokenize documents consistently.
- **FR-04:** Build an inverted index using a Hash Map.
- **FR-05:** Support single- and multi-term keyword searches.
- **FR-06:** Return prefix completions from a Trie.
- **FR-07:** Rank matching documents and return the top K using a Heap.
- **FR-08:** Represent document relationships as a Graph.
- **FR-09:** Return related documents for a selected result.
- **FR-10:** Process submitted queries through an explicit FIFO Queue.
- **FR-11:** Show titles, scores, snippets, and source paths.
- **FR-12:** Handle empty queries, unknown terms, duplicate documents, and invalid K values gracefully.

### Should-have

- Phrase search.
- AND/OR query modes.
- Search-result highlighting.
- Configurable number of results.
- Rebuild or update the index when documents change.
- Export benchmark results to CSV or JSON.

### Stretch goals

- BM25 ranking after a tested baseline.
- Graph-based ranking such as PageRank-style scoring.
- Typo tolerance using edit distance or a Trie-based strategy.
- Hybrid lexical and semantic retrieval using embeddings.
- A simple web interface after the core engine works.

Semantic embeddings are an extension, not a substitute for implementing the required DSA components.

---

## 8. Non-functional requirements

- **Correctness:** each data structure must satisfy its documented invariants.
- **Consistency:** indexing and query processing use the same tokenization rules.
- **Performance:** record timings on a declared corpus; avoid unsupported speed claims.
- **Reproducibility:** include a small dataset and deterministic test queries.
- **Maintainability:** separate indexing, retrieval, ranking, graph, and interface code.
- **Robustness:** malformed files or unsupported encodings should produce useful errors rather than silently corrupting the index.
- **Privacy:** process local files locally by default; do not upload document contents to external services.
- **Explainability:** show enough score details or matching terms to make rankings inspectable.

---

## 9. Testing and evaluation plan

### Unit tests

- Trie: insertion, shared prefixes, missing prefix, empty prefix policy, and frequency tie-breaking.
- Inverted index: repeated terms, absent terms, multi-term queries, and duplicate document handling.
- Heap: correct ordering, equal scores, K = 0 policy, K = 1, and K greater than candidate count.
- Graph: edge creation, isolated documents, duplicate edges, and neighbor ranking.
- Queue: FIFO order, empty queue, and request/result association.
- Ranker: hand-calculated examples, document-length effects, and common versus rare terms.

### End-to-end tests

Prepare a small corpus with known expected results. For each query, verify:
- the expected relevant document appears;
- clearly irrelevant documents do not outrank it;
- autocomplete suggestions match the prefix;
- related-document results follow the documented graph rule.

### Evaluation metrics

- **Autocomplete latency:** time per prefix request.
- **Search latency:** median and 95th-percentile query time.
- **Index build time:** time to index the corpus.
- **Memory usage:** approximate memory used by the index and graph.
- **Precision@K:** proportion of the first K results judged relevant.
- **Recall@K:** proportion of known relevant documents retrieved in the first K results.
- **MRR:** how high the first relevant result appears.

Create a small query set with manually labeled relevant documents. Report the corpus size, machine, language/runtime version, and measurement method. Never invent performance numbers; measure them.

---

## 10. Complexity expectations

Let:
- `L` = length of an autocomplete prefix.
- `S` = number of suggestions returned.
- `P` = number of postings visited for the query.
- `M` = number of candidate documents.
- `K` = requested result count.
- `V` and `E` = graph vertices and edges.

| Operation | Expected complexity / note |
|---|---|
| Trie prefix lookup | `O(L)` average with direct child lookup |
| Enumerate autocomplete results | Depends on subtree explored; at least `O(S)` to emit S suggestions |
| Hash Map term lookup | `O(1)` average to locate a term's postings |
| Retrieve candidates | Proportional to postings visited, roughly `O(P)` before scoring/combining costs |
| Heap-based top-K | `O(M log K)` with a bounded heap, when `1 <= K < M` |
| Graph traversal | `O(V + E)` for BFS/DFS over the visited graph |
| Build document relationships | Naive pairwise comparison can be `O(N²)` pairs; optimize if corpus size requires it |

These are expected bounds under stated assumptions, not guarantees for every implementation or dataset.

---

## 11. Implementation roadmap and checkpoints

### Phase 1 — Corpus and preprocessing
- Define a document schema and load a small corpus.
- Implement deterministic tokenization and normalization.
- **Checkpoint:** same input always produces the same token sequence.

### Phase 2 — Inverted index
- Build the Hash Map postings and term/document frequencies.
- Implement single-term and multi-term retrieval.
- **Checkpoint:** unit tests pass on a hand-built corpus.

### Phase 3 — Autocomplete
- Implement Trie insertion and prefix traversal.
- Add frequency-based suggestion ordering.
- **Checkpoint:** prefixes return only valid terms, in deterministic order.

### Phase 4 — Ranking and top-K
- Implement a baseline scorer, then TF-IDF or BM25.
- Use a Heap to select top-K results.
- **Checkpoint:** hand-calculated ranking tests pass and result ordering is stable.

### Phase 5 — Document graph
- Build edges from shared meaningful terms or explicit links.
- Return related documents with a clear explanation of edge weights.
- **Checkpoint:** graph tests confirm neighbors and traversal behavior.

### Phase 6 — Query queue and integration
- Enqueue search requests, process them in FIFO order, and associate results with request IDs.
- Connect all modules through a search service.
- **Checkpoint:** end-to-end searches use every required structure in a demonstrable path.

### Phase 7 — Interface, benchmarks, and documentation
- Add a CLI first; optionally add a UI.
- Measure correctness, ranking quality, latency, and index size.
- **Checkpoint:** a clean checkout can run tests and a sample search using documented commands.

---

## 12. Design decisions to record

Document these choices in `docs/design-decisions.md`:

1. Why Trie autocomplete is separate from the inverted index.
2. Whether multi-term search uses OR, AND, or both.
3. Why BM25 or TF-IDF was selected for lexical ranking.
4. How ties are resolved in the Heap.
5. How graph edges and weights are created.
6. Why the Queue exists in the chosen architecture and what it does not guarantee.
7. What happens when documents are added, edited, or removed.
8. Which components are implemented manually versus provided by standard libraries.
9. What limitations appear as the corpus grows.
10. Why semantic search is deferred until lexical retrieval is correct.

---

## 13. Risks and how to avoid weak implementation

- **Risk: DSA components are only decorative.** Make each one responsible for a real operation, with tests and a demo.
- **Risk: the Graph is arbitrary.** Define edge semantics and show why recommended documents are connected.
- **Risk: ranking is just word count.** Start with a baseline, then implement and evaluate TF-IDF/BM25.
- **Risk: the Queue adds no value.** Clearly define queued jobs and FIFO behavior; do not claim distributed processing.
- **Risk: too many features delay completion.** Finish the core search path before adding embeddings or a UI.
- **Risk: performance claims are unverified.** Publish reproducible benchmarks rather than adjectives like “instant” or “massive scale.”
- **Risk: calling it a production search engine.** Describe it honestly as a miniature educational retrieval engine.

---

## 14. Definition of done

The MVP is complete when:

- [ ] A clean setup can load the sample corpus.
- [ ] The Trie returns correct autocomplete suggestions.
- [ ] The Hash Map inverted index retrieves the expected candidate documents.
- [ ] The Heap returns the correct top-K ordering.
- [ ] The Graph returns related documents based on a documented rule.
- [ ] The Queue processes jobs in FIFO order.
- [ ] Search results show titles, snippets, and relevance scores.
- [ ] Unit and end-to-end tests pass.
- [ ] Benchmarks and their environment are documented.
- [ ] README instructions reproduce the demo without hidden manual steps.
- [ ] Limitations and future work are stated honestly.

---

## 15. Recommended demo

1. Load a sample corpus about programming, machine learning, algorithms, and computer systems.
2. Type `mach` and show Trie-based suggestions.
3. Search `machine learning` and show ranked results with matching terms and scores.
4. Change K and demonstrate Heap-based top-K selection.
5. Open a result and display graph-connected documents.
6. Submit several requests and demonstrate FIFO Queue processing.
7. Show tests and measured benchmark results.

## 16. Final project positioning

**Nexora is an educational search and information-retrieval engine that demonstrates Trie-based autocomplete, Hash Map inverted indexing, Heap-based top-K ranking, Graph-based document relationships, and Queue-based query processing.** Its value comes from correct implementations, defensible design decisions, measurable retrieval quality, and reproducible benchmarks—not simply the number of data structures listed.

### Suggested stack

- **Language:** Python or C++.
- **Core DSA:** implement the Trie, Heap usage, graph operations, and queue behavior explicitly enough to demonstrate them.
- **Testing:** `pytest` for Python or a suitable C++ test framework.
- **Interface:** CLI first; add a lightweight UI only after the engine works.
- **Dataset:** small, openly licensed local text/Markdown documents with source attribution.

Keep the initial version small and correct. A tested lexical search engine is a stronger foundation than an unfinished “AI-powered” system with embeddings added before the retrieval logic works.
