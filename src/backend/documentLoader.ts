import fs from 'fs';
import path from 'path';
import { Document } from './types.ts';
import { TextProcessor } from './textProcessor.ts';

export interface LoadResult {
  documents: Document[];
  skippedDuplicates: { filename: string; duplicateOf: string }[];
  errors: { filename: string; error: string }[];
}

export class DocumentLoader {
  /**
   * Load markdown or text documents from a directory.
   * Assigns deterministic stable IDs (0, 1, ...) based on sorted filename order.
   * Skips duplicates based on normalized token sequence fingerprint.
   */
  public static loadFromDirectory(dirPath: string): LoadResult {
    const result: LoadResult = {
      documents: [],
      skippedDuplicates: [],
      errors: [],
    };

    if (!fs.existsSync(dirPath)) {
      result.errors.push({ filename: dirPath, error: 'Directory does not exist' });
      return result;
    }

    let filenames: string[] = [];
    try {
      filenames = fs
        .readdirSync(dirPath)
        .filter((file) => file.endsWith('.md') || file.endsWith('.txt'))
        .sort((a, b) => a.localeCompare(b));
    } catch (err: any) {
      result.errors.push({ filename: dirPath, error: err.message || 'Failed to read directory' });
      return result;
    }

    const seenFingerprints = new Map<string, string>(); // fingerprint -> original filename

    let nextId = 0;
    for (const filename of filenames) {
      const fullPath = path.join(dirPath, filename);
      try {
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) continue;

        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        if (!rawContent.trim()) {
          result.errors.push({ filename, error: 'File is empty' });
          continue;
        }

        const tokens = TextProcessor.tokenize(rawContent);
        if (tokens.length === 0) {
          result.errors.push({ filename, error: 'File contains no alphanumeric tokens' });
          continue;
        }

        // Fingerprint check: normalized token stream string
        const fingerprint = tokens.join(' ');
        if (seenFingerprints.has(fingerprint)) {
          const original = seenFingerprints.get(fingerprint)!;
          result.skippedDuplicates.push({ filename, duplicateOf: original });
          continue;
        }
        seenFingerprints.set(fingerprint, filename);

        // Title extraction: first line starting with #, or clean filename
        let title = '';
        const lines = rawContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) {
            title = trimmed.replace(/^#+\s*/, '').trim();
            break;
          }
        }
        if (!title) {
          title = filename
            .replace(/\.(md|txt)$/i, '')
            .replace(/^[0-9]+[-_]/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }

        result.documents.push({
          id: nextId++,
          path: fullPath,
          filename,
          title,
          text: rawContent,
          length: tokens.length,
          tokens,
        });
      } catch (err: any) {
        result.errors.push({ filename, error: err.message || 'Error loading file' });
      }
    }

    return result;
  }
}
