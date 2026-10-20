import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Clock, ArrowRight, ChevronDown, ChevronUp, Network, BookOpen, Target, AlertTriangle } from 'lucide-react';
import { SearchResult, TrieSuggestion } from '../backend/types.ts';
import { SearchOutput } from '../backend/searchService.ts';
import { sound } from '../utils/sound.ts';

interface SearchTabProps {
  mode: 'OR' | 'AND';
  ranking: 'BM25' | 'TF';
  k: number;
  useQueue: boolean;
  onOpenDocument: (docId: number) => void;
  onExploreGraph: (docId: number) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  mode,
  ranking,
  k,
  useQueue,
  onOpenDocument,
  onExploreGraph,
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

  // Fetch Trie Autocomplete suggestions
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}&limit=7`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          if (data.suggestions && data.suggestions.length > 0) {
            sound.playPop();
          }
        }
      } catch (err) {
        console.error('Autocomplete fetch error:', err);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [query]);

  // Execute Search
  const executeSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setShowSuggestions(false);
    sound.playHit();

    try {
      if (useQueue) {
        const res = await fetch('/api/queue/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, mode, ranking, k }),
        });
        const data = await res.json();
        setLastRequestId(data.requestId);

        const searchRes = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&mode=${mode}&ranking=${ranking}&k=${k}&trace=true`
        );
        const searchData = await searchRes.json();
        setSearchOutput(searchData);
      } else {
        setLastRequestId(null);
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&mode=${mode}&ranking=${ranking}&k=${k}&trace=true`
        );
        const data = await res.json();
        setSearchOutput(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeSearch('machine learning');
  }, [mode, ranking, k]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        executeSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      sound.playClick();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      sound.playClick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        const selected = suggestions[selectedSuggestionIndex].word;
        setQuery(selected);
        executeSearch(selected);
      } else {
        executeSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const sampleQueries = [
    'machine learning',
    'inverted index',
    'neural networks',
    'graph algorithms',
    'virtual memory',
    'consensus raft',
    'b tree indexing',
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Stacked Title as specified in DESIGN.md */}
      <div className="max-w-5xl mx-auto pt-4 sm:pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-[var(--ink)] text-[var(--hit)] font-extrabold text-xs uppercase tracking-[0.14em] mb-2 border-[2px] border-[var(--paper)] shadow-[2px_2px_0_var(--ink)]">
              Fact-Check Arcade • 12 Verified Documents
            </div>
            <h1 className="hero-title text-[var(--paper)] drop-shadow-[4px_4px_0_var(--ink)]">
              NEXORA,<br />
              IT&apos;S INDEXED,<br />
              BRO.
            </h1>
            <p className="text-lg sm:text-2xl font-black text-[var(--paper)] mt-2 tracking-tight">
              Big claims. Zero receipts. Let&apos;s see what survives.
            </p>
          </div>

          {/* Crosshair motif inspired by DESIGN.md Section 1 */}
          <div className="hidden lg:flex items-center justify-center p-4">
            <div className="w-28 h-28 rounded-full border-[4px] border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center shadow-[6px_6px_0_var(--ink)] relative">
              <div className="absolute inset-x-2 top-1/2 h-[3px] bg-[var(--ink)] -translate-y-1/2"></div>
              <div className="absolute inset-y-2 left-1/2 w-[3px] bg-[var(--ink)] -translate-x-1/2"></div>
              <div className="w-12 h-12 rounded-full border-[3px] border-[var(--ink)] flex items-center justify-center bg-[var(--hit)] z-10 font-display text-lg text-[var(--ink)]">
                IR
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dominant Search Input Box */}
      <div className="max-w-4xl mx-auto relative">
        <div className="relative flex items-center bg-[var(--paper)] border-[3px] border-[var(--ink)] rounded-full shadow-[6px_6px_0_var(--ink)] focus-within:ring-4 focus-within:ring-[var(--hit)] transition-all p-1.5 sm:p-2">
          <div className="pl-3 sm:pl-4 text-[var(--ink)]">
            <Target className="w-6 h-6 text-[var(--ink)]" />
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
            placeholder="Type query prefix (e.g. 'mach' or 'index')..."
            className="w-full py-2.5 sm:py-3 pl-3 pr-32 bg-transparent text-[var(--ink)] placeholder-[var(--ink)]/50 text-base sm:text-lg font-bold focus:outline-none"
          />

          <button
            onClick={() => executeSearch()}
            disabled={isLoading}
            className="btn-primary text-xs sm:text-sm whitespace-nowrap !py-2.5 sm:!py-3 !px-5"
          >
            {isLoading ? <span>BUSTING...</span> : <span>Search -&gt;</span>}
          </button>
        </div>

        {/* Trie Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-3 bg-[var(--paper)] border-[3px] border-[var(--ink)] rounded-[20px] shadow-[6px_6px_0_var(--ink)] z-50 overflow-hidden divide-y-[2px] divide-[var(--ink)]/20 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-2 bg-[var(--hit)] border-b-[3px] border-[var(--ink)] text-xs font-black uppercase tracking-wider text-[var(--ink)] flex justify-between items-center">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[var(--ink)]" />
                <span>Trie Prefix Completions</span>
              </span>
              <span className="text-[11px] font-mono">Ranked by Corpus Frequency</span>
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
                  className={`px-5 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-[var(--hit)] text-[var(--ink)]' : 'hover:bg-amber-100/60 text-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="font-display text-base">▶</span>
                    <span className="font-extrabold text-sm sm:text-base">{item.word}</span>
                    {item.isPhrase && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--ink)] text-[var(--paper)]">
                        Phrase
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]">
                    freq: {item.frequency}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick query buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 justify-center">
          <span className="text-xs font-black uppercase text-[var(--paper)] mr-1 drop-shadow-sm">
            Pop a claim:
          </span>
          {sampleQueries.map((sample) => (
            <button
              key={sample}
              onClick={() => {
                sound.playClick();
                setQuery(sample);
                executeSearch(sample);
              }}
              className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--paper)] text-[var(--ink)] border-[2px] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--hit)] transition-colors active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Query Status & Pipeline Bar */}
      {searchOutput && (
        <div className="max-w-4xl mx-auto bg-[var(--paper)] border-[3px] border-[var(--ink)] rounded-full px-5 py-2.5 shadow-[4px_4px_0_var(--ink)] flex flex-wrap items-center justify-between gap-3 text-xs font-extrabold text-[var(--ink)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center space-x-1.5 text-[var(--ink)]">
              <Clock className="w-4 h-4 text-[var(--red)]" />
              <span>{searchOutput.durationMs} ms</span>
            </span>
            <span>•</span>
            <span>
              Candidates: <strong>{searchOutput.totalCandidates}</strong>
            </span>
            <span>•</span>
            <span>
              Top-K Heap: <strong className="text-[var(--red)]">{searchOutput.results.length}</strong> / {k}
            </span>
            <span>•</span>
            <span>
              Model: <strong className="bg-[var(--hit)] px-1.5 py-0.5 rounded border border-[var(--ink)]">{searchOutput.ranking}</strong>
            </span>
          </div>

          {lastRequestId && (
            <div className="font-mono text-[11px] bg-[var(--ink)] text-[var(--hit)] px-2.5 py-0.5 rounded-full">
              QUEUE ID: {lastRequestId}
            </div>
          )}
        </div>
      )}

      {/* Search Results in Neo-Brutalist Paper Cards */}
      <div className="max-w-4xl mx-auto space-y-4">
        {searchOutput && searchOutput.results.length === 0 ? (
          <div className="paper-panel p-8 text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-[var(--red)] mx-auto" />
            <h3 className="font-display text-2xl uppercase text-[var(--ink)]">ZERO RECEIPTS FOUND</h3>
            <p className="text-sm font-bold text-[var(--ink)]/80 max-w-md mx-auto">
              In {mode} mode, none of the 12 documents in our corpus matched this query.
              Try relaxing your terms or switching to OR mode.
            </p>
          </div>
        ) : (
          searchOutput?.results.map((result, rankIndex) => {
            const isExpanded = expandedDocId === result.docId;

            return (
              <article
                key={result.docId}
                className="paper-card p-5 sm:p-6 space-y-3 relative overflow-hidden"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--paper)] font-display text-sm flex items-center justify-center border-[2px] border-[var(--ink)]">
                      #{rankIndex + 1}
                    </span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenDocument(result.docId);
                      }}
                      className="font-display text-xl sm:text-2xl text-[var(--ink)] hover:text-[var(--red)] transition-colors text-left"
                    >
                      {result.title}
                    </button>
                  </div>

                  <div className="score-badge px-3 py-1 text-xs">
                    {result.explanation.method}: {result.score.toFixed(4)}
                  </div>
                </div>

                {/* Subhead info */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--ink)]/70">
                  <span className="font-mono">{result.filename}</span>
                  <span>•</span>
                  <span>Doc ID: {result.docId}</span>
                  <span>•</span>
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
                  className="p-3.5 bg-amber-50/80 rounded-[12px] border-[2px] border-[var(--ink)] text-sm sm:text-base leading-relaxed text-[var(--ink)] font-medium"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />

                {/* Actions row */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t-[2px] border-[var(--ink)]/20">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenDocument(result.docId);
                      }}
                      className="btn-secondary !py-1.5 !px-3.5 !text-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[var(--red)]" />
                      <span>Read Receipt -&gt;</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onExploreGraph(result.docId);
                      }}
                      className="btn-secondary !py-1.5 !px-3.5 !text-xs"
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
                    className="flex items-center space-x-1 text-xs font-bold text-[var(--ink)] hover:text-[var(--red)] transition-colors underline decoration-2 underline-offset-4"
                  >
                    <span>{isExpanded ? 'Hide receipts' : 'Show formula receipts'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Mathematical receipts breakdown */}
                {isExpanded && (
                  <div className="mt-3 p-4 bg-[var(--ink)] text-[var(--paper)] rounded-[14px] border-[2px] border-[var(--ink)] font-mono text-xs space-y-2 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between text-[var(--hit)] font-bold border-b border-white/20 pb-1.5 text-xs sm:text-sm">
                      <span>{result.explanation.method} Mathematical Receipts</span>
                      <span>Total = {result.score.toFixed(4)}</span>
                    </div>

                    {result.explanation.method === 'BM25' && (
                      <p className="text-[11px] text-white/70">
                        Formula: score = ∑ IDF(t) × [tf × (k1 + 1)] / [tf + k1 × (1 - b + b × |D| / avgdl)]
                      </p>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse mt-2">
                        <thead>
                          <tr className="border-b border-white/20 text-white/60 text-[10px] uppercase">
                            <th className="py-1">Term</th>
                            <th className="py-1">TF</th>
                            <th className="py-1">IDF</th>
                            <th className="py-1">|D| / avgdl</th>
                            <th className="py-1 text-right">Receipt Contribution</th>
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
