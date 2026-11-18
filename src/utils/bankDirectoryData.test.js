import assert from 'node:assert/strict';
import test from 'node:test';
import {
  enableManualBankEntry,
  filterBankResults,
  selectBankDetails,
} from './bankDirectoryData.js';
import { getSafePayoutSummary } from './withdrawal.js';
import { BANKS, BANKS_BY_COUNTRY } from '../data/banks.js';

const banks = [
  {
    name: 'Example National Bank',
    country: 'United States',
    flag: '🇺🇸',
    swiftCode: 'EXAMUS33',
  },
  {
    name: 'Example Credit Union',
    country: 'Canada',
    flag: '🇨🇦',
    swiftCode: 'EXAMCA22',
  },
];

test('bundles bank entries grouped by country with flags and SWIFT/BIC codes', () => {
  assert.ok(Object.keys(BANKS_BY_COUNTRY).length > 0);
  assert.ok(BANKS.length > 8);
  assert.ok(BANKS.every((bank) =>
    bank.name && bank.country && bank.flag
    && /^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/.test(bank.swiftCode)
  ));
});

test('bank search matches bank name, country, and SWIFT/BIC code without case sensitivity', () => {
  assert.deepEqual(filterBankResults(banks, 'national'), [banks[0]]);
  assert.deepEqual(filterBankResults(banks, 'canada'), [banks[1]]);
  assert.deepEqual(filterBankResults(banks, 'examca22'), [banks[1]]);
});

test('bank search reports no matching entries as an empty result set', () => {
  assert.deepEqual(filterBankResults(banks, 'not a listed bank'), []);
});

test('bank search shows the first eight banks when empty and caps matches at eight', () => {
  assert.deepEqual(filterBankResults(BANKS, ''), BANKS.slice(0, 8));
  assert.equal(filterBankResults(BANKS, 'bank').length, 8);
  assert.equal(filterBankResults(BANKS, 'bank', 2).length, 2);
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
  assert.equal(selected.selectedBank.flag, banks[1].flag);
  assert.equal(selected.routingCode, banks[1].swiftCode);
  assert.equal(selected.accountNumber, '123456789');
  assert.deepEqual(selected.selectedBank, {
    name: banks[1].name,
    country: banks[1].country,
    flag: banks[1].flag,
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
