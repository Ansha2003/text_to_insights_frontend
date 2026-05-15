'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarItem {
  label: string;
  value: number;
}

interface HorizontalBarChartProps {
  title: string;
  items: BarItem[];
}

function formatCr(val: number): string {
  return `₹${(val / 10_000_000).toFixed(2)} Cr`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

export function HorizontalBarChart({ title, items }: HorizontalBarChartProps) {
  const barHeight = 32;
  const chartHeight = Math.max(items.length * barHeight + 40, 200);

  return (
    <div className="dash-card">
      <h3 className="dash-card__title">{title}</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={items} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 10 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            tickFormatter={(v: string) => truncate(v, 18)}
          />
          <Tooltip
            formatter={(value) => formatCr(Number(value))}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.8125rem',
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', formatter: (v: unknown) => formatCr(Number(v)), fontSize: 11, fill: 'var(--text-secondary)' }}>
            {items.map((_, i) => (
              <Cell key={i} fill="#6366f1" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
