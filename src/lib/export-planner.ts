import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlannerState, CompanyProfile } from './types';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
};

const numberFormatter = new Intl.NumberFormat('id-ID');

export const exportPlannerToExcel = (state: PlannerState, profile: CompanyProfile | null) => {
  const isMulti = state.isMultiProduct && state.businessType === 'retail';
  const wb = XLSX.utils.book_new();
  
  let hppData: any[] = [];
  let pricingData: any[] = [];
  let analysisData: any[] = [];

  const percentage = typeof state.pricingPercentage === 'number' ? state.pricingPercentage : parseFloat(state.pricingPercentage) || 0;

  if (isMulti) {
    const totalQty = state.multiProducts.reduce((sum, p) => sum + p.qty, 0);
    const ongkirPerUnit = totalQty > 0 ? (state.globalOngkir / totalQty) : 0;
    let totalRev = 0;
    let totalHpp = 0;

    hppData = [
      ['Daftar Produk (HPP & Pricing)', 'Qty', 'Harga Beli', 'Ongkir/Unit', 'Kemasan', 'HPP/Unit', 'Harga Jual', 'Laba/Unit'],
    ];

    state.multiProducts.forEach(p => {
      const prodHpp = p.hargaBeli + ongkirPerUnit + p.kemasan;
      let prodPrice = 0;
      if (state.pricingMethod === 'markup') {
        prodPrice = prodHpp * (1 + percentage / 100);
      } else {
        prodPrice = percentage >= 100 ? prodHpp * 10 : prodHpp / (1 - percentage / 100);
      }
      totalRev += prodPrice * p.qty;
      totalHpp += prodHpp * p.qty;
      hppData.push([
        p.name || 'Produk', p.qty, p.hargaBeli, ongkirPerUnit, p.kemasan, prodHpp, prodPrice, prodPrice - prodHpp
      ]);
    });

    const cmRatio = totalRev > 0 ? (totalRev - totalHpp) / totalRev : 0;
    const bepRevenue = cmRatio > 0 ? state.fixedCosts / cmRatio : 0;
    const targetRevenue = state.targetUnits; // in multi, it's revenue
    const targetTotalCost = state.fixedCosts + (targetRevenue * (1 - cmRatio));
    const targetProfit = targetRevenue - targetTotalCost;

    pricingData = [
        ['Strategi Harga Global', 'Nilai', 'Keterangan'],
        ['Ongkos Kirim Global', state.globalOngkir, 'Didistribusikan per qty'],
        ['Metode Pricing', state.pricingMethod === 'markup' ? 'Markup' : 'Margin', 'Pilihan strategi'],
        ['Persentase Target', `${percentage}%`, 'Target persentase margin/markup']
    ];

    analysisData = [
        ['Analisis Operasional & Target', 'Nilai', 'Keterangan'],
        ['Biaya Tetap per Bulan', state.fixedCosts, 'Operasional rutin'],
        ['Total Investasi Awal', state.investment, 'Modal awal'],
        ['Margin Kontribusi Rata-rata', `${(cmRatio * 100).toFixed(2)}%`, '=(Total Penjualan - Total HPP) / Total Penjualan'],
        ['BEP Omzet', bepRevenue, '=Biaya Tetap / Margin Kontribusi'],
        ['Target Omzet Bulanan', targetRevenue, 'Simulasi target'],
        ['Total Biaya Target', targetTotalCost, '=Biaya Tetap + (Omzet Target * HPP Ratio)'],
        ['Proyeksi Laba Bersih', targetProfit, '=Target Omzet - Total Biaya Target'],
        ['ROI Bulanan', state.investment > 0 ? (targetProfit / state.investment) : 0, '=(Laba Bersih / Investasi) * 100%'],
    ];

  } else {
    if (state.businessType === 'jasa') {
      hppData = [
        ['Komponen HPP', 'Nilai (Rp)', 'Keterangan'],
        ['Jam Kerja', state.jasaData.jamKerja, 'Waktu yang dibutuhkan'],
        ['Tarif per Jam', state.jasaData.tarifPerJam, 'Biaya per jam'],
        ['Material Tambahan', state.jasaData.material, 'Bahan/material luar'],
        ['Total HPP', state.totalHpp, '=(Jam Kerja * Tarif) + Material']
      ];
    } else if (state.businessType === 'retail') {
      hppData = [
        ['Komponen HPP', 'Nilai (Rp)', 'Keterangan'],
        ['Harga Beli', state.retailData.hargaBeli, 'Harga produk per unit'],
        ['Ongkir Global', state.retailData.totalOngkir, 'Total ongkos kirim'],
        ['Jumlah Item', state.retailData.jumlahItemOngkir, 'Item dalam 1 resi'],
        ['Ongkir per Unit', state.retailData.totalOngkir / (state.retailData.jumlahItemOngkir || 1), '=Ongkir Global / Jumlah Item'],
        ['Biaya Kemasan', state.retailData.kemasan, 'Kemasan per unit'],
        ['Total HPP', state.totalHpp, '=Harga Beli + Ongkir Unit + Kemasan']
      ];
    } else {
      hppData = [
        ['Komponen HPP', 'Nilai (Rp)', 'Keterangan'],
        ['Bahan Baku', state.manufakturData.bahanBaku, 'Material inti per unit'],
        ['Tenaga Kerja', state.manufakturData.tenagaKerja, 'Upah per unit'],
        ['Overhead', state.manufakturData.overhead, 'Listrik, sewa, pabrik'],
        ['Total HPP', state.totalHpp, '=Bahan Baku + Tenaga Kerja + Overhead']
      ];
    }

    pricingData = [
      ['Strategi Harga', 'Nilai', 'Keterangan'],
      ['Total HPP', state.totalHpp, 'Dari perhitungan HPP'],
      ['Metode Pricing', state.pricingMethod === 'markup' ? 'Markup' : 'Margin', 'Pilihan strategi'],
      ['Persentase Target', `${percentage}%`, 'Target persentase'],
      ['Rekomendasi Harga Jual', state.recommendedPrice, state.pricingMethod === 'markup' 
          ? '=HPP * (1 + (Persentase/100))'
          : '=HPP / (1 - (Persentase/100))'],
      ['Laba per Unit', state.recommendedPrice - state.totalHpp, '=Harga Jual - HPP']
    ];

    const bepUnits = Math.ceil(state.fixedCosts / (state.recommendedPrice - state.totalHpp) || 0);
    const targetRevenue = state.targetUnits * state.recommendedPrice;
    const targetTotalCost = state.fixedCosts + (state.targetUnits * state.totalHpp);
    const targetProfit = targetRevenue - targetTotalCost;

    analysisData = [
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
  }

  const wsData = [
    ['LAPORAN PERENCANAAN BISNIS'],
    [`Perusahaan: ${profile?.name || 'FinansiaPro'}`],
    [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}`],
    [`Jenis Bisnis: ${state.businessType.toUpperCase()} ${isMulti ? '(MULTI PRODUK)' : ''}`],
    [],
    ...hppData,
    [],
    ...pricingData,
    [],
    ...analysisData
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = isMulti ? 
    [{ wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }] : 
    [{ wch: 30 }, { wch: 20 }, { wch: 45 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Perencanaan Bisnis');
  XLSX.writeFile(wb, `Perencanaan_Bisnis_${profile?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportPlannerToPdf = (state: PlannerState, profile: CompanyProfile | null) => {
  const isMulti = state.isMultiProduct && state.businessType === 'retail';
  const doc = new jsPDF('p', 'pt', 'a4');
  let currentY = 40;

  const primaryColor: [number, number, number] = [37, 99, 235];
  const textColor: [number, number, number] = [51, 65, 85];
  const headerColor: [number, number, number] = [59, 130, 246];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Laporan Perencanaan Bisnis', 40, currentY);
  currentY += 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Perusahaan: ${profile?.name || 'FinansiaPro'}`, 40, currentY);
  doc.text(`Bisnis: ${state.businessType.toUpperCase()}${isMulti ? ' (Multi)' : ''}`, 350, currentY);
  currentY += 15;
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 40, currentY);
  currentY += 30;

  const percentage = typeof state.pricingPercentage === 'number' ? state.pricingPercentage : parseFloat(state.pricingPercentage) || 0;

  if (isMulti) {
    const totalQty = state.multiProducts.reduce((sum, p) => sum + p.qty, 0);
    const ongkirPerUnit = totalQty > 0 ? (state.globalOngkir / totalQty) : 0;
    
    let totalRev = 0;
    let totalHpp = 0;

    const formattedHppData = state.multiProducts.map(p => {
      const prodHpp = p.hargaBeli + ongkirPerUnit + p.kemasan;
      let prodPrice = 0;
      if (state.pricingMethod === 'markup') {
        prodPrice = prodHpp * (1 + percentage / 100);
      } else {
        prodPrice = percentage >= 100 ? prodHpp * 10 : prodHpp / (1 - percentage / 100);
      }
      totalRev += prodPrice * p.qty;
      totalHpp += prodHpp * p.qty;
      
      return [
        p.name || 'Produk', 
        p.qty, 
        formatCurrency(p.hargaBeli), 
        formatCurrency(ongkirPerUnit), 
        formatCurrency(prodHpp), 
        formatCurrency(prodPrice),
        formatCurrency(prodPrice - prodHpp)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Produk', 'Qty', 'Beli', 'Ongkir/Unit', 'HPP/Unit', 'Harga Jual', 'Laba']],
      body: formattedHppData,
      theme: 'grid',
      styles: { valign: 'middle', cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
      headStyles: { fillColor: headerColor, valign: 'middle' },
      margin: { left: 40, right: 40 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 30;

    const cmRatio = totalRev > 0 ? (totalRev - totalHpp) / totalRev : 0;
    const bepRevenue = cmRatio > 0 ? state.fixedCosts / cmRatio : 0;
    const targetRevenue = state.targetUnits;
    const targetTotalCost = state.fixedCosts + (targetRevenue * (1 - cmRatio));
    const targetProfit = targetRevenue - targetTotalCost;
    const roi = state.investment > 0 ? ((targetProfit / state.investment) * 100).toFixed(2) + '%' : '0%';

    const analysisValRows = [
      ['Biaya Tetap Bulanan', formatCurrency(state.fixedCosts), 'Operasional pasti keluar'],
      ['Total Investasi Awal', formatCurrency(state.investment), 'Total modal awal'],
      ['BEP (Titik Impas) Omzet', formatCurrency(bepRevenue), 'Minimal pendapatan agar tidak rugi'],
      ['Target OmzetBulanan', formatCurrency(state.targetUnits), 'Asumsi target bulanan'],
      ['Total Biaya Proyeksi', formatCurrency(targetTotalCost), 'Biaya tetap + proporsional HPP'],
      ['Proyeksi Laba Bersih', formatCurrency(targetProfit), 'Omzet - Total Biaya Proyeksi'],
      ['ROI Bulanan', roi, '(Laba Bersih / Total Investasi) * 100%']
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Analisis & Target', 'Nilai', 'Keterangan']],
      body: analysisValRows,
      theme: 'grid',
      styles: { valign: 'middle', cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
      headStyles: { fillColor: headerColor, valign: 'middle' },
      margin: { left: 40, right: 40 },
    });

  } else {
    // Single Product Export (Existing Logic)
    let hppData: any[] = [];
    if (state.businessType === 'jasa') {
      hppData = [
        ['Jam Kerja', state.jasaData.jamKerja, 'Waktu yang dibutuhkan'],
        ['Tarif per Jam', state.jasaData.tarifPerJam, 'Biaya per jam'],
        ['Material Tambahan', state.jasaData.material, 'Bahan/material luar'],
        ['Total HPP', state.totalHpp, '=(Jam Kerja * Tarif) + Material']
      ];
    } else if (state.businessType === 'retail') {
      hppData = [
        ['Harga Beli', state.retailData.hargaBeli, 'Harga produk per unit'],
        ['Ongkir Global', state.retailData.totalOngkir, 'Total ongkos kirim'],
        ['Jumlah Item', state.retailData.jumlahItemOngkir, 'Item dalam 1 resi'],
        ['Ongkir per Unit', state.retailData.totalOngkir / (state.retailData.jumlahItemOngkir || 1), '=Ongkir Global / Jumlah Item'],
        ['Biaya Kemasan', state.retailData.kemasan, 'Kemasan per unit'],
        ['Total HPP', state.totalHpp, '=Harga Beli + Ongkir Unit + Kemasan']
      ];
    } else {
      hppData = [
        ['Bahan Baku', state.manufakturData.bahanBaku, 'Material inti per unit'],
        ['Tenaga Kerja', state.manufakturData.tenagaKerja, 'Upah per unit'],
        ['Overhead', state.manufakturData.overhead, 'Listrik, sewa, pabrik'],
        ['Total HPP', state.totalHpp, '=Bahan Baku + Tenaga Kerja + Overhead']
      ];
    }

    const formattedHppData = hppData.map(row => [row[0], typeof row[1] === 'number' ? formatCurrency(row[1]) : row[1], row[2]]);

    autoTable(doc, {
      startY: currentY,
      head: [['Komponen HPP', 'Nilai', 'Rumus / Keterangan']],
      body: formattedHppData,
      theme: 'grid',
      styles: { valign: 'middle', cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
      headStyles: { fillColor: headerColor, valign: 'middle' },
      margin: { left: 40, right: 40 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 30;

    const pricingValRows = [
      ['Total HPP', formatCurrency(state.totalHpp), 'Dari total perhitungan'],
      ['Metode Pricing', state.pricingMethod === 'markup' ? 'Markup' : 'Margin', 'Pendekatan penetapan harga'],
      ['Target Margin', `${percentage}%`, 'Persentase yang ingin dicapai'],
      ['Harga Jual', formatCurrency(state.recommendedPrice), 'Hasil perhitungan akhir'],
      ['Est. Laba per Unit', formatCurrency(state.recommendedPrice - state.totalHpp), 'Harga Jual - Total HPP']
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Strategi Pricing', 'Nilai', 'Rumus / Keterangan']],
      body: pricingValRows,
      theme: 'grid',
      styles: { valign: 'middle', cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
      headStyles: { fillColor: headerColor, valign: 'middle' },
      margin: { left: 40, right: 40 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 30;

    const bepUnits = Math.ceil(state.fixedCosts / (state.recommendedPrice - state.totalHpp) || 0);
    const targetRevenue = state.targetUnits * state.recommendedPrice;
    const targetTotalCost = state.fixedCosts + (state.targetUnits * state.totalHpp);
    const targetProfit = targetRevenue - targetTotalCost;
    const roi = state.investment > 0 ? ((targetProfit / state.investment) * 100).toFixed(2) + '%' : '0%';

    const analysisValRows = [
      ['Biaya Tetap Bulanan', formatCurrency(state.fixedCosts), 'Operasional pasti keluar'],
      ['Total Investasi', formatCurrency(state.investment), 'Total modal awal'],
      ['BEP Unit', `${bepUnits} Unit`, 'Biaya Tetap / Laba per Unit'],
      ['BEP Omzet', formatCurrency(bepUnits * state.recommendedPrice), 'BEP Unit * Harga Jual'],
      ['Target Penjualan', `${numberFormatter.format(state.targetUnits)} Unit`, 'Asumsi penjualan per bulan'],
      ['Proyeksi Omzet', formatCurrency(targetRevenue), 'Target Penjualan * Harga Jual'],
      ['Proyeksi Laba Bersih', formatCurrency(targetProfit), 'Omzet - Biaya Total'],
      ['ROI Bulanan', roi, '(Laba Bersih / Total Investasi) * 100%']
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Analisis & Target', 'Nilai', 'Rumus / Keterangan']],
      body: analysisValRows,
      theme: 'grid',
      styles: { valign: 'middle', cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
      headStyles: { fillColor: headerColor, valign: 'middle' },
      margin: { left: 40, right: 40 },
    });
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Dicetak dengan FinansiaPro - Halaman ${i} dari ${pageCount}`, 40, doc.internal.pageSize.getHeight() - 30);
  }

  doc.save(`Perencanaan_Bisnis_${profile?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`);
};

