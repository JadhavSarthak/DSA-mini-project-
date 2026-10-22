import type { Document, PostingsEntry } from './types.ts';

export class InvertedIndex {
  // term -> Map<docId, termFrequency>
  private index: Map<string, Map<number, number>> = new Map();
  // docId -> Document
  private documents: Map<number, Document> = new Map();
  private totalTokens = 0;

  /**
   * Clears existing index and builds postings from the provided documents.
   */
  public build(docs: Document[]): void {
    this.index.clear();
    this.documents.clear();
    this.totalTokens = 0;

    for (const doc of docs) {
      this.documents.set(doc.id, doc);
      this.totalTokens += doc.length;

      // Count term frequencies within this document
      const docTermFreqs = new Map<string, number>();
      for (const token of doc.tokens) {
        docTermFreqs.set(token, (docTermFreqs.get(token) || 0) + 1);
      }

      // Add to postings lists
      for (const [term, tf] of docTermFreqs.entries()) {
        if (!this.index.has(term)) {
          this.index.set(term, new Map());
        }
        this.index.get(term)!.set(doc.id, tf);
      }
    }
  }

  /**
   * Number of documents in the index (N).
   */
  public get documentCount(): number {
    return this.documents.size;
  }

  /**
   * Total vocabulary size (number of unique indexed terms).
   */
  public get vocabularySize(): number {
    return this.index.size;
  }

  /**
   * Average document length across the collection (avgdl).
   */
  public get avgDocLength(): number {
    if (this.documents.size === 0) return 0;
    return this.totalTokens / this.documents.size;
  }

  /**
   * Get document by its ID.
   */
  public getDocument(docId: number): Document | undefined {
    return this.documents.get(docId);
  }

  /**
   * Get all indexed documents.
   */
  public getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  /**
   * Document frequency df(t): number of documents containing term t.
   */
  public getDocFrequency(term: string): number {
    const postings = this.index.get(term.toLowerCase());
    return postings ? postings.size : 0;
  }

  /**
   * Term frequency tf(t, D): count of occurrences of term in document.
   */
  public getTermFrequency(term: string, docId: number): number {
    const postings = this.index.get(term.toLowerCase());
    if (!postings) return 0;
    return postings.get(docId) || 0;
  }

  /**
   * Get postings entries for a given term.
   */
  public getPostings(term: string): PostingsEntry[] {
    const postings = this.index.get(term.toLowerCase());
    if (!postings) return [];
    return Array.from(postings.entries()).map(([docId, tf]) => ({ docId, tf }));
  }

  /**
   * Retrieve candidate document IDs for given query terms.
   * mode: 'OR' returns union of documents containing at least one term.
   * mode: 'AND' returns intersection of documents containing all terms.
   */
  public getCandidates(queryTerms: string[], mode: 'OR' | 'AND' = 'OR'): number[] {
    if (queryTerms.length === 0) return [];

    const postingsListPerTerm: Set<number>[] = [];
    for (const term of queryTerms) {
      const postings = this.index.get(term.toLowerCase());
      if (postings && postings.size > 0) {
        postingsListPerTerm.push(new Set(postings.keys()));
      } else if (mode === 'AND') {
        // In AND mode, if any term has 0 postings, intersection is empty
        return [];
      }
    }

    if (postingsListPerTerm.length === 0) return [];

    if (mode === 'OR') {
      const union = new Set<number>();
      for (const set of postingsListPerTerm) {
        for (const docId of set) {
          union.add(docId);
        }
      }
      return Array.from(union).sort((a, b) => a - b);
    } else {
      // AND mode: intersect all sets
      // Start with smallest set for efficiency
      postingsListPerTerm.sort((a, b) => a.size - b.size);
      let intersection = Array.from(postingsListPerTerm[0]);
      for (let i = 1; i < postingsListPerTerm.length; i++) {
        const currentSet = postingsListPerTerm[i];
        intersection = intersection.filter((id) => currentSet.has(id));
        if (intersection.length === 0) break;
      }
      return intersection.sort((a, b) => a - b);
    }
  }

  /**
   * Inspect postings for UI or debugging.
   */
  public inspectTerms(limit = 50, filterPrefix = ''): { term: string; df: number; postings: PostingsEntry[] }[] {
    const list: { term: string; df: number; postings: PostingsEntry[] }[] = [];
    for (const [term, postings] of this.index.entries()) {
      if (!filterPrefix || term.startsWith(filterPrefix.toLowerCase())) {
        list.push({
          term,
          df: postings.size,
          postings: Array.from(postings.entries()).map(([docId, tf]) => ({ docId, tf })),
        });
      }
    }
    return list.sort((a, b) => b.df - a.df || a.term.localeCompare(b.term)).slice(0, limit);
  }
}
