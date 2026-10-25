import React, { useState, useEffect } from 'react';
import { Files, FilePlus, RefreshCw, BookOpen, Check, Sparkles, ArrowRight } from 'lucide-react';
import { Document } from '../backend/types.ts';
import { sound } from '../utils/sound.ts';

interface CorpusTabProps {
  onOpenDocument: (docId: number) => void;
  onCorpusReloaded: () => void;
}

export const CorpusTab: React.FC<CorpusTabProps> = ({ onOpenDocument, onCorpusReloaded }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleReloadCorpus = async () => {
    setIsReloading(true);
    setStatusMessage(null);
    sound.playHit();
    try {
      const res = await fetch('/api/corpus/reload', { method: 'POST' });
      const data = await res.json();
      setStatusMessage(`Reloaded ${data.loaded} documents. Deduplicated & skipped ${data.duplicates} duplicates.`);
      fetchDocuments();
      onCorpusReloaded();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsReloading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    sound.playHit();

    try {
      const filename = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const formattedContent = newContent.startsWith('# ')
        ? newContent
        : `# ${newTitle}\n\n${newContent}`;

      const res = await fetch('/api/documents/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `${filename}.md`,
          content: formattedContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Successfully indexed "${data.filename}"!`);
        setIsAddingDoc(false);
        setNewTitle('');
        setNewContent('');
        fetchDocuments();
        onCorpusReloaded();
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 pb-12">
      {/* Header Panel */}
      <div className="paper-panel p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Files className="w-7 h-7 text-[var(--red)]" />
            <h2 className="font-display text-3xl sm:text-4xl uppercase text-[var(--ink)]">
              CORPUS REPOSITORY
            </h2>
            <span className="score-badge px-3 py-0.5 text-xs">
              {documents.length} Verified Documents
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
            Every document has a stable deterministic ID based on sorted paths. Token-stream fingerprinting prevents duplicate indexing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              sound.playClick();
              setIsAddingDoc(!isAddingDoc);
            }}
            className="btn-primary !text-xs !py-2.5 !px-5"
          >
            <FilePlus className="w-4 h-4" />
            <span>{isAddingDoc ? 'Cancel' : 'Add Document -&gt;'}</span>
          </button>

          <button
            onClick={handleReloadCorpus}
            disabled={isReloading}
            className="btn-secondary !text-xs !py-2.5 !px-4"
          >
            <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-[var(--hit)] border-[3px] border-[var(--ink)] rounded-[16px] text-xs font-mono font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
          {statusMessage}
        </div>
      )}

      {/* Add Document Form */}
      {isAddingDoc && (
        <form onSubmit={handleCreateDocument} className="paper-panel p-6 space-y-4">
          <h3 className="font-display text-2xl uppercase text-[var(--ink)]">
            Index New Document
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-[var(--ink)]">Document Title:</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus in Paxos"
              className="w-full bg-white border-[3px] border-[var(--ink)] p-3 rounded-[12px] text-sm font-bold text-[var(--ink)] focus:outline-none focus:ring-4 focus:ring-[var(--hit)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-[var(--ink)]">Markdown Content:</label>
            <textarea
              required
              rows={6}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Paste factual document text..."
              className="w-full bg-white border-[3px] border-[var(--ink)] p-3 rounded-[12px] text-sm font-bold text-[var(--ink)] focus:outline-none focus:ring-4 focus:ring-[var(--hit)]"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsAddingDoc(false)}
              className="btn-secondary !text-xs !py-2 !px-4"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary !text-xs !py-2.5 !px-5">
              Index Into Engine -&gt;
            </button>
          </div>
        </form>
      )}

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="paper-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-[var(--ink)] text-[var(--paper)] font-display text-xs flex items-center justify-center">
                  #{doc.id}
                </span>
                <span className="score-badge px-2 py-0.5 text-[10px]">
                  {doc.length} tokens
                </span>
              </div>

              <h4 className="font-display text-xl text-[var(--ink)] mt-2 leading-tight">
                {doc.title}
              </h4>
              <p className="text-xs font-mono font-bold text-[var(--ink)]/60 mt-1 truncate">
                {doc.filename}
              </p>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onOpenDocument(doc.id);
              }}
              className="btn-secondary !text-xs !py-2 !w-full justify-center"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--red)]" />
              <span>Read Document -&gt;</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
