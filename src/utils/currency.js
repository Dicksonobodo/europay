export const CURRENCY_STORAGE_KEY = 'europay_preferred_currency';
export const CURRENCY_SELECTION_PENDING_KEY = 'europay_currency_selection_pending';
export const BASE_CURRENCY = 'EUR';

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
];

export const isSupportedCurrency = (currency) =>
  SUPPORTED_CURRENCIES.some((option) => option.code === currency);

export const getStoredCurrency = () => {
  if (typeof localStorage === 'undefined') return BASE_CURRENCY;
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
  return isSupportedCurrency(stored) ? stored : BASE_CURRENCY;
};

export const setStoredCurrency = (currency) => {
  if (!isSupportedCurrency(currency)) throw new Error('Choose a supported currency.');
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    localStorage.setItem(CURRENCY_SELECTION_PENDING_KEY, 'true');
  }
};

export const formatCurrency = (amount, currency, rate = 1) => {
  const safeCurrency = isSupportedCurrency(currency) ? currency : BASE_CURRENCY;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  const convertedAmount = Number(amount || 0) * safeRate;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: safeCurrency,
    maximumFractionDigits: safeCurrency === 'JPY' ? 0 : 2,
  }).format(convertedAmount);
};

export const parseExchangeRate = (payload, currency) => {
  if (currency === BASE_CURRENCY) return 1;
  const rate = payload?.rates?.[currency];
  if (payload?.result !== 'success' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('A current exchange rate is unavailable for this currency.');
  }
  return rate;
};
