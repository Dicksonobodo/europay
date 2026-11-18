export const MAX_BANK_SEARCH_RESULTS = 8;

export const filterBankResults = (banks, query, limit = MAX_BANK_SEARCH_RESULTS) => {
  const term = String(query ?? '').trim().toLocaleLowerCase();
  const matches = term
    ? banks.filter((bank) => [
      bank.name,
      bank.country,
      bank.swiftCode,
    ].some((value) => String(value ?? '').toLocaleLowerCase().includes(term)))
    : banks;
  return matches.slice(0, limit);
};

export const selectBankDetails = (details, bank) => ({
  ...details,
  bankName: bank.name,
  country: bank.country,
  routingCode: bank.swiftCode,
  selectedBank: {
    name: bank.name,
    country: bank.country,
    flag: bank.flag,
    swiftCode: bank.swiftCode,
  },
  manualEntry: false,
});

export const enableManualBankEntry = (details) => ({
  ...details,
  selectedBank: null,
  manualEntry: true,
});
