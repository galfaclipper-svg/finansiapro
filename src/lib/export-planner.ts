import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlannerState, CompanyProfile } from './types';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
};

const getHppDetail = (state: PlannerState) => {
  if (state.businessType === 'jasa') {
    return [
      ['Komponen HPP', 'Nilai (Rp)', 'Keterangan'],
      ['Jam Kerja', state.jasaData.jamKerja, 'Waktu yang dibutuhkan'],
      ['Tarif per Jam', state.jasaData.tarifPerJam, 'Biaya per jam'],
      ['Material Tambahan', state.jasaData.material, 'Bahan/material luar'],
      ['Total HPP', state.totalHpp, '=(Jam Kerja * Tarif) + Material']
    ];
  } else if (state.businessType === 'retail') {
    return [
      ['Komponen HPP', 'Nilai (Rp)', 'Keterangan'],
      ['Harga Beli', state.retailData.hargaBeli, 'Harga produk per unit'],
      ['Ongkir Global', state.retailData.totalOngkir, 'Total ongkos kirim'],
      ['Jumlah Item', state.retailData.jumlahItemOngkir, 'Item dalam 1 resi'],
      ['Ongkir per Unit', state.retailData.totalOngkir / (state.retailData.jumlahItemOngkir || 1), '=Ongkir Global / Jumlah Item'],
      ['Biaya Kemasan', state.retailData.kemasan, 'Kemasan per unit'],
      ['Total HPP', state.totalHpp, '=Harga Beli + Ongkir Unit + Kemasan']
    ];
  } else {
    return [
      ['Komponen HPP', 'Nilai (Rp)', 'Keterangan'],
      ['Bahan Baku', state.manufakturData.bahanBaku, 'Material inti per unit'],
      ['Tenaga Kerja', state.manufakturData.tenagaKerja, 'Upah per unit'],
      ['Overhead', state.manufakturData.overhead, 'Listrik, sewa, pabrik'],
      ['Total HPP', state.totalHpp, '=Bahan Baku + Tenaga Kerja + Overhead']
    ];
  }
};

export const exportPlannerToExcel = (state: PlannerState, profile: CompanyProfile | null) => {
  const wb = XLSX.utils.book_new();

  // Data Preparation
  const hppData = getHppDetail(state);
  
  const pricingData = [
    ['Strategi Harga', 'Nilai', 'Keterangan'],
    ['Total HPP', state.totalHpp, 'Dari perhitungan HPP'],
    ['Metode Pricing', state.pricingMethod === 'markup' ? 'Markup' : 'Margin', 'Pilihan strategi'],
    ['Persentase Target', `${state.pricingPercentage}%`, 'Target persentase'],
    ['Rekomendasi Harga Jual', state.recommendedPrice, state.pricingMethod === 'markup' 
        ? '=HPP * (1 + (Persentase/100))'
        : '=HPP / (1 - (Persentase/100))'],
    ['Laba per Unit', state.recommendedPrice - state.totalHpp, '=Harga Jual - HPP']
  ];

  const bepUnits = Math.ceil(state.fixedCosts / (state.recommendedPrice - state.totalHpp) || 0);
  const targetRevenue = state.targetUnits * state.recommendedPrice;
  const targetTotalCost = state.fixedCosts + (state.targetUnits * state.totalHpp);
  const targetProfit = targetRevenue - targetTotalCost;

  const analysisData = [
    ['Analisis Operasional & Target', 'Nilai', 'Keterangan'],
    ['Biaya Tetap per Bulan', state.fixedCosts, 'Operasional rutin'],
    ['Total Investasi Awal', state.investment, 'Modal awal'],
    ['BEP (Titik Impas) Unit', bepUnits, '=Biaya Tetap / Laba per Unit'],
    ['BEP Omzet', bepUnits * state.recommendedPrice, '=BEP Unit * Harga Jual'],
    ['Target Unit Penjualan', state.targetUnits, 'Simulasi bulanan'],
    ['Proyeksi Omzet', targetRevenue, '=Target Unit * Harga Jual'],
    ['Total Biaya Target', targetTotalCost, '=Biaya Tetap + (Target Unit * HPP)'],
    ['Proyeksi Laba Bersih', targetProfit, '=Proyeksi Omzet - Total Biaya Target'],
    ['ROI Bulanan', state.investment > 0 ? (targetProfit / state.investment) : 0, '=(Laba Bersih / Investasi) * 100%'],
  ];

  const wsData = [
    ['LAPORAN PERENCANAAN BISNIS'],
    [`Perusahaan: ${profile?.name || 'FinansiaPro'}`],
    [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}`],
    [`Jenis Bisnis: ${state.businessType.toUpperCase()}`],
    [],
    ...hppData,
    [],
    ...pricingData,
    [],
    ...analysisData
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column Widths adjustment
  ws['!cols'] = [
    { wch: 30 }, // Col A
    { wch: 20 }, // Col B
    { wch: 45 }  // Col C
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Perencanaan Bisnis');

  XLSX.writeFile(wb, `Perencanaan_Bisnis_${profile?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportPlannerToPdf = (state: PlannerState, profile: CompanyProfile | null) => {
  const doc = new jsPDF('p', 'pt', 'a4');
  let currentY = 40;

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const textColor: [number, number, number] = [51, 65, 85]; // Slate
  const headerColor: [number, number, number] = [59, 130, 246];

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Laporan Perencanaan Bisnis', 40, currentY);
  currentY += 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Perusahaan: ${profile?.name || 'FinansiaPro'}`, 40, currentY);
  doc.text(`Jenis Bisnis: ${state.businessType.toUpperCase()}`, 350, currentY);
  currentY += 15;
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 40, currentY);
  currentY += 30;

  const hppData = getHppDetail(state);
  const formattedHppData = hppData.slice(1).map(row => [row[0], typeof row[1] === 'number' ? formatCurrency(row[1]) : row[1], row[2]]);

  autoTable(doc, {
    startY: currentY,
    head: [['Komponen HPP', 'Nilai', 'Rumus / Keterangan']],
    body: formattedHppData,
    theme: 'grid',
    headStyles: { fillColor: headerColor },
    margin: { left: 40, right: 40 },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 120, halign: 'right' },
      2: { cellWidth: 245 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 30;

  const pricingValRows = [
    ['Total HPP', formatCurrency(state.totalHpp), 'Dari total perhitungan HPP sebelumnya'],
    ['Metode Pricing', state.pricingMethod === 'markup' ? 'Markup' : 'Margin', 'Pendekatan strategi penetapan harga'],
    ['Persentase Target', `${state.pricingPercentage}%`, 'Persentase yang ingin dicapai'],
    ['Rekomendasi Harga Jual', formatCurrency(state.recommendedPrice), state.pricingMethod === 'markup' ? 'HPP * (1 + Persentase)' : 'HPP / (1 - Persentase)'],
    ['Estimasi Laba per Unit', formatCurrency(state.recommendedPrice - state.totalHpp), 'Harga Jual - Total HPP']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Strategi Pricing', 'Nilai', 'Rumus / Keterangan']],
    body: pricingValRows,
    theme: 'grid',
    headStyles: { fillColor: headerColor },
    margin: { left: 40, right: 40 },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 120, halign: 'right' },
      2: { cellWidth: 245 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 30;

  const bepUnits = Math.ceil(state.fixedCosts / (state.recommendedPrice - state.totalHpp) || 0);
  const targetRevenue = state.targetUnits * state.recommendedPrice;
  const targetTotalCost = state.fixedCosts + (state.targetUnits * state.totalHpp);
  const targetProfit = targetRevenue - targetTotalCost;
  const roi = state.investment > 0 ? ((targetProfit / state.investment) * 100).toFixed(2) + '%' : '0%';

  const analysisValRows = [
    ['Biaya Tetap Bulanan', formatCurrency(state.fixedCosts), 'Operasional bulanan yang pasti keluar'],
    ['Total Investasi Awal', formatCurrency(state.investment), 'Total modal awal yang dikeluarkan'],
    ['BEP (Titik Impas) Unit', `${bepUnits} Unit`, 'Biaya Tetap / Laba per Unit'],
    ['BEP (Titik Impas) Omzet', formatCurrency(bepUnits * state.recommendedPrice), 'BEP Unit * Harga Jual'],
    ['Target Penjualan', `${state.targetUnits} Unit`, 'Asumsi penjualan per bulan'],
    ['Proyeksi Omzet', formatCurrency(targetRevenue), 'Target Penjualan * Harga Jual'],
    ['Proyeksi Laba Bersih', formatCurrency(targetProfit), 'Omzet - (Biaya Tetap + Total HPP Target)'],
    ['ROI Bulanan', roi, '(Laba Bersih / Total Investasi) * 100%']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Analisis & Target', 'Nilai', 'Rumus / Keterangan']],
    body: analysisValRows,
    theme: 'grid',
    headStyles: { fillColor: headerColor },
    margin: { left: 40, right: 40 },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 120, halign: 'right' },
      2: { cellWidth: 245 }
    }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Dicetak dengan FinansiaPro - Halaman ${i} dari ${pageCount}`, 40, doc.internal.pageSize.getHeight() - 30);
  }

  doc.save(`Perencanaan_Bisnis_${profile?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`);
};
