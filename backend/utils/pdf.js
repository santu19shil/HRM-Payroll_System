const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function buildSlipPdfBuffer({ companyName, companyAddress, companyLogo, monthKey, employee, earnings, deductions, employer, totals, paidDays, workingDays, createdAt }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const startY = doc.y;
      let logoBottom = startY;

      if (companyLogo) {
        try {
          const logoPath = path.join(__dirname, '..', companyLogo.replace(/^\//, ''));
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, startY, { fit: [55, 55] });
            logoBottom = startY + 55;
          }
        } catch (_) { /* ignore */ }
      }

      doc.fontSize(18).font('Helvetica-Bold').text(companyName || 'Payroll Slip', 105, startY, { width: 420 });
      doc.fontSize(9).font('Helvetica').text(companyAddress || '', 105, doc.y, { width: 420 });

      doc.y = Math.max(logoBottom, doc.y) + 12;
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.4);
      doc.fontSize(15).font('Helvetica-Bold').text(`Payslip for ${monthKey}`, { align: 'center' });
      doc.moveDown(0.5);

      const empName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.name || '';
      const printDate = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.fontSize(10).font('Helvetica');
      doc.text('Employee Name:', 40, doc.y).text(empName, 140, doc.y - doc.currentLineHeight());
      doc.text('Employee ID:', 40, doc.y).text(employee?.employee_id || '-', 140, doc.y - doc.currentLineHeight());
      doc.text('Department:', 40, doc.y).text(employee?.department || employee?.department_name || 'N/A', 140, doc.y - doc.currentLineHeight());
      doc.text('Designation:', 40, doc.y).text(employee?.designation || employee?.designation_title || 'N/A', 140, doc.y - doc.currentLineHeight());
      doc.text('Pay Period:', 40, doc.y).text(monthKey, 140, doc.y - doc.currentLineHeight());
      doc.text('Days (Paid/Working):', 40, doc.y).text(`${paidDays || 0} / ${workingDays || 0}`, 140, doc.y - doc.currentLineHeight());
      doc.text('Bank Name:', 40, doc.y).text(employee?.bank_name || '-', 140, doc.y - doc.currentLineHeight());
      doc.text('Bank Account No:', 40, doc.y).text(employee?.bank_account_number || '-', 140, doc.y - doc.currentLineHeight());
      doc.text('PAN Number:', 40, doc.y).text(employee?.pan_number || '-', 140, doc.y - doc.currentLineHeight());
      doc.text('PF Number:', 40, doc.y).text(employee?.pf_number || '-', 140, doc.y - doc.currentLineHeight());
      doc.text('UAN:', 40, doc.y).text(employee?.uan_number || '-', 140, doc.y - doc.currentLineHeight());
      doc.text('ESI Number:', 40, doc.y).text(employee?.esi_number || '-', 140, doc.y - doc.currentLineHeight());
      doc.moveDown(0.5);

      const drawTable = (title, rows, totalLabel, totalValue) => {
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.3);
        doc.fontSize(12).font('Helvetica-Bold').text(title, { underline: true });
        doc.moveDown(0.3);
        let total = 0;
        rows.forEach(r => {
          doc.fontSize(10).font('Helvetica').text(r.name, 45, doc.y, { continued: true });
          doc.text(`Rs. ${parseFloat(r.amount || 0).toLocaleString()}`, { align: 'right' });
          total += parseFloat(r.amount || 0);
        });
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').text(totalLabel, 45, doc.y, { continued: true });
        doc.text(`Rs. ${total.toLocaleString()}`, { align: 'right' });
        doc.moveDown(0.6);
      };

      drawTable('Earnings', earnings || [], 'Gross Earnings', totals?.gross || totals?.total_earnings || 0);
      drawTable('Deductions', deductions || [], 'Total Deductions', totals?.deductions || totals?.total_deductions || 0);
      if (employer && employer.length > 0) {
        drawTable('Employer Contributions', employer, 'Total Employer Contribution', totals?.employer || 0);
      }

      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.4);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#2563eb');
      doc.text('Gross Salary:', 45, doc.y, { continued: true });
      doc.text(`Rs. ${parseFloat(totals?.gross || totals?.total_earnings || 0).toLocaleString()}`, { align: 'right' });
      doc.text('Total Deductions:', 45, doc.y, { continued: true });
      doc.text(`Rs. ${parseFloat(totals?.deductions || totals?.total_deductions || 0).toLocaleString()}`, { align: 'right' });
      doc.fontSize(15).text('Net Salary:', 45, doc.y, { continued: true });
      doc.text(`Rs. ${parseFloat(totals?.net || totals?.net_pay || 0).toLocaleString()}`, { align: 'right' });
      doc.fillColor('#000');
      doc.moveDown(1.5);

      doc.fontSize(8).font('Helvetica').fillColor('#666');
      doc.text('This is a computer-generated payslip and does not require a signature.', { align: 'center' });
      doc.text(`Generated on: ${printDate}`, { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  buildSlipPdfBuffer
};
