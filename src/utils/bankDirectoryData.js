const isValidSwiftCode = (value) => /^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}(?:[A-Za-z0-9]{3})?$/.test(value);

export const filterBankResults = (banks, query) => {
  const term = String(query ?? '').trim().toLocaleLowerCase();
  if (!term) return banks;
  return banks.filter((bank) => [
    bank.name,
    bank.country,
    bank.countryCode,
    bank.swiftCode,
  ].some((value) => String(value ?? '').toLocaleLowerCase().includes(term)));
};

export const selectBankDetails = (details, bank) => ({
  ...details,
  bankName: bank.name,
  country: bank.country,
  routingCode: bank.swiftCode,
  selectedBank: {
    name: bank.name,
    country: bank.country,
    swiftCode: bank.swiftCode,
  },
  manualEntry: false,
});

export const enableManualBankEntry = (details) => ({
  ...details,
  selectedBank: null,
  manualEntry: true,
});

export const buildBankSearchParams = ({ query, country = '' }) => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 4 || normalizedQuery.length > 100) {
    throw new Error('Enter 4-100 characters of a bank name or SWIFT/BIC code.');
  }

  const params = new URLSearchParams({ query: normalizedQuery });
  if (country.trim()) params.set('country', country.trim());
  return params;
};

export const normalizeBankResults = (banks) => {
  if (!Array.isArray(banks)) throw new Error('The bank directory returned an invalid response.');

  return banks.flatMap((bank) => {
    if (
      typeof bank?.bank !== 'string'
      || typeof bank?.country !== 'string'
      || typeof bank?.swift_code !== 'string'
      || !bank.bank.trim()
      || !bank.country.trim()
      || !isValidSwiftCode(bank.swift_code)
    ) {
      return [];
    }

    return [{
      name: bank.bank.trim(),
      country: bank.country.trim(),
      countryCode: typeof bank.country_code === 'string' ? bank.country_code.trim() : '',
      swiftCode: bank.swift_code.toUpperCase(),
      city: typeof bank.city === 'string' ? bank.city.trim() : '',
      branch: typeof bank.branch === 'string' ? bank.branch.trim() : '',
    }];
  });
};

export const parseBankDirectoryResponse = (payload) => {
  if (Array.isArray(payload?.results)) {
    return normalizeBankResults(payload.results);
  }
  if (payload?.status === 'ok' && Array.isArray(payload?.data?.banks)) {
    return normalizeBankResults(payload.data.banks);
  }
  if (typeof payload?.error === 'string' && payload.error) {
    throw new Error(payload.error);
  }
  throw new Error('Bank search returned an unexpected response. Ensure the bank-directory API is running and deployed.');
};
