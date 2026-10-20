import React, { useState, useEffect, useMemo } from 'react';
import { Network, Sparkles, Sliders, ExternalLink, ArrowRight, Layers, Target } from 'lucide-react';
import { GraphData, GraphNode, GraphEdge, RelatedDocResult, ReachableLevel } from '../backend/types.ts';
import { sound } from '../utils/sound.ts';

interface GraphTabProps {
  onOpenDocument: (docId: number) => void;
  selectedDocId?: number | null;
}

export const GraphTab: React.FC<GraphTabProps> = ({ onOpenDocument, selectedDocId: initialDocId }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initialDocId ?? 0);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocResult[]>([]);
  const [reachableLevels, setReachableLevels] = useState<ReachableLevel[]>([]);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [threshold, setThreshold] = useState<number>(0.05);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data: GraphData) => {
        setGraphData(data);
        if (data.threshold) {
          setThreshold(data.threshold);
        }
      })
      .catch((err) => console.error('Graph fetch error:', err));
  }, []);

  useEffect(() => {
    if (initialDocId !== undefined && initialDocId !== null) {
      setSelectedNodeId(initialDocId);
    }
  }, [initialDocId]);

  useEffect(() => {
    if (selectedNodeId === null) {
      setRelatedDocs([]);
      setReachableLevels([]);
      return;
    }

    fetch(`/api/documents/${selectedNodeId}/related?limit=6`)
      .then((res) => res.json())
      .then((data) => setRelatedDocs(data.related || []))
      .catch((err) => console.error('Related docs error:', err));

    fetch(`/api/documents/${selectedNodeId}/reachable?depth=2`)
      .then((res) => res.json())
      .then((data) => setReachableLevels(data.levels || []))
      .catch((err) => console.error('Reachable docs error:', err));
  }, [selectedNodeId]);

  const filteredEdges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.filter((e) => e.weight >= threshold);
  }, [graphData, threshold]);

  const nodePositions = useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) return new Map<number, { x: number; y: number }>();
    const positions = new Map<number, { x: number; y: number }>();
    const total = graphData.nodes.length;
    const centerX = 340;
    const centerY = 240;
    const radius = 170;

    graphData.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / total - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.set(node.id, { x, y });
    });

    return positions;
  }, [graphData]);

  const selectedNode = useMemo(() => {
    if (!graphData || selectedNodeId === null) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId);
  }, [graphData, selectedNodeId]);

  const handleSelectNode = (id: number) => {
    sound.playClick();
    setSelectedNodeId(id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Panel */}
      <div className="paper-panel p-5 max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Network className="w-6 h-6 text-[var(--red)]" />
            <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-tight text-[var(--ink)]">
              Document Relationship Graph
            </h2>
            <span className="score-badge px-2.5 py-0.5 text-[11px]">
              Cosine Sim &gt;= {threshold}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-[var(--ink)]/80 mt-1">
            Documents cluster through shared vocabulary terms. Click any vertex to inspect 1st and 2nd degree neighbors.
          </p>
        </div>

        {/* Threshold Slider in Pill */}
        <div className="flex items-center space-x-3 bg-[var(--paper)] px-4 py-2 rounded-full border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
          <Sliders className="w-4 h-4 text-[var(--ink)]" />
          <span className="text-xs font-black uppercase text-[var(--ink)]">SIM THRESHOLD:</span>
          <input
            type="range"
            min="0.02"
            max="0.20"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-28 accent-[var(--red)] cursor-pointer"
          />
          <span className="font-mono font-black text-sm text-[var(--red)]">
            {threshold.toFixed(2)}
          </span>
          <span className="text-[11px] font-bold text-[var(--ink)]/70">
            ({filteredEdges.length} edges)
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-8 paper-panel p-4 flex flex-col items-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs font-bold text-[var(--ink)]/80 mb-2 border-b-[2px] border-[var(--ink)]/20 pb-2">
            <span>Click any node to explore connections</span>
            {hoveredEdge && (
              <span className="bg-[var(--hit)] text-[var(--ink)] border-[2px] border-[var(--ink)] px-2.5 py-0.5 rounded-full font-bold">
                Cosine Sim: {hoveredEdge.weight} • Shared: {hoveredEdge.sharedTerms.slice(0, 3).join(', ')}
              </span>
            )}
          </div>

          <div className="w-full overflow-x-auto flex justify-center py-2">
            <svg width="680" height="480" className="select-none">
              {/* Edges */}
              {filteredEdges.map((edge, idx) => {
                const p1 = nodePositions.get(edge.source);
                const p2 = nodePositions.get(edge.target);
                if (!p1 || !p2) return null;

                const isConnected =
                  selectedNodeId === edge.source || selectedNodeId === edge.target;
                const strokeColor = isConnected ? '#E2261B' : '#0B0B0B';
                const strokeWidth = isConnected
                  ? Math.max(3, edge.weight * 20)
                  : Math.max(1.5, edge.weight * 10);
                const opacity = isConnected ? 1 : 0.25;

                return (
                  <g key={`${edge.source}-${edge.target}-${idx}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={opacity}
                      onMouseEnter={() => setHoveredEdge(edge)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      className="cursor-pointer transition-all hover:stroke-[var(--red)]"
                    />
                    {isConnected && (
                      <text
                        x={(p1.x + p2.x) / 2}
                        y={(p1.y + p2.y) / 2 - 4}
                        fill="#0B0B0B"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="select-none"
                      >
                        {edge.weight}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {graphData?.nodes.map((node) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                const isSelected = selectedNodeId === node.id;
                const isNeighbor =
                  selectedNodeId !== null &&
                  filteredEdges.some(
                    (e) =>
                      (e.source === selectedNodeId && e.target === node.id) ||
                      (e.target === selectedNodeId && e.source === node.id)
                  );

                const fillColor = isSelected ? '#FFD400' : isNeighbor ? '#FFFFFF' : '#0B0B0B';
                const textColor = isSelected || isNeighbor ? '#0B0B0B' : '#FFF6EC';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => handleSelectNode(node.id)}
                    className="cursor-pointer group"
                  >
                    <circle
                      r={isSelected ? 18 : isNeighbor ? 15 : 12}
                      fill={fillColor}
                      stroke="#0B0B0B"
                      strokeWidth={3}
                      className="transition-transform duration-150 group-hover:scale-125"
                    />
                    <text
                      dy="4"
                      textAnchor="middle"
                      fill={textColor}
                      fontSize="11"
                      fontWeight="900"
                      fontFamily="monospace"
                    >
                      {node.id}
                    </text>

                    {/* Label */}
                    <text
                      dy={isSelected ? 30 : 25}
                      textAnchor="middle"
                      fill="#0B0B0B"
                      fontSize="10"
                      fontFamily="system-ui"
                      fontWeight={isSelected ? '900' : '700'}
                      className="pointer-events-none drop-shadow-sm"
                    >
                      {node.title.length > 20 ? node.title.slice(0, 18) + '...' : node.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="lg:col-span-4 space-y-4">
          {selectedNode ? (
            <div className="paper-panel p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="score-badge px-2.5 py-0.5 text-xs">
                    Document #{selectedNode.id}
                  </span>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onOpenDocument(selectedNode.id);
                    }}
                    className="text-xs font-black uppercase text-[var(--red)] hover:underline flex items-center space-x-1"
                  >
                    <span>Read receipt -&gt;</span>
                  </button>
                </div>
                <h3 className="font-display text-xl text-[var(--ink)] mt-2 leading-tight">
                  {selectedNode.title}
                </h3>
                <p className="text-xs font-mono font-bold text-[var(--ink)]/70 mt-1">
                  {selectedNode.filename} • {selectedNode.length} tokens
                </p>
              </div>

              {/* Related Documents list */}
              <div className="space-y-2 pt-2 border-t-[2px] border-[var(--ink)]/20">
                <div className="flex items-center justify-between text-xs font-black uppercase text-[var(--ink)]">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--red)]" />
                    <span>Top Related Documents</span>
                  </span>
                  <span>Cosine Sim</span>
                </div>

                {relatedDocs.length === 0 ? (
                  <p className="text-xs font-bold text-[var(--ink)]/70 italic py-2">
                    No connected documents above threshold {threshold}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {relatedDocs.map((rel) => (
                      <div
                        key={rel.docId}
                        onClick={() => handleSelectNode(rel.docId)}
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
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {rel.sharedTerms.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--ink)] text-[var(--paper)]"
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

              {/* BFS Reachable levels */}
              <div className="pt-2 border-t-[2px] border-[var(--ink)]/20 space-y-2">
                <div className="flex items-center space-x-1 text-xs font-black uppercase text-[var(--ink)]">
                  <Layers className="w-4 h-4 text-[var(--red)]" />
                  <span>BFS Clusters (Depth 1 & 2)</span>
                </div>

                {reachableLevels.map((lvl) => (
                  <div
                    key={lvl.depth}
                    className="text-xs bg-amber-100/70 p-2.5 rounded-[12px] border-[2px] border-[var(--ink)]"
                  >
                    <div className="font-black text-[var(--ink)] mb-1">
                      Depth {lvl.depth} ({lvl.docs.length} nodes):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lvl.docs.map((d) => (
                        <button
                          key={d.docId}
                          onClick={() => handleSelectNode(d.docId)}
                          className="px-2 py-0.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[10px] font-bold hover:bg-[var(--hit)] hover:text-[var(--ink)] transition-colors"
                        >
                          #{d.docId} {d.title.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="paper-panel p-6 text-center text-xs font-bold text-[var(--ink)]/70">
              Select a node in the graph to view related documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
