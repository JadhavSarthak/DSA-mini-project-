import fs from 'fs';
import path from 'path';
import type { EvalQueryItem, EvalSummary } from './types.ts';
import { SearchService } from './searchService.ts';

export class EvaluationEngine {
  /**
   * Run information retrieval evaluation against data/sample/queries.tsv.
   */
  public static evaluate(
    service: SearchService,
    tsvPath: string,
    k = 3
  ): EvalSummary {
    const items: EvalQueryItem[] = [];

    if (!fs.existsSync(tsvPath)) {
      throw new Error(`Evaluation dataset not found at ${tsvPath}`);
    }

    const content = fs.readFileSync(tsvPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    // Skip header line
    const dataLines = lines[0].includes('relevant_docs') ? lines.slice(1) : lines;

    let totalPrecision = 0;
    let totalRecall = 0;
    let totalRR = 0;

    for (const line of dataLines) {
      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const queryText = parts[0].trim();
      const expectedFiles = parts[1]
        .split(',')
        .map((f) => f.trim().toLowerCase())
        .filter((f) => f.length > 0);

      if (!queryText || expectedFiles.length === 0) continue;

      // Execute search synchronously via service
      const searchOutput = service.searchSync(queryText, 'OR', 'BM25', k);
      const retrievedFiles = searchOutput.results.map((r) => r.filename.toLowerCase());

      // Compute hits
      const hits = retrievedFiles.filter((f) => expectedFiles.includes(f)).length;
      const precision = k > 0 ? hits / k : 0;
      const recall = expectedFiles.length > 0 ? hits / expectedFiles.length : 0;

      // Compute Reciprocal Rank
      let rr = 0;
      let topMatch: string | undefined = undefined;
      for (let rank = 0; rank < retrievedFiles.length; rank++) {
        if (expectedFiles.includes(retrievedFiles[rank])) {
          rr = 1 / (rank + 1);
          topMatch = retrievedFiles[rank];
          break;
        }
      }

      totalPrecision += precision;
      totalRecall += recall;
      totalRR += rr;

      items.push({
        query: queryText,
        expectedFiles,
        retrievedFiles,
        precision: Number(precision.toFixed(3)),
        recall: Number(recall.toFixed(3)),
        reciprocalRank: Number(rr.toFixed(3)),
        topRankedMatch: topMatch,
      });
    }

    const n = Math.max(1, items.length);

    return {
      k,
      meanPrecisionAtK: Number((totalPrecision / n).toFixed(3)),
      meanRecallAtK: Number((totalRecall / n).toFixed(3)),
      meanReciprocalRank: Number((totalRR / n).toFixed(3)),
      queries: items,
    };
  }
}
