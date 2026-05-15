'use client';

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'number';
}

function formatIndianCurrency(val: number): string {
  const crore = 10_000_000;
  const lakh = 100_000;

  if (Math.abs(val) >= crore) {
    return `₹${(val / crore).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= lakh) {
    return `₹${(val / lakh).toFixed(2)} L`;
  }
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatNumber(val: number): string {
  return val.toLocaleString('en-IN');
}

export function KPICard({ title, value, format }: KPICardProps) {
  const display = format === 'currency' ? formatIndianCurrency(value) : formatNumber(value);

  return (
    <div className="dash-kpi">
      <span className="dash-kpi__label">{title}</span>
      <span className="dash-kpi__value">{display}</span>
    </div>
  );
}
