'use client';

import { useState, useCallback } from 'react';

export interface DashboardFilters {
  start_date: string;
  end_date: string;
}

interface SegmentItem {
  label: string;
  value: number;
}

interface DealItem {
  file_name: string;
  file_owner_name: string;
  billing_amount: number;
}

export interface DashboardData {
  total_sales: number;
  total_files: number;
  sports_vs_nonsports: SegmentItem[];
  sales_by_segment: SegmentItem[];
  top_salespersons: SegmentItem[];
  top_deals: DealItem[];
  revenue_by_sport: SegmentItem[];
  revenue_by_event: SegmentItem[];
  revenue_by_client_category: SegmentItem[];
}

export type DashboardStatus = 'idle' | 'loading' | 'success' | 'error';

function getDefaultFilters(): DashboardFilters {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    start_date: `${year}-01-01`,
    end_date: `${year}-${month}-${day}`,
  };
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<DashboardStatus>('idle');
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<DashboardFilters>(getDefaultFilters);

  const fetchDashboard = useCallback(async (f?: DashboardFilters) => {
    const activeFilters = f || filters;
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/dashboard/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeFilters),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      if (json.status !== 'success') {
        throw new Error(json.message || 'Unknown error');
      }

      setData(json.data);
      setLastRefreshed(json.last_refreshed);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setStatus('error');
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters);
    fetchDashboard(newFilters);
  }, [fetchDashboard]);

  const refresh = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, status, lastRefreshed, error, filters, fetchDashboard, updateFilters, refresh };
}
