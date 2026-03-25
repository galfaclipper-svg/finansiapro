import { PageHeader } from '@/components/layout/page-header';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { AiSummary } from '@/components/dashboard/ai-summary';

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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RevenueChart />
        </div>
        <div className="lg:col-span-3">
          <AiSummary />
        </div>
      </div>
      <RecentTransactions />
    </div>
  );
}
