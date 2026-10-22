import type { SearchResult } from './types.ts';

export interface HeapStepTrace {
  step: number;
  candidate: { docId: number; title: string; score: number };
  action: 'PUSH' | 'REPLACE_ROOT' | 'REJECT';
  reason: string;
  heapState: { docId: number; title: string; score: number }[];
}

export class TopKHeap {
  private heap: SearchResult[] = [];
  private capacity: number;
  public stepTrace: HeapStepTrace[] = [];
  private traceEnabled: boolean;

  constructor(capacity: number, enableTrace = false) {
    this.capacity = Math.max(0, capacity);
    this.traceEnabled = enableTrace;
  }

  /**
   * Returns true if A is "worse" than B.
   * In our bounded min-heap, the root is the worst element in the top-K.
   * Priority order (from worst to best):
   * 1. Lower score is worse.
   * 2. If equal score, lexicographically larger title is worse (since final sort wants title asc).
   * 3. If equal title, larger docId is worse.
   */
  private isWorse(a: SearchResult, b: SearchResult): boolean {
    if (a.score !== b.score) {
      return a.score < b.score;
    }
    const titleComp = a.title.localeCompare(b.title);
    if (titleComp !== 0) {
      return titleComp > 0;
    }
    return a.docId > b.docId;
  }

  /**
   * Insert a candidate into the bounded heap.
   */
  public push(item: SearchResult): void {
    if (this.capacity <= 0) {
      if (this.traceEnabled) {
        this.stepTrace.push({
          step: this.stepTrace.length + 1,
          candidate: { docId: item.docId, title: item.title, score: item.score },
          action: 'REJECT',
          reason: 'Heap capacity is 0 (K=0)',
          heapState: [],
        });
      }
      return;
    }

    if (this.heap.length < this.capacity) {
      this.heap.push(item);
      this.siftUp(this.heap.length - 1);

      if (this.traceEnabled) {
        this.stepTrace.push({
          step: this.stepTrace.length + 1,
          candidate: { docId: item.docId, title: item.title, score: item.score },
          action: 'PUSH',
          reason: `Heap has spare capacity (${this.heap.length}/${this.capacity})`,
          heapState: this.heap.map((h) => ({ docId: h.docId, title: h.title, score: h.score })),
        });
      }
    } else {
      // Heap is full: compare with the worst kept element at root (heap[0])
      const worst = this.heap[0];
      if (this.isWorse(worst, item)) {
        // Candidate is better than the worst element!
        this.heap[0] = item;
        this.siftDown(0);

        if (this.traceEnabled) {
          this.stepTrace.push({
            step: this.stepTrace.length + 1,
            candidate: { docId: item.docId, title: item.title, score: item.score },
            action: 'REPLACE_ROOT',
            reason: `Score (${item.score}) > worst root score (${worst.score}), replaced root`,
            heapState: this.heap.map((h) => ({ docId: h.docId, title: h.title, score: h.score })),
          });
        }
      } else {
        if (this.traceEnabled) {
          this.stepTrace.push({
            step: this.stepTrace.length + 1,
            candidate: { docId: item.docId, title: item.title, score: item.score },
            action: 'REJECT',
            reason: `Score (${item.score}) <= worst root score (${worst.score}), discarded`,
            heapState: this.heap.map((h) => ({ docId: h.docId, title: h.title, score: h.score })),
          });
        }
      }
    }
  }

  private siftUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      // If current is worse than parent, swap up towards root
      if (this.isWorse(this.heap[current], this.heap[parent])) {
        const temp = this.heap[current];
        this.heap[current] = this.heap[parent];
        this.heap[parent] = temp;
        current = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    let current = index;
    const length = this.heap.length;

    while (true) {
      let worst = current;
      const left = 2 * current + 1;
      const right = 2 * current + 2;

      if (left < length && this.isWorse(this.heap[left], this.heap[worst])) {
        worst = left;
      }
      if (right < length && this.isWorse(this.heap[right], this.heap[worst])) {
        worst = right;
      }

      if (worst !== current) {
        const temp = this.heap[current];
        this.heap[current] = this.heap[worst];
        this.heap[worst] = temp;
        current = worst;
      } else {
        break;
      }
    }
  }

  /**
   * Returns top-K elements in final ranked order:
   * Score descending, tie-break title ascending, then docId ascending.
   */
  public extractSorted(): SearchResult[] {
    const list = [...this.heap];
    list.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const titleComp = a.title.localeCompare(b.title);
      if (titleComp !== 0) {
        return titleComp;
      }
      return a.docId - b.docId;
    });
    return list;
  }

  public get size(): number {
    return this.heap.length;
  }

  /**
   * Full sort baseline algorithm O(M log M) used for correctness verification.
   */
  public static fullSortBaseline(candidates: SearchResult[], k: number): SearchResult[] {
    if (k <= 0) return [];
    const copy = [...candidates];
    copy.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const titleComp = a.title.localeCompare(b.title);
      if (titleComp !== 0) {
        return titleComp;
      }
      return a.docId - b.docId;
    });
    return copy.slice(0, k);
  }
}
