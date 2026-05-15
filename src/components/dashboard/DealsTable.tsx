'use client';

interface Deal {
  file_name: string;
  file_owner_name: string;
  billing_amount: number;
}

interface DealsTableProps {
  title: string;
  deals: Deal[];
}

function formatCr(val: number): string {
  const crore = 10_000_000;
  const lakh = 100_000;
  if (Math.abs(val) >= crore) return `₹${(val / crore).toFixed(2)} Cr`;
  if (Math.abs(val) >= lakh) return `₹${(val / lakh).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function DealsTable({ title, deals }: DealsTableProps) {
  return (
    <div className="dash-card">
      <h3 className="dash-card__title">{title}</h3>
      <div className="dash-table-container dash-table-container--scrollable">
        <table className="dash-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Deal</th>
              <th>Owner</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, i) => (
              <tr key={i}>
                <td className="dash-table__rank">{i + 1}</td>
                <td className="dash-table__deal" title={deal.file_name}>{deal.file_name}</td>
                <td>{deal.file_owner_name}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCr(deal.billing_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
