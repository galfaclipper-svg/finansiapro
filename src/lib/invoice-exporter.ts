import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { id as dateFnsId } from "date-fns/locale";
import type { Invoice, Client } from "./types";

export const exportInvoiceToExcel = async (
  invoice: Invoice,
  client: Client,
  companyProfile: { name: string; email: string; phone: string; address: string }
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyProfile.name;
  workbook.created = new Date();

  // 1. Sheet "Siap Cetak"
  const printSheet = workbook.addWorksheet("Siap Cetak", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    },
    views: [{ showGridLines: false }],
  });

  // Set Column Widths for Print Sheet
  printSheet.columns = [
    { width: 3 }, // Spacer A
    { width: 30 }, // Deskripsi
    { width: 12 }, // Qty
    { width: 20 }, // Harga Satuan
    { width: 25 }, // Total
    { width: 3 }, // Spacer F
  ];

  // Helper styles
  const titleFont: Partial<ExcelJS.Font> = { size: 24, bold: true, color: { argb: "FF333333" } };
  const headerFont: Partial<ExcelJS.Font> = { size: 14, bold: true, color: { argb: "FF333333" } };
  const boldFont: Partial<ExcelJS.Font> = { size: 11, bold: true };
  const normalFont: Partial<ExcelJS.Font> = { size: 11 };
  
  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Fetch logo
  let logoId: number | null = null;
  try {
    const response = await fetch('/icon.png');
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      logoId = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
    }
  } catch (err) {
    console.error("Error loading logo for excel:", err);
  }

  if (logoId !== null) {
    printSheet.addImage(logoId, {
      tl: { col: 1, row: 1 }, // B2
      ext: { width: 100, height: 100 }
    });
  }

  // Row 2-4: INVOICE title & info on the right
  printSheet.mergeCells("D2:E2");
  const titleCell = printSheet.getCell("D2");
  titleCell.value = "INVOICE";
  titleCell.font = titleFont;
  titleCell.alignment = { vertical: "middle", horizontal: "right" };

  printSheet.mergeCells("D3:E3");
  printSheet.getCell("D3").value = `No. Tagihan: ${invoice.number}`;
  printSheet.getCell("D3").alignment = { horizontal: "right" };
  printSheet.getCell("D3").font = boldFont;

  printSheet.mergeCells("D4:E4");
  const tglFmt = format(new Date(invoice.date), "dd MMMM yyyy", { locale: dateFnsId });
  printSheet.getCell("D4").value = `Tanggal: ${tglFmt}`;
  printSheet.getCell("D4").alignment = { horizontal: "right" };

  printSheet.mergeCells("D5:E5");
  const dueFmt = format(new Date(invoice.dueDate), "dd MMMM yyyy", { locale: dateFnsId });
  printSheet.getCell("D5").value = `Jatuh Tempo: ${dueFmt}`;
  printSheet.getCell("D5").alignment = { horizontal: "right" };

  // Status LUNAS (Jika sudah dibayar)
  if (invoice.status === "paid") {
    printSheet.mergeCells("D6:E6");
    const statusCell = printSheet.getCell("D6");
    statusCell.value = "STATUS: LUNAS";
    statusCell.font = { size: 14, bold: true, color: { argb: "FF008000" } }; // Green
    statusCell.alignment = { horizontal: "right" };
  } else if (invoice.status === "cancelled") {
    printSheet.mergeCells("D6:E6");
    const statusCell = printSheet.getCell("D6");
    statusCell.value = "STATUS: DIBATALKAN";
    statusCell.font = { size: 14, bold: true, color: { argb: "FFFF0000" } }; // Red
    statusCell.alignment = { horizontal: "right" };
  }

  // Row 7-10: Info Perusahaan (di bawah logo)
  printSheet.mergeCells("B7:C7");
  const companyNameCell = printSheet.getCell("B7");
  companyNameCell.value = companyProfile.name;
  companyNameCell.font = headerFont;
  companyNameCell.alignment = { vertical: "middle", horizontal: "left" };

  printSheet.mergeCells("B8:C8");
  printSheet.getCell("B8").value = companyProfile.address;
  
  printSheet.mergeCells("B9:C9");
  printSheet.getCell("B9").value = companyProfile.phone;
  
  printSheet.mergeCells("B10:C10");
  printSheet.getCell("B10").value = companyProfile.email;

  // Row 12-15: Kepada Pelanggan
  printSheet.getCell("B12").value = "Ditagihkan Kepada:";
  printSheet.getCell("B12").font = { size: 10, italic: true, color: { argb: "FF666666" } };
  
  printSheet.getCell("B13").value = client.name;
  printSheet.getCell("B13").font = boldFont;
  
  printSheet.getCell("B14").value = client.address;
  printSheet.getCell("B15").value = client.phone;

  // Table Headers (Row 17)
  const headerRowIdx = 17;
  const headers = ["Deskripsi", "Kuantitas", "Harga Satuan", "Total"];
  const colKeys = ["B", "C", "D", "E"];

  headers.forEach((header, index) => {
    const cell = printSheet.getCell(`${colKeys[index]}${headerRowIdx}`);
    cell.value = header;
    cell.font = boldFont;
    cell.border = borderAll;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F0F0" },
    };
    cell.alignment = { vertical: "middle", horizontal: index === 0 ? "left" : "right" };
  });

  // Table Items
  let currentRow = headerRowIdx + 1;
  invoice.items.forEach((item) => {
    printSheet.getCell(`B${currentRow}`).value = item.description;
    printSheet.getCell(`B${currentRow}`).border = borderAll;
    
    printSheet.getCell(`C${currentRow}`).value = item.quantity;
    printSheet.getCell(`C${currentRow}`).border = borderAll;
    printSheet.getCell(`C${currentRow}`).alignment = { horizontal: "right" };
    
    printSheet.getCell(`D${currentRow}`).value = item.unitPrice;
    printSheet.getCell(`D${currentRow}`).numFmt = '"Rp"#,##0.00';
    printSheet.getCell(`D${currentRow}`).border = borderAll;
    printSheet.getCell(`D${currentRow}`).alignment = { horizontal: "right" };
    
    printSheet.getCell(`E${currentRow}`).value = item.total;
    printSheet.getCell(`E${currentRow}`).numFmt = '"Rp"#,##0.00';
    printSheet.getCell(`E${currentRow}`).border = borderAll;
    printSheet.getCell(`E${currentRow}`).alignment = { horizontal: "right" };
    
    currentRow++;
  });

  // Totals Area
  currentRow += 1; // Spasi
  
  // Subtotal
  printSheet.getCell(`D${currentRow}`).value = "Subtotal";
  printSheet.getCell(`D${currentRow}`).font = normalFont;
  printSheet.getCell(`E${currentRow}`).value = invoice.subTotal;
  printSheet.getCell(`E${currentRow}`).numFmt = '"Rp"#,##0.00';
  printSheet.getCell(`E${currentRow}`).alignment = { horizontal: "right" };
  
  // Tax
  if (invoice.taxRate > 0) {
    currentRow++;
    printSheet.getCell(`D${currentRow}`).value = `Pajak (${invoice.taxRate}%)`;
    printSheet.getCell(`D${currentRow}`).font = normalFont;
    printSheet.getCell(`E${currentRow}`).value = invoice.taxAmount;
    printSheet.getCell(`E${currentRow}`).numFmt = '"Rp"#,##0.00';
    printSheet.getCell(`E${currentRow}`).alignment = { horizontal: "right" };
  }

  // Grand Total
  currentRow++;
  printSheet.getCell(`D${currentRow}`).value = "TOTAL TAGIHAN";
  printSheet.getCell(`D${currentRow}`).font = boldFont;
  printSheet.getCell(`E${currentRow}`).value = invoice.totalAmount;
  printSheet.getCell(`E${currentRow}`).font = boldFont;
  printSheet.getCell(`E${currentRow}`).numFmt = '"Rp"#,##0.00';
  printSheet.getCell(`E${currentRow}`).alignment = { horizontal: "right" };

  // Notes
  if (invoice.notes) {
    currentRow += 3;
    printSheet.getCell(`B${currentRow}`).value = "Catatan:";
    printSheet.getCell(`B${currentRow}`).font = boldFont;
    currentRow++;
    printSheet.getCell(`B${currentRow}`).value = invoice.notes;
    // Allow text wrap for notes
    printSheet.getCell(`B${currentRow}`).alignment = { wrapText: true, vertical: "top" };
    printSheet.mergeCells(`B${currentRow}:E${currentRow+2}`);
  }

  // -----------------------------------------------------
  // 2. Sheet "Data Tagihan"
  const invoiceDataSheet = workbook.addWorksheet("Data Tagihan");
  invoiceDataSheet.columns = [
    { header: "No. Tagihan", key: "number", width: 20 },
    { header: "Tanggal", key: "date", width: 15 },
    { header: "Jatuh Tempo", key: "dueDate", width: 15 },
    { header: "ID Pelanggan", key: "clientId", width: 20 },
    { header: "Subtotal", key: "subTotal", width: 20 },
    { header: "Pajak (%)", key: "taxRate", width: 15 },
    { header: "Pajak (Rp)", key: "taxAmount", width: 20 },
    { header: "Total Tagihan", key: "totalAmount", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Catatan", key: "notes", width: 30 },
  ];

  invoiceDataSheet.addRow({
    number: invoice.number,
    date: format(new Date(invoice.date), "yyyy-MM-dd"),
    dueDate: format(new Date(invoice.dueDate), "yyyy-MM-dd"),
    clientId: invoice.clientId,
    subTotal: invoice.subTotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    status: invoice.status,
    notes: invoice.notes,
  });

  // Format currency in data sheet
  ['E', 'G', 'H'].forEach(col => {
    invoiceDataSheet.getColumn(col).numFmt = '"Rp"#,##0.00';
  });

  // Make header bold
  invoiceDataSheet.getRow(1).font = { bold: true };
  invoiceDataSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };

  // -----------------------------------------------------
  // 3. Sheet "Data Pelanggan"
  const clientDataSheet = workbook.addWorksheet("Data Pelanggan");
  clientDataSheet.columns = [
    { header: "ID Pelanggan", key: "id", width: 20 },
    { header: "Nama", key: "name", width: 30 },
    { header: "Email", key: "email", width: 25 },
    { header: "Telepon", key: "phone", width: 20 },
    { header: "Alamat", key: "address", width: 40 },
    { header: "Catatan", key: "notes", width: 30 },
  ];

  clientDataSheet.addRow({
    id: client.id,
    name: client.name,
    email: client.email || "-",
    phone: client.phone || "-",
    address: client.address || "-",
    notes: client.notes || "-",
  });

  clientDataSheet.getRow(1).font = { bold: true };
  clientDataSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };

  // Generate Excel Buffer and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Invoice_${invoice.number}.xlsx`);
};
