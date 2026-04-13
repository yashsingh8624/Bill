/**
 * Generates a WhatsApp share link for an invoice
 * @param {Object} bill - The bill object
 * @param {string} businessName - Company name
 * @returns {string} The encoded WhatsApp URL
 */
export const getWhatsAppLink = (bill, businessName = 'Our Shop') => {
  if (!bill) return '';
  const phone = bill.customerPhone ? bill.customerPhone.replace(/\D/g, '') : '';
  const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
  
  const itemsList = (bill.items || [])
    .map(item => `- ${item.name}: ${item.quantity} x ₹${parseFloat(item.rate).toFixed(2)}`)
    .join('\n');

  const message = `*Invoice from ${businessName}* 📄\n\n` +
    `Dear *${bill.customerName}*,\n` +
    `Your invoice *#${bill.invoiceNo}* has been generated successfully.\n\n` +
    `*Summary:*\n${itemsList}\n` +
    `--------------------------\n` +
    `*Net Total: ₹${parseFloat(bill.grandTotal || bill.total).toFixed(2)}*\n` +
    `Amount Paid: ₹${parseFloat(bill.amountPaid || 0).toFixed(2)}\n` +
    `Outstanding: ₹${parseFloat(bill.outstanding || 0).toFixed(2)}\n` +
    `--------------------------\n\n` +
    `Thank you for your business! 🙏`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
