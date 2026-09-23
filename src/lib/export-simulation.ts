import * as ExcelJS from 'exceljs';
import { SimulationState, InventoryItem, Transaction, CompanyProfile } from './types';

export const exportSimulationToExcel = async (
  state: SimulationState,
  inventory: InventoryItem[],
  transactions: Transaction[],
  profile: CompanyProfile
) => {
  const wb = new ExcelJS.Workbook();
  const ws1 = wb.addWorksheet('Simulasi Penjualan');
  const ws2 = wb.addWorksheet('Modal & Proyeksi');

  // --- STYLES ---
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
  };
  const bgBlueYellow: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  const fontBlue = { color: { argb: 'FF0000FF' } };
  const fontGreen = { color: { argb: 'FF00B050' } };

  // Helper to add rows with styles
  const addStyledRow = (ws: ExcelJS.Worksheet, values: any[], isHeader = false) => {
    const row = ws.addRow(values);
    row.eachCell((cell) => {
      cell.border = borderAll;
      if (isHeader) {
        cell.fill = headerFill;
        cell.font = headerFont;
      }
    });
    return row;
  };

  // ==========================================
  // SHEET 1: SIMULASI PENJUALAN
  // ==========================================
  
  ws1.getColumn(1).width = 30; // Produk
  ws1.getColumn(2).width = 15; // Eceran
  ws1.getColumn(3).width = 15; // Reseller
  ws1.getColumn(4).width = 15; // Agen
  ws1.getColumn(5).width = 15; // Borongan
  ws1.getColumn(6).width = 15; // Total
  ws1.getColumn(7).width = 15; // Stok Sisa
  ws1.getColumn(8).width = 15; // Status

  ws1.addRow(['SIMULASI PENJUALAN – Eceran, Reseller, Agen & Borongan']).font = { bold: true, size: 14, color: { argb: 'FF1F497D' } };
  ws1.addRow([`${profile.name || 'Bisnis Anda'} | Proyeksi 12 Bulan`]).font = { italic: true };
  ws1.addRow([]);

  addStyledRow(ws1, ['RINGKASAN HASIL SIMULASI'], true);
  ws1.addRow(['Total pcs terjual', { formula: 'SUM(C.C22:F22)' }]); // Just placeholder formulas for now
  ws1.addRow(['Total omzet (Rp)', { formula: 'D.G32' }]);
  ws1.addRow(['Total HPP (Rp)', { formula: 'E.G42' }]);
  ws1.addRow([]);

  addStyledRow(ws1, ['A. PARAMETER CHANNEL PENJUALAN', 'Eceran', 'Reseller', 'Agen', 'Borongan', 'Catatan'], true);
  ws1.addRow(['Jalur penjualan', 'Marketplace', 'Transaksi langsung', 'Transaksi langsung', 'Distributor']);
  ws1.addRow(['Syarat minimum pcs per pesanan', 1, 12, 50, 200]);
  ws1.addRow(['Komisi platform / marketplace (%)', 0.1, 0, 0, 0]);
  ws1.addRow([]);

  addStyledRow(ws1, ['B. DAFTAR HARGA JUAL (Rp / pcs) & STOK', 'Harga Eceran', 'Harga Reseller', 'Harga Agen', 'Harga Borongan', 'Stok Lama'], true);
  
  let startRowB = ws1.rowCount + 1;
  inventory.forEach((item) => {
    ws1.addRow([item.name, item.costPerUnit * 3, item.costPerUnit * 2.5, item.costPerUnit * 2, item.costPerUnit * 1.5, item.stock]);
  });
  ws1.addRow([]);

  addStyledRow(ws1, ['C. INPUT KUANTITAS PENJUALAN (pcs)', 'Eceran', 'Reseller', 'Agen', 'Borongan', 'Total Terjual', 'Sisa Stok', 'Status'], true);
  let startRowC = ws1.rowCount + 1;
  inventory.forEach((item, i) => {
    const r = ws1.addRow([item.name, 50, 100, 150, 200, { formula: `SUM(B${startRowC+i}:E${startRowC+i})` }, 0, 'OK']);
    // Color inputs
    [2,3,4,5].forEach(col => { r.getCell(col).fill = bgBlueYellow; r.getCell(col).font = fontBlue; });
  });

  // ==========================================
  // SHEET 2: MODAL & PROYEKSI
  // ==========================================
  
  ws2.getColumn(1).width = 30;
  ws2.getColumn(2).width = 15;
  for (let i = 3; i <= 15; i++) ws2.getColumn(i).width = 12; // Months

  ws2.addRow(['MODAL TAMBAHAN & PROYEKSI LABA RUGI – NERACA 12 BULAN']).font = { bold: true, size: 14, color: { argb: 'FF1F497D' } };
  ws2.addRow([]);

  addStyledRow(ws2, ['RINGKASAN HASIL 12 BULAN'], true);
  ws2.addRow(['Total tambahan modal usaha (Rp)', { formula: '1E.B20' }]);
  ws2.addRow(['Total pendapatan 12 bulan (Rp)', { formula: '3.O30' }]);
  ws2.addRow(['Laba (rugi) bersih 12 bulan (Rp)', { formula: '3.O50' }]);
  ws2.addRow([]);

  addStyledRow(ws2, ['1. TAMBAHAN MODAL USAHA & RINCIAN PENGGUNAANNYA'], true);
  ws2.addRow(['Bulan biaya operasional yang didanai', state.monthsToFundOp]);
  ws2.addRow(['Bulan biaya marketing yang didanai', state.monthsToFundMkt]);
  ws2.addRow([]);

  addStyledRow(ws2, ['1B. BIAYA OPERASIONAL', 'Rp / bulan', 'Bulan didanai', 'Dana dialokasikan'], true);
  ws2.addRow(['Beban Gaji', 12585000, state.monthsToFundOp, { formula: 'B18*C18' }]);
  ws2.addRow(['Total biaya operasional', { formula: 'SUM(B18:B18)' }, '', { formula: 'SUM(D18:D18)' }]);
  ws2.addRow([]);

  addStyledRow(ws2, ['3. LAPORAN LABA RUGI PROYEKSI 12 BULAN (Rp)', 'Okt 2026', 'Nov 2026', 'Des 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027', 'Apr 2027', 'Mei 2027', 'Jun 2027', 'Jul 2027', 'Agu 2027', 'Sep 2027', 'Total'], true);
  ws2.addRow(['PENDAPATAN']);
  ws2.addRow(['Penjualan Eceran', 1000000, 1200000, 1500000, 1000000, 1200000, 1500000, 1000000, 1200000, 1500000, 1000000, 1200000, 1500000, { formula: 'SUM(B25:M25)' }]);
  
  ws2.addRow([]);
  addStyledRow(ws2, ['4. ARUS KAS PROYEKSI 12 BULAN'], true);
  ws2.addRow(['Laba (Rugi) Bersih', { formula: 'B25' }]); // Mock formula

  ws2.addRow([]);
  addStyledRow(ws2, ['5. NERACA PROYEKSI'], true);
  ws2.addRow(['Kas & Bank', 50000000]); 

  // Make Excel write out
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Simulasi_Proyeksi_12_Bulan_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
