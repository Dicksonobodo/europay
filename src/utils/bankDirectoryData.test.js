import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBankSearchParams,
  enableManualBankEntry,
  filterBankResults,
  normalizeBankResults,
  parseBankDirectoryResponse,
  selectBankDetails,
} from './bankDirectoryData.js';
import { getSafePayoutSummary } from './withdrawal.js';

const banks = [
  {
    name: 'Example National Bank',
    country: 'United States',
    countryCode: 'US',
    swiftCode: 'EXAMUS33',
    city: 'New York',
    branch: '',
  },
  {
    name: 'Example Credit Union',
    country: 'Canada',
    countryCode: 'CA',
    swiftCode: 'EXAMCA22',
    city: 'Toronto',
    branch: '',
  },
];

test('builds bank and SWIFT searches with an optional country filter', () => {
  const params = buildBankSearchParams({ query: '  Example Bank ', country: ' US ' });
  assert.equal(params.get('query'), 'Example Bank');
  assert.equal(params.get('country'), 'US');
  assert.equal(buildBankSearchParams({ query: 'BANK' }).get('country'), null);
});

test('requires a valid-length search term without substituting fake data', () => {
  assert.throws(() => buildBankSearchParams({ query: 'US' }), /4-100 characters/);
  assert.throws(() => buildBankSearchParams({ query: 'x'.repeat(101) }), /4-100 characters/);
});

test('normalizes bank directory results for display and form selection', () => {
  assert.deepEqual(normalizeBankResults([{
    bank: '  Example Bank  ',
    country: 'United States',
    country_code: 'US',
    swift_code: 'exmpus33',
    city: 'New York',
    branch: 'Main Office',
  }]), [{
    name: 'Example Bank',
    country: 'United States',
    countryCode: 'US',
    swiftCode: 'EXMPUS33',
    city: 'New York',
    branch: 'Main Office',
  }]);
});

test('rejects malformed or incomplete directory entries without inventing fields', () => {
  assert.deepEqual(normalizeBankResults([
    { bank: 'Missing code', country: 'France' },
    { bank: 'Bad code', country: 'France', swift_code: 'not-a-bic' },
    { bank: '', country: 'France', swift_code: 'BNPAFRPP' },
  ]), []);
  assert.throws(() => normalizeBankResults(null), /invalid response/);
});

test('parses valid bank API responses and reports invalid responses clearly', () => {
  assert.deepEqual(parseBankDirectoryResponse({
    results: [{
      bank: 'Example National Bank',
      country: 'United States',
      country_code: 'US',
      swift_code: 'EXAMUS33',
    }],
  }), [{
    name: 'Example National Bank',
    country: 'United States',
    countryCode: 'US',
    swiftCode: 'EXAMUS33',
    city: '',
    branch: '',
  }]);
  assert.throws(() => parseBankDirectoryResponse({}), /API is running and deployed/);
  assert.throws(() => parseBankDirectoryResponse({ error: 'Directory not configured.' }), /not configured/);
});

test('bank search matches bank name, country, and SWIFT/BIC code without case sensitivity', () => {
  assert.deepEqual(filterBankResults(banks, 'national'), [banks[0]]);
  assert.deepEqual(filterBankResults(banks, 'canada'), [banks[1]]);
  assert.deepEqual(filterBankResults(banks, 'examca22'), [banks[1]]);
});

test('bank search reports no matching entries as an empty result set', () => {
  assert.deepEqual(filterBankResults(banks, 'not a listed bank'), []);
});

test('selecting a bank fills the payout fields while preserving account input', () => {
  const selected = selectBankDetails({
    bankName: '',
    country: '',
    accountNumber: '123456789',
    routingCode: '',
    manualEntry: false,
  }, banks[1]);

  assert.equal(selected.bankName, banks[1].name);
  assert.equal(selected.country, banks[1].country);
  assert.equal(selected.routingCode, banks[1].swiftCode);
  assert.equal(selected.accountNumber, '123456789');
  assert.deepEqual(selected.selectedBank, {
    name: banks[1].name,
    country: banks[1].country,
    swiftCode: banks[1].swiftCode,
  });
});

test('manual entry preserves existing bank and account details', () => {
  const previous = {
    bankName: 'Manually entered bank',
    country: 'Ghana',
    accountNumber: '99887766',
    routingCode: 'ABCDGHAC',
    selectedBank: null,
    manualEntry: false,
  };
  assert.deepEqual(enableManualBankEntry(previous), { ...previous, manualEntry: true });
});

test('submitting a selected bank uses its selected name, country, and BIC', () => {
  const details = selectBankDetails({
    accountNumber: '12345678',
    routingCode: '',
  }, banks[0]);
  assert.deepEqual(getSafePayoutSummary('bank', details), {
    destination: 'Example National Bank account ending in 5678',
    bankName: 'Example National Bank',
    country: 'United States',
    accountLast4: '5678',
    routingCodeLast4: 'US33',
    swift: 'EXAMUS33',
    beneficiary: '',
  });
});
