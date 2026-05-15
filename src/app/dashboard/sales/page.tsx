'use client';

import { AppLayout } from '@/components/layout';
import { DashboardGrid } from '@/components/dashboard';

export default function SalesDashboard() {
  return (
    <AppLayout activePath="/dashboard/sales">
      <div className="dash-page">
        <DashboardGrid />
      </div>
    </AppLayout>
  );
}
