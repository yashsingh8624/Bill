import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoicePDF = (bill, settings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Custom Constants
  const colPrimary = [79, 70, 229];    // Indigo 600
  const colText = [30, 41, 59];        // Slate 800
  const colMuted = [100, 116, 139];    // Slate 500
  const colBorder = [226, 232, 240];   // Slate 200
  const colGreen = [22, 163, 74];      // Emerald 600
  const colRed = [220, 38, 38];        // Red 600
  
  // -- Top Header Banner --
  doc.setFillColor(...colPrimary);
  doc.rect(0, 0, pageWidth, 15, 'F');
  
  // -- Header Section --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...colPrimary);
  doc.text(settings.businessName || 'SmartBill Pro', 20, 32);
  
  // Shop Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colMuted);
  let yOffset = 40;
  if (settings.ownerPhone) {
    doc.text(`Contact: ${settings.ownerPhone}`, 20, yOffset);
    yOffset += 5;
  }
  if (settings.gstNumber) {
    doc.text(`GSTIN: ${settings.gstNumber}`, 20, yOffset);
  }

  // Invoice Title Right
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colText);
  doc.text('INVOICE', pageWidth - 20, 32, { align: 'right' });
  
  // Invoice Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colText);
  doc.text(`Invoice No:`, pageWidth - 60, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.invoiceNo, pageWidth - 20, 40, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text(`Date:`, pageWidth - 60, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.readableDate || new Date(bill.date).toLocaleDateString(), pageWidth - 20, 46, { align: 'right' });

  // Divider
  doc.setDrawColor(...colBorder);
  doc.setLineWidth(0.5);
  doc.line(20, 52, pageWidth - 20, 52);

  // -- Bill To Section --
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(20, 57, (pageWidth - 40) / 2, 26, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colMuted);
  doc.text('BILL TO:', 24, 63);
  
  doc.setFontSize(12);
  doc.setTextColor(...colText);
  doc.text(bill.customerName.toUpperCase(), 24, 71);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colMuted);
  doc.text(`Phone: ${bill.customerPhone || 'N/A'}`, 24, 78);

  // -- Table Section --
  const tableData = bill.items.map((item, index) => [
    index + 1,
    item.name,
    `Rs ${item.price.toFixed(2)}`,
    item.quantity,
    `Rs ${item.amount.toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 95,
    head: [['#', 'ITEM DESCRIPTION', 'RATE', 'QTY', 'AMOUNT']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: colPrimary,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 6
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 35, fontStyle: 'bold', textColor: colText }
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: colBorder,
      lineWidth: 0.1,
      textColor: colText
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // -- Summary Section --
  let finalY = doc.lastAutoTable.finalY + 12;
  const rightColX = pageWidth - 20;
  const labelX = rightColX - 55;

  doc.setFontSize(10);
  doc.setTextColor(...colMuted);
  
  // Subtotal
  doc.text('Subtotal:', labelX, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colText);
  doc.text(`Rs ${bill.subTotal.toFixed(2)}`, rightColX, finalY, { align: 'right' });

  // GST if enabled
  if (bill.gstEnabled) {
    finalY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colMuted);
    doc.text(`GST (${bill.gstRate}%):`, labelX, finalY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colText);
    doc.text(`Rs ${((bill.cgst||0) + (bill.sgst||0)).toFixed(2)}`, rightColX, finalY, { align: 'right' });
  }

  // Prev Balance
  if (bill.prevBalanceIncluded > 0) {
    finalY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colMuted);
    doc.text('Previous Balance:', labelX, finalY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colText);
    doc.text(`Rs ${bill.prevBalanceIncluded.toFixed(2)}`, rightColX, finalY, { align: 'right' });
  }

  // Grand Total Box
  finalY += 12;
  doc.setFillColor(...colPrimary);
  doc.roundedRect(labelX - 5, finalY - 7, 65, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('GRAND TOTAL', labelX, finalY + 2);
  doc.text(`Rs ${bill.grandTotal.toFixed(2)}`, rightColX, finalY + 2, { align: 'right' });

  // Payment Status
  finalY += 16;
  doc.setFontSize(10);
  doc.setTextColor(...colMuted);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Mode:', labelX, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colText);
  doc.text(bill.paymentMode, rightColX, finalY, { align: 'right' });

  finalY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colMuted);
  doc.text('Amount Paid:', labelX, finalY);
  doc.setTextColor(...colGreen);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs ${bill.amountPaid.toFixed(2)}`, rightColX, finalY, { align: 'right' });

  if (Math.abs(bill.outstanding) > 0) {
    finalY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colMuted);
    doc.text('Outstanding Due:', labelX, finalY);
    
    // If negative outstanding, it means advance/credit
    if (bill.outstanding < 0) {
       doc.setTextColor(...colGreen);
       doc.setFont('helvetica', 'bold');
       doc.text(`Rs ${Math.abs(bill.outstanding).toFixed(2)} (CR)`, rightColX, finalY, { align: 'right' });
    } else {
       doc.setTextColor(...colRed);
       doc.setFont('helvetica', 'bold');
       doc.text(`Rs ${Math.abs(bill.outstanding).toFixed(2)}`, rightColX, finalY, { align: 'right' });
    }
  }

  // -- Footer Section --
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(...colBorder);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...colMuted);
  doc.text('Thank you for your business! This is a computer generated invoice.', pageWidth / 2, footerY, { align: 'center' });

  doc.save(`Invoice_${bill.invoiceNo}_${bill.customerName.replace(/\s+/g, '_')}.pdf`);
};
