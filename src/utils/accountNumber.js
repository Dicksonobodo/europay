export const isValidAccountNumber = (value) => /^\d{12}$/.test(String(value || ''));

export const normalizeAccountNumberSearch = (value) =>
  String(value || '').replace(/[\s-]/g, '');

export const generateAccountNumber = () => {
  const digits = new Uint8Array(12);
  globalThis.crypto.getRandomValues(digits);
  return Array.from(digits, (digit) => digit % 10).join('');
};

export const formatAccountNumber = (value) =>
  String(value || '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
