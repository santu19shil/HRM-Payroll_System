export const clearNumericInput = (val) => {
  if (val === 0 || val == null) return '';
  return String(val);
};

export const formatPayrollAmount = (amount) => {
  const num = parseFloat(amount || 0);
  return `₹${num.toLocaleString()}`;
};

export const getPayrollStatusBadge = (status) => {
  if (status === 'PAID') return 'badge-success';
  if (status === 'PROCESSED' || status === 'COMPLETED') return 'badge-info';
  if (status === 'PENDING' || status === 'DRAFT') return 'badge-warning';
  return 'badge-gray';
};

export const parsePayrollValue = (value) => parseFloat(value || 0);
