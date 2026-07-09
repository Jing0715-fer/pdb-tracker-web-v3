'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Filter, Database, CalendarDays, TrendingUp, SearchCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedEmptyState } from '@/components/enhanced-empty-state';

interface LiteratureEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function LiteratureEmptyState({ hasFilters = true, onClearFilters }: LiteratureEmptyStateProps) {
  return (
    <EnhancedEmptyState
      icon={<BookOpen className="h-10 w-10" />}
      title="No papers found"
      description={
        hasFilters
          ? 'No papers match your current filters. Try adjusting your search criteria or clearing some filters.'
          : 'There are no papers in the database yet. Papers will appear here once they are added.'
      }
      accentColor="#7c5cbf"
      action={
        hasFilters && onClearFilters
          ? { label: 'Clear all filters', onClick: onClearFilters, icon: <Filter className="h-4 w-4" /> }
          : undefined
      }
      suggestions={[
        { icon: <CalendarDays className="h-3.5 w-3.5" />, text: 'Remove date filter' },
        { icon: <TrendingUp className="h-3.5 w-3.5" />, text: 'Lower IF threshold' },
        { icon: <SearchCheck className="h-3.5 w-3.5" />, text: 'Broaden search' },
      ]}
    />
  );
}
