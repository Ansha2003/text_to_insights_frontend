'use client';

import { useState, useCallback } from 'react';
import type { DashboardFilters } from './useDashboard';

export interface CustomTileData {
  id: string;
  title: string;
  chart_type: 'line' | 'bar' | 'horizontal_bar' | 'pie' | 'table';
  x_key: string;
  y_keys: string[];
  rows: Record<string, unknown>[];
  sql?: string;
  error?: string;
}

export function useCustomTiles() {
  const [tiles, setTiles] = useState<CustomTileData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTile = useCallback(async (prompt: string, filters: DashboardFilters) => {
    setIsGenerating(true);

    try {
      const res = await fetch('/api/dashboard/custom-tile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          start_date: filters.start_date,
          end_date: filters.end_date,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();

      if (json.status === 'error') {
        const errorTile: CustomTileData = {
          id: `tile_err_${Date.now()}`,
          title: 'Error',
          chart_type: 'table',
          x_key: '',
          y_keys: [],
          rows: [],
          error: json.message || 'Failed to generate tile',
          sql: json.sql,
        };
        setTiles((prev) => [errorTile, ...prev]);
      } else {
        setTiles((prev) => [json.tile, ...prev]);
      }
    } catch (err) {
      const errorTile: CustomTileData = {
        id: `tile_err_${Date.now()}`,
        title: 'Error',
        chart_type: 'table',
        x_key: '',
        y_keys: [],
        rows: [],
        error: err instanceof Error ? err.message : 'Network error',
      };
      setTiles((prev) => [errorTile, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const removeTile = useCallback((id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tiles, isGenerating, generateTile, removeTile };
}
