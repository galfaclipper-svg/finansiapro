
import type { Account, CompanyProfile } from './types';

export const CHART_OF_ACCOUNTS: Account[] = [
  // Aset (Assets) - 1xxx
  { id: '1011', name: 'Kas Fisik', type: 'Assets', category: 'Current Assets', isSystem: true },
  { id: '1021', name: 'Kas Bank BCA', type: 'Assets', category: 'Current Assets' },
  { id: '1022', name: 'Bank BRI', type: 'Assets', category: 'Current Assets' },
  { id: '1023', name: 'Bank Mandiri', type: 'Assets', category: 'Current Assets' },
  { id: '1024', name: 'Bank Seabank', type: 'Assets', category: 'Current Assets' },
  { id: '1031', name: 'Dana', type: 'Assets', category: 'Current Assets' },
  { id: '1032', name: 'ShopeePay', type: 'Assets', category: 'Current Assets' },
  { id: '1033', name: 'GoPay', type: 'Assets', category: 'Current Assets' },
  { id: '1034', name: 'OVO', type: 'Assets', category: 'Current Assets' },
  { id: '1030', name: 'Piutang Usaha', type: 'Assets', category: 'Current Assets', isSystem: true },
  { id: '1040', name: 'Piutang Karyawan', type: 'Assets', category: 'Current Assets', isSystem: true },
  { id: '1050', name: 'Persediaan Barang Dagang', type: 'Assets', category: 'Current Assets', isSystem: true },
  { id: '1060', name: 'Sewa Dibayar di Muka', type: 'Assets', category: 'Current Assets' },
  { id: '1070', name: 'Asuransi Dibayar di Muka', type: 'Assets', category: 'Current Assets' },
  { id: '1210', name: 'Peralatan', type: 'Assets', category: 'Fixed Assets', isSystem: true },
  { id: '1215', name: 'Akumulasi Penyusutan - Peralatan', type: 'Assets', category: 'Fixed Assets', isSystem: true }, // Contra-Asset
  { id: '1310', name: 'Aset Tak Berwujud', type: 'Assets', category: 'Intangible Assets', isSystem: true },
  { id: '1315', name: 'Akumulasi Amortisasi', type: 'Assets', category: 'Intangible Assets', isSystem: true }, // Contra-Asset

  // Kewajiban (Liabilities) - 2xxx
  { id: '2010', name: 'Utang Usaha', type: 'Liabilities', category: 'Current Liabilities', isSystem: true },
  { id: '2020', name: 'Utang Gaji', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2030', name: 'Utang Pajak', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2040', name: 'Pendapatan Diterima di Muka', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2100', name: 'Utang Bank', type: 'Liabilities', category: 'Long-term Liabilities' },

  // Ekuitas (Equity) - 3xxx
  { id: '3010', name: 'Modal Pemilik', type: 'Equity', category: 'Owner Equity', isSystem: true },
  { id: '3020', name: 'Laba Ditahan', type: 'Equity', category: 'Owner Equity', isSystem: true },
  { id: '3030', name: 'Prive', type: 'Equity', category: 'Owner Equity', isSystem: true }, // Drawings

  // Pendapatan (Revenue) - 4xxx
  { id: '4010', name: 'Pendapatan Penjualan', type: 'Revenue', category: 'Sales Revenue', isSystem: true },
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
  { id: '5010', name: 'Harga Pokok Penjualan', type: 'Expenses', category: 'Cost of Goods Sold', isSystem: true },
  { id: '5100', name: 'Beban Pemasaran', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5110', name: 'Iklan Shopee', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5120', name: 'Iklan TikTok', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5125', name: 'Beban Komisi Marketplace', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5130', name: 'Iklan Instagram', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5135', name: 'Beban Pengiriman / Ekspedisi', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5140', name: 'Biaya Endorsement', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5145', name: 'Biaya Produksi Konten', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5210', name: 'Beban Gaji', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5215', name: 'Beban THR & Bonus Karyawan', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5220', name: 'Beban Sewa', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5230', name: 'Beban Bunga Bank', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5240', name: 'Beban Asuransi', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5250', name: 'Beban Listrik, Air, & Internet', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5255', name: 'Beban Retribusi & Kebersihan', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5260', name: 'Beban Perlengkapan Kantor', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5265', name: 'Beban Konsumsi Kantor', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5270', name: 'Beban Penyusutan', type: 'Expenses', category: 'Operating Expenses', isSystem: true },
  { id: '5280', name: 'Beban Amortisasi', type: 'Expenses', category: 'Operating Expenses', isSystem: true },
  { id: '5290', name: 'Beban Administrasi Bank', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5300', name: 'Kas Lebih/Kurang', type: 'Expenses', category: 'Operating Expenses', isSystem: true }, // Can also be Revenue
  { id: '5410', name: 'Beban Barang Rusak/Hilang', type: 'Expenses', category: 'Operating Expenses', isSystem: true },
  { id: '5420', name: 'Beban Sampel/Promosi', type: 'Expenses', category: 'Operating Expenses', isSystem: true },
  { id: '5990', name: 'Beban Lain-lain', type: 'Expenses', category: 'Operating Expenses' },
];


export const COA_CATEGORIES = CHART_OF_ACCOUNTS.map(account => account.name);

export const CASH_ACCOUNTS = [
  'Kas Bank BCA',
  'Kas Fisik',
  'Bank BRI',
  'Bank Mandiri',
  'Bank Seabank',
  'Dana',
  'ShopeePay',
  'GoPay',
  'OVO',
];

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: 'Nama Perusahaan Anda',
  address: 'Alamat Perusahaan Anda',
  reportRecipients: [],
};
