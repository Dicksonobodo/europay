import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatAccountNumber,
  generateAccountNumber,
  isValidAccountNumber,
  normalizeAccountNumberSearch,
} from './accountNumber.js';

test('generates and formats a 12-digit Europay account number', () => {
  const accountNumber = generateAccountNumber();
  assert.match(accountNumber, /^\d{12}$/);
  assert.equal(isValidAccountNumber(accountNumber), true);
  assert.equal(formatAccountNumber('123456789012'), '1234 5678 9012');
  assert.equal(isValidAccountNumber('12345678901'), false);
  assert.equal(isValidAccountNumber('123456789012x'), false);
  assert.equal(normalizeAccountNumberSearch('1234 5678-9012'), '123456789012');
});
