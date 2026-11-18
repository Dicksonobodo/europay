export const BANKS_BY_COUNTRY = {
  Australia: {
    flag: '🇦🇺',
    banks: [
      { name: 'Australia and New Zealand Banking Group', swiftCode: 'ANZBAU3M' },
      { name: 'Commonwealth Bank of Australia', swiftCode: 'CTBAAU2S' },
      { name: 'National Australia Bank', swiftCode: 'NATAAU3303M' },
      { name: 'Westpac Banking Corporation', swiftCode: 'WPACAU2F' },
    ],
  },
  Canada: {
    flag: '🇨🇦',
    banks: [
      { name: 'Bank of Montreal', swiftCode: 'BOFMCAM2' },
      { name: 'Canadian Imperial Bank of Commerce', swiftCode: 'CIBCCATT' },
      { name: 'Royal Bank of Canada', swiftCode: 'ROYCCAT2' },
      { name: 'The Toronto-Dominion Bank', swiftCode: 'TDOMCATTTOR' },
    ],
  },
  France: {
    flag: '🇫🇷',
    banks: [
      { name: 'BNP Paribas', swiftCode: 'BNPAFRPP' },
      { name: 'Credit Agricole', swiftCode: 'AGRIFRPP' },
      { name: 'Societe Generale', swiftCode: 'SOGEFRPP' },
    ],
  },
  Germany: {
    flag: '🇩🇪',
    banks: [
      { name: 'Commerzbank', swiftCode: 'COBADEFF' },
      { name: 'Deutsche Bank', swiftCode: 'DEUTDEFF' },
      { name: 'DZ Bank', swiftCode: 'GENODEFF' },
    ],
  },
  Ghana: {
    flag: '🇬🇭',
    banks: [
      { name: 'Ecobank Ghana', swiftCode: 'ECOCGHAC' },
      { name: 'GCB Bank', swiftCode: 'GHCBGHAC' },
      { name: 'Standard Chartered Bank Ghana', swiftCode: 'SCBLGHAC' },
    ],
  },
  India: {
    flag: '🇮🇳',
    banks: [
      { name: 'Axis Bank', swiftCode: 'AXISINBB' },
      { name: 'HDFC Bank', swiftCode: 'HDFCINBB' },
      { name: 'ICICI Bank', swiftCode: 'ICICINBB' },
      { name: 'State Bank of India', swiftCode: 'SBININBB' },
    ],
  },
  Japan: {
    flag: '🇯🇵',
    banks: [
      { name: 'MUFG Bank', swiftCode: 'BOTKJPJT' },
      { name: 'Mizuho Bank', swiftCode: 'MHCBJPJT' },
      { name: 'Sumitomo Mitsui Banking Corporation', swiftCode: 'SMBCJPJT' },
    ],
  },
  Netherlands: {
    flag: '🇳🇱',
    banks: [
      { name: 'ABN AMRO Bank', swiftCode: 'ABNANL2A' },
      { name: 'ING Bank', swiftCode: 'INGBNL2A' },
      { name: 'Rabobank', swiftCode: 'RABONL2U' },
    ],
  },
  Nigeria: {
    flag: '🇳🇬',
    banks: [
      { name: 'Access Bank', swiftCode: 'ABNGNGLA' },
      { name: 'Ecobank Nigeria', swiftCode: 'ECOCNGLA' },
      { name: 'First Bank of Nigeria', swiftCode: 'FBNINGLA' },
      { name: 'Guaranty Trust Bank', swiftCode: 'GTBINGLA' },
      { name: 'United Bank for Africa', swiftCode: 'UNAFNGLA' },
      { name: 'Zenith Bank', swiftCode: 'ZEIBNGLA' },
    ],
  },
  Singapore: {
    flag: '🇸🇬',
    banks: [
      { name: 'DBS Bank', swiftCode: 'DBSSSGSG' },
      { name: 'Oversea-Chinese Banking Corporation', swiftCode: 'OCBCSGSG' },
      { name: 'United Overseas Bank', swiftCode: 'UOVBSGSG' },
    ],
  },
  'South Africa': {
    flag: '🇿🇦',
    banks: [
      { name: 'Absa Bank', swiftCode: 'ABSAZAJJ' },
      { name: 'FirstRand Bank', swiftCode: 'FIRNZAJJ' },
      { name: 'Nedbank', swiftCode: 'NEDSZAJJ' },
      { name: 'Standard Bank of South Africa', swiftCode: 'SBZAZAJJ' },
    ],
  },
  'United Arab Emirates': {
    flag: '🇦🇪',
    banks: [
      { name: 'Abu Dhabi Commercial Bank', swiftCode: 'ADCBAEAA' },
      { name: 'Emirates NBD Bank', swiftCode: 'EBILAEAD' },
      { name: 'First Abu Dhabi Bank', swiftCode: 'NBADAEAA' },
    ],
  },
  'United Kingdom': {
    flag: '🇬🇧',
    banks: [
      { name: 'Barclays Bank', swiftCode: 'BARCGB22' },
      { name: 'HSBC UK Bank', swiftCode: 'HBUKGB4B' },
      { name: 'Lloyds Bank', swiftCode: 'LOYDGB2L' },
      { name: 'NatWest', swiftCode: 'NWBKGB2L' },
    ],
  },
  'United States': {
    flag: '🇺🇸',
    banks: [
      { name: 'Bank of America', swiftCode: 'BOFAUS3N' },
      { name: 'Citibank', swiftCode: 'CITIUS33' },
      { name: 'JPMorgan Chase Bank', swiftCode: 'CHASUS33' },
      { name: 'U.S. Bank', swiftCode: 'USBKUS44' },
      { name: 'Wells Fargo Bank', swiftCode: 'WFBIUS6S' },
    ],
  },
};

export const BANKS = Object.entries(BANKS_BY_COUNTRY).flatMap(([country, group]) =>
  group.banks.map((bank) => ({
    ...bank,
    country,
    flag: group.flag,
  }))
);
