import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const safeNum = (val) => parseFloat(val) || 0;
const fmt = (val) => safeNum(val).toFixed(2);

/**
 * Splits a long string into lines that fit within maxWidth pixels.
 */
const splitLines = (doc, text, maxWidth) => {
  if (!text) return [];
  return doc.splitTextToSize(String(text), maxWidth);
};

export const generateInvoicePDF = (bill, settings = {}) => {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();   // 210
    const pageH = doc.internal.pageSize.getHeight();  // 297
    const margin = 12;
    const contentW = pageW - margin * 2;

    // ── Colour Palette ─────────────────────────────────────────────
    const PRIMARY   = [30, 64, 175];    // Blue-800
    const TEXT      = [15, 23, 42];     // Slate-950
    const MUTED     = [100, 116, 139];  // Slate-500
    const BORDER    = [203, 213, 225];  // Slate-300
    const LIGHT_BG  = [248, 250, 252];  // Slate-50
    const GREEN     = [22, 163, 74];
    const RED       = [220, 38, 38];
    const AMBER     = [180, 83, 9];
    const WHITE     = [255, 255, 255];

    // ── Top Colour Bar ─────────────────────────────────────────────
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageW, 8, 'F');

    // ── Business Name (left) ───────────────────────────────────────
    let y = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...PRIMARY);
    doc.text(String(settings.businessName || 'SmartBill Pro'), margin, y);

    // Business address + phone + GSTIN
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    if (settings.businessAddress) {
      const addrLines = splitLines(doc, settings.businessAddress, contentW / 2 - 5);
      doc.text(addrLines, margin, y);
      y += addrLines.length * 4;
    }
    if (settings.ownerPhone) {
      doc.text(`Phone: ${settings.ownerPhone}`, margin, y);
      y += 4;
    }
    if (settings.gstNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT);
      doc.text(`GSTIN: ${settings.gstNumber}`, margin, y);
      y += 4;
    }

    // ── TAX INVOICE (right) ────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...PRIMARY);
    doc.text('TAX INVOICE', pageW - margin, 18, { align: 'right' });

    // Invoice box
    const infoBoxX = pageW / 2 + 5;
    const infoBoxW = pageW / 2 - margin - 5;
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(infoBoxX, 22, infoBoxW, 20, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('Invoice No.', infoBoxX + 4, 30);
    doc.text('Date', infoBoxX + 4, 37);

    const dateStr = bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'bold');
    doc.text(String(bill.invoiceNo || 'DRAFT'), pageW - margin - 2, 30, { align: 'right' });
    doc.text(dateStr, pageW - margin - 2, 37, { align: 'right' });

    // ── Divider ─────────────────────────────────────────────────────
    const divY = Math.max(y + 2, 45);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin, divY, pageW - margin, divY);

    // ── Bill To Section ─────────────────────────────────────────────
    const billToY = divY + 4;
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, billToY, (contentW / 2) - 4, 22, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('BILL TO', margin + 4, billToY + 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(String(bill.customerName || 'Customer').toUpperCase(), margin + 4, billToY + 13);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`Ph: ${bill.customerPhone || 'N/A'}`, margin + 4, billToY + 19);

    // ── Items Table ─────────────────────────────────────────────────
    const tableStartY = billToY + 26;

    // Build table rows
    const tableRows = (bill.items || []).map((item, idx) => {
      const discCell = safeNum(item.discount) > 0 ? `${safeNum(item.discount)}%` : '—';
      const gstCell  = safeNum(item.gstRate) > 0  ? `${safeNum(item.gstRate)}%`  : '0%';
      return [
        idx + 1,
        item.name || 'Item',
        item.hsn || '—',
        item.size || '—',
        safeNum(item.quantity) || 1,
        `${fmt(item.rate)}`,
        discCell,
        gstCell,
        `${fmt(item.amount)}`,
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Item Description', 'HSN', 'Size', 'Qty', 'Rate (₹)', 'Disc.', 'GST', 'Amount (₹)']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: PRIMARY,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'left',   cellWidth: 48 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'center', cellWidth: 10 },
        5: { halign: 'right',  cellWidth: 22 },
        6: { halign: 'center', cellWidth: 14 },
        7: { halign: 'center', cellWidth: 12 },
        8: { halign: 'right',  cellWidth: 24, fontStyle: 'bold', textColor: TEXT },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        lineColor: BORDER,
        lineWidth: 0.2,
        textColor: TEXT,
      },
      alternateRowStyles: { fillColor: LIGHT_BG },
    });

    // ── Totals Section ─────────────────────────────────────────────
    let fy = doc.lastAutoTable.finalY + 6;
    const totBoxX = pageW / 2 + 10;
    const totBoxW = pageW - margin - totBoxX;

    // Derive values safely
    const subTotal      = safeNum(bill.subTotal);
    const totalDiscount = safeNum(bill.totalDiscount);
    const cgst          = safeNum(bill.cgst);
    const sgst          = safeNum(bill.sgst);
    const totalGST      = cgst + sgst;
    const prevBal       = safeNum(bill.prevBalanceIncluded);
    const amountPaid    = safeNum(bill.amountPaid);
    // Recompute grandTotal to ensure accuracy
    const grandTotal    = subTotal + totalGST - totalDiscount + prevBal;
    const outstanding   = Math.max(0, grandTotal - amountPaid);

    // Helper to draw a total row
    const drawTotRow = (label, value, opts = {}) => {
      const { bold = false, color = TEXT, highlight = false, topLine = false } = opts;
      if (topLine) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(totBoxX, fy - 1, pageW - margin, fy - 1);
      }
      doc.setFontSize(highlight ? 10 : 8.5);
      doc.setFont('helvetica', bold || highlight ? 'bold' : 'normal');
      doc.setTextColor(...color);
      doc.text(label, totBoxX + 2, fy);
      doc.text(`Rs ${value}`, pageW - margin, fy, { align: 'right' });
      fy += highlight ? 8 : 6;
    };

    // ── Totals Box background ────────────────────────────────────────
    // Pre-calculate height
    const totRows  = 2 + (totalDiscount > 0 ? 1 : 0) + (totalGST > 0 ? 2 : 0) + (prevBal > 0 ? 1 : 0) + 1 + (outstanding > 0 ? 1 : 0);
    const boxH     = totRows * 6 + 16;
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(totBoxX - 2, fy - 4, totBoxW + 2, boxH, 2, 2, 'FD');

    drawTotRow('Subtotal', fmt(subTotal));
    if (totalDiscount > 0) {
      drawTotRow('Discount (−)', fmt(totalDiscount), { color: AMBER });
    }
    if (totalGST > 0) {
      drawTotRow(`CGST`, fmt(cgst));
      drawTotRow(`SGST`, fmt(sgst));
    }
    if (prevBal > 0) {
      drawTotRow('Previous Balance', fmt(prevBal), { color: AMBER, bold: true });
    }

    // Grand Total — highlighted box
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(totBoxX - 2, fy - 4, totBoxW + 2, 11, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('GRAND TOTAL', totBoxX + 2, fy + 2);
    doc.text(`Rs ${fmt(grandTotal)}`, pageW - margin, fy + 2, { align: 'right' });
    fy += 12;

    // Paid / Outstanding
    drawTotRow('Amount Paid', fmt(amountPaid), { bold: true, color: GREEN, topLine: true });
    if (outstanding > 0) {
      drawTotRow('Outstanding Due', fmt(outstanding), { bold: true, color: RED });
    }

    // Payment mode
    fy += 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`Payment Mode: ${bill.paymentMode || 'Cash'}`, totBoxX + 2, fy);
    fy += 8;

    // ── Signature Line (right) ─────────────────────────────────────
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.3);
    doc.line(pageW - margin - 50, fy, pageW - margin, fy);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...MUTED);
    doc.text('Authorised Signature', pageW - margin - 25, fy + 4, { align: 'center' });

    // ── Footer ─────────────────────────────────────────────────────
    const footerY = pageH - 28;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, pageW - margin, footerY);

    // Left: Terms & Conditions
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text('Terms & Conditions:', margin, footerY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const tc = settings.termsAndConditions || 'Goods once sold will not be taken back. Subject to local jurisdiction.';
    const tcLines = splitLines(doc, tc, contentW / 2 - 5);
    doc.text(tcLines, margin, footerY + 10);

    // Right: Bank Details
    if (settings.bankName || settings.bankAccount) {
      const bx = pageW / 2 + 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT);
      doc.setFontSize(7.5);
      doc.text('Bank Details:', bx, footerY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      if (settings.bankName)    doc.text(`Bank: ${settings.bankName}`, bx, footerY + 10);
      if (settings.bankAccount) doc.text(`A/c No.: ${settings.bankAccount}`, bx, footerY + 15);
      if (settings.bankIFSC)    doc.text(`IFSC: ${settings.bankIFSC}`, bx, footerY + 20);
    } else {
      // Powered by line
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...MUTED);
      doc.text('This is a computer-generated invoice. No signature required.', pageW / 2, footerY + 10, { align: 'center' });
    }

    // Bottom bar
    doc.setFillColor(...PRIMARY);
    doc.rect(0, pageH - 5, pageW, 5, 'F');

    const safeName = String(bill.customerName || 'Customer').replace(/\s+/g, '_');
    doc.save(`TaxInvoice_${bill.invoiceNo || 'Draft'}_${safeName}.pdf`);

  } catch (err) {
    console.error('[PDF Generator] Error:', err);
    alert('PDF generation failed: ' + (err?.message || err));
  }
};
