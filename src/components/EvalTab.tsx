import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, Copy, Download, Check, Zap, Sparkles } from 'lucide-react';
import { BenchmarkMetrics, EvalSummary } from '../backend/types.ts';
import { sound } from '../utils/sound.ts';

export const EvalTab: React.FC = () => {
  const [activeBoardTab, setActiveBoardTab] = useState<'ir' | 'latency' | 'heap'>('ir');
  const [evalData, setEvalData] = useState<EvalSummary | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkMetrics | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [evalK, setEvalK] = useState(3);
  const [copiedResult, setCopiedResult] = useState(false);

  const runEvaluation = async (k = evalK) => {
    setIsEvaluating(true);
    sound.playHit();
    try {
      const res = await fetch(`/api/eval?k=${k}`);
      const data = await res.json();
      setEvalData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const runBenchmarks = async () => {
    setIsBenchmarking(true);
    sound.playHit();
    try {
      const res = await fetch('/api/benchmarks');
      const data = await res.json();
      setBenchmarkData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  useEffect(() => {
    runEvaluation(3);
    runBenchmarks();
  }, []);

  const handleCopyResult = () => {
    sound.playClick();
    if (!evalData) return;
    const summary = `NEXORA IR SCORECARD:
Precision@${evalData.k}: ${(evalData.meanPrecisionAtK * 100).toFixed(1)}%
Recall@${evalData.k}: ${(evalData.meanRecallAtK * 100).toFixed(1)}%
MRR: ${evalData.meanReciprocalRank.toFixed(3)}
Tested across ${evalData.queries.length} ground-truth queries in queries.tsv.`;
    navigator.clipboard.writeText(summary);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  const handleDownloadScoreCard = () => {
    sound.playClick();
    if (!evalData) return;
    const payload = {
      scorecard: 'Nexora Information Retrieval Evaluation',
      k: evalData.k,
      precisionAtK: evalData.meanPrecisionAtK,
      recallAtK: evalData.meanRecallAtK,
      mrr: evalData.meanReciprocalRank,
      queries: evalData.queries,
      benchmarks: benchmarkData,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora-scorecard-k${evalData.k}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 pb-12">
      {/* Scoreboard Header */}
      <div className="paper-panel p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-7 h-7 text-[var(--red)]" />
            <h2 className="font-display text-3xl sm:text-4xl uppercase text-[var(--ink)]">
              THE SCOREBOARD
            </h2>
            <span className="score-badge px-3 py-0.5 text-xs">
              queries.tsv Verified
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
            Ground-truth evaluation of Precision@K, Recall@K, and MRR. No vanity numbers.
          </p>
        </div>

        {/* Board Pill Tabs per DESIGN.md: "Three pill tabs, active tab --hit with ink border" */}
        <div className="flex items-center space-x-2">
          {[
            { id: 'ir', label: 'IR PRECISION' },
            { id: 'latency', label: 'LATENCY (p50/p95)' },
            { id: 'heap', label: 'HEAP VS SORT' },
          ].map((tab) => {
            const isActive = activeBoardTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveBoardTab(tab.id as any);
                }}
                className={`tab-pill ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Scoreboard Content */}
      {activeBoardTab === 'ir' && evalData && (
        <div className="paper-panel p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-[16px] bg-[var(--hit)] border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] space-y-1">
              <div className="text-xs font-black uppercase text-[var(--ink)]">
                Precision@{evalData.k}
              </div>
              <div className="font-display text-4xl sm:text-5xl text-[var(--ink)]">
                {(evalData.meanPrecisionAtK * 100).toFixed(1)}%
              </div>
              <p className="text-xs font-bold text-[var(--ink)]/80">
                Top-{evalData.k} retrieved documents matching ground truth.
              </p>
            </div>

            <div className="p-5 rounded-[16px] bg-[var(--paper)] border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] space-y-1">
              <div className="text-xs font-black uppercase text-[var(--ink)]">
                Recall@{evalData.k}
              </div>
              <div className="font-display text-4xl sm:text-5xl text-[var(--red)]">
                {(evalData.meanRecallAtK * 100).toFixed(1)}%
              </div>
              <p className="text-xs font-bold text-[var(--ink)]/80">
                Relevant corpus files retrieved in top-{evalData.k}.
              </p>
            </div>

            <div className="p-5 rounded-[16px] bg-[var(--ink)] text-[var(--paper)] border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] space-y-1">
              <div className="text-xs font-black uppercase text-[var(--hit)]">
                Mean Reciprocal Rank (MRR)
              </div>
              <div className="font-display text-4xl sm:text-5xl text-[var(--hit)]">
                {evalData.meanReciprocalRank.toFixed(3)}
              </div>
              <p className="text-xs font-bold text-white/80">
                Inverse rank of first relevant hit (1.0 = flawless #1 rank).
              </p>
            </div>
          </div>

          {/* Ranked Rows Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs font-bold">
              <thead>
                <tr className="border-b-[3px] border-[var(--ink)] text-[var(--ink)] text-xs uppercase">
                  <th className="py-2.5">#</th>
                  <th className="py-2.5">Query</th>
                  <th className="py-2.5">Ground Truth Target</th>
                  <th className="py-2.5">Retrieved Docs</th>
                  <th className="py-2.5 text-right">P@{evalData.k}</th>
                  <th className="py-2.5 text-right">R@{evalData.k}</th>
                  <th className="py-2.5 text-right">RR</th>
                </tr>
              </thead>
              <tbody className="divide-y-[2px] divide-[var(--ink)]/20">
                {evalData.queries.map((q, idx) => (
                  <tr key={q.query} className="text-[var(--ink)]">
                    <td className="py-3 font-display text-sm">{idx + 1}</td>
                    <td className="py-3 font-display text-base">&quot;{q.query}&quot;</td>
                    <td className="py-3 text-[var(--ink)]/80">
                      {q.expectedFiles.map((f) => f.replace('.md', '')).join(', ')}
                    </td>
                    <td className="py-3">
                      {q.retrievedFiles.map((f) => (
                        <span
                          key={f}
                          className={`inline-block mr-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            q.expectedFiles.includes(f)
                              ? 'bg-[var(--hit)] text-[var(--ink)] border-[var(--ink)]'
                              : 'bg-white text-[var(--ink)]/60 border-[var(--ink)]/40'
                          }`}
                        >
                          {f.replace('.md', '')}
                        </span>
                      ))}
                    </td>
                    <td className="py-3 text-right font-black">{q.precision}</td>
                    <td className="py-3 text-right font-black">{q.recall}</td>
                    <td className="py-3 text-right font-black text-[var(--red)]">{q.reciprocalRank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rules note in muted text under list per DESIGN.md Section 3 */}
          <p className="text-xs font-bold text-[var(--muted)] border-t-[2px] border-[var(--ink)]/20 pt-2">
            * Rules note: Ground truth queries are evaluated against data/sample/queries.tsv without index contamination or query tuning.
          </p>

          {/* Footer Actions per DESIGN.md: "Copy result (secondary), Download score card (primary)" */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-[3px] border-[var(--ink)]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase text-[var(--ink)]">Eval K:</span>
              {[1, 3, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    sound.playClick();
                    setEvalK(val);
                    runEvaluation(val);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border-[2px] border-[var(--ink)] ${
                    evalK === val ? 'bg-[var(--ink)] text-[var(--paper)]' : 'bg-[var(--paper)] text-[var(--ink)]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <button onClick={handleCopyResult} className="btn-secondary !text-xs !py-2.5 !px-5">
                {copiedResult ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedResult ? 'Copied Result!' : 'Copy result'}</span>
              </button>

              <button onClick={handleDownloadScoreCard} className="btn-primary !text-xs !py-2.5 !px-5">
                <Download className="w-4 h-4" />
                <span>Download score card -&gt;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Latency Tab */}
      {activeBoardTab === 'latency' && benchmarkData && (
        <div className="paper-panel p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            <div className="p-4 rounded-[14px] bg-[var(--paper)] border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
              <div className="text-xs font-black uppercase text-[var(--ink)]/70">Autocomplete Latency</div>
              <div className="font-display text-3xl text-[var(--ink)] mt-1">
                p50: {benchmarkData.autocompleteP50Ms} ms
              </div>
              <div className="text-xs font-bold text-[var(--red)] mt-0.5">
                p95: {benchmarkData.autocompleteP95Ms} ms
              </div>
            </div>

            <div className="p-4 rounded-[14px] bg-[var(--paper)] border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
              <div className="text-xs font-black uppercase text-[var(--ink)]/70">Search Query Latency</div>
              <div className="font-display text-3xl text-[var(--ink)] mt-1">
                p50: {benchmarkData.searchP50Ms} ms
              </div>
              <div className="text-xs font-bold text-[var(--red)] mt-0.5">
                p95: {benchmarkData.searchP95Ms} ms
              </div>
            </div>

            <div className="p-4 rounded-[14px] bg-[var(--paper)] border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
              <div className="text-xs font-black uppercase text-[var(--ink)]/70">Index Build Time</div>
              <div className="font-display text-3xl text-[var(--ink)] mt-1">
                {benchmarkData.indexBuildTimeMs} ms
              </div>
              <div className="text-xs font-bold text-[var(--ink)]/70 mt-0.5">
                Trie: {benchmarkData.trieBuildTimeMs} ms • Graph: {benchmarkData.graphBuildTimeMs} ms
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-[12px] border-[2px] border-[var(--ink)] text-xs font-mono font-bold text-[var(--ink)]">
            <span>Environment: </span>
            <span>{benchmarkData.environment.platform} • {benchmarkData.environment.runtime} ({benchmarkData.environment.nodeVersion})</span>
          </div>

          <button onClick={() => runBenchmarks()} className="btn-primary !text-xs !py-2.5 !px-5">
            <RefreshCw className={`w-4 h-4 ${isBenchmarking ? 'animate-spin' : ''}`} />
            <span>Rerun Benchmarks -&gt;</span>
          </button>
        </div>
      )}

      {/* Heap vs Sort Tab */}
      {activeBoardTab === 'heap' && benchmarkData && (
        <div className="paper-panel p-6 space-y-4">
          <div className="p-6 bg-[var(--hit)] border-[3px] border-[var(--ink)] rounded-[18px] shadow-[6px_6px_0_var(--ink)]">
            <h3 className="font-display text-3xl uppercase text-[var(--ink)]">
              {benchmarkData.heapVsSortComparison.ratio}
            </h3>
            <p className="text-sm font-bold text-[var(--ink)] mt-1">
              Bounded Min-Heap takes <strong>{benchmarkData.heapVsSortComparison.heapDurationUs} µs</strong> versus Full Sort <strong>{benchmarkData.heapVsSortComparison.fullSortDurationUs} µs</strong> on {benchmarkData.heapVsSortComparison.candidateCount} candidates (K={benchmarkData.heapVsSortComparison.k}).
            </p>
          </div>

          <div className="p-4 bg-[var(--paper)] border-[2px] border-[var(--ink)] rounded-[14px] text-xs font-mono font-bold space-y-2">
            <div className="text-sm font-display uppercase">Theoretical Complexity</div>
            <div>• Bounded Min-Heap: O(M log K) - only keeps K best candidates; discards worse items in O(1) root comparison.</div>
            <div>• Full Sort Baseline: O(M log M) - sorts all M candidates before taking slice(0, K).</div>
          </div>
        </div>
      )}
    </div>
  );
};
