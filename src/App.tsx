import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { SearchTab } from './components/SearchTab.tsx';
import { GraphTab } from './components/GraphTab.tsx';
import { DsaLabTab } from './components/DsaLabTab.tsx';
import { EvalTab } from './components/EvalTab.tsx';
import { CorpusTab } from './components/CorpusTab.tsx';
import { DocumentModal } from './components/DocumentModal.tsx';
import { ServiceStats } from './backend/searchService.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [mode, setMode] = useState<'OR' | 'AND'>('OR');
  const [ranking, setRanking] = useState<'BM25' | 'TF'>('BM25');
  const [k, setK] = useState(5);
  const [useQueue, setUseQueue] = useState(false);

  // Document Modal state
  const [openedDocId, setOpenedDocId] = useState<number | null>(null);
  // Graph focus state
  const [graphFocusDocId, setGraphFocusDocId] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleOpenDocument = (docId: number) => {
    setOpenedDocId(docId);
  };

  const handleExploreInGraph = (docId: number) => {
    setGraphFocusDocId(docId);
    setActiveTab('graph');
  };

  return (
    <div className="min-h-screen bg-[var(--red)] text-[var(--paper)] flex flex-col font-sans selection:bg-[var(--hit)] selection:text-[var(--ink)]">
      {/* Top Navbar & Controls */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        mode={mode}
        setMode={setMode}
        ranking={ranking}
        setRanking={setRanking}
        k={k}
        setK={setK}
        useQueue={useQueue}
        setUseQueue={setUseQueue}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto py-4 sm:py-6">
        {activeTab === 'search' && (
          <SearchTab
            mode={mode}
            ranking={ranking}
            k={k}
            useQueue={useQueue}
            onOpenDocument={handleOpenDocument}
            onExploreGraph={handleExploreInGraph}
          />
        )}

        {activeTab === 'graph' && (
          <GraphTab
            onOpenDocument={handleOpenDocument}
            selectedDocId={graphFocusDocId}
          />
        )}

        {activeTab === 'dsa' && <DsaLabTab />}

        {activeTab === 'eval' && <EvalTab />}

        {activeTab === 'corpus' && (
          <CorpusTab
            onOpenDocument={handleOpenDocument}
            onCorpusReloaded={() => fetchStats()}
          />
        )}
      </main>

      {/* Document Reader Modal */}
      <DocumentModal
        docId={openedDocId}
        onClose={() => setOpenedDocId(null)}
        onSelectRelatedDoc={(newId) => setOpenedDocId(newId)}
        onExploreInGraph={handleExploreInGraph}
      />

      {/* Footer */}
      <footer className="border-t-2 border-[var(--ink)] bg-[var(--red-deep)] py-4 text-center text-xs font-mono font-bold text-[var(--paper)] shadow-[0_-2px_0_var(--ink)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="uppercase tracking-wider">
            NEXORA • HIGH-PERFORMANCE INFORMATION RETRIEVAL ENGINE • DETERMINISTIC &amp; EXPLAINABLE
          </span>
          <span className="text-[var(--hit)]">
            Trie • Inverted Index • BM25 • Top-K Min-Heap • Graph • FIFO Queue
          </span>
        </div>
      </footer>
    </div>
  );
}
