'use client';

import { useState, useCallback } from 'react';

interface SQLViewerProps {
  queries: string[];
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'NULL', 'IS', 'AS', 'GROUP', 'BY',
  'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'SUM',
  'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION',
  'WITH', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
  'BETWEEN', 'LIKE', 'EXISTS', 'ALL', 'ANY', 'TOP', 'ASC', 'DESC',
  'PARTITION', 'OVER', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NULLIF', 'COALESCE',
  'CAST', 'CONVERT', 'DATE', 'YEAR', 'MONTH', 'DAY',
];

function highlightSQL(sql: string): React.ReactNode {
  const regex = new RegExp(`\\b(${SQL_KEYWORDS.join('|')})\\b`, 'gi');
  const parts = sql.split(regex);

  return parts.map((part, i) =>
    SQL_KEYWORDS.includes(part.toUpperCase())
      ? <span key={i} className="sql-viewer__keyword">{part}</span>
      : part
  );
}

export function SQLViewer({ queries }: SQLViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentQuery = queries[currentIndex];

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentQuery);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = currentQuery;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentQuery]);

  if (!queries.length) return null;

  return (
    <div className="sql-viewer">
      {/* Toggle button */}
      <button
        type="button"
        className="sql-viewer__toggle"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="sql-viewer-content"
      >
        <span className="sql-viewer__toggle-label">
          <SQLIcon />
          View SQL Query
          {queries.length > 1 && (
            <span className="sql-viewer__count">{queries.length}</span>
          )}
        </span>
        <ChevronIcon isOpen={isExpanded} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div id="sql-viewer-content" className="sql-viewer__content" role="region" aria-label="SQL query">
          {/* Multi-query navigation */}
          {queries.length > 1 && (
            <div className="sql-viewer__nav">
              <button
                className="sql-viewer__nav-btn"
                onClick={() => setCurrentIndex((i) => i - 1)}
                disabled={currentIndex === 0}
                aria-label="Previous query"
              >
                ← Prev
              </button>
              <span className="sql-viewer__nav-label">
                Query {currentIndex + 1} of {queries.length}
              </span>
              <button
                className="sql-viewer__nav-btn"
                onClick={() => setCurrentIndex((i) => i + 1)}
                disabled={currentIndex === queries.length - 1}
                aria-label="Next query"
              >
                Next →
              </button>
            </div>
          )}

          {/* Code block */}
          <div className="sql-viewer__code-wrap">
            <button
              className="sql-viewer__copy-btn"
              onClick={handleCopy}
              aria-label="Copy SQL query"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <pre className="sql-viewer__pre">
              <code>{highlightSQL(currentQuery)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function SQLIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
