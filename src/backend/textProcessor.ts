export class TextProcessor {
  private static readonly STOP_WORDS: Set<string> = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
    'are', 'aren', 'arent', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
    'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing',
    'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
    'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
    'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no',
    'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
    'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
    'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
    'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours',
    'yourself', 'yourselves'
  ]);

  /**
   * Deterministically lowercases and splits text into alphanumeric tokens.
   */
  public static tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 0);
  }

  /**
   * Check if a token is a known English stop word.
   */
  public static isStopWord(token: string): boolean {
    return this.STOP_WORDS.has(token.toLowerCase());
  }

  /**
   * Filter out stop words.
   */
  public static removeStopWords(tokens: string[]): string[] {
    return tokens.filter((t) => !this.isStopWord(t));
  }

  /**
   * Extract meaningful adjacent multi-word phrases (bigrams/trigrams) for Trie autocomplete.
   */
  public static extractPhrases(tokens: string[]): { phrase: string; count: number }[] {
    const phraseMap = new Map<string, number>();

    for (let i = 0; i < tokens.length - 1; i++) {
      const t1 = tokens[i];
      const t2 = tokens[i + 1];

      // Avoid phrases composed solely of stop words
      if (this.isStopWord(t1) && this.isStopWord(t2)) continue;

      const bigram = `${t1} ${t2}`;
      phraseMap.set(bigram, (phraseMap.get(bigram) || 0) + 1);

      if (i < tokens.length - 2) {
        const t3 = tokens[i + 2];
        if (!this.isStopWord(t1) || !this.isStopWord(t3)) {
          const trigram = `${t1} ${t2} ${t3}`;
          phraseMap.set(trigram, (phraseMap.get(trigram) || 0) + 1);
        }
      }
    }

    return Array.from(phraseMap.entries())
      .filter(([_, count]) => count >= 1)
      .map(([phrase, count]) => ({ phrase, count }));
  }

  /**
   * Extract a highlighted snippet surrounding the best match in the document.
   */
  public static createSnippet(
    rawText: string,
    queryTokens: string[],
    maxLength = 220
  ): string {
    if (!rawText) return '';
    const cleanQueryTokens = queryTokens.filter((q) => q.length > 0);
    if (cleanQueryTokens.length === 0) {
      const clean = rawText.replace(/\s+/g, ' ').trim();
      return clean.length <= maxLength ? clean : clean.slice(0, maxLength) + '...';
    }

    // Split rawText into lines/sentences
    const sentences = rawText
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 0 && !s.startsWith('#'));

    let bestSentence = '';
    let maxHits = -1;

    for (const sentence of sentences) {
      const sentenceTokens = this.tokenize(sentence);
      let hits = 0;
      for (const q of cleanQueryTokens) {
        if (sentenceTokens.includes(q)) {
          hits += 1;
        }
      }
      if (hits > maxHits) {
        maxHits = hits;
        bestSentence = sentence;
      }
    }

    let snippet = bestSentence || sentences[0] || rawText.slice(0, maxLength);
    if (snippet.length > maxLength) {
      // Try to center around the first matched term
      const lowerSnippet = snippet.toLowerCase();
      let firstIndex = -1;
      for (const q of cleanQueryTokens) {
        const idx = lowerSnippet.indexOf(q);
        if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
          firstIndex = idx;
        }
      }

      if (firstIndex !== -1) {
        const start = Math.max(0, firstIndex - 50);
        const end = Math.min(snippet.length, start + maxLength);
        snippet = (start > 0 ? '...' : '') + snippet.slice(start, end).trim() + (end < snippet.length ? '...' : '');
      } else {
        snippet = snippet.slice(0, maxLength).trim() + '...';
      }
    }

    // Highlight query tokens with high-contrast black on yellow styling
    for (const q of cleanQueryTokens) {
      const regex = new RegExp(`\\b(${q})\\b`, 'gi');
      snippet = snippet.replace(
        regex,
        '<mark class="hit-mark" style="background-color: #FFD400; color: #0B0B0B; font-weight: 800; padding: 1px 6px; margin: 0 1.5px; border-radius: 6px; border: 1.5px solid #0B0B0B; box-shadow: 1.5px 1.5px 0 #0B0B0B; display: inline-block;">$1</mark>'
      );
    }

    return snippet;
  }
}
