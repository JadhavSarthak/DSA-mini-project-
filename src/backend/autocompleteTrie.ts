import type { TrieSuggestion } from './types.ts';

export class TrieNode {
  public children: Map<string, TrieNode> = new Map();
  public isEndOfWord = false;
  public frequency = 0;
  public word = '';
  public isPhrase = false;
}

export interface TrieNodeDebug {
  char: string;
  isEnd: boolean;
  word?: string;
  frequency?: number;
  childrenCount: number;
  children?: TrieNodeDebug[];
}

export class AutocompleteTrie {
  private root: TrieNode = new TrieNode();
  private totalWords = 0;
  private totalNodes = 1;

  /**
   * Insert a normalized term or multi-word phrase into the Trie.
   */
  public insert(term: string, frequency = 1, isPhrase = false): void {
    if (!term) return;
    const clean = term.toLowerCase().trim();
    if (!clean) return;

    let current = this.root;
    for (const char of clean) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
        this.totalNodes += 1;
      }
      current = current.children.get(char)!;
    }

    if (!current.isEndOfWord) {
      this.totalWords += 1;
    }
    current.isEndOfWord = true;
    current.frequency = (current.frequency || 0) + frequency;
    current.word = clean;
    current.isPhrase = isPhrase;
  }

  /**
   * Find completions for a given prefix.
   * Empty prefix returns empty list [] according to Nexora specification.
   * Results are sorted by frequency descending, then alphabetical ascending.
   */
  public complete(prefix: string, limit = 8): TrieSuggestion[] {
    if (!prefix || !prefix.trim()) {
      return []; // Empty prefix policy
    }

    const cleanPrefix = prefix.toLowerCase().trim();
    let current = this.root;

    for (const char of cleanPrefix) {
      if (!current.children.has(char)) {
        return []; // Prefix not found
      }
      current = current.children.get(char)!;
    }

    // Traverse all descendants from current prefix node
    const matches: TrieSuggestion[] = [];
    this.collectWords(current, matches);

    // Sort by frequency descending, tie-break alphabetical ascending
    matches.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return a.word.localeCompare(b.word);
    });

    return matches.slice(0, limit);
  }

  private collectWords(node: TrieNode, results: TrieSuggestion[]): void {
    if (node.isEndOfWord) {
      results.push({
        word: node.word,
        frequency: node.frequency,
        isPhrase: node.isPhrase,
      });
    }

    for (const child of node.children.values()) {
      this.collectWords(child, results);
    }
  }

  public get wordCount(): number {
    return this.totalWords;
  }

  public get nodeCount(): number {
    return this.totalNodes;
  }

  /**
   * Generate an inspectable tree for visual exploration in the frontend.
   */
  public inspectTree(prefix = '', maxDepth = 4): TrieNodeDebug {
    let startNode = this.root;
    if (prefix) {
      for (const char of prefix.toLowerCase()) {
        if (!startNode.children.has(char)) {
          return {
            char: prefix,
            isEnd: false,
            childrenCount: 0,
            children: [],
          };
        }
        startNode = startNode.children.get(char)!;
      }
    }

    const buildDebug = (node: TrieNode, char: string, currentDepth: number): TrieNodeDebug => {
      const debugNode: TrieNodeDebug = {
        char,
        isEnd: node.isEndOfWord,
        word: node.isEndOfWord ? node.word : undefined,
        frequency: node.isEndOfWord ? node.frequency : undefined,
        childrenCount: node.children.size,
      };

      if (currentDepth < maxDepth) {
        debugNode.children = Array.from(node.children.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([c, child]) => buildDebug(child, c, currentDepth + 1));
      }

      return debugNode;
    };

    return buildDebug(startNode, prefix || 'ROOT', 0);
  }
}
