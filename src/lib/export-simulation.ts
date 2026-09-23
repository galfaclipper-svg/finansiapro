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
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } }; // Dark Blue
  const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
  };
  const bgInput: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // Light Yellow
  const fontInput = { color: { argb: 'FF0000FF' } }; // Blue
  
  const addStyledRow = (ws: ExcelJS.Worksheet, values: any[], isHeader = false, isSubHeader = false) => {
    const row = ws.addRow(values);
    row.eachCell((cell) => {
      cell.border = borderAll;
      if (isHeader) {
        cell.fill = headerFill;
        cell.font = headerFont;
      } else if (isSubHeader) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.font = { bold: true };
      }
    });
    return row;
  };

  // ==========================================
  // SHEET 1: SIMULASI PENJUALAN
  // ==========================================
  ws1.getColumn(1).width = 30;
  for (let i = 2; i <= 9; i++) ws1.getColumn(i).width = 15;

  ws1.addRow(['SIMULASI PENJUALAN – Eceran, Reseller, Agen & Borongan']).font = { bold: true, size: 12, color: { argb: 'FF1F497D' } };
  ws1.addRow([`${profile.name || 'Jonami Beauty'} | Proyeksi 12 Bulan`]).font = { italic: true };
  ws1.addRow([]);

  addStyledRow(ws1, ['RINGKASAN HASIL SIMULASI'], true);
  const sumQtyRow = ws1.addRow(['Total pcs terjual', { formula: 'SUM(F24:F50)' }]);
  const sumOmzetRow = ws1.addRow(['Total omzet (Rp)', { formula: 'SUM(F60:F80)' }]);
  const sumHppRow = ws1.addRow(['Total HPP (Rp)', { formula: 'SUM(G60:G80)' }]);
  const sumLabaKotorRow = ws1.addRow(['Laba kotor (Rp)', { formula: 'SUM(H60:H80)' }]);
  ws1.addRow([]);

  // A. PARAMETER
  addStyledRow(ws1, ['A. PARAMETER CHANNEL PENJUALAN', 'Eceran', 'Reseller', 'Agen', 'Borongan', 'Catatan / sumber'], true);
  ws1.addRow(['Jalur penjualan', 'Marketplace', 'Transaksi langsung', 'Transaksi langsung', 'Distributor / clearance', '']);
  ws1.addRow(['Syarat minimum pcs per pesanan', 1, 12, 50, 200, 'Asumsi']);
  const komisiRow = ws1.addRow(['Komisi platform / marketplace (% omzet)', 0.1, 0, 0, 0, 'Asumsi platform']);
  const ongkirRow = ws1.addRow(['Ongkir ditanggung penjual (% omzet)', 0.016, 0, 0, 0, 'Asumsi ongkir']);
  
  [2,3,4,5].forEach(col => {
    komisiRow.getCell(col).fill = bgInput; komisiRow.getCell(col).font = fontInput;
    ongkirRow.getCell(col).fill = bgInput; ongkirRow.getCell(col).font = fontInput;
  });
  ws1.addRow([]);

  // B. HARGA
  addStyledRow(ws1, ['B. DAFTAR HARGA JUAL (Rp / pcs), HPP & STOK', 'HPP / pcs (Rp)', 'Harga Eceran', 'Harga Reseller', 'Harga Agen', 'Harga Borongan', 'Stok lama (pcs)'], true);
  const startRowHarga = ws1.rowCount + 1;
  inventory.forEach(item => {
    const r = ws1.addRow([item.name, item.costPerUnit, item.costPerUnit * 3, item.costPerUnit * 2.5, item.costPerUnit * 2, item.costPerUnit * 1.5, item.stock]);
    [3,4,5,6].forEach(col => { r.getCell(col).fill = bgInput; r.getCell(col).font = fontInput; });
  });
  ws1.addRow([]);

  // C. KUANTITAS
  addStyledRow(ws1, ['C. INPUT KUANTITAS PENJUALAN (pcs) – ubah sel kuning', 'Eceran', 'Reseller', 'Agen', 'Borongan', 'Total terjual', 'Sisa stok akhir'], true);
  const startRowQty = ws1.rowCount + 1;
  inventory.forEach((item, idx) => {
    const hRow = startRowHarga + idx;
    const rRow = startRowQty + idx;
    // Base simulation qty on equal distribution just for mock, users can change
    const defaultQty = 100; 
    const r = ws1.addRow([
      item.name, 
      defaultQty, defaultQty, defaultQty, defaultQty, 
      { formula: `SUM(B${rRow}:E${rRow})` },
      { formula: `G${hRow}-F${rRow}` }
    ]);
    [2,3,4,5].forEach(col => { r.getCell(col).fill = bgInput; r.getCell(col).font = fontInput; });
  });
  const endRowQty = ws1.rowCount;
  
  ws1.addRow([]);
  
  // D. OMZET & LABA
  addStyledRow(ws1, ['D & E. OMZET & LABA PER PRODUK (Rp)', 'Omzet', 'HPP', 'Laba kotor', 'Margin kotor', 'Komisi & ongkir', 'Laba kontribusi', 'Margin kontribusi'], true);
  const startRowOmzet = ws1.rowCount + 1;
  inventory.forEach((item, idx) => {
    const hRow = startRowHarga + idx;
    const qRow = startRowQty + idx;
    const rRow = startRowOmzet + idx;
    
    // Omzet = sum(qty * price)
    const formulaOmzet = `B${qRow}*C${hRow} + C${qRow}*D${hRow} + D${qRow}*E${hRow} + E${qRow}*F${hRow}`;
    // HPP = total qty * hpp
    const formulaHpp = `F${qRow}*B${hRow}`;
    // Laba Kotor = Omzet - HPP
    const formulaLK = `B${rRow}-C${rRow}`;
    // Komisi & Ongkir = Eceran Qty * Eceran Price * (Komisi% + Ongkir%) + ... (simplified)
    const formulaKomisi = `(B${qRow}*C${hRow}*(B${komisiRow.number}+B${ongkirRow.number}))`;
    // Laba kontribusi
    const formulaLKon = `D${rRow}-F${rRow}`;

    ws1.addRow([
      item.name, 
      { formula: formulaOmzet }, 
      { formula: formulaHpp }, 
      { formula: formulaLK }, 
      { formula: `IF(B${rRow}>0, D${rRow}/B${rRow}, 0)` },
      { formula: formulaKomisi },
      { formula: formulaLKon },
      { formula: `IF(B${rRow}>0, G${rRow}/B${rRow}, 0)` }
    ]);
  });

  // Fix up the references in Summary
  sumQtyRow.getCell(2).value = { formula: `SUM(F${startRowQty}:F${endRowQty})` };
  sumOmzetRow.getCell(2).value = { formula: `SUM(B${startRowOmzet}:B${ws1.rowCount})` };
  sumHppRow.getCell(2).value = { formula: `SUM(C${startRowOmzet}:C${ws1.rowCount})` };
  sumLabaKotorRow.getCell(2).value = { formula: `SUM(D${startRowOmzet}:D${ws1.rowCount})` };


  // ==========================================
  // SHEET 2: MODAL & PROYEKSI
  // ==========================================
  ws2.getColumn(1).width = 30;
  ws2.getColumn(2).width = 15;
  const monthNames = ['Okt 26','Nov 26','Des 26','Jan 27','Feb 27','Mar 27','Apr 27','Mei 27','Jun 27','Jul 27','Agu 27','Sep 27'];
  for (let i = 0; i < 12; i++) ws2.getColumn(i+3).width = 12;
  ws2.getColumn(15).width = 15; // Total 12 Bln

  ws2.addRow(['MODAL TAMBAHAN & PROYEKSI LABA RUGI – NERACA 12 BULAN']).font = { bold: true, size: 12, color: { argb: 'FF1F497D' } };
  ws2.addRow([]);

  // RINGKASAN
  addStyledRow(ws2, ['RINGKASAN HASIL 12 BULAN'], true);
  ws2.addRow(['Total tambahan modal usaha (Rp)', { formula: '1E.B30' }]); // Will map later
  ws2.addRow(['Laba (rugi) bersih 12 bulan (Rp)', { formula: 'O50' }]);
  ws2.addRow([]);

  // 1. TAMBAHAN MODAL
  addStyledRow(ws2, ['1. TAMBAHAN MODAL USAHA & RINCIAN'], true);
  addStyledRow(ws2, ['1B. BIAYA OPERASIONAL', 'Rp / bulan', 'Bulan didanai', 'Dana dialokasikan'], false, true);
  const rowOp = ws2.addRow(['Total biaya operasional', state.operationalCostPerMonth, state.monthsToFundOp, { formula: 'B11*C11' }]);
  rowOp.getCell(2).fill = bgInput; rowOp.getCell(2).font = fontInput;
  rowOp.getCell(3).fill = bgInput; rowOp.getCell(3).font = fontInput;
  
  addStyledRow(ws2, ['1C. BIAYA MARKETING', 'Rp / bulan', 'Bulan didanai', 'Dana dialokasikan'], false, true);
  const rowMkt = ws2.addRow(['Total biaya marketing', state.marketingCostPerMonth, state.monthsToFundMkt, { formula: 'B13*C13' }]);
  rowMkt.getCell(2).fill = bgInput; rowMkt.getCell(2).font = fontInput;
  rowMkt.getCell(3).fill = bgInput; rowMkt.getCell(3).font = fontInput;

  // 2. ASUMSI JADWAL
  ws2.addRow([]);
  addStyledRow(ws2, ['2. ASUMSI JADWAL & PARAMETER', ...monthNames, 'Total'], true);
  const rEceran = ws2.addRow(['Bobot Penjualan Eceran (%)', ...state.weights.eceran, { formula: 'SUM(B17:M17)' }]);
  const rReseller = ws2.addRow(['Bobot Penjualan Reseller (%)', ...state.weights.reseller, { formula: 'SUM(B18:M18)' }]);
  
  for(let col=2; col<=13; col++) {
    rEceran.getCell(col).fill = bgInput; rEceran.getCell(col).font = fontInput;
    rReseller.getCell(col).fill = bgInput; rReseller.getCell(col).font = fontInput;
  }
  
  ws2.addRow([]);

  // 3. LABA RUGI
  addStyledRow(ws2, ['3. LAPORAN LABA RUGI (Rp)', ...monthNames, 'Total 12 Bln'], true);
  const lrStart = ws2.rowCount + 1;
  
  // Pendapatan
  const rowPendapatan = ws2.addRow(['PENDAPATAN', ...Array(12).fill(0), 0]);
  for(let i=0; i<12; i++) {
    const cellRef = String.fromCharCode(66+i); // B, C, D...
    // Pendapatan Eceran = Total Omzet Eceran * Bobot bln ini / 100
    // Simplified: Total Omzet * Bobot
    rowPendapatan.getCell(i+2).value = { formula: `'Simulasi Penjualan'!B${sumOmzetRow.number} * ${cellRef}${rEceran.number} / 100` };
  }
  rowPendapatan.getCell(14).value = { formula: `SUM(B${lrStart}:M${lrStart})` };

  // HPP
  const rowHPP = ws2.addRow(['HPP', ...Array(12).fill(0), 0]);
  for(let i=0; i<12; i++) {
    const cellRef = String.fromCharCode(66+i);
    rowHPP.getCell(i+2).value = { formula: `'Simulasi Penjualan'!B${sumHppRow.number} * ${cellRef}${rEceran.number} / 100` };
  }
  rowHPP.getCell(14).value = { formula: `SUM(B${lrStart+1}:M${lrStart+1})` };

  // Laba Kotor
  const rowLK = ws2.addRow(['LABA KOTOR', ...Array(12).fill(0), 0]);
  for(let i=0; i<=12; i++) {
    const cellRef = String.fromCharCode(66+i);
    rowLK.getCell(i+2).value = { formula: `${cellRef}${lrStart} - ${cellRef}${lrStart+1}` };
  }

  // Operasional & Marketing
  const rowBebanOp = ws2.addRow(['Biaya Operasional', ...Array(12).fill({ formula: `B${rowOp.number}` }), { formula: `B${rowOp.number}*12` }]);
  const rowBebanMkt = ws2.addRow(['Biaya Marketing', ...Array(12).fill({ formula: `B${rowMkt.number}` }), { formula: `B${rowMkt.number}*12` }]);

  // Laba Bersih
  const rowLabaBersih = ws2.addRow(['LABA BERSIH', ...Array(12).fill(0), 0]);
  for(let i=0; i<=12; i++) {
    const cellRef = String.fromCharCode(66+i);
    rowLabaBersih.getCell(i+2).value = { formula: `${cellRef}${rowLK.number} - ${cellRef}${rowBebanOp.number} - ${cellRef}${rowBebanMkt.number}` };
  }

  ws2.addRow([]);
  
  // 4. ARUS KAS
  addStyledRow(ws2, ['4. ARUS KAS PROYEKSI', ...monthNames, 'Total 12 Bln'], true);
  const akStart = ws2.rowCount + 1;
  const rowKasBersih = ws2.addRow(['Arus Kas Operasi', ...Array(13).fill(0)]);
  for(let i=0; i<=12; i++) {
    const cellRef = String.fromCharCode(66+i);
    rowKasBersih.getCell(i+2).value = { formula: `${cellRef}${rowLabaBersih.number}` };
  }
  
  const rowKasAkhir = ws2.addRow(['SALDO KAS AKHIR', ...Array(13).fill(0)]);
  // Bulan 1 = Kas Awal + Arus kas
  rowKasAkhir.getCell(2).value = { formula: `50000000 + B${akStart}` }; // Kas awal = 50jt asumsi
  // Bulan 2+ = Kas Akhir bulan lalu + Arus kas
  for(let i=1; i<12; i++) {
    const cellRef = String.fromCharCode(66+i);
    const prevCell = String.fromCharCode(66+i-1);
    rowKasAkhir.getCell(i+2).value = { formula: `${prevCell}${rowKasAkhir.number} + ${cellRef}${akStart}` };
  }

  ws2.addRow([]);
  
  // 5. NERACA
  addStyledRow(ws2, ['5. NERACA PROYEKSI', ...monthNames], true);
  const rowAset = ws2.addRow(['ASET - Kas & Bank', ...Array(12).fill(0)]);
  for(let i=0; i<12; i++) {
    const cellRef = String.fromCharCode(66+i);
    rowAset.getCell(i+2).value = { formula: `${cellRef}${rowKasAkhir.number}` };
  }

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
