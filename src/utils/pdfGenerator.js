import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const safeNum = (val) => parseFloat(val) || 0;
const fmt = (val) => safeNum(val).toFixed(2);

const numberToWords = (number) => {
    const num = Math.floor(safeNum(number));
    if (num === 0) return 'Zero Only';
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty ','Thirty ','Forty ','Fifty ', 'Sixty ','Seventy ','Eighty ','Ninety '];
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
    return str.trim() + ' Only';
};

const preloadImage = async (src) => {
  if (!src) return null;
  try {
    if (src.startsWith('data:')) {
      const img = new Image();
      img.src = src;
      await img.decode();
      return src;
    }
    const response = await fetch(src);
    const blob = await response.blob();
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
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
    if (!bill) throw new Error("Bill data is undefined");

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth(); 
    const pageH = doc.internal.pageSize.getHeight(); 
    const margin = 10;
    
    const writeText = (text, x, y, size = 10, align = 'left', isBold = false, color = [0,0,0], fontName = 'helvetica', italic = false) => {
      doc.setFont(fontName, italic ? 'italic' : (isBold ? 'bold' : 'normal'));
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(String(text || ''), x, y, { align });
    };

    const finalQr = await preloadImage(settings.qrImage);

    // Outer Border
    doc.setDrawColor(30, 41, 59); // slate-800
    doc.setLineWidth(1.0);
    doc.rect(margin, margin, pageW - 2 * margin, pageH - 2 * margin);
    
    // Inner Border
    doc.setLineWidth(0.3);
    const inMargin = margin + 1.5;
    const inW = pageW - 2 * inMargin;
    const inH = pageH - 2 * inMargin;
    doc.rect(inMargin, inMargin, inW, inH);

    let cursorY = inMargin;

    // Header Block
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(inMargin, cursorY, inW, 35, 'F');
    
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(inMargin + 3, cursorY + 2, 25, 5, 'FD');
    writeText('GST INVOICE', inMargin + 15.5, cursorY + 5.5, 7, 'center', true, [100, 116, 139]); 
    writeText('Original for Recipient', pageW - inMargin - 3, cursorY + 5.5, 7, 'right', true, [100, 116, 139]);

    cursorY += 14;
    writeText((settings.businessName || 'Business Name').toUpperCase(), pageW / 2, cursorY, 18, 'center', true, [15, 23, 42]);
    cursorY += 6;
    writeText(settings.businessAddress, pageW / 2, cursorY, 9, 'center', true, [51, 65, 85]);
    cursorY += 7;
    
    const detailsY = cursorY + 1;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect((pageW / 2) - 55, detailsY - 4, 38, 6, 'FD');
    writeText(`GSTIN: ${settings.gstNumber || 'N/A'}`, (pageW / 2) - 36, detailsY, 8, 'center', true, [30, 41, 59]);
    
    let infoStr = `Ph: ${settings.ownerPhone || 'N/A'}`;
    if (settings.email) infoStr += `   Email: ${settings.email}`;
    writeText(infoStr, (pageW / 2) - 10, detailsY, 8, 'left', true, [30, 41, 59]);

    cursorY += 6;
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.3);
    doc.line(inMargin, cursorY, pageW - inMargin, cursorY);
    
    // Info Block
    let blockStartY = cursorY;
    const midX = inMargin + (inW * 0.55);
    
    // Left side (Billed To)
    cursorY += 5;
    writeText('DETAILS OF RECEIVER (BILLED TO)', inMargin + 4, cursorY, 7, 'left', true, [100, 116, 139]);
    doc.setDrawColor(203, 213, 225);
    doc.line(inMargin + 4, cursorY + 2, midX - 4, cursorY + 2);
    
    let leftY = cursorY + 8;
    writeText((bill.customerName || 'N/A').toUpperCase(), inMargin + 4, leftY, 12, 'left', true, [15, 23, 42]);
    leftY += 5;
    
    const addrLines = doc.splitTextToSize(bill.customerAddress || 'N/A', midX - inMargin - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(addrLines, inMargin + 4, leftY);
    leftY += (addrLines.length * 4) + 2;
    writeText(`Ph: ${bill.customerPhone || 'N/A'}`, inMargin + 4, leftY, 9, 'left', true, [51, 65, 85]);
    leftY += 2;
    
    // Right side (Invoice Meta)
    let rightY = blockStartY + 8;
    const rX1 = midX + 4;
    const rX2 = pageW - inMargin - 4;
    
    doc.setFillColor(248, 250, 252); 
    doc.rect(midX, blockStartY, inW * 0.45, Math.max(leftY - blockStartY, 30), 'F');
    writeText('Invoice No:', rX1, rightY, 9, 'left', true, [71, 85, 105]);
    writeText(String(bill.invoiceNo || 'N/A'), rX2, rightY, 11, 'right', true, [15, 23, 42]);
    rightY += 8;
    writeText('Invoice Date:', rX1, rightY, 9, 'left', true, [71, 85, 105]);
    const dStr = bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
    writeText(dStr, rX2, rightY, 9, 'right', true, [15, 23, 42]);
    rightY += 8;
    writeText('Payment Mode:', rX1, rightY, 9, 'left', true, [71, 85, 105]);
    writeText(String(bill.paymentMode || 'N/A').toUpperCase(), rX2, rightY, 9, 'right', true, [15, 23, 42]);
    
    const blockEndY = Math.max(leftY, rightY);
    doc.setDrawColor(30, 41, 59);
    doc.line(midX, blockStartY, midX, blockEndY);
    doc.line(inMargin, blockEndY, pageW - inMargin, blockEndY);
    cursorY = blockEndY;

    // Table Section
    const tRows = (Array.isArray(bill.items) ? bill.items : []).map((i, idx) => [
      idx + 1,
      i.name || 'Item',
      '—', // HSN fallback
      safeNum(i.quantity) || 1,
      fmt(i.rate),
      safeNum(i.gstRate) > 0 ? `${safeNum(i.gstRate)}%` : '0%',
      fmt(i.amount),
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: inMargin, right: inMargin, bottom: inMargin + 36 + 22 }, 
      head: [['S.N.', 'Description of Goods', 'HSN/SAC', 'Qty', 'Rate', 'GST', 'Amount']],
      body: tRows,
      theme: 'plain',
      headStyles: {
        fillColor: [226, 232, 240],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10, textColor: [71, 85, 105], fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 'auto', textColor: [15, 23, 42], fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 18, 
            textColor: [148, 163, 184], fontSize: 7, font: 'courier' }, 
        3: { halign: 'center', cellWidth: 14, textColor: [30, 41, 59], fontStyle: 'bold', fillColor: [248, 250, 252] },
        4: { halign: 'right', cellWidth: 20, textColor: [15, 23, 42], fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 14, textColor: [71, 85, 105], fontStyle: 'bold' },
        6: { halign: 'right', cellWidth: 30, textColor: [15, 23, 42], fontStyle: 'bold' }
      },
      styles: {
        fontSize: 9, lineColor: [203, 213, 225], lineWidth: { bottom: 0.2 }, cellPadding: 3, valign: 'middle'
      },
      willDrawCell: function (data) {
        if (data.section === 'head' || data.section === 'body') {
          doc.setDrawColor(30, 41, 59);
          doc.setLineWidth(0.3);
          if (data.section === 'head') {
            doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
          if (data.column.index !== 6) {
             doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      }
    });

    cursorY = doc.lastAutoTable?.finalY || cursorY;
    
    // Fill remaining table vertical space dynamically
    let emptySpaceTargetY = inH + inMargin - 36 - 28; 
    if (cursorY < emptySpaceTargetY) {
       doc.setDrawColor(30, 41, 59);
       doc.setLineWidth(0.3);
       if (doc.lastAutoTable && doc.lastAutoTable.columns) {
         let currentX = inMargin;
         for (let i = 0; i < doc.lastAutoTable.columns.length - 1; i++) {
            currentX += doc.lastAutoTable.columns[i].width;
            doc.line(currentX, cursorY, currentX, emptySpaceTargetY);
         }
       }
       cursorY = emptySpaceTargetY;
    }
    
    doc.setDrawColor(30, 41, 59);
    doc.line(inMargin, cursorY, pageW - inMargin, cursorY);
    
    // Totals & Summary
    let tsY = cursorY;
    
    writeText('Amount in Words:', inMargin + 4, tsY + 5, 8, 'left', true, [100, 116, 139]);
    doc.setDrawColor(203, 213, 225);
    doc.line(inMargin + 4, tsY + 6.5, inMargin + 30, tsY + 6.5);
    
    const grandTotal = safeNum(bill.grandTotal);
    const prevBal = safeNum(bill.prevBalanceIncluded);
    const finalInvoiceTotal = safeNum(grandTotal + prevBal);
    
    writeText(`Rupees ${numberToWords(finalInvoiceTotal)}`, inMargin + 4, tsY + 11, 10, 'left', true, [15, 23, 42], 'helvetica', true);
    
    writeText('Terms & Conditions:', inMargin + 4, tsY + 22, 8, 'left', true, [100, 116, 139]);
    const tnc = settings.termsAndConditions || "1. Goods once sold will not be taken back.\n2. Subject to local Jurisdiction only.";
    const tncLines = doc.splitTextToSize(tnc, midX - inMargin - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(tncLines, inMargin + 4, tsY + 26);
    
    doc.setFillColor(248, 250, 252);
    doc.rect(midX, tsY, inW * 0.45, 36, 'F');
    doc.setDrawColor(30, 41, 59);
    doc.line(midX, tsY, midX, tsY + 36);
    doc.line(inMargin, tsY + 36, pageW - inMargin, tsY + 36);
    const rTotals = [
       { label: 'Taxable Value', value: fmt(bill.subTotal), color: [15,23,42], lineType: 1 },
       { label: 'Discount', value: `- ${fmt(bill.totalDiscount)}`, color: [225,29,72], lineType: 1 }, 
       { label: 'Tax (CGST + SGST)', value: fmt(safeNum(bill.cgst) + safeNum(bill.sgst)), color: [15,23,42], lineType: 2 },
    ];
    
    let ty = tsY;
    rTotals.forEach((rt) => {
       if (rt.lineType === 1) {
          doc.setDrawColor(203, 213, 225);
       } else {
          doc.setDrawColor(30, 41, 59);
          doc.setFillColor(255, 255, 255);
          doc.rect(midX, ty, inW * 0.45, 8, 'F');
       }
       writeText(rt.label.toUpperCase(), midX + 4, ty + 5, 8, 'left', true, [71, 85, 105]);
       writeText(`Rs ${rt.value}`, pageW - inMargin - 4, ty + 5, 9, 'right', true, rt.color);
       doc.line(midX, ty + 8, pageW - inMargin, ty + 8);
       ty += 8;
    });
    
    doc.setFillColor(30, 41, 59);
    doc.rect(midX, ty, inW * 0.45, 12, 'F');
    writeText('TOTAL INVOICE VALUE', midX + 4, ty + 7.5, 9, 'left', true, [255, 255, 255]);
    writeText(`Rs ${fmt(finalInvoiceTotal)}`, pageW - inMargin - 4, ty + 8, 14, 'right', true, [255, 255, 255]);

    cursorY = tsY + 36;
    
    // Footer Block
    let footY = cursorY + 4;
    
    if (settings.bankName || settings.bankAccount) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(inMargin, footY, 65, 22, 'FD');
      writeText('COMPANY BANK DETAILS', inMargin + 3, footY + 4, 8, 'left', true, [30, 41, 59]);
      doc.line(inMargin + 3, footY + 5, inMargin + 62, footY + 5);
      writeText('Bank:', inMargin + 3, footY + 10, 8, 'left', true, [100, 116, 139]);
      writeText(settings.bankName || 'N/A', inMargin + 18, footY + 10, 8, 'left', true, [15, 23, 42]);
      writeText('A/c No:', inMargin + 3, footY + 15, 8, 'left', true, [100, 116, 139]);
      writeText(settings.bankAccount || 'N/A', inMargin + 18, footY + 15, 8, 'left', true, [15, 23, 42], 'courier');
      writeText('IFSC:', inMargin + 3, footY + 20, 8, 'left', true, [100, 116, 139]);
      writeText(settings.bankIFSC || 'N/A', inMargin + 18, footY + 20, 8, 'left', true, [15, 23, 42], 'courier');
                }
    
    if (finalQr) {
      try {
        doc.setDrawColor(203, 213, 225);
        doc.rect(midX - 25, footY, 22, 22, 'S'); 
        doc.addImage(finalQr, 'PNG', midX - 24, footY + 1, 20, 20);
      } catch(e) {
        console.warn('QR image failed to render:', e);
      }
    }
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`For ${settings.businessName || 'Business'}`, pageW - inMargin - 25, footY + 5, { align: 'center' });
    
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(pageW - inMargin - 50, footY + 18, pageW - inMargin, footY + 18);
    writeText('AUTHORISED SIGNATORY', pageW - inMargin - 25, footY + 22, 8, 'center', true, [15, 23, 42]);

    const safeName = String(bill.customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Invoice_${bill.invoiceNo || 'Draft'}_${safeName}.pdf`;
    
    return { doc, fileName };

  } catch (err) {
    console.error('PDF Generation Error:', err);
    throw err;
  }
};
