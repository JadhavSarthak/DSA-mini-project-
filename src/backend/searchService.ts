import path from 'path';
import { AutocompleteTrie } from './autocompleteTrie.ts';
import { DocumentGraph } from './documentGraph.ts';
import { DocumentLoader } from './documentLoader.ts';
import { InvertedIndex } from './invertedIndex.ts';
import { QueryQueue } from './queryQueue.ts';
import { Ranker } from './ranker.ts';
import { TextProcessor } from './textProcessor.ts';
import { TopKHeap, type HeapStepTrace } from './topKHeap.ts';
import type { Document, QueryJob, SearchResult, TrieSuggestion } from './types.ts';

export interface SearchOutput {
  query: string;
  normalizedQueryTokens: string[];
  mode: 'OR' | 'AND';
  ranking: 'BM25' | 'TF';
  k: number;
  totalCandidates: number;
  results: SearchResult[];
  heapTrace?: HeapStepTrace[];
  durationMs: number;
}

export interface ServiceStats {
  documentCount: number;
  vocabularySize: number;
  avgDocLength: number;
  trieWordCount: number;
  trieNodeCount: number;
  graphVertices: number;
  graphEdges: number;
  queueLength: number;
  lastBuildStats: {
    indexBuildMs: number;
    trieBuildMs: number;
    graphBuildMs: number;
    totalDocsLoaded: number;
    skippedDuplicates: number;
  };
}

export class SearchService {
  private loader: DocumentLoader = new DocumentLoader();
  private index: InvertedIndex = new InvertedIndex();
  private trie: AutocompleteTrie = new AutocompleteTrie();
  private graph: DocumentGraph = new DocumentGraph();
  private queue: QueryQueue = new QueryQueue();

  private documents: Document[] = [];
  private currentCorpusDir = '';
  private lastBuildStats = {
    indexBuildMs: 0,
    trieBuildMs: 0,
    graphBuildMs: 0,
    totalDocsLoaded: 0,
    skippedDuplicates: 0,
  };

  constructor(corpusDir = path.resolve(process.cwd(), 'data/sample')) {
    this.currentCorpusDir = corpusDir;
    this.reloadCorpus(corpusDir);
  }

  /**
   * Loads documents from disk and builds all data structures.
   */
  public reloadCorpus(dirPath: string): { loaded: number; duplicates: number; errors: any[] } {
    this.currentCorpusDir = dirPath;

    // Phase 1: Load documents and detect duplicates
    const loadResult = DocumentLoader.loadFromDirectory(dirPath);
    this.documents = loadResult.documents;

    // Phase 2: Build Inverted Index (Hash Map)
    const t0 = performance.now();
    this.index.build(this.documents);
    const t1 = performance.now();

    // Phase 3: Build Autocomplete Trie
    const t2 = performance.now();
    this.trie = new AutocompleteTrie();
    // Insert single vocabulary terms with corpus frequencies
    const termFreqs = new Map<string, number>();
    for (const doc of this.documents) {
      for (const token of doc.tokens) {
        termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
      }
      // Insert meaningful multi-word phrases (decision 9)
      const phrases = TextProcessor.extractPhrases(doc.tokens);
      for (const p of phrases) {
        this.trie.insert(p.phrase, p.count, true);
      }
    }
    for (const [term, freq] of termFreqs.entries()) {
      this.trie.insert(term, freq, false);
    }
    const t3 = performance.now();

    // Phase 5: Build Document Graph (TF-IDF Cosine Similarity)
    const t4 = performance.now();
    this.graph = new DocumentGraph(0.05);
    this.graph.build(this.documents, this.index);
    const t5 = performance.now();

    this.lastBuildStats = {
      indexBuildMs: Number((t1 - t0).toFixed(2)),
      trieBuildMs: Number((t3 - t2).toFixed(2)),
      graphBuildMs: Number((t5 - t4).toFixed(2)),
      totalDocsLoaded: this.documents.length,
      skippedDuplicates: loadResult.skippedDuplicates.length,
    };

    return {
      loaded: this.documents.length,
      duplicates: loadResult.skippedDuplicates.length,
      errors: loadResult.errors,
    };
  }

  /**
   * Trie autocomplete prefix completion.
   */
  public getSuggestions(prefix: string, limit = 8): TrieSuggestion[] {
    return this.trie.complete(prefix, limit);
  }

  /**
   * Core search pipeline executed synchronously:
   * 1. Tokenization and stopword handling
   * 2. Candidate retrieval from Hash Map Inverted Index (OR / AND)
   * 3. Relevance ranking (BM25 or TF)
   * 4. Top-K selection via Bounded Min-Heap
   * 5. Snippet generation & score explanation
   */
  public searchSync(
    rawQuery: string,
    mode: 'OR' | 'AND' = 'OR',
    ranking: 'BM25' | 'TF' = 'BM25',
    k = 5,
    enableHeapTrace = false
  ): SearchOutput {
    const startTime = performance.now();
    const queryTokens = TextProcessor.tokenize(rawQuery);

    if (queryTokens.length === 0) {
      return {
        query: rawQuery,
        normalizedQueryTokens: [],
        mode,
        ranking,
        k,
        totalCandidates: 0,
        results: [],
        durationMs: Number((performance.now() - startTime).toFixed(2)),
      };
    }

    // Step 2: Retrieve candidate doc IDs
    const candidateIds = this.index.getCandidates(queryTokens, mode);

    // Step 3 & 4: Score candidates and insert into bounded min-heap
    const heap = new TopKHeap(k, enableHeapTrace);

    for (const docId of candidateIds) {
      const doc = this.index.getDocument(docId);
      if (!doc) continue;

      const explanation =
        ranking === 'BM25'
          ? Ranker.scoreBM25(docId, queryTokens, this.index)
          : Ranker.scoreTF(docId, queryTokens, this.index);

      if (explanation.totalScore <= 0) continue;

      const matchedTerms = explanation.terms.map((t) => t.term);
      const snippet = TextProcessor.createSnippet(doc.text, queryTokens);

      const searchItem: SearchResult = {
        docId: doc.id,
        title: doc.title,
        path: doc.path,
        filename: doc.filename,
        score: explanation.totalScore,
        snippet,
        matchedTerms,
        explanation,
      };

      heap.push(searchItem);
    }

    // Step 5: Extract top-K in final sorted order
    const topResults = heap.extractSorted();
    const durationMs = Number((performance.now() - startTime).toFixed(2));

    return {
      query: rawQuery,
      normalizedQueryTokens: queryTokens,
      mode,
      ranking,
      k,
      totalCandidates: candidateIds.length,
      results: topResults,
      heapTrace: enableHeapTrace ? heap.stepTrace : undefined,
      durationMs,
    };
  }

  /**
   * Enqueue a search request through the FIFO Queue (Phase 6).
   */
  public enqueueSearch(
    rawQuery: string,
    mode: 'OR' | 'AND' = 'OR',
    ranking: 'BM25' | 'TF' = 'BM25',
    k = 5
  ): { requestId: string; job: QueryJob } {
    const requestId = this.queue.enqueue(rawQuery, mode, ranking, k);
    const job = this.queue.getJob(requestId)!;

    // Process immediately in FIFO order and return result
    const dequeuedJob = this.queue.dequeue();
    if (dequeuedJob && dequeuedJob.id === requestId) {
      try {
        const searchRes = this.searchSync(
          dequeuedJob.query,
          dequeuedJob.mode,
          dequeuedJob.ranking,
          dequeuedJob.k
        );
        dequeuedJob.results = searchRes.results;
        this.queue.finishJob(dequeuedJob, searchRes.results.length);
      } catch (err: any) {
        this.queue.finishJob(dequeuedJob, 0, err.message);
      }
    }

    return { requestId, job };
  }

  public getRelatedDocuments(docId: number, limit = 5) {
    return this.graph.getRelated(docId, limit);
  }

  public getReachableDocuments(docId: number, depth = 2) {
    return this.graph.getReachable(docId, depth);
  }

  public getGraphData() {
    return this.graph.getGraphData();
  }

  public getInvertedIndex() {
    return this.index;
  }

  public getAutocompleteTrie() {
    return this.trie;
  }

  public getQueryQueue() {
    return this.queue;
  }

  public getDocument(id: number): Document | undefined {
    return this.index.getDocument(id);
  }

  public getAllDocuments(): Document[] {
    return this.documents;
  }

  public getStats(): ServiceStats {
    return {
      documentCount: this.documents.length,
      vocabularySize: this.index.vocabularySize,
      avgDocLength: Number(this.index.avgDocLength.toFixed(2)),
      trieWordCount: this.trie.wordCount,
      trieNodeCount: this.trie.nodeCount,
      graphVertices: this.graph.vertexCount,
      graphEdges: this.graph.edgeCount,
      queueLength: this.queue.length,
      lastBuildStats: this.lastBuildStats,
    };
  }

  public getCurrentCorpusDir(): string {
    return this.currentCorpusDir;
  }
}
