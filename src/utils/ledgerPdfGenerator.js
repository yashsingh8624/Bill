import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const safeNum = (val) => parseFloat(val) || 0;
const fmt = (val) => safeNum(val).toFixed(2);

export const generateLedgerPDF = (customer, ledgerEntries, totals, settings = {}) => {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 15;
    let cursorY = 15;

    // --- COLORS ---
    const TEXT_MAIN = [30, 41, 59];      // slate-800
    const TEXT_MUTED = [100, 116, 139];  // slate-500
    const BORDER = [226, 232, 240];      // slate-200
    const ACCENT = [79, 70, 229];        // indigo-600

    const writeText = (text, x, y, size = 10, color = TEXT_MAIN, font = 'helvetica', style = 'normal', align = 'left') => {
      doc.setFont(font, style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(String(text), x, y, { align });
    };

    // --- HEADER SECTIONS ---
    writeText(settings.businessName || 'SmartBill Pro', marginX, cursorY + 5, 18, TEXT_MAIN, 'helvetica', 'bold');
    writeText('CUSTOMER LEDGER', pageW - marginX, cursorY + 5, 16, ACCENT, 'helvetica', 'bold', 'right');
    
    cursorY += 12;

    if (settings.ownerPhone) {
      writeText(`Phone: ${settings.ownerPhone}`, marginX, cursorY, 9, TEXT_MUTED);
      cursorY += 5;
    }

    cursorY += 5;
    doc.setDrawColor(...BORDER);
    doc.line(marginX, cursorY, pageW - marginX, cursorY);
    cursorY += 8;

    // --- CUSTOMER DETAILS & SUMMARY ---
    writeText('CUSTOMER DETAILS', marginX, cursorY, 8, TEXT_MUTED, 'helvetica', 'bold');
    cursorY += 5;
    writeText(String(customer.name).toUpperCase(), marginX, cursorY, 11, TEXT_MAIN, 'helvetica', 'bold');
    if (customer.phone) {
      writeText(`Phone: ${customer.phone}`, marginX, cursorY + 5, 9, TEXT_MUTED);
    }
    
    // Right side Summary box
    const summaryX = pageW / 2;
    writeText('SUMMARY', summaryX, cursorY - 5, 8, TEXT_MUTED, 'helvetica', 'bold');
    writeText(`Total Billed: Rs ${fmt(totals.totalBilled)}`, summaryX, cursorY, 9, TEXT_MAIN);
    writeText(`Total Paid: Rs ${fmt(totals.totalPaid)}`, summaryX, cursorY + 5, 9, TEXT_MAIN);
    writeText(`Outstanding: Rs ${fmt(totals.outstanding)}`, summaryX, cursorY + 10, 9, [220, 38, 38], 'helvetica', 'bold');
    
    cursorY += 15;

    // --- LEDGER TABLE ---
    const tableRows = [];
    let runningBalance = 0;

    ledgerEntries.forEach((txn) => {
      const debit = (txn.type === 'SALE' || txn.type === 'OPENING') ? safeNum(txn.amount) : 0;
      const credit = (txn.type === 'PAYMENT' || txn.type === 'ROLLOVER') ? safeNum(txn.amount) : 0;
      runningBalance = runningBalance + debit - credit;

      tableRows.push([
        new Date(txn.date).toLocaleDateString(),
        txn.desc || txn.description || txn.type,
        debit > 0 ? fmt(debit) : '-',
        credit > 0 ? fmt(credit) : '-',
        fmt(runningBalance)
      ]);
    });

    autoTable(doc, {
      startY: cursorY + 5,
      margin: { left: marginX, right: marginX },
      head: [['Date', 'Description / Invoice', 'Total (Rs)', 'Paid (Rs)', 'Running Balance (Rs)']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [248, 250, 252], // slate-50
        textColor: TEXT_MAIN,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        lineColor: BORDER,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'left', cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 30, textColor: [220, 38, 38] }, // Red for Total
        3: { halign: 'right', cellWidth: 30, textColor: [22, 163, 74] }, // Green for Paid
        4: { halign: 'right', cellWidth: 35, fontStyle: 'bold', textColor: ACCENT }
      },
      styles: {
        fontSize: 9,
        textColor: TEXT_MAIN,
        lineColor: BORDER,
        lineWidth: 0.1,
        cellPadding: 4
      },
      alternateRowStyles: { fillColor: [255, 255, 255] }
    });

    // Footer
    let fy = doc.lastAutoTable.finalY + 15;
    doc.setDrawColor(...BORDER);
    doc.line(marginX, fy, pageW - marginX, fy);
    writeText('This is a computer-generated ledger statement.', pageW / 2, fy + 5, 8, TEXT_MUTED, 'helvetica', 'italic', 'center');

    const safeName = String(customer.name).replace(/\s+/g, '_');
    const fileName = `Ledger_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    return { doc, fileName };

  } catch (err) {
    console.error('Ledger PDF Generation Error:', err);
    throw err;
  }
};
