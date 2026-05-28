// StructureAnalysisSection.tsx
// Standalone structure analysis panel with tabs: Quality | Interactions | Contacts | Annotations | Similar | Summary

import React, { useState } from 'react';
import {
  BarChart3, Network, Link2, Bookmark, GitBranch, FileText,
} from 'lucide-react';
import { QualityMetricsSection } from './validation-table';
import {
  LigandInteractionNetwork,
  ContactsSection,
  AnnotationsSection,
  SimilaritySection,
  SummarySection,
} from './entity-panel';

interface StructureAnalysisSectionProps {
  pdbId: string;
  entities: any[];
  ligandCodes: string[];
  entityColors: Record<string, string>;
  ligandColors: Record<string, string>;
}

const TABS = [
  { id: 'quality', label: 'Quality', icon: BarChart3 },
  { id: 'interactions', label: 'Interactions', icon: Network },
  { id: 'contacts', label: 'Contacts', icon: Link2 },
  { id: 'annotations', label: 'Annotations', icon: Bookmark },
  { id: 'similar', label: 'Similar', icon: GitBranch },
  { id: 'summary', label: 'Summary', icon: FileText },
] as const;

type TabId = typeof TABS[number]['id'];

export function StructureAnalysisSection({
  pdbId,
  entities,
  ligandCodes,
  entityColors,
  ligandColors,
}: StructureAnalysisSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>('quality');

  return (
    <div className="flex flex-col rounded-lg border border-claude-border bg-claude-surface overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 pt-2 bg-claude-bg border-b border-claude-border overflow-hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-md text-[9px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-claude-surface text-claude-accent border border-claude-border border-b-claude-surface -mb-px'
                  : 'text-claude-text-muted hover:text-claude-text hover:bg-claude-border-light'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="p-3 min-h-[300px] max-h-[400px] overflow-y-auto custom-scrollbar">
        {activeTab === 'quality' && (
          <QualityMetricsSection pdbId={pdbId} />
        )}
        {activeTab === 'interactions' && (
          <LigandInteractionNetwork
            pdbId={pdbId}
            entities={entities}
            ligandCodes={ligandCodes}
            entityColors={entityColors}
            ligandColors={ligandColors}
          />
        )}
        {activeTab === 'contacts' && (
          <ContactsSection
            pdbId={pdbId}
            entities={entities}
            ligandCodes={ligandCodes}
            entityColors={entityColors}
            ligandColors={ligandColors}
          />
        )}
        {activeTab === 'annotations' && (
          <AnnotationsSection
            pdbId={pdbId}
            entities={entities}
            ligandCodes={ligandCodes}
            entityColors={entityColors}
            ligandColors={ligandColors}
          />
        )}
        {activeTab === 'similar' && (
          <SimilaritySection pdbId={pdbId} />
        )}
        {activeTab === 'summary' && (
          <SummarySection
            entities={entities}
            ligandCodes={ligandCodes}
            pdbId={pdbId}
          />
        )}
      </div>
    </div>
  );
}