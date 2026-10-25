import React, { useState } from 'react';
import { Volume2, VolumeX, Share2, Check, Menu, X, SlidersHorizontal } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'search', label: 'Search' },
    { id: 'graph', label: 'Graph' },
    { id: 'dsa', label: 'DSA Lab' },
    { id: 'eval', label: 'Scoreboard' },
    { id: 'corpus', label: 'Corpus' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--red)] border-b-2 border-[var(--ink)] shadow-[0_2px_0_var(--ink)]">
      {/* Top micro-bar */}
      <div className="bg-[var(--red-deep)] border-b border-[var(--ink)]/40 py-1 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between text-[11px] font-semibold text-[var(--paper)]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[var(--hit)] inline-block"></span>
            <span className="tracking-wide">
              Information Retrieval Engine • Search a curated document set
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSound}
              aria-label={`Sound toggle, currently ${soundEnabled ? 'On' : 'Off'}`}
              className="flex items-center space-x-1.5 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--hit)] text-[11px] font-bold"
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

            <button
              onClick={handleShare}
              className="flex items-center space-x-1 hover:underline text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-[var(--hit)]"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-[var(--hit)]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'Copied Link' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar — single row on desktop */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => handleTabClick('search')}
          className="cursor-pointer select-none flex items-center space-x-2.5"
        >
          <div className="px-2.5 py-0.5 bg-[var(--ink)] text-[var(--hit)] font-display text-2xl uppercase tracking-tight border-2 border-[var(--ink)] rounded-md shadow-[2px_2px_0_var(--paper)]">
            NEXORA
          </div>
          <span className="hidden sm:inline text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--hit)] text-[var(--ink)] border-2 border-[var(--ink)]">
            IR ENGINE
          </span>
        </div>

        {/* Desktop Navigation Tabs — single clean row */}
        <nav className="hidden md:flex items-center space-x-1.5">
          {navItems.map((tab) => {
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

        {/* Mobile menu toggle button */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={() => {
              sound.playClick();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            aria-label="Toggle navigation menu"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--paper)] text-[var(--ink)] border-2 border-[var(--ink)] rounded-full text-xs font-bold shadow-[2px_2px_0_var(--ink)]"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="uppercase">{activeTab}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[var(--ink)] bg-[var(--paper)] p-4 space-y-2 shadow-[0_4px_0_var(--ink)] animate-in fade-in duration-100">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`tab-pill !w-full justify-center ${isActive ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Engine Controls Strip — aligned to 1200px container */}
      <div className="bg-[var(--red-deep)] border-t border-[var(--ink)] py-2 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center space-x-1 text-[var(--paper)] font-bold text-[11px] uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </span>

            {/* Match Mode: OR / AND */}
            <div className="inline-flex items-center h-8 bg-[var(--paper)] text-[var(--ink)] px-2 rounded-full border-2 border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)]">
              <span className="opacity-70 mr-1 text-[10px]">MATCH:</span>
              <button
                onClick={() => {
                  sound.playClick();
                  setMode('OR');
                }}
                className={`px-2 py-0.5 rounded-full transition-colors ${mode === 'OR' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                OR
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setMode('AND');
                }}
                className={`px-2 py-0.5 rounded-full transition-colors ${mode === 'AND' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                AND
              </button>
            </div>

            {/* Ranking Model: BM25 / TF */}
            <div className="inline-flex items-center h-8 bg-[var(--paper)] text-[var(--ink)] px-2 rounded-full border-2 border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)]">
              <span className="opacity-70 mr-1 text-[10px]">RANK:</span>
              <button
                onClick={() => {
                  sound.playClick();
                  setRanking('BM25');
                }}
                className={`px-2 py-0.5 rounded-full transition-colors ${ranking === 'BM25' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                BM25
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setRanking('TF');
                }}
                className={`px-2 py-0.5 rounded-full transition-colors ${ranking === 'TF' ? 'bg-[var(--hit)] text-[var(--ink)] font-black' : 'hover:opacity-100 opacity-60'}`}
              >
                TF
              </button>
            </div>

            {/* Top-K Selector */}
            <div className="inline-flex items-center h-8 bg-[var(--paper)] text-[var(--ink)] px-2 rounded-full border-2 border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)]">
              <span className="opacity-70 mr-1 text-[10px]">TOP-K:</span>
              {[1, 3, 5, 8, 12].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    sound.playClick();
                    setK(num);
                  }}
                  className={`px-1.5 py-0.5 rounded-full transition-colors ${k === num ? 'bg-[var(--ink)] text-[var(--paper)] font-black' : 'hover:opacity-100 opacity-60'}`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* FIFO Queue Toggle */}
            <label className="inline-flex items-center h-8 space-x-1.5 cursor-pointer bg-[var(--paper)] text-[var(--ink)] px-3 rounded-full border-2 border-[var(--ink)] font-extrabold text-[11px] shadow-[2px_2px_0_var(--ink)] select-none">
              <input
                type="checkbox"
                checked={useQueue}
                onChange={(e) => {
                  sound.playClick();
                  setUseQueue(e.target.checked);
                }}
                className="w-3.5 h-3.5 accent-[var(--ink)] cursor-pointer"
              />
              <span>FIFO QUEUE</span>
            </label>
          </div>

          {/* Quick stats on desktop */}
          {stats && (
            <div className="hidden lg:flex items-center space-x-2 font-mono text-[11px] text-[var(--paper)] font-bold">
              <span>{stats.documentCount} DOCS</span>
              <span className="opacity-60">•</span>
              <span>{stats.vocabularySize} TERMS</span>
              <span className="opacity-60">•</span>
              <span>{stats.graphEdges} EDGES</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
