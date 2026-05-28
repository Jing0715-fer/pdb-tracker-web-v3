'use client';

import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LitReport } from '@/lib/pdb-types';

type DateScale = 'all' | 'year' | 'month' | 'day';

interface LiteratureDateSidebarProps {
  reports: LitReport[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  isLoading: boolean;
  /** When true, removes own border-r and width (used inside pdb-tracker aside wrapper) */
  inline?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function LiteratureDateSidebar({
  reports,
  selectedDate,
  onSelectDate,
  isLoading,
  inline = false,
}: LiteratureDateSidebarProps) {
  const [scale, setScale] = useState<DateScale>('month');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Extract unique years from reports
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    reports.forEach(r => {
      const y = r.date.slice(0, 4);
      years.add(y);
    });
    return Array.from(years).sort().reverse();
  }, [reports]);

  const handleScaleSelect = (s: DateScale) => {
    setScale(s);
    if (s === 'all') {
      onSelectDate('');
    }
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    onSelectDate(year);
  };

  const handleMonthSelect = (year: string, month: string) => {
    setSelectedYear(year);
    onSelectDate(`${year}-${month}`);
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return;
    const y = date.getFullYear().toString();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    onSelectDate(`${y}-${m}-${d}`);
  };

  const handleClearDate = () => {
    setSelectedYear('');
    onSelectDate('');
  };

  // Parse selected date to extract parts
  const parsedDate = selectedDate ? selectedDate.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/) : null;

  // Get reports filtered by current selection
  const filteredReports = useMemo(() => {
    if (!selectedDate) return [];
    if (scale === 'year') return reports.filter(r => r.date.startsWith(selectedDate));
    if (scale === 'month') return reports.filter(r => r.date.startsWith(selectedDate));
    if (scale === 'day') return reports.filter(r => r.date === selectedDate);
    return [];
  }, [reports, selectedDate, scale]);

  return (
    <div className={`flex-shrink-0 bg-claude-surface dark:bg-[#242220] flex flex-col ${
      inline ? 'w-full' : 'w-full xl:w-[220px] border-r border-claude-border dark:border-[#3d3832]'
    }`}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-claude-border dark:border-[#3d3832] bg-claude-surface dark:bg-[#242220]">
        <div className="text-xs font-semibold text-claude-text-secondary mb-2">Reports by Date</div>

        {/* Scale toggle */}
        <div className="flex gap-0.5 bg-claude-border-light dark:bg-[#2b2926] rounded-lg p-0.5 mb-2">
          {(['all', 'year', 'month', 'day'] as DateScale[]).map(s => (
            <button
              key={s}
              onClick={() => handleScaleSelect(s)}
              className={cn(
                'flex-1 py-1 px-1 rounded-md text-[10px] font-medium transition-all duration-150 capitalize',
                scale === s
                  ? 'bg-claude-surface dark:bg-[#242220] text-claude-accent shadow-sm'
                  : 'text-claude-text-muted hover:text-claude-text'
              )}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* All scale: show summary */}
        {scale === 'all' && (
          <div className="text-center py-3">
            <div className="text-[11px] text-claude-text-muted mb-1">
              {reports.length} reports across {availableYears.length} year{availableYears.length !== 1 ? 's' : ''}
            </div>
            {selectedDate && (
              <button
                onClick={handleClearDate}
                className="text-[11px] text-claude-accent hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* Year scale: show year list */}
        {scale === 'year' && (
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {availableYears.length === 0 ? (
              <div className="text-[11px] text-claude-text-muted text-center py-2">No data</div>
            ) : (
              availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => handleYearSelect(year)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-150',
                    selectedDate === year
                      ? 'bg-claude-accent/15 text-claude-accent font-semibold border border-claude-accent/30'
                      : 'text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926]'
                  )}
                >
                  <span>{year}</span>
                  <span className="ml-auto text-[10px] text-claude-text-muted ml-2">
                    {reports.filter(r => r.date.startsWith(year)).length}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Month scale: year → month drill-down */}
        {scale === 'month' && (
          <div className="space-y-0.5">
            {!selectedYear ? (
              // Show year list
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {availableYears.map(year => {
                  const yearCount = reports.filter(r => r.date.startsWith(year)).length;
                  return (
                    <button
                      key={year}
                      onClick={() => handleYearSelect(year)}
                      className="w-full text-left px-2 py-1.5 rounded-md text-xs text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926] transition-colors flex items-center"
                    >
                      <span>{year}</span>
                      <span className="ml-auto text-[10px] text-claude-text-muted">{yearCount} reports</span>
                    </button>
                  );
                })}
              </div>
            ) : !parsedDate?.[2] || selectedDate === selectedYear ? (
              // Show month grid for selected year
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <button
                    onClick={() => { setSelectedYear(''); onSelectDate(''); }}
                    className="text-[11px] text-claude-accent hover:underline"
                  >
                    ← Back
                  </button>
                  <span className="text-[11px] font-semibold text-claude-text ml-auto">{selectedYear}</span>
                </div>
                <div className="grid grid-cols-3 gap-0.5">
                  {MONTHS.map((label, i) => {
                    const mm = (i + 1).toString().padStart(2, '0');
                    const value = `${selectedYear}-${mm}`;
                    const monthCount = reports.filter(r => r.date.startsWith(value)).length;
                    return (
                      <button
                        key={mm}
                        onClick={() => monthCount > 0 && handleMonthSelect(selectedYear, mm)}
                        className={cn(
                          'px-1 py-1 rounded text-[10px] text-center transition-colors flex flex-col items-center',
                          monthCount > 0
                            ? selectedDate === value
                              ? 'bg-claude-accent/20 text-claude-accent font-semibold border border-claude-accent/30'
                              : 'text-claude-text-secondary hover:bg-claude-border-light dark:hover:bg-[#2b2926]'
                            : 'text-claude-text-muted/40 cursor-default'
                        )}
                        title={`${label} ${selectedYear}: ${monthCount} reports`}
                      >
                        <span>{label}</span>
                        {monthCount > 0 && <span className="text-[9px] opacity-60">{monthCount}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Month is selected — show the date breadcrumb + back
              <div>
                <button
                  onClick={() => { onSelectDate(selectedYear); }}
                  className="flex items-center gap-1 text-[11px] text-claude-accent hover:underline mb-1"
                >
                  ← Back to {selectedYear}
                </button>
                <div className="text-[11px] text-claude-text font-semibold">
                  {MONTHS[parseInt(parsedDate![2]) - 1]} {parsedDate![1]}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Day scale: calendar */}
        {scale === 'day' && (
          <div className="mt-1">
            {selectedDate && parsedDate?.[3] && (
              <button
                onClick={handleClearDate}
                className="flex items-center gap-1 text-[11px] text-claude-accent hover:underline mb-1"
              >
                ← Clear
              </button>
            )}
            <Calendar
              mode="single"
              selected={
                selectedDate && parsedDate?.[3]
                  ? new Date(parseInt(parsedDate[1]), parseInt(parsedDate[2]) - 1, parseInt(parsedDate[3]))
                  : undefined
              }
              onSelect={handleDaySelect}
              classNames={{
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month: 'space-y-2',
                caption: 'flex justify-center pt-1 relative items-center text-xs',
                caption_label: 'text-xs font-medium text-claude-text',
                nav: 'space-x-1 flex items-center',
                nav_button: cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'h-6 w-6 p-0 bg-claude-surface dark:bg-[#242220] border-claude-border text-claude-text'
                ),
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-[10px] text-claude-text-muted w-6 font-normal',
                row: 'flex w-full mt-1',
                cell: 'h-6 w-6 p-0 text-center text-[11px]',
                day: cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'h-6 w-6 p-0 text-[11px] font-normal'
                ),
                day_selected: 'bg-claude-accent text-white hover:bg-claude-accent/90',
                day_today: 'text-claude-accent font-semibold',
                day_outside: 'text-claude-text-muted/40',
                day_disabled: 'text-claude-text-muted/30',
              }}
              from={new Date(2020, 0, 1)}
              to={new Date(2030, 11, 31)}
              disabled={(date) => {
                const y = date.getFullYear().toString();
                const m = (date.getMonth() + 1).toString().padStart(2, '0');
                const d = date.getDate().toString().padStart(2, '0');
                const ds = `${y}-${m}-${d}`;
                return !reports.some(r => r.date === ds);
              }}
            />
          </div>
        )}
      </div>

      {/* Report list for year/month/day when specific selection active */}
      {scale !== 'all' && selectedDate && filteredReports.length > 0 && (
        <div className="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-1">
          {filteredReports.map(report => {
            const isActive = selectedDate === report.date;
            const label = scale === 'year'
              ? report.date.slice(5) // MM-DD
              : scale === 'month'
              ? report.date.slice(8) || report.date // DD or full
              : report.date;
            return (
              <button
                key={report.id}
                onClick={() => onSelectDate(report.date)}
                className={`w-full text-left p-2.5 rounded-md transition-all duration-150 group ${
                  isActive
                    ? 'bg-claude-accent-light dark:bg-[#3d2a22] border-l-2 border-claude-accent sidebar-active-card'
                    : 'hover:bg-claude-border-light dark:hover:bg-[#2b2926] border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-semibold ${
                    isActive ? 'text-claude-accent' : 'text-claude-text'
                  }`}>
                    {label}
                  </span>
                </div>
                {report.title && (
                  <div className={`text-[10px] leading-tight truncate ${
                    isActive ? 'text-claude-accent/70' : 'text-claude-text-muted'
                  }`}>
                    {report.title}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {scale !== 'all' && selectedDate && filteredReports.length === 0 && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[11px] text-claude-text-muted text-center px-4 py-4">
            No reports for this {scale}
          </div>
        </div>
      )}
    </div>
  );
}
