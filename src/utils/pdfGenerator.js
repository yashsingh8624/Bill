import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoicePDF = (bill, settings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // -- Header Section --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(settings.businessName || 'SmartBill Pro', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Contact: ${settings.ownerPhone || ''}`, 20, 32);
  if (settings.gstNumber) {
    doc.text(`GSTIN: ${settings.gstNumber}`, 20, 37);
  }

  // Invoice Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text('INVOICE', pageWidth - 20, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Invoice #: ${bill.invoiceNo}`, pageWidth - 20, 32, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${bill.readableDate || new Date(bill.date).toLocaleDateString()}`, pageWidth - 20, 37, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(20, 45, pageWidth - 20, 45);

  // -- Bill To Section --
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(20, 50, (pageWidth - 40) / 2, 25, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO:', 25, 56);
  
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(bill.customerName.toUpperCase(), 25, 63);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Phone: ${bill.customerPhone || 'N/A'}`, 25, 69);

  // -- Table Section --
  const tableData = bill.items.map((item, index) => [
    index + 1,
    item.name,
    `₹${item.price.toFixed(2)}`,
    item.quantity,
    `₹${item.amount.toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 85,
    head: [['S.No', 'Item Description', 'Rate', 'Qty', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    }
  });

  // -- Summary Section --
  let finalY = doc.lastAutoTable.finalY + 10;
  
  const rightColX = pageWidth - 20;
  const labelX = rightColX - 50;

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  
  // Subtotal
  doc.text('Subtotal:', labelX, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`₹${bill.subTotal.toFixed(2)}`, rightColX, finalY, { align: 'right' });

  // GST if enabled
  if (bill.gstEnabled) {
    finalY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`GST (${bill.gstRate}%):`, labelX, finalY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`₹${((bill.cgst||0) + (bill.sgst||0)).toFixed(2)}`, rightColX, finalY, { align: 'right' });
  }

  // Prev Balance
  if (bill.prevBalanceIncluded > 0) {
    finalY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('Previous Udhaar:', labelX, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${bill.prevBalanceIncluded.toFixed(2)}`, rightColX, finalY, { align: 'right' });
  }

  // Grand Total Box
  finalY += 10;
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(labelX - 5, finalY - 6, 55, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('GRAND TOTAL:', labelX, finalY + 2);
  doc.text(`₹${bill.grandTotal.toFixed(2)}`, rightColX, finalY + 2, { align: 'right' });

  // Payment Status
  finalY += 15;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Mode:', labelX, finalY);
  doc.setTextColor(30, 41, 59);
  doc.text(bill.paymentMode, rightColX, finalY, { align: 'right' });

  finalY += 7;
  doc.setTextColor(100, 116, 139);
  doc.text('Amount Paid:', labelX, finalY);
  doc.setTextColor(22, 163, 74); // emerald-600
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${bill.amountPaid.toFixed(2)}`, rightColX, finalY, { align: 'right' });

  if (bill.outstanding > 0) {
    finalY += 7;
    doc.setTextColor(100, 116, 139);
    doc.text('Outstanding:', labelX, finalY);
    doc.setTextColor(220, 38, 38); // red-600
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${bill.outstanding.toFixed(2)}`, rightColX, finalY, { align: 'right' });
  }

  // -- Footer Section --
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Thank you for your business! This is a computer generated invoice.', pageWidth / 2, footerY, { align: 'center' });

  doc.save(`Invoice_${bill.invoiceNo}_${bill.customerName.replace(/\s+/g, '_')}.pdf`);
};
