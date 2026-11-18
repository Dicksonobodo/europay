import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCardNumber,
  getCardPreview,
  getSafePayoutSummary,
  isWithdrawalRequirementBlocked,
  resolveWithdrawalRequirement,
  resolveWithdrawalStage,
  validateWithdrawalRequirement,
  validateWithdrawalDetails,
} from './withdrawal.js';

test('formats card numbers as they are entered and detects the brand', () => {
  assert.equal(formatCardNumber('4111 1111-1111 1111'), '4111 1111 1111 1111');
  assert.equal(getCardPreview({ cardNumber: '378282246310005' }).brand, 'American Express');
});

test('live card preview uses placeholders and current form values', () => {
  assert.deepEqual(getCardPreview({}), {
    brand: 'Card',
    number: '•••• •••• •••• ••••',
    name: 'CARDHOLDER NAME',
    expiry: 'MM/YY',
  });
  assert.deepEqual(getCardPreview({
    cardNumber: '4111111111111111',
    cardholderName: 'Ada Lovelace',
    expiry: '09/30',
  }), {
    brand: 'Visa',
    number: '4111 1111 1111 1111',
    name: 'Ada Lovelace',
    expiry: '09/30',
  });
});

test('card withdrawal validation checks number, cardholder and unexpired expiry', () => {
  const valid = {
    cardNumber: '4111111111111111',
    cardholderName: 'Ada Lovelace',
    expiry: '09/30',
  };
  const now = new Date('2026-03-01T00:00:00');
  assert.equal(validateWithdrawalDetails('card', valid, now), '');
  assert.equal(validateWithdrawalDetails('card', { ...valid, cardholderName: '' }, now), 'Enter the name on the card.');
  assert.equal(validateWithdrawalDetails('card', { ...valid, expiry: '02/26' }, now), 'Enter a valid, unexpired MM/YY expiry.');
});

test('payout summary retains only the card details needed by the withdrawal flow', () => {
  const summary = getSafePayoutSummary('card', {
    cardNumber: '4111111111111111',
    cardholderName: 'Ada Lovelace',
    expiry: '09/30',
  });
  assert.deepEqual(summary, {
    destination: 'Visa ending in 1111',
    cardBrand: 'Visa',
    cardLast4: '1111',
    cardExpiry: '09/30',
    beneficiary: 'Ada Lovelace',
  });
  assert.equal(Object.hasOwn(summary, 'cardNumber'), false);
});

test('withdrawal requirements resolve legacy profiles and gate incomplete steps', () => {
  assert.equal(resolveWithdrawalStage({ withdrawalStage: 'processing_fee' }), 'processing_fee');
  assert.deepEqual(resolveWithdrawalRequirement({}), {
    stage: 'upgrade',
    status: 'required',
    reason: '',
    instructions: '',
  });
  assert.equal(isWithdrawalRequirementBlocked({ withdrawalStage: 'processing_fee' }), true);
  assert.equal(isWithdrawalRequirementBlocked({ withdrawalStage: 'enabled', isPro: true }), false);
});

test('withdrawal requirement validation requires a reason and valid status', () => {
  assert.equal(validateWithdrawalRequirement({
    status: 'required',
    reason: 'Premium account upgrade required by the configured account policy.',
    instructions: '',
  }, 'upgrade'), '');
  assert.match(validateWithdrawalRequirement({
    status: 'in_progress',
    reason: '',
    instructions: '',
  }, 'processing_fee'), /Explain why/);
  assert.equal(validateWithdrawalRequirement({
    status: 'completed',
    reason: '',
    instructions: '',
  }, 'enabled'), '');
  assert.match(validateWithdrawalRequirement({
    status: 'required',
    reason: '',
    instructions: '',
  }, 'enabled'), /completed/);
});
