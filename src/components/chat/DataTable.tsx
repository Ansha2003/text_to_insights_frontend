'use client';

import { useState, useMemo, useCallback } from 'react';
import type { TableData } from '@/types';

interface DataTableProps {
  data: TableData;
  pageSize?: number;
  title?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable({ 
  data, 
  pageSize = 10,
  title,
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const { columns, rows } = data;
  const totalRows = data.totalRows || rows.length;

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return rows;
    
    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      
      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortColumn, sortDirection]);

  // Paginate rows
  const displayedRows = useMemo(() => {
    if (showAll) return sortedRows;
    const start = currentPage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize, showAll]);

  // Calculate pagination info
  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const showPagination = sortedRows.length > pageSize;

  // Handle sort click
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      // Cycle: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  // Handle page change
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

  // Toggle show all
  const toggleShowAll = useCallback(() => {
    setShowAll(prev => !prev);
    setCurrentPage(0);
  }, []);

  // Format cell value for display
  const formatValue = (value: unknown): string => {
    if (value == null) return '—';
    if (typeof value === 'number') {
      // Format numbers with commas
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <div className="data-table-wrapper">
      {title && <div className="data-table__title">{title}</div>}
      
      {/* Table container with horizontal scroll */}
      <div className="data-table-container" role="region" aria-label="Data table" tabIndex={0}>
        <table className="data-table" aria-label={title || 'Query results'}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  onClick={() => handleSort(column)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(column); } }}
                  tabIndex={0}
                  className={sortColumn === column ? 'data-table__th--sorted' : ''}
                  aria-sort={
                    sortColumn === column
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  style={{ cursor: 'pointer' }}
                >
                  <span className="data-table__th-content">
                    <span className="data-table__th-text">{column}</span>
                    <SortIcon
                      direction={sortColumn === column ? sortDirection : null}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column}>
                    {formatValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination and info */}
      {(showPagination || totalRows > rows.length) && (
        <div className="data-table__footer">
          <div className="data-table__info">
            {showAll ? (
              <span>Showing all {sortedRows.length} rows</span>
            ) : (
              <span>
                Showing {currentPage * pageSize + 1}–
                {Math.min((currentPage + 1) * pageSize, sortedRows.length)} of {sortedRows.length}
                {totalRows > rows.length && ` (${totalRows} total)`}
              </span>
            )}
          </div>
          
          <div className="data-table__actions">
            {/* Show All / Show Less toggle */}
            {showPagination && (
              <button
                type="button"
                className="data-table__show-all-btn"
                onClick={toggleShowAll}
                aria-label={showAll ? 'Show fewer rows' : `Show all ${sortedRows.length} rows`}
              >
                {showAll ? 'Show Less' : 'Show All'}
              </button>
            )}
            
            {/* Pagination controls */}
            {showPagination && !showAll && (
              <div className="data-table__pagination">
                <button
                  className="data-table__page-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </button>
                <span className="data-table__page-info">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  className="data-table__page-btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sort Icon Component
function SortIcon({ direction }: { direction: SortDirection }) {
  return (
    <span className={`data-table__sort-icon ${direction ? 'data-table__sort-icon--active' : ''}`}>
      {direction === 'asc' && '↑'}
      {direction === 'desc' && '↓'}
      {!direction && '↕'}
    </span>
  );
}

// Chevron Icons
function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
