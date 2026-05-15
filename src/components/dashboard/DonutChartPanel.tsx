'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Segment {
  label: string;
  value: number;
}

interface DonutChartPanelProps {
  title: string;
  segments: Segment[];
}

const COLORS = ['#6366f1', '#1a3a5c', '#8b5cf6', '#4fc3f7', '#a78bfa'];

function formatCr(val: number): string {
  return `₹${(val / 10_000_000).toFixed(2)} Cr`;
}

function renderLabel({ cx, cy }: { cx: number; cy: number }) {
  return null;
}

export function DonutChartPanel({ title, segments }: DonutChartPanelProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="dash-card">
      <h3 className="dash-card__title">{title}</h3>
      <div className="dash-card__center-label">{formatCr(total)}</div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            label={false}
          >
            {segments.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCr(Number(value))}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.8125rem',
            }}
          />
          <Legend
            verticalAlign="bottom"
            formatter={(value: string, entry: { payload?: { value?: number } }) => {
              const v = entry.payload?.value ?? 0;
              const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
              return `${value}: ${formatCr(v)} (${pct}%)`;
            }}
            wrapperStyle={{ fontSize: '0.8125rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
