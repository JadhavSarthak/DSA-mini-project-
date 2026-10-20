import { Document, GraphData, GraphEdge, GraphNode, ReachableLevel, RelatedDocResult } from './types.ts';
import { InvertedIndex } from './invertedIndex.ts';
import { TextProcessor } from './textProcessor.ts';
import { Ranker } from './ranker.ts';

export class DocumentGraph {
  public static readonly DEFAULT_SIMILARITY_THRESHOLD = 0.05;

  // docId -> Map<targetDocId, { weight: number, sharedTerms: string[] }>
  private adjacencyList: Map<number, Map<number, { weight: number; sharedTerms: string[] }>> = new Map();
  private documents: Map<number, Document> = new Map();
  private edgeThreshold: number;

  constructor(threshold = DocumentGraph.DEFAULT_SIMILARITY_THRESHOLD) {
    this.edgeThreshold = threshold;
  }

  /**
   * Builds the document graph using TF-IDF vector cosine similarity.
   * Only checks candidate pairs that share at least one non-stopword term.
   */
  public build(docs: Document[], index: InvertedIndex): void {
    this.adjacencyList.clear();
    this.documents.clear();

    for (const doc of docs) {
      this.documents.set(doc.id, doc);
      this.adjacencyList.set(doc.id, new Map());
    }

    const totalDocs = docs.length;
    if (totalDocs <= 1) return;

    // 1. Compute TF-IDF vector & vector Euclidean norm for each document
    // docId -> Map<term, tfIdfValue>
    const tfidfVectors = new Map<number, Map<string, number>>();
    const vectorNorms = new Map<number, number>();

    for (const doc of docs) {
      const vec = new Map<string, number>();
      let sumSquares = 0;

      // Group non-stopword tokens
      const docTermFreqs = new Map<string, number>();
      for (const token of doc.tokens) {
        if (!TextProcessor.isStopWord(token)) {
          docTermFreqs.set(token, (docTermFreqs.get(token) || 0) + 1);
        }
      }

      for (const [term, tf] of docTermFreqs.entries()) {
        const df = index.getDocFrequency(term);
        const idf = Ranker.computeIDF(df, totalDocs);
        const weight = tf * idf;
        vec.set(term, weight);
        sumSquares += weight * weight;
      }

      tfidfVectors.set(doc.id, vec);
      vectorNorms.set(doc.id, Math.sqrt(sumSquares));
    }

    // 2. Candidate pair generation via shared terms to avoid blind O(N^2) comparisons
    const evaluatedPairs = new Set<string>();

    for (const doc of docs) {
      const u = doc.id;
      const uVec = tfidfVectors.get(u);
      const uNorm = vectorNorms.get(u) || 0;
      if (!uVec || uNorm === 0) continue;

      // Find candidates sharing terms with u
      const candidateDocs = new Set<number>();
      for (const term of uVec.keys()) {
        const postings = index.getPostings(term);
        for (const p of postings) {
          if (p.docId !== u) {
            candidateDocs.add(p.docId);
          }
        }
      }

      for (const v of candidateDocs) {
        const pairKey = u < v ? `${u}-${v}` : `${v}-${u}`;
        if (evaluatedPairs.has(pairKey)) continue;
        evaluatedPairs.add(pairKey);

        const vVec = tfidfVectors.get(v);
        const vNorm = vectorNorms.get(v) || 0;
        if (!vVec || vNorm === 0) continue;

        // Compute dot product and collect shared terms
        let dotProduct = 0;
        const sharedTerms: { term: string; score: number }[] = [];

        // Iterate over smaller vector
        const [smallerVec, largerVec] = uVec.size <= vVec.size ? [uVec, vVec] : [vVec, uVec];
        for (const [term, uVal] of smallerVec.entries()) {
          const vVal = largerVec.get(term);
          if (vVal !== undefined) {
            const product = uVal * vVal;
            dotProduct += product;
            sharedTerms.push({ term, score: product });
          }
        }

        const cosineSim = dotProduct / (uNorm * vNorm);

        if (cosineSim >= this.edgeThreshold) {
          sharedTerms.sort((a, b) => b.score - a.score);
          const topShared = sharedTerms.slice(0, 6).map((s) => s.term);
          const weight = Number(cosineSim.toFixed(4));

          this.adjacencyList.get(u)!.set(v, { weight, sharedTerms: topShared });
          this.adjacencyList.get(v)!.set(u, { weight, sharedTerms: topShared });
        }
      }
    }
  }

  /**
   * Get related documents sorted by edge weight (cosine similarity).
   */
  public getRelated(docId: number, limit = 5): RelatedDocResult[] {
    const neighbors = this.adjacencyList.get(docId);
    if (!neighbors || neighbors.size === 0) return [];

    const results: RelatedDocResult[] = [];
    for (const [targetId, edgeInfo] of neighbors.entries()) {
      const doc = this.documents.get(targetId);
      if (doc) {
        results.push({
          docId: doc.id,
          title: doc.title,
          filename: doc.filename,
          similarity: edgeInfo.weight,
          sharedTerms: edgeInfo.sharedTerms,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity || a.title.localeCompare(b.title));
    return results.slice(0, limit);
  }

  /**
   * Breadth-First Search (BFS) returning reachable document clusters up to maxDepth.
   */
  public getReachable(startDocId: number, maxDepth = 2): ReachableLevel[] {
    if (!this.documents.has(startDocId)) return [];

    const visited = new Set<number>([startDocId]);
    const levels: ReachableLevel[] = [];
    let currentQueue = [startDocId];

    for (let depth = 1; depth <= maxDepth; depth++) {
      const nextQueue: number[] = [];
      const currentLevelDocs: ReachableLevel['docs'] = [];

      for (const curr of currentQueue) {
        const neighbors = this.adjacencyList.get(curr);
        if (!neighbors) continue;

        for (const [neighborId, edge] of neighbors.entries()) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            nextQueue.push(neighborId);
            const doc = this.documents.get(neighborId);
            if (doc) {
              currentLevelDocs.push({
                docId: doc.id,
                title: doc.title,
                filename: doc.filename,
                similarityToParent: edge.weight,
              });
            }
          }
        }
      }

      if (currentLevelDocs.length > 0) {
        levels.push({ depth, docs: currentLevelDocs });
        currentQueue = nextQueue;
      } else {
        break;
      }
    }

    return levels;
  }

  /**
   * Full graph export for visual canvas or force-directed graph.
   */
  public getGraphData(): GraphData {
    const nodes: GraphNode[] = [];
    for (const doc of this.documents.values()) {
      nodes.push({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        length: doc.length,
      });
    }

    const edges: GraphEdge[] = [];
    const seenEdges = new Set<string>();

    for (const [source, targets] of this.adjacencyList.entries()) {
      for (const [target, edge] of targets.entries()) {
        const key = source < target ? `${source}-${target}` : `${target}-${source}`;
        if (!seenEdges.has(key)) {
          seenEdges.add(key);
          edges.push({
            source,
            target,
            weight: edge.weight,
            sharedTerms: edge.sharedTerms,
          });
        }
      }
    }

    return {
      nodes,
      edges,
      threshold: this.edgeThreshold,
    };
  }

  public get vertexCount(): number {
    return this.documents.size;
  }

  public get edgeCount(): number {
    let count = 0;
    for (const targets of this.adjacencyList.values()) {
      count += targets.size;
    }
    return count / 2; // Symmetric edges
  }
}
