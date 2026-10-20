import React, { useState } from 'react';
import { Search, Network, Cpu, Trophy, Files, Volume2, VolumeX, Share2, Check, ArrowRight } from 'lucide-react';
import { ServiceStats } from '../backend/searchService.ts';
import { sound } from '../utils/sound.ts';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: ServiceStats | null;
  mode: 'OR' | 'AND';
  setMode: (m: 'OR' | 'AND') => void;
  ranking: 'BM25' | 'TF';
  setRanking: (r: 'BM25' | 'TF') => void;
  k: number;
  setK: (k: number) => void;
  useQueue: boolean;
  setUseQueue: (q: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  mode,
  setMode,
  ranking,
  setRanking,
  k,
  setK,
  useQueue,
  setUseQueue,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedShare, setCopiedShare] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playClick();
  };

  const handleShare = () => {
    sound.playClick();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleTabClick = (tabId: string) => {
    sound.playClick();
    setActiveTab(tabId);
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--red)] border-b-[3px] border-[var(--ink)] shadow-[0_4px_0_var(--ink)]">
      {/* Top kicker and quick links bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--paper)]">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[var(--hit)] inline-block animate-pulse"></span>
          <span className="tracking-[0.14em] text-[11px] drop-shadow-sm">
            Big Claims. Zero Receipts. We Checked.
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Sound Toggle per DESIGN.md: "Label shows state in words: Sound: On / Sound: Off" */}
          <button
            onClick={toggleSound}
            aria-label={`Sound toggle, currently ${soundEnabled ? 'On' : 'Off'}`}
            className="flex items-center space-x-1.5 hover:underline focus-visible:outline-[3px] focus-visible:outline-[var(--hit)] focus-visible:outline-offset-2 text-[11px] font-bold"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sound: On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-white/70" />
                <span>Sound: Off</span>
              </>
            )}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center space-x-1 hover:underline text-[11px] font-bold focus-visible:outline-[3px] focus-visible:outline-[var(--hit)]"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-[var(--hit)]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedShare ? 'Copied Link!' : 'Share'}</span>
          </button>

          {/* Receipts shortcut */}
          <button
            onClick={() => handleTabClick('corpus')}
            className="hover:underline text-[11px] font-bold focus-visible:outline-[3px] focus-visible:outline-[var(--hit)]"
          >
            Receipts (12)
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div
          onClick={() => handleTabClick('search')}
          className="cursor-pointer select-none group flex items-center space-x-2.5"
        >
          <div className="px-2.5 py-0.5 bg-[var(--ink)] text-[var(--hit)] font-display text-2xl uppercase tracking-tighter border-[2px] border-[var(--ink)] rounded-md shadow-[2px_2px_0_var(--paper)] group-hover:rotate-1 transition-transform">
            NEXORA
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--hit)] text-[var(--ink)] border-[2px] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
              IR ENGINE
            </span>
          </div>
        </div>

        {/* Neo-brutalist Pill Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {[
            { id: 'search', label: 'Search' },
            { id: 'graph', label: 'Graph' },
            { id: 'dsa', label: 'DSA Lab' },
            { id: 'eval', label: 'Scoreboard' },
            { id: 'corpus', label: 'Receipts' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                aria-selected={isActive}
                className={`tab-pill ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Engine Controls Strip */}
      <div className="bg-[var(--red-deep)] border-t-[2px] border-[var(--ink)] py-1.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode: OR / AND */}
            <div className="flex items-center space-x-1 bg-[var(--paper)] text-[var(--ink)] px-2 py-0.5 rounded-full border-[2px] border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)]">
              <span className="text-[var(--ink)] opacity-70">MATCH:</span>
              <button
                onClick={() => {
                  sound.playClick();
                  setMode('OR');
                }}
                className={`px-1.5 rounded-full ${mode === 'OR' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                OR
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setMode('AND');
                }}
                className={`px-1.5 rounded-full ${mode === 'AND' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                AND
              </button>
            </div>

            {/* Ranking Model */}
            <div className="flex items-center space-x-1 bg-[var(--paper)] text-[var(--ink)] px-2 py-0.5 rounded-full border-[2px] border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)]">
              <span className="text-[var(--ink)] opacity-70">RANK:</span>
              <button
                onClick={() => {
                  sound.playClick();
                  setRanking('BM25');
                }}
                className={`px-1.5 rounded-full ${ranking === 'BM25' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                BM25
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setRanking('TF');
                }}
                className={`px-1.5 rounded-full ${ranking === 'TF' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                TF
              </button>
            </div>

            {/* Top-K Selector */}
            <div className="flex items-center space-x-1 bg-[var(--paper)] text-[var(--ink)] px-2 py-0.5 rounded-full border-[2px] border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)]">
              <span className="text-[var(--ink)] opacity-70">TOP-K:</span>
              {[1, 3, 5, 8, 12].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    sound.playClick();
                    setK(num);
                  }}
                  className={`px-1.5 rounded-full ${k === num ? 'bg-[var(--ink)] text-[var(--paper)] font-black' : 'hover:opacity-100 opacity-60'}`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* FIFO Queue Toggle */}
            <label className="flex items-center space-x-1.5 cursor-pointer bg-[var(--paper)] text-[var(--ink)] px-2.5 py-0.5 rounded-full border-[2px] border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)]">
              <input
                type="checkbox"
                checked={useQueue}
                onChange={(e) => {
                  sound.playClick();
                  setUseQueue(e.target.checked);
                }}
                className="w-3.5 h-3.5 accent-[var(--ink)]"
              />
              <span>FIFO QUEUE</span>
            </label>
          </div>

          {/* Quick stats on the right */}
          {stats && (
            <div className="hidden md:flex items-center space-x-2 font-mono text-[11px] text-[var(--paper)] font-bold">
              <span>{stats.documentCount} DOCS</span>
              <span>/</span>
              <span>{stats.vocabularySize} TERMS</span>
              <span>/</span>
              <span>{stats.graphEdges} EDGES</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
