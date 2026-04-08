import { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { BusinessPlanner } from '@/components/business-planner/business-planner';

export const metadata: Metadata = {
  title: 'Perencana Bisnis | FinansiaPro',
  description: 'Alat bantu perencanaan bisnis, kalkulator HPP, simulasi harga, dan analisis BEP.',
};

export default function BusinessPlannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Perencana Bisnis" 
        description="Gunakan berbagai alat simulasi kami untuk menghitung HPP, rekomendasi harga, dan analisis target Break-Even Point (BEP)."
      />
      <BusinessPlanner />
    </div>
  );
}
