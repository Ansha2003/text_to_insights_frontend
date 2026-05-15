'use client';

import { useState } from 'react';
import type { DashboardFilters } from '@/hooks/useDashboard';

interface DateRangeFilterProps {
  filters: DashboardFilters;
  onApply: (filters: DashboardFilters) => void;
  disabled?: boolean;
}

export function DateRangeFilter({ filters, onApply, disabled }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState(filters.start_date);
  const [endDate, setEndDate] = useState(filters.end_date);

  const handleApply = () => {
    if (startDate && endDate) {
      onApply({ start_date: startDate, end_date: endDate });
    }
  };

  return (
    <div className="dash-date-filter">
      <div className="dash-date-filter__field">
        <label className="dash-date-filter__label">Start Date</label>
        <input
          type="date"
          className="dash-date-filter__input"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="dash-date-filter__field">
        <label className="dash-date-filter__label">End Date</label>
        <input
          type="date"
          className="dash-date-filter__input"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={disabled}
        />
      </div>
      <button
        className="dash-date-filter__btn"
        onClick={handleApply}
        disabled={disabled || !startDate || !endDate}
      >
        Apply
      </button>
    </div>
  );
}
