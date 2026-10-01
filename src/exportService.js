const XLSX = require('xlsx');

function buildExcelBuffer(records) {
  const rows = records.map((r) => ({
    'Visit ID': r.visitId || '',
    'Visit Date': r.visitDate || '',
    'Visit Time': r.visitTimeSlotDesc || '',
    'Visit Type': r.visitTypeDesc || '',
    'Policy / Quotation No': r.policyNo || '',
    'Proposal No': r.proposalNo || '',
    'Type': r.newReschedule || '',
    'Mobile Number': r.contractorMobile || '',
    'Status': r.visitStatusDesc || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Visits');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { buildExcelBuffer };