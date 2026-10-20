import React, { useState, useEffect } from 'react';
import { X, BookOpen, Network, Sparkles } from 'lucide-react';
import { Document, RelatedDocResult } from '../backend/types.ts';
import { sound } from '../utils/sound.ts';

interface DocumentModalProps {
  docId: number | null;
  onClose: () => void;
  onSelectRelatedDoc: (newDocId: number) => void;
  onExploreInGraph: (docId: number) => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  docId,
  onClose,
  onSelectRelatedDoc,
  onExploreInGraph,
}) => {
  const [doc, setDoc] = useState<Document | null>(null);
  const [related, setRelated] = useState<RelatedDocResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (docId === null) {
      setDoc(null);
      setRelated([]);
      return;
    }

    setIsLoading(true);
    fetch(`/api/documents/${docId}`)
      .then((res) => res.json())
      .then((data) => setDoc(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));

    fetch(`/api/documents/${docId}/related?limit=5`)
      .then((res) => res.json())
      .then((data) => setRelated(data.related || []))
      .catch((err) => console.error(err));
  }, [docId]);

  if (docId === null) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--ink)]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="paper-panel max-w-4xl w-full max-h-[85vh] flex flex-col shadow-[8px_8px_0_var(--ink)] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-[3px] border-[var(--ink)] flex items-center justify-between bg-[var(--hit)]">
          <div className="flex items-center space-x-3">
            <span className="w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center font-display text-base border-[2px] border-[var(--ink)]">
              #{docId}
            </span>
            <div>
              <h2 className="font-display text-xl sm:text-2xl text-[var(--ink)] leading-tight">
                {doc?.title || 'Loading receipt...'}
              </h2>
              <p className="text-xs font-mono font-bold text-[var(--ink)]/80">
                {doc?.filename} • {doc?.length} tokens
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                sound.playClick();
                onClose();
                onExploreInGraph(docId);
              }}
              className="btn-primary !text-xs !py-1.5 !px-3"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Explore Graph -&gt;</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center hover:bg-[var(--red)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y-[3px] md:divide-y-0 md:divide-x-[3px] divide-[var(--ink)]">
          {/* Document Content */}
          <div className="md:col-span-8 p-6 text-sm sm:text-base text-[var(--ink)] leading-relaxed space-y-4 font-medium whitespace-pre-line bg-[var(--paper)]">
            {isLoading ? <p>Loading content...</p> : doc?.text}
          </div>

          {/* Related Documents Sidebar */}
          <div className="md:col-span-4 p-5 bg-amber-50/70 space-y-4">
            <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-[var(--ink)]">
              <Sparkles className="w-4 h-4 text-[var(--red)]" />
              <span>Connected Receipts</span>
            </div>

            {related.length === 0 ? (
              <p className="text-xs font-bold text-[var(--ink)]/60 italic">
                No connected documents above threshold.
              </p>
            ) : (
              <div className="space-y-2.5">
                {related.map((rel) => (
                  <div
                    key={rel.docId}
                    onClick={() => {
                      sound.playClick();
                      onSelectRelatedDoc(rel.docId);
                    }}
                    className="p-3 rounded-[12px] bg-[var(--paper)] border-[2px] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--hit)] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[var(--ink)]">
                        #{rel.docId} {rel.title}
                      </span>
                      <span className="score-badge px-1.5 py-0.5 text-[10px]">
                        {rel.similarity.toFixed(4)}
                      </span>
                    </div>

                    {rel.sharedTerms.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {rel.sharedTerms.map((t) => (
                          <span
                            key={t}
                            className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[var(--ink)] text-[var(--paper)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
