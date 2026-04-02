import { PageHeader } from '@/components/layout/page-header';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { CashPositionChart } from '@/components/dashboard/cash-position-chart';
import { SalesByPlatformChart } from '@/components/dashboard/sales-by-platform-chart';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dasbor"
        description="Selamat datang kembali! Berikut adalah ringkasan kinerja bisnis Anda."
      >
        <DatePickerWithRange />
      </PageHeader>
      
      <OverviewCards />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="lg:col-span-4">
          <RevenueChart />
        </div>
        <div className="lg:col-span-3">
          <CashPositionChart />
        </div>
        <div className="lg:col-span-7">
          <SalesByPlatformChart />
        </div>
        <div className="lg:col-span-7">
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}
