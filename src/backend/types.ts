export interface Document {
  id: number;
  path: string;
  filename: string;
  title: string;
  text: string;
  length: number; // total token count
  tokens: string[];
}

export interface PostingsEntry {
  docId: number;
  tf: number;
}

export interface TermScoreBreakdown {
  term: string;
  tf: number;
  idf: number;
  docLength: number;
  avgDocLength: number;
  contribution: number;
}

export interface ScoreExplanation {
  method: 'BM25' | 'TF';
  k1?: number;
  b?: number;
  terms: TermScoreBreakdown[];
  totalScore: number;
}

export interface SearchResult {
  docId: number;
  title: string;
  path: string;
  filename: string;
  score: number;
  snippet: string;
  matchedTerms: string[];
  explanation: ScoreExplanation;
}

export interface TrieSuggestion {
  word: string;
  frequency: number;
  isPhrase: boolean;
}

export interface GraphEdge {
  source: number;
  target: number;
  weight: number;
  sharedTerms: string[];
}

export interface GraphNode {
  id: number;
  title: string;
  filename: string;
  length: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  threshold: number;
}

export interface RelatedDocResult {
  docId: number;
  title: string;
  filename: string;
  similarity: number;
  sharedTerms: string[];
}

export interface ReachableLevel {
  depth: number;
  docs: {
    docId: number;
    title: string;
    filename: string;
    similarityToParent?: number;
  }[];
}

export interface QueryJob {
  id: string;
  query: string;
  mode: 'OR' | 'AND';
  ranking: 'BM25' | 'TF';
  k: number;
  queuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  resultsCount?: number;
  results?: SearchResult[];
}

export interface EvalQueryItem {
  query: string;
  expectedFiles: string[];
  retrievedFiles: string[];
  precision: number;
  recall: number;
  reciprocalRank: number;
  topRankedMatch?: string;
}

export interface EvalSummary {
  k: number;
  meanPrecisionAtK: number;
  meanRecallAtK: number;
  meanReciprocalRank: number;
  queries: EvalQueryItem[];
}

export interface BenchmarkMetrics {
  environment: {
    runtime: string;
    nodeVersion: string;
    platform: string;
    timestamp: string;
  };
  corpusSize: number;
  vocabSize: number;
  indexBuildTimeMs: number;
  graphBuildTimeMs: number;
  trieBuildTimeMs: number;
  searchP50Ms: number;
  searchP95Ms: number;
  autocompleteP50Ms: number;
  autocompleteP95Ms: number;
  heapVsSortComparison: {
    k: number;
    candidateCount: number;
    heapDurationUs: number;
    fullSortDurationUs: number;
    ratio: string;
  };
}
