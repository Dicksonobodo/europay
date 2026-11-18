import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASE_CURRENCY,
  formatCurrency,
  isSupportedCurrency,
  parseExchangeRate,
} from './currency.js';

test('validates the supported display currency list', () => {
  assert.equal(isSupportedCurrency(BASE_CURRENCY), true);
  assert.equal(isSupportedCurrency('NGN'), true);
  assert.equal(isSupportedCurrency('XYZ'), false);
});

test('formats EUR values using the chosen display rate', () => {
  assert.equal(formatCurrency(10, 'USD', 1.1), '$11.00');
  assert.match(formatCurrency(10, 'JPY', 150), /1,?500/);
});

test('uses EUR safely when the requested currency or rate is invalid', () => {
  assert.equal(formatCurrency(10, 'XYZ', 1), '€10.00');
  assert.equal(formatCurrency(10, 'USD', null), '$10.00');
});

test('accepts valid exchange rates and rejects unavailable currencies', () => {
  assert.equal(parseExchangeRate({ result: 'success', rates: { USD: 1.08 } }, 'USD'), 1.08);
  assert.equal(parseExchangeRate({}, 'EUR'), 1);
  assert.throws(() => parseExchangeRate({ result: 'success', rates: {} }, 'NGN'), /unavailable/);
});
