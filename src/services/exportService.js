const ExcelJS = require('exceljs');
const fs = require('fs');

class ExportService {
  async exportRecords(filePath, records) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Scraped Records');

    const normalizedRows = Array.isArray(records) ? records : [];

    if (normalizedRows.length > 0) {
      const headers = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row || {}))));
      worksheet.columns = headers.map((header) => ({
        header,
        key: header,
        width: Math.max(18, header.length + 4)
      }));

      normalizedRows.forEach((row) => {
        const rowValues = {};
        headers.forEach((header) => {
          const value = row?.[header];
          rowValues[header] = value === null || typeof value === 'undefined' ? '' : String(value);
        });
        worksheet.addRow(rowValues);
      });
    } else {
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 18 },
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Status', key: 'status', width: 18 }
      ];
    }

    const directory = require('path').dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }
}

module.exports = { ExportService };
