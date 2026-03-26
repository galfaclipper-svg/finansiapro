
import type { Account, CompanyProfile, InventoryItem, Transaction } from './types';

export const CHART_OF_ACCOUNTS: Account[] = [
  // Aset (Assets) - 1xxx
  { id: '1010', name: 'Kas', type: 'Assets', category: 'Current Assets' },
  { id: '1020', name: 'Bank', type: 'Assets', category: 'Current Assets' },
  { id: '1030', name: 'Piutang Usaha', type: 'Assets', category: 'Current Assets' },
  { id: '1040', name: 'Piutang Karyawan', type: 'Assets', category: 'Current Assets' },
  { id: '1050', name: 'Persediaan Barang Dagang', type: 'Assets', category: 'Current Assets' },
  { id: '1060', name: 'Sewa Dibayar di Muka', type: 'Assets', category: 'Current Assets' },
  { id: '1070', name: 'Asuransi Dibayar di Muka', type: 'Assets', category: 'Current Assets' },
  { id: '1210', name: 'Peralatan', type: 'Assets', category: 'Fixed Assets' },
  { id: '1215', name: 'Akumulasi Penyusutan - Peralatan', type: 'Assets', category: 'Fixed Assets' }, // Contra-Asset
  { id: '1310', name: 'Aset Tak Berwujud', type: 'Assets', category: 'Intangible Assets' },
  { id: '1315', name: 'Akumulasi Amortisasi', type: 'Assets', category: 'Intangible Assets' }, // Contra-Asset

  // Kewajiban (Liabilities) - 2xxx
  { id: '2010', name: 'Utang Usaha', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2020', name: 'Utang Gaji', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2030', name: 'Utang Pajak', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2040', name: 'Pendapatan Diterima di Muka', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2100', name: 'Utang Bank', type: 'Liabilities', category: 'Long-term Liabilities' },

  // Ekuitas (Equity) - 3xxx
  { id: '3010', name: 'Modal Pemilik', type: 'Equity', category: 'Owner Equity' },
  { id: '3020', name: 'Laba Ditahan', type: 'Equity', category: 'Owner Equity' },
  { id: '3030', name: 'Prive', type: 'Equity', category: 'Owner Equity' }, // Drawings

  // Pendapatan (Revenue) - 4xxx
  { id: '4010', name: 'Pendapatan Penjualan', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4011', name: 'Pendapatan Penjualan (Shopee)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4012', name: 'Pendapatan Penjualan (TikTok)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4013', name: 'Pendapatan Penjualan (Facebook)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4014', name: 'Pendapatan Penjualan (lynk.id)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4015', name: 'Pendapatan Penjualan (WhatsApp)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4016', name: 'Pendapatan Penjualan (Website)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4020', name: 'Pendapatan Bunga Bank', type: 'Revenue', category: 'Other Revenue' },
  { id: '4030', name: 'Pendapatan Lain-lain', type: 'Revenue', category: 'Other Revenue' },
  { id: '4031', name: 'Pendapatan Produk Lainnya', type: 'Revenue', category: 'Other Revenue' },

  // Beban (Expenses) - 5xxx
  { id: '5010', name: 'Harga Pokok Penjualan', type: 'Expenses', category: 'Cost of Goods Sold' },
  { id: '5110', name: 'Iklan Shopee', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5120', name: 'Iklan TikTok', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5130', name: 'Iklan Instagram', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5140', name: 'Biaya Endorsement', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5210', name: 'Beban Gaji', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5220', name: 'Beban Sewa', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5230', name: 'Beban Bunga Bank', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5240', name: 'Beban Asuransi', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5250', name: 'Beban Listrik, Air, & Internet', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5260', name: 'Beban Perlengkapan Kantor', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5270', name: 'Beban Penyusutan', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5280', name: 'Beban Amortisasi', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5290', name: 'Beban Administrasi Bank', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5300', name: 'Kas Lebih/Kurang', type: 'Expenses', category: 'Operating Expenses' }, // Can also be Revenue
  { id: '5990', name: 'Beban Lain-lain', type: 'Expenses', category: 'Operating Expenses' },
];


export const COA_CATEGORIES = CHART_OF_ACCOUNTS.map(account => account.name);

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: 'FinansiaPro Demo Store',
  address: '123 E-Commerce Ave, Online City, 12345',
};

// Function to generate a date string for the last N days
const pastDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

export const MOCK_TRANSACTIONS: Transaction[] = [
    // Equity & Initial Funding
    { id: 'TRN001', date: pastDate(90), description: 'Setoran Modal Awal Pemilik', amount: 75000000, type: 'cash-in', category: 'Modal Pemilik', accountId: '3010' },
    { id: 'TRN002', date: pastDate(20), description: 'Penarikan dana oleh pemilik (Prive)', amount: 2500000, type: 'cash-out', category: 'Prive', accountId: '3030' },
    
    // Revenue from various channels
    { id: 'TRN101', date: pastDate(5), description: 'Penjualan Kemeja A via Shopee', amount: 750000, type: 'cash-in', category: 'Pendapatan Penjualan (Shopee)', accountId: '4011', itemId: 'INV001', quantity: 5 },
    { id: 'TRN102', date: pastDate(4), description: 'Penjualan Celana B di TikTok Shop', amount: 1250000, type: 'cash-in', category: 'Pendapatan Penjualan (TikTok)', accountId: '4012', itemId: 'INV002', quantity: 5 },
    { id: 'TRN103', date: pastDate(3), description: 'Penjualan Baju C via Website', amount: 475000, type: 'cash-in', category: 'Pendapatan Penjualan (Website)', accountId: '4016', itemId: 'INV003', quantity: 5 },
    { id: 'TRN104', date: pastDate(2), description: 'Order custom via WhatsApp', amount: 950000, type: 'cash-in', category: 'Pendapatan Penjualan (WhatsApp)', accountId: '4015' },
    { id: 'TRN105', date: pastDate(1), description: 'Penjualan dari link lynk.id', amount: 300000, type: 'cash-in', category: 'Pendapatan Penjualan (lynk.id)', accountId: '4014' },
    { id: 'TRN106', date: pastDate(1), description: 'Penjualan via Facebook Marketplace', amount: 250000, type: 'cash-in', category: 'Pendapatan Penjualan (Facebook)', accountId: '4013' },
    { id: 'TRN107', date: pastDate(10), description: 'Jasa desain logo untuk klien', amount: 1500000, type: 'cash-in', category: 'Pendapatan Produk Lainnya', accountId: '4031' },
    { id: 'TRN108', date: pastDate(12), description: 'Bunga dari tabungan bank', amount: 45000, type: 'cash-in', category: 'Pendapatan Bunga Bank', accountId: '4020' },
    { id: 'TRN109', date: pastDate(15), description: 'Hasil penjualan aset kantor bekas', amount: 500000, type: 'cash-in', category: 'Pendapatan Lain-lain', accountId: '4030' },

    // Operating Expenses
    { id: 'TRN201', date: pastDate(30), description: 'Biaya Iklan Meta (Facebook & IG)', amount: 1200000, type: 'cash-out', category: 'Iklan Instagram', accountId: '5130' },
    { id: 'TRN202', date: pastDate(28), description: 'Top up saldo iklan TikTok Ads', amount: 1000000, type: 'cash-out', category: 'Iklan TikTok', accountId: '5120' },
    { id: 'TRN203', date: pastDate(25), description: 'Biaya promosi di Shopee', amount: 750000, type: 'cash-out', category: 'Iklan Shopee', accountId: '5110' },
    { id: 'TRN204', date: pastDate(15), description: 'Pembayaran jasa endorsement ke Influencer A', amount: 2000000, type: 'cash-out', category: 'Biaya Endorsement', accountId: '5140' },
    { id: 'TRN205', date: pastDate(2), description: 'Pembayaran Gaji Karyawan - Periode Bulan Ini', amount: 15000000, type: 'cash-out', category: 'Beban Gaji', accountId: '5210' },
    { id: 'TRN206', date: pastDate(5), description: 'Pembayaran sewa kantor/gudang bulan ini', amount: 5000000, type: 'cash-out', category: 'Beban Sewa', accountId: '5220' },
    { id: 'TRN207', date: pastDate(3), description: 'Tagihan Listrik, Air, dan Internet', amount: 1250000, type: 'cash-out', category: 'Beban Listrik, Air, & Internet', accountId: '5250' },
    { id: 'TRN208', date: pastDate(10), description: 'Pembelian ATK dan perlengkapan kantor', amount: 450000, type: 'cash-out', category: 'Beban Perlengkapan Kantor', accountId: '5260' },
    { id: 'TRN209', date: pastDate(1), description: 'Biaya administrasi bulanan Bank', amount: 25000, type: 'cash-out', category: 'Beban Administrasi Bank', accountId: '5290' },
    { id: 'TRN210', date: pastDate(1), description: 'Bunga pinjaman bank', amount: 350000, type: 'cash-out', category: 'Beban Bunga Bank', accountId: '5230' },
    { id: 'TRN211', date: pastDate(6), description: 'Biaya tak terduga (jamuan klien)', amount: 250000, type: 'cash-out', category: 'Beban Lain-lain', accountId: '5990' },
    { id: 'TRN212', date: pastDate(31), description: 'Kekurangan kas saat opname kas kecil', amount: 15000, type: 'cash-out', category: 'Kas Lebih/Kurang', accountId: '5300' },


    // Asset & Liability related transactions
    { id: 'TRN301', date: pastDate(60), description: 'Pembelian 100pcs Kemeja A dari Pemasok', amount: 10000000, type: 'cash-out', category: 'Persediaan Barang Dagang', accountId: '1050', itemId: 'INV001', quantity: 100 },
    { id: 'TRN302', date: pastDate(50), description: 'Pembelian 50pcs Celana B dari Pemasok', amount: 7500000, type: 'cash-out', category: 'Persediaan Barang Dagang', accountId: '1050', itemId: 'INV002', quantity: 50 },
    { id: 'TRN303', date: pastDate(40), description: 'Pembelian 200pcs Baju C dari Pemasok', amount: 10000000, type: 'cash-out', category: 'Persediaan Barang Dagang', accountId: '1050', itemId: 'INV003', quantity: 200 },
    { id: 'TRN304', date: pastDate(80), description: 'Pembelian Komputer untuk Kantor', amount: 15000000, type: 'cash-out', category: 'Peralatan', accountId: '1210' },
    { id: 'TRN305', date: pastDate(70), description: 'Pembayaran sewa ruko untuk 1 tahun', amount: 5000000, type: 'cash-out', category: 'Sewa Dibayar di Muka', accountId: '1060' },
    { id: 'TRN306', date: pastDate(70), description: 'Pembayaran premi asuransi kebakaran untuk 1 tahun', amount: 2400000, type: 'cash-out', category: 'Asuransi Dibayar di Muka', accountId: '1070' },
    { id: 'TRN307', date: pastDate(25), description: 'Kasbon untuk perjalanan dinas Budi', amount: 750000, type: 'cash-out', category: 'Piutang Karyawan', accountId: '1040' },
    
    // Non-cash adjustment entries
    { id: 'TRN401', date: pastDate(1), description: 'Penyusutan Peralatan Bulan Ini', amount: 250000, type: 'cash-out', category: 'Beban Penyusutan', accountId: '5270' },

];


export const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'INV001', name: 'Kemeja A', sku: 'KMJ-A-01', stock: 50, costPerUnit: 100000, salePrice: 150000 },
    { id: 'INV002', name: 'Celana B', sku: 'CLN-B-01', stock: 30, costPerUnit: 150000, salePrice: 250000 },
    { id: 'INV003', name: 'Baju C', sku: 'BJU-C-01', stock: 100, costPerUnit: 50000, salePrice: 95000 },
];
