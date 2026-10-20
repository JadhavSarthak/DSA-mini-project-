import { QueryJob } from './types.ts';

class QueueNode<T> {
  public data: T;
  public next: QueueNode<T> | null = null;

  constructor(data: T) {
    this.data = data;
  }
}

export class QueryQueue {
  private head: QueueNode<QueryJob> | null = null;
  private tail: QueueNode<QueryJob> | null = null;
  private currentLength = 0;
  private requestCounter = 0;

  // Track completed or active jobs by ID for history/inspection
  private jobRegistry: Map<string, QueryJob> = new Map();
  private maxHistory = 100;

  /**
   * Enqueue a new search job at the tail of the FIFO queue.
   * Returns the unique request ID.
   */
  public enqueue(
    query: string,
    mode: 'OR' | 'AND' = 'OR',
    ranking: 'BM25' | 'TF' = 'BM25',
    k = 5
  ): string {
    this.requestCounter += 1;
    const now = Date.now();
    const requestId = `req-${now}-${this.requestCounter}`;

    const job: QueryJob = {
      id: requestId,
      query,
      mode,
      ranking,
      k,
      queuedAt: now,
      status: 'queued',
    };

    const node = new QueueNode(job);
    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      if (this.tail) {
        this.tail.next = node;
      }
      this.tail = node;
    }

    this.currentLength += 1;
    this.jobRegistry.set(requestId, job);

    // Trim old history if needed
    if (this.jobRegistry.size > this.maxHistory) {
      const oldestKey = this.jobRegistry.keys().next().value;
      if (oldestKey) this.jobRegistry.delete(oldestKey);
    }

    return requestId;
  }

  /**
   * Dequeue the next job from the head of the FIFO queue.
   */
  public dequeue(): QueryJob | null {
    if (!this.head) {
      return null;
    }

    const jobNode = this.head;
    this.head = this.head.next;
    if (!this.head) {
      this.tail = null;
    }

    this.currentLength -= 1;
    const job = jobNode.data;
    job.status = 'processing';
    job.startedAt = Date.now();

    return job;
  }

  /**
   * Mark a job as completed and record its duration and metrics.
   */
  public finishJob(job: QueryJob, resultsCount: number, error?: string): void {
    job.finishedAt = Date.now();
    job.durationMs = job.startedAt ? job.finishedAt - job.startedAt : 0;
    job.status = error ? 'failed' : 'completed';
    job.resultsCount = resultsCount;
    this.jobRegistry.set(job.id, job);
  }

  public get length(): number {
    return this.currentLength;
  }

  public getJob(id: string): QueryJob | undefined {
    return this.jobRegistry.get(id);
  }

  /**
   * Get list of jobs currently waiting in the FIFO queue.
   */
  public getPendingJobs(): QueryJob[] {
    const list: QueryJob[] = [];
    let curr = this.head;
    while (curr) {
      list.push(curr.data);
      curr = curr.next;
    }
    return list;
  }

  /**
   * Get history of recently processed jobs.
   */
  public getJobHistory(limit = 20): QueryJob[] {
    return Array.from(this.jobRegistry.values())
      .sort((a, b) => b.queuedAt - a.queuedAt)
      .slice(0, limit);
  }
}
