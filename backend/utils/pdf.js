const PDFDocument = require('pdfkit');

function buildSlipPdfBuffer({ companyName, monthKey, employee, totals, createdAt }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(companyName ? `Payroll Slip - ${companyName}` : 'Payroll Slip', { align: 'center' });

      doc
        .moveDown(0.5)
        .fontSize(12)
        .font('Helvetica')
        .text(`Month: ${monthKey}`);

      doc
        .fontSize(12)
        .text(`Generated: ${createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString()}`);

      doc.moveDown();

      // Employee
      doc.fontSize(13).font('Helvetica-Bold').text('Employee');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Name: ${employee?.employeeName || employee?.name || ''}`);
      doc.text(`Department: ${employee?.department || ''}`);

      if (employee?.baseSalaryMonthly != null) {
        doc.moveDown(0.5);
      }

      // Earnings/Deductions/Net
      doc.moveDown(0.5);
      doc.fontSize(13).font('Helvetica-Bold').text('Payroll');

      doc.fontSize(12).font('Helvetica');
      const base = Number(totals?.baseSalaryMonthly ?? totals?.base ?? 0);
      const deductions = Number(totals?.deductionsMonthly ?? totals?.deductions ?? 0);
      const bonuses = Number(totals?.bonusesMonthly ?? totals?.bonuses ?? 0);
      const net = Number(totals?.netSalary ?? totals?.net ?? (base + bonuses - deductions));

      // Simple table-like layout
      const rowY = doc.y;
      doc.text(`Base:`, 40, rowY);
      doc.text(`${base.toFixed(2)}`, 240, rowY);
      doc.text(`Bonuses:`, 40, rowY + 16);
      doc.text(`${bonuses.toFixed(2)}`, 240, rowY + 16);
      doc.text(`Deductions:`, 40, rowY + 32);
      doc.text(`${deductions.toFixed(2)}`, 240, rowY + 32);

      doc.font('Helvetica-Bold');
      doc.text(`Net Salary:`, 40, rowY + 52);
      doc.text(`${net.toFixed(2)}`, 240, rowY + 52);
      doc.font('Helvetica');

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#6b7280').text('Confidential', { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  buildSlipPdfBuffer
};

