import { InvertedIndex } from './invertedIndex.ts';
import type { ScoreExplanation, TermScoreBreakdown } from './types.ts';

export class Ranker {
  public static readonly DEFAULT_K1 = 1.2;
  public static readonly DEFAULT_B = 0.75;

  /**
   * Robertson-Spärck Jones IDF with smoothing:
   * IDF(t) = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
   */
  public static computeIDF(df: number, totalDocs: number): number {
    if (totalDocs === 0) return 0;
    const numerator = totalDocs - df + 0.5;
    const denominator = df + 0.5;
    return Math.log(1 + Math.max(0, numerator / denominator));
  }

  /**
   * Score a document against query terms using Okapi BM25.
   */
  public static scoreBM25(
    docId: number,
    queryTerms: string[],
    index: InvertedIndex,
    k1 = Ranker.DEFAULT_K1,
    b = Ranker.DEFAULT_B
  ): ScoreExplanation {
    const doc = index.getDocument(docId);
    if (!doc) {
      return { method: 'BM25', k1, b, terms: [], totalScore: 0 };
    }

    const totalDocs = index.documentCount;
    const avgdl = index.avgDocLength;
    const docLength = doc.length;
    const termBreakdowns: TermScoreBreakdown[] = [];
    let totalScore = 0;

    for (const term of queryTerms) {
      const cleanTerm = term.toLowerCase();
      const tf = index.getTermFrequency(cleanTerm, docId);
      if (tf <= 0) continue;

      const df = index.getDocFrequency(cleanTerm);
      const idf = this.computeIDF(df, totalDocs);

      // BM25 term weighting component
      const lengthNorm = 1 - b + (b * (avgdl > 0 ? docLength / avgdl : 1));
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * lengthNorm;
      const termScore = idf * (numerator / (denominator || 1));

      totalScore += termScore;
      termBreakdowns.push({
        term: cleanTerm,
        tf,
        idf: Number(idf.toFixed(4)),
        docLength,
        avgDocLength: Number(avgdl.toFixed(2)),
        contribution: Number(termScore.toFixed(4)),
      });
    }

    return {
      method: 'BM25',
      k1,
      b,
      terms: termBreakdowns,
      totalScore: Number(totalScore.toFixed(4)),
    };
  }

  /**
   * Simple baseline Term Frequency (TF) scorer.
   */
  public static scoreTF(
    docId: number,
    queryTerms: string[],
    index: InvertedIndex
  ): ScoreExplanation {
    const doc = index.getDocument(docId);
    if (!doc) {
      return { method: 'TF', terms: [], totalScore: 0 };
    }

    const avgdl = index.avgDocLength;
    const termBreakdowns: TermScoreBreakdown[] = [];
    let totalScore = 0;

    for (const term of queryTerms) {
      const cleanTerm = term.toLowerCase();
      const tf = index.getTermFrequency(cleanTerm, docId);
      if (tf <= 0) continue;

      totalScore += tf;
      termBreakdowns.push({
        term: cleanTerm,
        tf,
        idf: 1,
        docLength: doc.length,
        avgDocLength: Number(avgdl.toFixed(2)),
        contribution: tf,
      });
    }

    return {
      method: 'TF',
      terms: termBreakdowns,
      totalScore,
    };
  }
}
