'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, X } from 'lucide-react';
import type { LitPaper } from '@/lib/pdb-types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  pmid: string;
  title: string;
  journal: string;
  IF: number | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  methodColor: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'pdb' | 'keyword' | 'author';
  weight: number;
  sharedItems: string[];
}

interface LiteratureCitationNetworkProps {
  papers: LitPaper[];
  onClose?: () => void;
}

// ─── Edge type colors ─────────────────────────────────────────────────────────

const EDGE_COLORS = {
  pdb: '#2d8f8f',     // teal (cryo-em)
  keyword: '#7c5cbf', // purple (xray)
  author: '#c9872e',  // amber (nmr)
};

const EDGE_COLORS_DARK = {
  pdb: '#3db5b5',
  keyword: '#9b7ed8',
  author: '#d9a24e',
};

// ─── Helper: get method color for node ────────────────────────────────────────

function getNodeMethodColor(paper: LitPaper): string {
  const methods = paper.pdbs.map(p => p.method || '');
  if (methods.some(m => m.toLowerCase().includes('cryo'))) return '#2d8f8f';
  if (methods.some(m => m.toLowerCase().includes('x-ray') || m.toLowerCase().includes('xray'))) return '#7c5cbf';
  if (methods.some(m => m.toLowerCase().includes('nmr'))) return '#c9872e';
  return '#c96442'; // default accent
}

// ─── Build adjacency ──────────────────────────────────────────────────────────

function buildGraph(papers: LitPaper[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Limit to top 20 by IF
  const topPapers = [...papers]
    .filter(p => p.IF != null)
    .sort((a, b) => (b.IF ?? 0) - (a.IF ?? 0))
    .slice(0, 20);

  if (topPapers.length === 0) {
    // fallback: use first 20 papers regardless of IF
    const fallback = papers.slice(0, 20);
    return buildGraphFromPapers(fallback);
  }

  return buildGraphFromPapers(topPapers);
}

function buildGraphFromPapers(papers: LitPaper[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const n = papers.length;
  const centerX = 400;
  const centerY = 300;
  const radius = Math.min(200, n * 10);

  // Initialize nodes in a circle
  const nodes: GraphNode[] = papers.map((p, i) => ({
    pmid: p.pmid,
    title: p.title || '',
    journal: p.journal || '',
    IF: p.IF,
    x: centerX + radius * Math.cos((2 * Math.PI * i) / n),
    y: centerY + radius * Math.sin((2 * Math.PI * i) / n),
    vx: 0,
    vy: 0,
    methodColor: getNodeMethodColor(p),
  }));

  const edges: GraphEdge[] = [];
  const edgeMap = new Map<string, GraphEdge>();

  // Build edges from shared PDB IDs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = papers[i];
      const b = papers[j];

      // Shared PDB IDs
      const aPdbs = new Set(a.pdbs.map(p => p.pdbId));
      const sharedPdbs = b.pdbs.filter(p => aPdbs.has(p.pdbId)).map(p => p.pdbId);
      if (sharedPdbs.length > 0) {
        const key = `${a.pmid}-${b.pmid}-pdb`;
        edgeMap.set(key, {
          source: a.pmid,
          target: b.pmid,
          type: 'pdb',
          weight: sharedPdbs.length,
          sharedItems: sharedPdbs,
        });
      }

      // Shared keywords
      const aKw = new Set(a.keywords || []);
      const sharedKw = (b.keywords || []).filter(k => aKw.has(k));
      if (sharedKw.length > 0) {
        const key = `${a.pmid}-${b.pmid}-keyword`;
        edgeMap.set(key, {
          source: a.pmid,
          target: b.pmid,
          type: 'keyword',
          weight: sharedKw.length,
          sharedItems: sharedKw,
        });
      }

      // Shared authors
      const aAuthors = new Set((a.authors || '').split(/[,;]/).map(s => s.trim()).filter(Boolean));
      const sharedAuthors = (b.authors || '').split(/[,;]/).map(s => s.trim()).filter(a2 => aAuthors.has(a2));
      if (sharedAuthors.length > 0) {
        const key = `${a.pmid}-${b.pmid}-author`;
        edgeMap.set(key, {
          source: a.pmid,
          target: b.pmid,
          type: 'author',
          weight: sharedAuthors.length,
          sharedItems: sharedAuthors,
        });
      }
    }
  }

  edges.push(...edgeMap.values());

  // Simple force simulation: 50 iterations
  for (let iter = 0; iter < 50; iter++) {
    const alpha = 1 - iter / 50; // decay

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (800 * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const src = nodes.find(n => n.pmid === edge.source);
      const tgt = nodes.find(n => n.pmid === edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 120;
      const force = ((dist - idealDist) * 0.05 * alpha * edge.weight);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    // Apply velocity with damping
    for (const node of nodes) {
      node.vx *= 0.6;
      node.vy *= 0.6;
      node.x += node.vx;
      node.y += node.vy;

      // Keep within bounds
      node.x = Math.max(60, Math.min(740, node.x));
      node.y = Math.max(60, Math.min(540, node.y));
    }
  }

  return { nodes, edges };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiteratureCitationNetwork({ papers, onClose }: LiteratureCitationNetworkProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { nodes, edges } = useMemo(() => buildGraph(papers), [papers]);

  // Filter edges for selected node
  const relevantEdges = useMemo(() => {
    if (!selectedNode) return edges;
    return edges.filter(e => e.source === selectedNode || e.target === selectedNode);
  }, [edges, selectedNode]);

  // Connected nodes to selected
  const connectedNodes = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const s = new Set<string>();
    s.add(selectedNode);
    for (const e of relevantEdges) {
      s.add(e.source);
      s.add(e.target);
    }
    return s;
  }, [relevantEdges, selectedNode]);

  const handleNodeClick = useCallback((pmid: string) => {
    setSelectedNode(prev => prev === pmid ? null : pmid);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedNode(null);
    setHoveredNode(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(3, z + 0.2)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.3, z - 0.2)), []);

  // Pan with mouse drag on SVG background
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'circle') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Node size based on IF
  const getNodeRadius = (IF: number | null) => {
    if (IF == null) return 8;
    if (IF >= 30) return 18;
    if (IF >= 20) return 15;
    if (IF >= 10) return 12;
    if (IF >= 5) return 10;
    return 8;
  };

  // Edge thickness based on weight
  const getEdgeWidth = (weight: number) => Math.max(1, Math.min(4, weight));

  const hoveredPaper = useMemo(() => {
    if (!hoveredNode) return null;
    return papers.find(p => p.pmid === hoveredNode);
  }, [hoveredNode, papers]);

  if (nodes.length < 2) {
    return (
      <div className="flex items-center justify-center h-80 text-claude-text-muted text-sm">
        Need at least 2 papers with IF data to build citation network
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="relative rounded-xl border border-claude-border dark:border-[#3d3832] bg-white dark:bg-[#1a1917] overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-claude-border dark:border-[#3d3832] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-claude-text">Citation Network</span>
          <span className="text-[10px] text-claude-text-muted">
            {nodes.length} papers · {edges.length} connections
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-1 rounded hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-text transition-colors" title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-claude-text-muted font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1 rounded hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-text transition-colors" title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleReset} className="p-1 rounded hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-text transition-colors" title="Reset view">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-text transition-colors" title="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Graph */}
      <div className="relative" style={{ height: 500 }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {/* Arrow marker */}
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#c96442" fillOpacity="0.5" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {relevantEdges.map((edge, i) => {
              const src = nodes.find(n => n.pmid === edge.source);
              const tgt = nodes.find(n => n.pmid === edge.target);
              if (!src || !tgt) return null;

              const isHighlighted = selectedNode != null && (edge.source === selectedNode || edge.target === selectedNode);
              const isDimmed = selectedNode != null && !isHighlighted;

              return (
                <line
                  key={`edge-${i}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={EDGE_COLORS[edge.type]}
                  strokeWidth={getEdgeWidth(edge.weight)}
                  strokeOpacity={isDimmed ? 0.1 : isHighlighted ? 0.7 : 0.3}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode === node.pmid;
              const isConnected = connectedNodes.has(node.pmid);
              const isDimmed = selectedNode != null && !isConnected;
              const isHovered = hoveredNode === node.pmid;
              const radius = getNodeRadius(node.IF);

              return (
                <g key={node.pmid}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + (isHovered ? 3 : isSelected ? 2 : 0)}
                    fill={node.methodColor}
                    fillOpacity={isDimmed ? 0.15 : isHovered || isSelected ? 0.9 : 0.6}
                    stroke={isSelected ? '#c96442' : isHovered ? '#fff' : node.methodColor}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.5}
                    strokeOpacity={isDimmed ? 0.1 : 1}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => handleNodeClick(node.pmid)}
                    onMouseEnter={() => setHoveredNode(node.pmid)}
                    onMouseLeave={() => setHoveredNode(null)}
                  />
                  {/* IF label on larger nodes */}
                  {radius >= 10 && !isDimmed && (
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-white text-[7px] font-bold pointer-events-none select-none"
                      style={{ fontSize: '7px' }}
                    >
                      {node.IF != null ? node.IF.toFixed(0) : ''}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredNode && hoveredPaper && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute top-3 left-3 max-w-[260px] rounded-lg bg-white dark:bg-[#2b2926] shadow-lg border border-claude-border dark:border-[#3d3832] p-3 pointer-events-none z-10"
            >
              <div className="text-xs font-semibold text-claude-text leading-snug line-clamp-2 mb-1">
                {hoveredPaper.title || 'Untitled'}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-claude-text-muted">
                {hoveredPaper.journal && <span>{hoveredPaper.journal}</span>}
                {hoveredPaper.IF != null && (
                  <span className="font-bold text-claude-accent">IF {hoveredPaper.IF.toFixed(1)}</span>
                )}
              </div>
              {/* Shared items count */}
              {selectedNode && selectedNode !== hoveredNode && (
                <div className="mt-1.5 pt-1.5 border-t border-claude-border dark:border-[#3d3832] space-y-0.5">
                  {relevantEdges
                    .filter(e => (e.source === hoveredNode && e.target === selectedNode) || (e.source === selectedNode && e.target === hoveredNode))
                    .map((e, i) => (
                      <div key={i} className="text-[9px] text-claude-text-secondary flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: EDGE_COLORS[e.type] }} />
                        <span className="capitalize">{e.type}</span>: {e.sharedItems.slice(0, 3).join(', ')}{e.sharedItems.length > 3 ? ` +${e.sharedItems.length - 3}` : ''}
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-claude-border dark:border-[#3d3832] flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-medium text-claude-text-muted uppercase tracking-wider">Edge Types:</span>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-claude-text-secondary capitalize">{type === 'pdb' ? 'Shared PDB' : type === 'keyword' ? 'Shared Keywords' : 'Shared Authors'}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-claude-text-muted">Node size = IF value</span>
        </div>
      </div>

      {/* Selected node info */}
      <AnimatePresence>
        {selectedNode && (() => {
          const paper = papers.find(p => p.pmid === selectedNode);
          if (!paper) return null;
          const connCount = relevantEdges.filter(e => e.source === selectedNode || e.target === selectedNode).length;
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 border-t border-claude-border dark:border-[#3d3832] bg-claude-accent/5 dark:bg-claude-accent/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-claude-text leading-snug line-clamp-1">{paper.title}</div>
                  <div className="text-[10px] text-claude-text-muted mt-0.5">
                    {paper.journal} · IF {paper.IF?.toFixed(1) || 'N/A'} · {connCount} connection{connCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded hover:bg-claude-border-light dark:hover:bg-[#2b2926] text-claude-text-muted hover:text-claude-text transition-colors flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
