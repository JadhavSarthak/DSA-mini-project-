import os from 'os';
import { BenchmarkMetrics, SearchResult } from './types.ts';
import { SearchService } from './searchService.ts';
import { TopKHeap } from './topKHeap.ts';

export class BenchmarkRunner {
  public static run(service: SearchService): BenchmarkMetrics {
    const startAutocomplete = performance.now();
    const testPrefixes = [
      'm', 'ma', 'mach', 'machi', 'machine', 'd', 'de', 'deep', 's', 'se', 'search',
      'n', 'ne', 'net', 'netw', 'network', 'g', 'gr', 'graph', 'c', 'co', 'comp',
      't', 'tr', 'tran', 'trave', 'p', 'pr', 'prec', 'h', 'ha', 'hash', 'b', 'bm'
    ];

    const autocompleteLatencies: number[] = [];
    for (let iter = 0; iter < 100; iter++) {
      const prefix = testPrefixes[iter % testPrefixes.length];
      const t0 = performance.now();
      service.getSuggestions(prefix, 5);
      const t1 = performance.now();
      autocompleteLatencies.push(t1 - t0);
    }
    autocompleteLatencies.sort((a, b) => a - b);
    const acP50 = autocompleteLatencies[Math.floor(autocompleteLatencies.length * 0.5)];
    const acP95 = autocompleteLatencies[Math.floor(autocompleteLatencies.length * 0.95)];

    const testQueries = [
      'machine learning', 'deep learning neural networks', 'inverted index bm25',
      'graph traversal breadth first search', 'operating system virtual memory paging',
      'distributed consensus raft paxos', 'database storage b tree',
      'compiler optimization intermediate representation', 'cryptography public key encryption'
    ];

    const searchLatencies: number[] = [];
    for (let iter = 0; iter < 50; iter++) {
      const q = testQueries[iter % testQueries.length];
      const t0 = performance.now();
      service.searchSync(q, 'OR', 'BM25', 5);
      const t1 = performance.now();
      searchLatencies.push(t1 - t0);
    }
    searchLatencies.sort((a, b) => a - b);
    const searchP50 = searchLatencies[Math.floor(searchLatencies.length * 0.5)];
    const searchP95 = searchLatencies[Math.floor(searchLatencies.length * 0.95)];

    // Bounded Heap vs Full Sort benchmark on synthetic candidate list
    const candidatePoolSize = 500;
    const K = 5;
    const syntheticCandidates: SearchResult[] = [];
    for (let i = 0; i < candidatePoolSize; i++) {
      syntheticCandidates.push({
        docId: i,
        title: `Document ${i}`,
        path: `/path/doc-${i}.md`,
        filename: `doc-${i}.md`,
        score: Math.sin(i * 997) * 50 + 50,
        snippet: 'Sample snippet text...',
        matchedTerms: ['term'],
        explanation: { method: 'BM25', terms: [], totalScore: 0 },
      });
    }

    // Benchmark Heap
    const heapStart = performance.now();
    for (let iter = 0; iter < 500; iter++) {
      const heap = new TopKHeap(K);
      for (const cand of syntheticCandidates) {
        heap.push(cand);
      }
      heap.extractSorted();
    }
    const heapTotalMs = performance.now() - heapStart;
    const heapDurationUs = (heapTotalMs / 500) * 1000;

    // Benchmark Full Sort
    const sortStart = performance.now();
    for (let iter = 0; iter < 500; iter++) {
      TopKHeap.fullSortBaseline(syntheticCandidates, K);
    }
    const sortTotalMs = performance.now() - sortStart;
    const fullSortDurationUs = (sortTotalMs / 500) * 1000;

    const stats = service.getStats();

    return {
      environment: {
        runtime: `Node.js / V8`,
        nodeVersion: process.version,
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        timestamp: new Date().toISOString(),
      },
      corpusSize: stats.documentCount,
      vocabSize: stats.vocabularySize,
      indexBuildTimeMs: stats.lastBuildStats.indexBuildMs,
      graphBuildTimeMs: stats.lastBuildStats.graphBuildMs,
      trieBuildTimeMs: stats.lastBuildStats.trieBuildMs,
      searchP50Ms: Number(searchP50.toFixed(3)),
      searchP95Ms: Number(searchP95.toFixed(3)),
      autocompleteP50Ms: Number(acP50.toFixed(3)),
      autocompleteP95Ms: Number(acP95.toFixed(3)),
      heapVsSortComparison: {
        k: K,
        candidateCount: candidatePoolSize,
        heapDurationUs: Number(heapDurationUs.toFixed(2)),
        fullSortDurationUs: Number(fullSortDurationUs.toFixed(2)),
        ratio: `${(fullSortDurationUs / (heapDurationUs || 0.001)).toFixed(2)}x faster with Heap`,
      },
    };
  }
}
