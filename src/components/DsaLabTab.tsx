import React, { useState, useEffect } from 'react';
import { Cpu, Sparkles, Database, ListOrdered, Layers, RefreshCw, Play, ArrowRight } from 'lucide-react';
import { TrieNodeDebug } from '../backend/autocompleteTrie.ts';
import { PostingsEntry, QueryJob } from '../backend/types.ts';
import { HeapStepTrace } from '../backend/topKHeap.ts';
import { sound } from '../utils/sound.ts';

export const DsaLabTab: React.FC = () => {
  const [activeDsaTab, setActiveDsaTab] = useState<'trie' | 'index' | 'heap' | 'queue' | 'cpp'>('trie');

  // C++ Native Backend Console state
  const [cppOutput, setCppOutput] = useState<string>('');
  const [isRunningCpp, setIsRunningCpp] = useState(false);
  const [lastCppCommand, setLastCppCommand] = useState<string>('');

  // Trie state
  const [triePrefix, setTriePrefix] = useState('mach');
  const [trieDebug, setTrieDebug] = useState<TrieNodeDebug | null>(null);

  // Inverted Index state
  const [indexSearchTerm, setIndexSearchTerm] = useState('learning');
  const [indexTermsList, setIndexTermsList] = useState<{ term: string; df: number; postings: PostingsEntry[] }[]>([]);

  // Heap trace state
  const [heapK, setHeapK] = useState(3);
  const [heapTraceQuery, setHeapTraceQuery] = useState('machine learning');
  const [heapTraces, setHeapTraces] = useState<HeapStepTrace[]>([]);

  // Query Queue state
  const [queueData, setQueueData] = useState<{ length: number; pending: QueryJob[]; history: QueryJob[] }>({
    length: 0,
    pending: [],
    history: [],
  });

  const fetchTrie = async (p = triePrefix) => {
    try {
      const res = await fetch(`/api/inspect/trie?prefix=${encodeURIComponent(p)}&maxDepth=3`);
      const data = await res.json();
      setTrieDebug(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeDsaTab === 'trie') fetchTrie();
  }, [activeDsaTab, triePrefix]);

  const fetchIndex = async (termPrefix = indexSearchTerm) => {
    try {
      const res = await fetch(`/api/inspect/index?prefix=${encodeURIComponent(termPrefix)}&limit=30`);
      const data = await res.json();
      setIndexTermsList(data.terms || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeDsaTab === 'index') fetchIndex();
  }, [activeDsaTab, indexSearchTerm]);

  const runHeapSimulation = async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(heapTraceQuery)}&k=${heapK}&trace=true`);
      const data = await res.json();
      setHeapTraces(data.heapTrace || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeDsaTab === 'heap') runHeapSimulation();
  }, [activeDsaTab, heapK, heapTraceQuery]);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue/jobs');
      const data = await res.json();
      setQueueData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeDsaTab === 'queue') fetchQueue();
  }, [activeDsaTab]);

  const enqueueBatchQueries = async () => {
    sound.playHit();
    const testBatch = ['graph traversal', 'operating systems', 'neural networks', 'consensus raft'];
    for (const q of testBatch) {
      await fetch('/api/queue/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, k: 3 }),
      });
    }
    fetchQueue();
  };

  const handleSubTabChange = (tab: any) => {
    sound.playClick();
    setActiveDsaTab(tab);
  };

  const renderTrieNode = (node: TrieNodeDebug, path = '') => {
    return (
      <div key={path} className="ml-4 pl-3 border-l-[3px] border-[var(--ink)] my-1.5 font-mono text-xs">
        <div className="flex items-center space-x-2 py-0.5">
          <span className="w-6 h-6 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-bold text-xs border border-[var(--ink)]">
            {node.char}
          </span>
          {node.isEnd && (
            <span className="score-badge px-2 py-0.5 text-[11px]">
              &quot;{node.word}&quot; (freq: {node.frequency})
            </span>
          )}
          <span className="text-[var(--ink)]/70 font-bold text-[11px]">
            {node.childrenCount} branches
          </span>
        </div>
        {node.children && node.children.map((child, i) => renderTrieNode(child, `${path}-${child.char}-${i}`))}
      </div>
    );
  };

  const runCppBinary = async (endpoint: string, label: string) => {
    setIsRunningCpp(true);
    setLastCppCommand(label);
    sound.playHit();
    try {
      const res = await fetch(`/api/cpp/${endpoint}`);
      const data = await res.json();
      setCppOutput(data.stdout || data.stderr || data.error || 'Execution completed with no output.');
    } catch (err: any) {
      setCppOutput(`Error: ${err.message}`);
    } finally {
      setIsRunningCpp(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Sub-tab selection */}
      <div className="flex flex-wrap gap-2.5">
        {[
          { id: 'trie', label: '1. Trie (Prefix Autocomplete)' },
          { id: 'index', label: '2. Hash Map (Postings List)' },
          { id: 'heap', label: '3. Min-Heap (Top-K Simulator)' },
          { id: 'queue', label: '4. FIFO Queue (Arrival Order)' },
          { id: 'cpp', label: '5. C++17 Native Engine (make check & CLI)' },
        ].map((tab) => {
          const isActive = activeDsaTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`tab-pill ${isActive ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. TRIE VIEW */}
      {activeDsaTab === 'trie' && (
        <div className="space-y-4">
          <div className="paper-panel p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl uppercase text-[var(--ink)]">
                Trie Character Hierarchy
              </h3>
              <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
                Each node maps a character to children. Terminal nodes store frequency and phrase flags.
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-[var(--paper)] px-3 py-1.5 rounded-full border-[3px] border-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
              <span className="text-xs font-black uppercase text-[var(--ink)]">SUBTREE PREFIX:</span>
              <input
                type="text"
                value={triePrefix}
                onChange={(e) => setTriePrefix(e.target.value)}
                placeholder="mach, de, net"
                className="bg-transparent border-none text-xs font-bold text-[var(--red)] focus:outline-none"
              />
            </div>
          </div>

          <div className="paper-panel p-6 shadow-inner max-h-[500px] overflow-y-auto bg-amber-50/60">
            {trieDebug ? renderTrieNode(trieDebug, 'root') : <p>Loading Trie...</p>}
          </div>
        </div>
      )}

      {/* 2. INVERTED INDEX VIEW */}
      {activeDsaTab === 'index' && (
        <div className="space-y-4">
          <div className="paper-panel p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl uppercase text-[var(--ink)]">
                Inverted Index Postings List
              </h3>
              <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
                Hash Map: <code className="font-mono bg-[var(--hit)] px-1.5 py-0.5 rounded border border-[var(--ink)]">term -&gt; Map&lt;docId, termFrequency&gt;</code>.
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-[var(--paper)] px-3 py-1.5 rounded-full border-[3px] border-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
              <span className="text-xs font-black uppercase text-[var(--ink)]">FILTER TERM:</span>
              <input
                type="text"
                value={indexSearchTerm}
                onChange={(e) => setIndexSearchTerm(e.target.value)}
                placeholder="machine, index, tree"
                className="bg-transparent border-none text-xs font-bold text-[var(--red)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indexTermsList.map((entry) => (
              <div key={entry.term} className="paper-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-[var(--ink)]">
                    &quot;{entry.term}&quot;
                  </span>
                  <span className="score-badge px-2 py-0.5 text-xs font-mono">
                    Doc Freq: {entry.df}
                  </span>
                </div>

                <div className="text-xs font-mono font-bold text-[var(--ink)]/80">
                  <span>Postings: </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {entry.postings.map((p) => (
                      <span
                        key={p.docId}
                        className="px-2 py-0.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px]"
                      >
                        Doc #{p.docId} (tf: <strong className="text-[var(--hit)]">{p.tf}</strong>)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. HEAP VIEW */}
      {activeDsaTab === 'heap' && (
        <div className="space-y-4">
          <div className="paper-panel p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl uppercase text-[var(--ink)]">
                Bounded Min-Heap Top-K Simulator
              </h3>
              <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
                Root holds the <strong>worst</strong> result in top-K. Better candidate replaces root in O(log K).
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 bg-[var(--paper)] px-3 py-1.5 rounded-full border-[3px] border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] text-xs font-black">
                <span>K:</span>
                {[1, 3, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      sound.playClick();
                      setHeapK(val);
                    }}
                    className={`px-2 py-0.5 rounded-full ${
                      heapK === val ? 'bg-[var(--ink)] text-[var(--hit)] font-bold' : 'opacity-60'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  runHeapSimulation();
                }}
                className="btn-primary !py-1.5 !px-3.5 !text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate -&gt;</span>
              </button>
            </div>
          </div>

          <div className="paper-panel p-5 space-y-3">
            <h4 className="font-display text-lg uppercase text-[var(--ink)]">
              Step-by-step Candidate Evaluation (Total: {heapTraces.length})
            </h4>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {heapTraces.map((trace) => {
                const actionBadge =
                  trace.action === 'PUSH'
                    ? 'bg-[var(--hit)] text-[var(--ink)]'
                    : trace.action === 'REPLACE_ROOT'
                    ? 'bg-[var(--ink)] text-[var(--hit)]'
                    : 'bg-[var(--red)] text-[var(--paper)]';

                return (
                  <div
                    key={trace.step}
                    className="p-3 bg-amber-50/70 border-[2px] border-[var(--ink)] rounded-[12px] text-xs font-mono font-bold flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-[2px_2px_0_var(--ink)]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-display text-xs">
                        #{trace.step}
                      </span>
                      <span className="text-[var(--ink)]">
                        Doc #{trace.candidate.docId} ({trace.candidate.title.slice(0, 24)}...)
                      </span>
                      <span className="score-badge px-1.5 py-0.5 text-[10px]">
                        Score: {trace.candidate.score.toFixed(3)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full border-[2px] border-[var(--ink)] text-[10px] uppercase font-black ${actionBadge}`}>
                        {trace.action}
                      </span>
                      <span className="text-[var(--ink)]/80 text-[11px]">{trace.reason}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. QUEUE VIEW */}
      {activeDsaTab === 'queue' && (
        <div className="space-y-4">
          <div className="paper-panel p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl uppercase text-[var(--ink)]">
                FIFO Linked-List Queue Monitor
              </h3>
              <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
                Requests are given unique IDs and processed in arrival order. Queue Depth: <strong>{queueData.length}</strong>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={enqueueBatchQueries} className="btn-hit !py-2 !px-4 !text-xs">
                <Play className="w-3.5 h-3.5" />
                <span>Enqueue Batch -&gt;</span>
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  fetchQueue();
                }}
                className="btn-secondary !py-2 !px-3.5 !text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="paper-panel p-5 overflow-x-auto">
            <h4 className="font-display text-lg uppercase text-[var(--ink)] mb-3">
              FIFO Job Ledger
            </h4>
            <table className="w-full text-left border-collapse text-xs font-mono font-bold">
              <thead>
                <tr className="border-b-[3px] border-[var(--ink)] text-[var(--ink)] text-[11px] uppercase">
                  <th className="py-2">Request ID</th>
                  <th className="py-2">Query</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Time</th>
                  <th className="py-2">Duration</th>
                  <th className="py-2 text-right">Matches</th>
                </tr>
              </thead>
              <tbody className="divide-y-[2px] divide-[var(--ink)]/20">
                {queueData.history.map((job) => (
                  <tr key={job.id} className="text-[var(--ink)]">
                    <td className="py-2 font-black">{job.id}</td>
                    <td className="py-2">&quot;{job.query}&quot;</td>
                    <td className="py-2">
                      <span className="score-badge px-2 py-0.5 text-[10px]">
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(job.queuedAt).toLocaleTimeString()}</td>
                    <td className="py-2">{job.durationMs !== undefined ? `${job.durationMs} ms` : '-'}</td>
                    <td className="py-2 text-right font-black">{job.resultsCount ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. C++17 NATIVE ENGINE VIEW */}
      {activeDsaTab === 'cpp' && (
        <div className="space-y-4">
          <div className="paper-panel p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-[var(--ink)] text-[var(--hit)] font-display text-sm border border-[var(--ink)]">
                  C++17
                </span>
                <h3 className="font-display text-2xl uppercase text-[var(--ink)]">
                  Native C++17 Engine &amp; Binary Suite
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
                Compiled with <code className="font-mono bg-[var(--hit)] px-1 rounded border border-[var(--ink)]">g++ -std=c++17 -O3</code>.
                Execute real native binaries and verify test suites directly.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => runCppBinary('check', 'make check')}
                disabled={isRunningCpp}
                className="btn-primary !text-xs !py-2 !px-4"
              >
                <span>make check -&gt;</span>
              </button>
              <button
                onClick={() => runCppBinary('test', './run_tests')}
                disabled={isRunningCpp}
                className="btn-secondary !text-xs !py-2 !px-3.5"
              >
                <span>./run_tests</span>
              </button>
              <button
                onClick={() => runCppBinary('benchmark', './benchmark')}
                disabled={isRunningCpp}
                className="btn-secondary !text-xs !py-2 !px-3.5"
              >
                <span>./benchmark</span>
              </button>
              <button
                onClick={() => runCppBinary('eval', './evaluate 3')}
                disabled={isRunningCpp}
                className="btn-secondary !text-xs !py-2 !px-3.5"
              >
                <span>./evaluate</span>
              </button>
              <button
                onClick={() => runCppBinary('demo', './nexora demo')}
                disabled={isRunningCpp}
                className="btn-hit !text-xs !py-2 !px-3.5"
              >
                <span>./nexora demo</span>
              </button>
            </div>
          </div>

          {/* Terminal Console Output */}
          <div className="paper-panel p-5 space-y-3 bg-[var(--ink)] text-[var(--paper)]">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-mono text-xs font-bold text-white/80 ml-2">
                  Console Output {lastCppCommand ? `[${lastCppCommand}]` : ''}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--hit)]">
                {isRunningCpp ? 'EXECUTING BINARY...' : 'IDLE / READY'}
              </span>
            </div>

            <pre className="font-mono text-xs text-[var(--hit)] bg-black/60 p-4 rounded-[12px] border border-white/10 overflow-x-auto max-h-[460px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {isRunningCpp
                ? 'Running native C++ binary...\nCompiling & executing in container sandbox...'
                : cppOutput ||
                  'Click any action button above (e.g. "make check ->", "./run_tests", "./benchmark") to run the compiled C++17 binaries directly and view live stdout output.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
