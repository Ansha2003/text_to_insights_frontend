'use client';

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { CustomTileData } from '@/hooks/useCustomTiles';

const COLORS = ['#6366f1', '#1a3a5c', '#8b5cf6', '#4fc3f7', '#a78bfa', '#f59e0b', '#10b981', '#ef4444'];

interface DynamicTileProps {
  tile: CustomTileData;
  onRemove: (id: string) => void;
}

function formatValue(val: unknown): string {
  if (val == null) return '-';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  const crore = 10_000_000;
  const lakh = 100_000;
  if (Math.abs(n) >= crore) return `₹${(n / crore).toFixed(2)} Cr`;
  if (Math.abs(n) >= lakh) return `₹${(n / lakh).toFixed(2)} L`;
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '0.8125rem',
};

function RenderLineChart({ tile }: { tile: CustomTileData }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={tile.rows} margin={{ top: 8, right: 30, bottom: 8, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={tile.x_key} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => formatValue(v)} />
        <Tooltip formatter={(v) => formatValue(v)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
        {tile.y_keys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function RenderBarChart({ tile }: { tile: CustomTileData }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={tile.rows} margin={{ top: 8, right: 30, bottom: 8, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={tile.x_key} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(v) => formatValue(v)} />
        <Tooltip formatter={(v) => formatValue(v)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
        {tile.y_keys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderHorizontalBarChart({ tile }: { tile: CustomTileData }) {
  const barHeight = 32;
  const height = Math.max(tile.rows.length * barHeight + 40, 200);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={tile.rows} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 10 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey={tile.x_key}
          width={120}
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 15) + '...' : v}
        />
        <Tooltip formatter={(v) => formatValue(v)} contentStyle={tooltipStyle} />
        {tile.y_keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={COLORS[i % COLORS.length]}
            radius={[0, 4, 4, 0]}
            barSize={20}
            label={{ position: 'right', formatter: (v: unknown) => formatValue(v), fontSize: 11, fill: 'var(--text-secondary)' }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function RenderPieChart({ tile }: { tile: CustomTileData }) {
  const yKey = tile.y_keys[0] || 'value';
  const total = tile.rows.reduce((s, r) => s + Number(r[yKey] || 0), 0);

  return (
    <>
      <div className="dash-card__center-label">{formatValue(total)}</div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={tile.rows}
            dataKey={yKey}
            nameKey={tile.x_key}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {tile.rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatValue(v)} contentStyle={tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            formatter={(value, entry) => {
              const payload = entry.payload as Record<string, unknown> | undefined;
              const v = Number(payload?.[yKey] || 0);
              const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
              return `${value}: ${formatValue(v)} (${pct}%)`;
            }}
            wrapperStyle={{ fontSize: '0.8125rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}

function RenderTable({ tile }: { tile: CustomTileData }) {
  if (tile.rows.length === 0) return <p style={{ color: 'var(--text-tertiary)' }}>No data found</p>;
  const columns = Object.keys(tile.rows[0]);
  return (
    <div className="dash-table-container dash-table-container--scrollable">
      <table className="dash-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tile.rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col}>{formatValue(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DynamicTile({ tile, onRemove }: DynamicTileProps) {
  const isWide = tile.chart_type === 'line' || tile.chart_type === 'table';

  if (tile.error) {
    return (
      <div className={`dash-card dash-card--error ${isWide ? 'dash-card--full-width' : ''}`}>
        <div className="dash-card__header">
          <h3 className="dash-card__title">Error</h3>
          <button className="dash-card__close-btn" onClick={() => onRemove(tile.id)} title="Remove">
            <CloseIcon />
          </button>
        </div>
        <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{tile.error}</p>
        {tile.sql && (
          <details style={{ marginTop: 8, fontSize: '0.75rem' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}>Show SQL</summary>
            <pre style={{ marginTop: 4, padding: 8, background: 'var(--code-bg)', borderRadius: 6, overflow: 'auto', fontSize: '0.75rem' }}>{tile.sql}</pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className={`dash-card dash-card--custom ${isWide ? 'dash-card--full-width' : ''}`}>
      <div className="dash-card__header">
        <h3 className="dash-card__title">{tile.title}</h3>
        <button className="dash-card__close-btn" onClick={() => onRemove(tile.id)} title="Remove">
          <CloseIcon />
        </button>
      </div>

      {tile.chart_type === 'line' && <RenderLineChart tile={tile} />}
      {tile.chart_type === 'bar' && <RenderBarChart tile={tile} />}
      {tile.chart_type === 'horizontal_bar' && <RenderHorizontalBarChart tile={tile} />}
      {tile.chart_type === 'pie' && <RenderPieChart tile={tile} />}
      {tile.chart_type === 'table' && <RenderTable tile={tile} />}

      {tile.sql && (
        <details style={{ marginTop: 12, fontSize: '0.75rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}>Show SQL</summary>
          <pre style={{ marginTop: 4, padding: 8, background: 'var(--code-bg)', borderRadius: 6, overflow: 'auto', fontSize: '0.75rem', color: 'var(--code-text)' }}>{tile.sql}</pre>
        </details>
      )}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
