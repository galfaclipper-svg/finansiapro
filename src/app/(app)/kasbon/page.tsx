import { PageHeader } from '@/components/layout/page-header';
import { KasbonManager } from '@/components/kasbon/kasbon-manager';

export default function KasbonPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Kasbon Karyawan"
        description="Kelola piutang karyawan (kasbon), pantau sisa pinjaman, dan cetak laporan per bulan."
      />
      <KasbonManager />
    </div>
  );
}
