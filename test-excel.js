const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();

const wsJournal = XLSX.utils.aoa_to_sheet([
  ['Tanggal', 'ID', 'Akun', 'Deskripsi', 'Debit', 'Kredit'],
  ['2024-01-01', 'TRX-1', 'Kas', 'Deposit', 1000, 0],
  ['2024-01-02', 'TRX-2', 'Sewa', 'Bayar Sewa', 0, 500],
  ['2024-01-03', 'TRX-3', 'Kas', 'Tarik Tunai', 0, 200]
]);
XLSX.utils.book_append_sheet(wb, wsJournal, 'Jurnal Umum');

const wsLedger = XLSX.utils.aoa_to_sheet([
  ['Buku Besar: Kas'],
  [],[],[],[],
]);

for(let i=0; i<5; i++) {
   let rowRef = 6 + i;
   let k = 'ROW()-5';
   let rowArray = "ROW('Jurnal Umum'!$C$2:$C$5000)/('Jurnal Umum'!$C$2:$C$5000=\"Kas\")";
   let agg = `AGGREGATE(15, 6, ${rowArray}, ${k})`;
   let createCol = (c) => `IFERROR(INDEX('Jurnal Umum'!${c}:${c}, ${agg}), "")`;
   
   XLSX.utils.sheet_add_aoa(wsLedger, [[
      {f: createCol('A')},
      {f: createCol('B')},
      {f: createCol('C')},
      {f: createCol('D')},
      {f: createCol('E')},
      {f: createCol('F')}
   ]], {origin: 'A'+rowRef});
}
XLSX.utils.book_append_sheet(wb, wsLedger, 'Kas');
XLSX.writeFile(wb, 'test_ledger.xlsx');
