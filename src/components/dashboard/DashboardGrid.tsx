'use client';

import { useEffect, useCallback } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useCustomTiles } from '@/hooks/useCustomTiles';
import { DateRangeFilter } from './DateRangeFilter';
import { KPICard } from './KPICard';
import { DonutChartPanel } from './DonutChartPanel';
import { HorizontalBarChart } from './HorizontalBarChart';
import { DealsTable } from './DealsTable';
import { PromptBar } from './PromptBar';
import { DynamicTile } from './DynamicTile';

export function DashboardGrid() {
  const { data, status, lastRefreshed, error, filters, fetchDashboard, updateFilters, refresh } = useDashboard();
  const { tiles, isGenerating, generateTile, removeTile } = useCustomTiles();

  const handlePromptSubmit = useCallback((prompt: string) => {
    generateTile(prompt, filters);
  }, [generateTile, filters]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="dash">
      {/* Header */}
      <div className="dash__header">
        <div>
          <h1 className="dash__title">Sales Overview</h1>
          <p className="dash__subtitle">Real-time sales data from Athena</p>
        </div>
        <div className="dash__header-right">
          {lastRefreshed && (
            <span className="dash__refreshed">Last refreshed: {lastRefreshed}</span>
          )}
          <button
            className="dash__refresh-btn"
            onClick={refresh}
            disabled={status === 'loading'}
            title="Refresh data"
          >
            <RefreshIcon spinning={status === 'loading'} />
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <DateRangeFilter
        filters={filters}
        onApply={updateFilters}
        disabled={status === 'loading'}
      />

      {/* Custom Tile Prompt */}
      <PromptBar onSubmit={handlePromptSubmit} isLoading={isGenerating} />

      {/* Error State */}
      {status === 'error' && (
        <div className="dash__error">
          <p>{error}</p>
          <button className="dash__retry-btn" onClick={refresh}>Retry</button>
        </div>
      )}

      {/* Loading State */}
      {status === 'loading' && (
        <div className="dash__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dash-card dash-card--skeleton">
              <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 40, width: '80%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Custom Tiles */}
      {tiles.length > 0 && (
        <div className="dash__grid">
          {tiles.map((tile) => (
            <DynamicTile key={tile.id} tile={tile} onRemove={removeTile} />
          ))}
        </div>
      )}

      {/* Fixed Tiles */}
      {status === 'success' && data && (
        <div className="dash__grid">
          <KPICard title="Total Sales" value={data.total_sales} format="currency" />
          <KPICard title="Total Files" value={data.total_files} format="number" />
          <DonutChartPanel title="Sports vs Non-Sports Sales" segments={data.sports_vs_nonsports} />
          <HorizontalBarChart title="Sales by Business Unit" items={data.sales_by_segment} />
          <HorizontalBarChart title="Top 15 Salespersons" items={data.top_salespersons} />
          <DealsTable title="Top 15 Deals" deals={data.top_deals} />
          <HorizontalBarChart title="Revenue by Sport" items={data.revenue_by_sport} />
          <HorizontalBarChart title="Revenue by Event" items={data.revenue_by_event} />
          <DonutChartPanel title="Revenue by Client Category" segments={data.revenue_by_client_category} />
        </div>
      )}
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? 'dash__spin' : ''}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
