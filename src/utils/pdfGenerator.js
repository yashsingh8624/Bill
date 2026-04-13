import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const safeNum = (val) => parseFloat(val) || 0;
const fmt = (val) => safeNum(val).toFixed(2);

/**
 * Preload an image (base64 or URL) and ensure it's fully decoded before use.
 * Returns base64 data URL or null on failure.
 */
const preloadImage = async (src) => {
  if (!src) return null;
  try {
    // If already base64, just decode it
    if (src.startsWith('data:')) {
      const img = new Image();
      img.src = src;
      await img.decode();
      return src;
    }
    // If URL, fetch as base64 first
    const response = await fetch(src);
    const blob = await response.blob();
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    // Decode image to make sure it's ready
    const img = new Image();
    img.src = base64;
    await img.decode();
    return base64;
  } catch (error) {
    console.error('Failed to preload image:', error);
    return null;
  }
};

export const generateInvoicePDF = async (bill, settings = {}) => {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth(); // 210
    const pageH = doc.internal.pageSize.getHeight(); // 297
    const marginX = 15;
    let cursorY = 15;

    // --- COLORS ---
    const TEXT_MAIN = [30, 41, 59];      // slate-800
    const TEXT_MUTED = [100, 116, 139];  // slate-500
    const BORDER = [226, 232, 240];      // slate-200
    const ACCENT = [79, 70, 229];        // indigo-600

    // HELPER: Write text
    const writeText = (text, x, y, size = 10, color = TEXT_MAIN, font = 'helvetica', style = 'normal', align = 'left') => {
      doc.setFont(font, style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(String(text), x, y, { align });
    };

    // --- PRELOAD IMAGES ---
    const finalLogo = await preloadImage(settings.logo);
    const finalQr = await preloadImage(settings.qrImage);

    // --- HEADER SECTIONS ---
    // Header Left - Logo
    if (finalLogo) {
      try {
        doc.addImage(finalLogo, 'PNG', marginX, cursorY, 25, 25);
        writeText(settings.businessName || 'SmartBill Pro', marginX + 30, cursorY + 12, 20, TEXT_MAIN, 'helvetica', 'bold');
      } catch (e) {
        // Fallback if logo fails
        writeText(settings.businessName || 'SmartBill Pro', marginX, cursorY + 5, 20, TEXT_MAIN, 'helvetica', 'bold');
      }
    } else {
      writeText(settings.businessName || 'SmartBill Pro', marginX, cursorY + 5, 20, TEXT_MAIN, 'helvetica', 'bold');
    }
    
    // Header Right (INVOICE title)
    writeText('TAX INVOICE', pageW - marginX, cursorY + 5, 20, ACCENT, 'helvetica', 'bold', 'right');
    
    cursorY += (finalLogo ? 28 : 12);
    const headerLeftY = cursorY;

    // Business Details
    if (settings.businessAddress) {
      const addressLines = doc.splitTextToSize(settings.businessAddress, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(addressLines, marginX, cursorY);
      cursorY += addressLines.length * 4;
    }
    if (settings.ownerPhone) {
      writeText(`Phone: ${settings.ownerPhone}`, marginX, cursorY, 9, TEXT_MUTED);
      cursorY += 5;
    }
    if (settings.gstNumber) {
      writeText(`GSTIN: ${settings.gstNumber}`, marginX, cursorY, 9, TEXT_MAIN, 'helvetica', 'bold');
      cursorY += 5;
    }

    // Invoice Details Box (Right aligned)
    let rightY = headerLeftY;
    const dateStr = bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
    
    writeText('Invoice No:', pageW - marginX - 35, rightY, 9, TEXT_MUTED);
    writeText(String(bill.invoiceNo || 'DRAFT'), pageW - marginX, rightY, 9, TEXT_MAIN, 'helvetica', 'bold', 'right');
    rightY += 5;
    writeText('Date:', pageW - marginX - 35, rightY, 9, TEXT_MUTED);
    writeText(dateStr, pageW - marginX, rightY, 9, TEXT_MAIN, 'helvetica', 'bold', 'right');
    
    cursorY = Math.max(cursorY, rightY) + 8;

    // --- DIVIDER ---
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(marginX, cursorY, pageW - marginX, cursorY);
    cursorY += 8;

    // --- CUSTOMER DETAILS ---
    writeText('BILL TO', marginX, cursorY, 8, TEXT_MUTED, 'helvetica', 'bold');
    cursorY += 5;
    writeText(String(bill.customerName || 'Customer').toUpperCase(), marginX, cursorY, 11, TEXT_MAIN, 'helvetica', 'bold');
    cursorY += 5;
    if (bill.customerPhone) {
      writeText(`Phone: ${bill.customerPhone}`, marginX, cursorY, 9, TEXT_MUTED);
    }
    cursorY += 8;

    // --- ITEMS TABLE ---
    const tableRows = (bill.items || []).map((item, idx) => [
      idx + 1,
      item.name || 'Item',
      item.hsn || '—',
      safeNum(item.quantity) || 1,
      fmt(item.rate),
      safeNum(item.discount) > 0 ? `${safeNum(item.discount)}%` : '—',
      safeNum(item.gstRate) > 0 ? `${safeNum(item.gstRate)}%` : '0%',
      fmt(item.amount),
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [['#', 'Item Description', 'HSN', 'Qty', 'Rate (Rs)', 'Disc.', 'GST', 'Amount (Rs)']],
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
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'center', cellWidth: 15 },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
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

    cursorY = doc.lastAutoTable.finalY + 8;

    // --- SUMMARY SECTION ---
    // Extract totals
    const subTotal = safeNum(bill.subTotal);
    const totDiscount = safeNum(bill.totalDiscount);
    const taxableTotal = safeNum(bill.taxableTotal) || (subTotal - totDiscount);
    const cgst = safeNum(bill.cgst);
    const sgst = safeNum(bill.sgst);
    const prevBal = safeNum(bill.prevBalanceIncluded);
    const grandTotal = safeNum(bill.grandTotal);
    const amountPaid = safeNum(bill.amountPaid);
    const outstanding = Math.max(0, grandTotal - amountPaid);

    const summaryBoxX = pageW - marginX - 75;
    const summaryBoxW = 75;
    
    const drawSummaryRow = (label, value, isBold = false, addLine = false) => {
      if (addLine) {
        doc.setDrawColor(...BORDER);
        doc.line(summaryBoxX, cursorY - 3, pageW - marginX, cursorY - 3);
      }
      writeText(label, summaryBoxX, cursorY, 9, TEXT_MAIN, 'helvetica', isBold ? 'bold' : 'normal');
      writeText(`Rs ${value}`, pageW - marginX, cursorY, 9, TEXT_MAIN, 'helvetica', isBold ? 'bold' : 'normal', 'right');
      cursorY += 6;
    };

    drawSummaryRow('Subtotal', fmt(subTotal));
    if (totDiscount > 0) drawSummaryRow('Discount', `-${fmt(totDiscount)}`);
    
    // Taxable Amount line if discount exists
    if (totDiscount > 0) drawSummaryRow('Taxable Amount', fmt(taxableTotal), false, true);

    if (cgst > 0 || sgst > 0) {
      if (cgst > 0) drawSummaryRow('CGST', fmt(cgst));
      if (sgst > 0) drawSummaryRow('SGST', fmt(sgst));
    }
    
    if (prevBal > 0) {
      drawSummaryRow('Current Bill Total', fmt(grandTotal), true);
      drawSummaryRow('Previous Balance', fmt(prevBal), true);
      
      doc.setFillColor(...ACCENT);
      doc.rect(summaryBoxX, cursorY - 4, summaryBoxW, 9, 'F');
      writeText('TOTAL DUE', summaryBoxX + 2, cursorY + 2, 10, [255, 255, 255], 'helvetica', 'bold');
      writeText(`Rs ${fmt(grandTotal + prevBal)}`, pageW - marginX - 2, cursorY + 2, 10, [255, 255, 255], 'helvetica', 'bold', 'right');
      cursorY += 10;
    } else {
      doc.setFillColor(...TEXT_MAIN);
      doc.rect(summaryBoxX, cursorY - 4, summaryBoxW, 9, 'F');
      writeText('GRAND TOTAL', summaryBoxX + 2, cursorY + 2, 10, [255, 255, 255], 'helvetica', 'bold');
      writeText(`Rs ${fmt(grandTotal)}`, pageW - marginX - 2, cursorY + 2, 10, [255, 255, 255], 'helvetica', 'bold', 'right');
      cursorY += 10;
    }

    drawSummaryRow('Amount Paid', fmt(amountPaid), true);
    if (outstanding > 0) {
      drawSummaryRow('Outstanding Balance', fmt(outstanding), true);
    }
    
    writeText(`Payment Mode: ${bill.paymentMode || 'Cash'}`, summaryBoxX, cursorY, 8, TEXT_MUTED);

    // --- FOOTER SECTION (T&C and Bank Details) ---
    // Place footer dynamically near the bottom, or just below if page is long
    let footerY = Math.max(cursorY + 20, pageH - 68);
    
    // Check page break logic for footer
    if (footerY + 50 > pageH) {
       doc.addPage();
       footerY = 20;
    }

    doc.setDrawColor(...BORDER);
    doc.line(marginX, footerY, pageW - marginX, footerY);
    footerY += 6;

    // Terms & Conditions (Always left aligned, full width)
    const tc = settings.termsAndConditions || 'Goods once sold will not be taken back.';
    writeText('Terms & Conditions:', marginX, footerY, 8, TEXT_MAIN, 'helvetica', 'bold');
    const tcLines = doc.splitTextToSize(tc, pageW - (marginX * 2));
    doc.text(tcLines, marginX, footerY + 5);
    
    footerY += (tcLines.length * 4) + 8; // Adjust Y below Terms

    // 3-Column Footer Layout: Bank Details (Left), QR Code (Center), Signature (Right)
    const bottomSectionY = footerY;

    // Left: Bank Details
    if (settings.bankName || settings.bankAccount) {
      writeText('Bank Details:', marginX, bottomSectionY, 8, TEXT_MAIN, 'helvetica', 'bold');
      if (settings.bankName) writeText(`Bank: ${settings.bankName}`, marginX, bottomSectionY + 5, 8, TEXT_MUTED);
      if (settings.bankAccount) writeText(`Account: ${settings.bankAccount}`, marginX, bottomSectionY + 10, 8, TEXT_MUTED);
      if (settings.bankIFSC) writeText(`IFSC: ${settings.bankIFSC}`, marginX, bottomSectionY + 15, 8, TEXT_MUTED);
    }

    // Center: QR Code
    if (finalQr) {
      try {
        const qrSize = 25;
        const qrX = pageW / 2 - qrSize / 2;
        const qrY = bottomSectionY;
        doc.addImage(finalQr, 'PNG', qrX, qrY, qrSize, qrSize);
        writeText('Scan to Pay', pageW / 2, qrY + qrSize + 4, 8, TEXT_MUTED, 'helvetica', 'bold', 'center');
      } catch (e) {
        console.warn('QR image failed to render in PDF:', e);
      }
    }

    // Right: Signature Area
    const sigY = bottomSectionY + 10;
    writeText('Authorised Signatory', pageW - marginX, sigY + 10, 9, TEXT_MAIN, 'helvetica', 'bold', 'right');

    const safeName = String(bill.customerName || 'Customer').replace(/\s+/g, '_');
    const fileName = `Invoice_${bill.invoiceNo || 'Draft'}_${safeName}.pdf`;
    
    return { doc, fileName };

  } catch (err) {
    console.error('PDF Generation Error:', err);
    throw err;
  }
};
