import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Network,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { SearchResult, TrieSuggestion } from '../backend/types.ts';
import { SearchOutput } from '../backend/searchService.ts';
import { sound } from '../utils/sound.ts';

interface SearchTabProps {
  onOpenDocument: (docId: number) => void;
  onExploreGraph: (docId: number) => void;
  mode: 'OR' | 'AND';
  ranking: 'BM25' | 'TF';
  k: number;
  useQueue: boolean;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  onOpenDocument,
  onExploreGraph,
  mode,
  ranking,
  k,
  useQueue,
}) => {
  const [query, setQuery] = useState('machine learning');
  const [suggestions, setSuggestions] = useState<TrieSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchOutput, setSearchOutput] = useState<SearchOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const sampleQueries = [
    'machine learning',
    'inverted index',
    'neural networks',
    'virtual memory',
    'consensus raft',
    'compiler optimization',
  ];

  // Fetch Trie autocomplete suggestions as user types
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}&limit=6`);
        if (res.ok) {
          const data: TrieSuggestion[] = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [query]);

  // Execute search
  const executeSearch = async (overrideQuery?: string) => {
    const targetQuery = overrideQuery ?? query;
    if (!targetQuery.trim()) return;

    sound.playHit();
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      if (useQueue) {
        // Enqueue query
        const submitRes = await fetch('/api/queue/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: targetQuery, mode, ranking, k }),
        });
        const submitData = await submitRes.json();
        setLastRequestId(submitData.requestId);

        // Process immediately for UI reactivity
        const processRes = await fetch('/api/queue/process-next', { method: 'POST' });
        const processData = await processRes.json();

        if (processData.job) {
          setSearchOutput({
            query: processData.job.query,
            normalizedQueryTokens: targetQuery.toLowerCase().split(/\s+/),
            mode: processData.job.mode,
            ranking: processData.job.ranking,
            k: processData.job.k,
            totalCandidates: processData.job.results?.length ?? 0,
            results: processData.job.results ?? [],
            durationMs: processData.job.durationMs ?? 0.5,
          });
        }
      } else {
        // Direct search
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(targetQuery)}&mode=${mode}&ranking=${ranking}&k=${k}`
        );
        if (res.ok) {
          const data: SearchOutput = await res.json();
          setSearchOutput(data);
          setLastRequestId(null);
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial search once on mount
  useEffect(() => {
    executeSearch('machine learning');
  }, [mode, ranking, k]);

  // Keyboard navigation for Trie dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') executeSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        const chosen = suggestions[selectedSuggestionIndex].word;
        setQuery(chosen);
        executeSearch(chosen);
      } else {
        executeSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Centered Hero Container (~1200px max width) */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Headline, Description, Metadata, Search Bar (Primary CTA), Popular Queries */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
            {/* Headline */}
            <h1 className="hero-title text-[var(--paper)] drop-shadow-[2px_2px_0_var(--ink)]">
              NEXORA<br />
              INFORMATION<br />
              RETRIEVAL
            </h1>

            {/* Supporting Description */}
            <p className="text-base sm:text-lg font-bold text-[var(--paper)] leading-snug">
              Search curated documents with transparent ranking and evidence-linked results.
            </p>

            {/* Metadata Label below description */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--paper)]/90 pt-0.5">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[var(--ink)] text-[var(--hit)] border border-[var(--paper)]/30 font-bold text-[11px]">
                Search a curated document set
              </span>
              <span className="hidden sm:inline opacity-60">•</span>
              <span className="hidden sm:inline">12 indexed topics</span>
              <span className="hidden sm:inline opacity-60">•</span>
              <span className="hidden sm:inline">BM25 &amp; TF ranking</span>
            </div>

            {/* Primary Call to Action: Dominant Search Bar inside content flow */}
            <div className="relative pt-1">
              <div className="relative flex items-center bg-[var(--paper)] border-2 border-[var(--ink)] rounded-full shadow-[3px_3px_0_var(--ink)] focus-within:ring-2 focus-within:ring-[var(--hit)] transition-all p-1">
                <div className="pl-3.5 text-[var(--ink)]">
                  <Search className="w-5 h-5 text-[var(--ink)]" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                    setSelectedSuggestionIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type search query (e.g. 'machine learning', 'virtual memory')..."
                  className="w-full py-2 sm:py-2.5 pl-3 pr-28 bg-transparent text-[var(--ink)] placeholder-[var(--ink)]/50 text-sm sm:text-base font-bold focus:outline-none"
                />

                <button
                  onClick={() => executeSearch()}
                  disabled={isLoading}
                  className="btn-primary text-xs sm:text-sm whitespace-nowrap !py-2 !px-4 !min-h-[38px]"
                >
                  {isLoading ? <span>Searching...</span> : <span>Search -&gt;</span>}
                </button>
              </div>

              {/* Trie Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[16px] shadow-[4px_4px_0_var(--ink)] z-50 overflow-hidden divide-y divide-[var(--ink)]/20 animate-in fade-in duration-100">
                  <div className="px-4 py-1.5 bg-[var(--hit)] border-b-2 border-[var(--ink)] text-[11px] font-black uppercase tracking-wider text-[var(--ink)] flex justify-between items-center">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--ink)]" />
                      <span>Trie Prefix Suggestions</span>
                    </span>
                    <span className="text-[10px] font-mono">Ranked by Corpus Frequency</span>
                  </div>

                  {suggestions.map((item, idx) => {
                    const isSelected = idx === selectedSuggestionIndex;
                    return (
                      <div
                        key={item.word}
                        onMouseDown={() => {
                          setQuery(item.word);
                          executeSearch(item.word);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                        className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-[var(--hit)] text-[var(--ink)]' : 'hover:bg-amber-100/60 text-[var(--ink)]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-display text-sm text-[var(--ink)]">▶</span>
                          <span className="font-extrabold text-sm">{item.word}</span>
                          {item.isPhrase && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--ink)] text-[var(--paper)]">
                              Phrase
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]">
                          freq: {item.frequency}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Popular Topics Quick Query Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-black uppercase text-[var(--paper)] tracking-wider mr-1">
                Popular queries:
              </span>
              {sampleQueries.map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    sound.playClick();
                    setQuery(sample);
                    executeSearch(sample);
                  }}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--ink)] shadow-[1.5px_1.5px_0_var(--ink)] hover:bg-[var(--hit)] transition-colors active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column (Desktop) / Stacked Below Search (Mobile): Circular IR Graphic & Product Benefits */}
          <div className="lg:col-span-5 xl:col-span-4 w-full">
            <div className="paper-panel p-5 space-y-3.5 bg-[var(--paper)]">
              {/* Circular IR Graphic Header */}
              <div className="flex items-center space-x-3 pb-3 border-b border-[var(--ink)]/20">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--ink)] bg-[var(--hit)] flex items-center justify-center font-display text-base text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] relative shrink-0">
                  <div className="absolute inset-x-1 top-1/2 h-[1.5px] bg-[var(--ink)] -translate-y-1/2 opacity-70"></div>
                  <div className="absolute inset-y-1 left-1/2 w-[1.5px] bg-[var(--ink)] -translate-x-1/2 opacity-70"></div>
                  <span className="relative z-10">IR</span>
                </div>
                <div>
                  <h3 className="font-display text-lg uppercase text-[var(--ink)] leading-tight">
                    Engine Capabilities
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-[var(--ink)]/70">
                    Transparent Document Discovery
                  </p>
                </div>
              </div>

              {/* Concise Product Benefits */}
              <ul className="space-y-2 text-xs font-bold text-[var(--ink)]">
                <li className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--hit)] border border-[var(--ink)] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>Algorithmically ranked results</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--hit)] border border-[var(--ink)] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>Relevance-focused retrieval</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--hit)] border border-[var(--ink)] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>Document-linked evidence</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--hit)] border border-[var(--ink)] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>Designed to reduce unsupported answers</span>
                </li>
              </ul>

              {/* Credible, evidence-based highlight note */}
              <div className="pt-2 border-t border-[var(--ink)]/20 text-[11px] font-medium text-[var(--ink)]/80 leading-relaxed bg-amber-50/80 p-2.5 rounded-lg border border-[var(--ink)]/20">
                Designed to reduce unsupported answers through document-based retrieval.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Query Status & Pipeline Bar — aligned to 1200px container */}
      {searchOutput && (
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="bg-[var(--paper)] border-2 border-[var(--ink)] rounded-full px-4 sm:px-5 py-2 shadow-[2px_2px_0_var(--ink)] flex flex-wrap items-center justify-between gap-2.5 text-xs font-bold text-[var(--ink)]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center space-x-1.5 text-[var(--ink)]">
                <Clock className="w-3.5 h-3.5 text-[var(--red)]" />
                <span>{searchOutput.durationMs} ms</span>
              </span>
              <span className="opacity-50">•</span>
              <span>
                Candidates: <strong>{searchOutput.totalCandidates}</strong>
              </span>
              <span className="opacity-50">•</span>
              <span>
                Top-K Heap: <strong className="text-[var(--red)]">{searchOutput.results.length}</strong> / {k}
              </span>
              <span className="opacity-50">•</span>
              <span>
                Model: <strong className="bg-[var(--hit)] px-1.5 py-0.5 rounded border border-[var(--ink)]">{searchOutput.ranking}</strong>
              </span>
            </div>

            {lastRequestId && (
              <div className="font-mono text-[10px] font-bold bg-[var(--ink)] text-[var(--hit)] px-2.5 py-0.5 rounded-full">
                QUEUE ID: {lastRequestId}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results List — aligned to 1200px container */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-3.5">
        {searchOutput && searchOutput.results.length === 0 ? (
          <div className="paper-panel p-8 text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-[var(--red)] mx-auto" />
            <h3 className="font-display text-2xl uppercase text-[var(--ink)]">NO MATCHING DOCUMENTS FOUND</h3>
            <p className="text-sm font-bold text-[var(--ink)]/80 max-w-md mx-auto">
              In {mode} mode, none of the documents in our corpus matched this query.
              Try relaxing your terms or switching to OR mode.
            </p>
          </div>
        ) : (
          searchOutput?.results.map((result, rankIndex) => {
            const isExpanded = expandedDocId === result.docId;

            return (
              <article
                key={result.docId}
                className="paper-card p-4 sm:p-5 space-y-2.5 relative overflow-hidden"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-7 h-7 rounded-full bg-[var(--ink)] text-[var(--paper)] font-display text-xs flex items-center justify-center border border-[var(--ink)]">
                      #{rankIndex + 1}
                    </span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenDocument(result.docId);
                      }}
                      className="font-display text-lg sm:text-xl text-[var(--ink)] hover:text-[var(--red)] transition-colors text-left"
                    >
                      {result.title}
                    </button>
                  </div>

                  <div className="score-badge px-2.5 py-0.5 text-xs">
                    {result.explanation.method}: {result.score.toFixed(4)}
                  </div>
                </div>

                {/* Subhead info */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--ink)]/70">
                  <span className="font-mono">{result.filename}</span>
                  <span className="opacity-50">•</span>
                  <span>Doc ID: {result.docId}</span>
                  <span className="opacity-50">•</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <span>Matched:</span>
                    {result.matchedTerms.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full bg-[var(--hit)] text-[var(--ink)] border border-[var(--ink)] font-bold text-[10px]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Snippet */}
                <div
                  className="p-3 bg-amber-50/80 rounded-[10px] border border-[var(--ink)]/30 text-xs sm:text-sm leading-relaxed text-[var(--ink)] font-medium"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />

                {/* Actions & receipts toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--ink)]/15">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenDocument(result.docId);
                      }}
                      className="btn-secondary !py-1 !px-3 !text-xs !min-h-[32px]"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[var(--red)]" />
                      <span>Read Document -&gt;</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onExploreGraph(result.docId);
                      }}
                      className="btn-secondary !py-1 !px-3 !text-xs !min-h-[32px]"
                    >
                      <Network className="w-3.5 h-3.5 text-[var(--ink)]" />
                      <span>Graph -&gt;</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setExpandedDocId(isExpanded ? null : result.docId);
                    }}
                    className="flex items-center space-x-1 text-xs font-bold text-[var(--ink)] hover:text-[var(--red)] transition-colors underline decoration-1 underline-offset-4"
                  >
                    <span>{isExpanded ? 'Hide breakdown' : 'Show score breakdown'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Mathematical score breakdown */}
                {isExpanded && (
                  <div className="mt-2.5 p-3.5 bg-[var(--ink)] text-[var(--paper)] rounded-[12px] border border-[var(--ink)] font-mono text-xs space-y-2 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between text-[var(--hit)] font-bold border-b border-white/20 pb-1 text-xs">
                      <span>{result.explanation.method} Score Calculation</span>
                      <span>Total = {result.score.toFixed(4)}</span>
                    </div>

                    {result.explanation.method === 'BM25' && (
                      <p className="text-[10px] text-white/70">
                        Formula: score = ∑ IDF(t) × [tf × (k1 + 1)] / [tf + k1 × (1 - b + b × |D| / avgdl)]
                      </p>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse mt-1 text-xs">
                        <thead>
                          <tr className="border-b border-white/20 text-white/60 text-[10px] uppercase">
                            <th className="py-1">Term</th>
                            <th className="py-1">TF</th>
                            <th className="py-1">IDF</th>
                            <th className="py-1">|D| / avgdl</th>
                            <th className="py-1 text-right">Score Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-xs">
                          {result.explanation.terms.map((termInfo) => (
                            <tr key={termInfo.term}>
                              <td className="py-1 text-[var(--hit)] font-bold">{termInfo.term}</td>
                              <td className="py-1">{termInfo.tf}</td>
                              <td className="py-1">{termInfo.idf}</td>
                              <td className="py-1">
                                {termInfo.docLength} / {termInfo.avgDocLength}
                              </td>
                              <td className="py-1 text-right font-bold text-[var(--hit)]">
                                +{termInfo.contribution.toFixed(4)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
