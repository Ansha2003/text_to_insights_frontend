import type { TableData, ChartData, FileData, ParsedContent } from '@/types';

// ============================================================================
// Response Content Detection
// ============================================================================

/**
 * Attempt to detect if text content contains structured data (table/chart)
 * This handles cases where the agent returns JSON within text
 */
export function detectStructuredContent(text: string): ParsedContent | null {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      
      // Check for table structure
      if (isTableData(parsed)) {
        return {
          type: 'table',
          table: normalizeTableData(parsed),
        };
      }
      
      // Check for chart structure
      if (isChartData(parsed)) {
        return {
          type: 'chart',
          chart: normalizeChartData(parsed),
        };
      }
    } catch {
      // Not valid JSON, continue as text
    }
  }
  
  return null;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if data looks like table data
 */
export function isTableData(data: unknown): data is Partial<TableData> {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  
  // Check for explicit columns + rows structure
  if (Array.isArray(obj.columns) && Array.isArray(obj.rows)) {
    return true;
  }
  
  // Check for array of objects (implicit table)
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    return true;
  }
  
  return false;
}

/**
 * Check if data looks like chart data
 */
export function isChartData(data: unknown): data is Partial<ChartData> {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  
  // Check for chart type indicator
  if (obj.type && ['bar', 'line', 'pie', 'area', 'scatter'].includes(obj.type as string)) {
    return true;
  }
  
  // Check for chart-specific properties
  if (obj.xKey || obj.yKey || obj.chartData) {
    return true;
  }
  
  return false;
}

/**
 * Check if data looks like file data
 */
export function isFileData(data: unknown): data is Partial<FileData> {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  
  return !!(obj.url || obj.download_url || obj.file_url);
}

// ============================================================================
// Data Normalization
// ============================================================================

/**
 * Normalize table data to consistent format
 */
export function normalizeTableData(data: unknown): TableData {
  // Array of objects
  if (Array.isArray(data) && data.length > 0) {
    const firstRow = data[0];
    const columns = Object.keys(firstRow as Record<string, unknown>);
    return {
      columns,
      rows: data as Record<string, unknown>[],
      totalRows: data.length,
    };
  }
  
  // Already structured
  const obj = data as Partial<TableData>;
  return {
    columns: obj.columns || [],
    rows: obj.rows || [],
    totalRows: obj.totalRows ?? (obj.rows?.length || 0),
  };
}

/**
 * Normalize chart data to consistent format
 */
export function normalizeChartData(data: unknown): ChartData {
  const obj = data as Partial<ChartData> & { chartData?: Record<string, unknown>[] };
  
  return {
    type: obj.type || 'bar',
    data: obj.data || obj.chartData || [],
    xKey: obj.xKey || 'x',
    yKey: obj.yKey || 'y',
    title: obj.title,
    xLabel: obj.xLabel,
    yLabel: obj.yLabel,
  };
}

/**
 * Normalize file data to consistent format
 */
export function normalizeFileData(data: unknown): FileData {
  const obj = data as Record<string, unknown>;
  
  return {
    name: (obj.name || obj.filename || 'download') as string,
    url: (obj.url || obj.download_url || obj.file_url || '') as string,
    size: (obj.size || obj.file_size || 0) as number,
    mimeType: (obj.mimeType || obj.mime_type || obj.contentType || 'application/octet-stream') as string,
  };
}

// ============================================================================
// SQL Query Extraction
// ============================================================================

/**
 * Extract SQL queries from text content
 */
export function extractSqlQueries(text: string): string[] {
  const queries: string[] = [];
  
  // Match SQL code blocks
  const sqlBlockRegex = /```(?:sql)?\s*([\s\S]*?)```/gi;
  let match;
  
  while ((match = sqlBlockRegex.exec(text)) !== null) {
    const query = match[1].trim();
    if (isSqlQuery(query)) {
      queries.push(query);
    }
  }
  
  return queries;
}

/**
 * Basic check if text looks like a SQL query
 */
function isSqlQuery(text: string): boolean {
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'WITH'];
  const upperText = text.toUpperCase().trim();
  return sqlKeywords.some(keyword => upperText.startsWith(keyword));
}

// ============================================================================
// Content Formatting
// ============================================================================

/**
 * Format a number for display
 */
export function formatNumber(value: unknown): string {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
  return String(value);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
