import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCardNumber,
  formatMinorUnits,
  getRequirementEmailStatusMessage,
  getWithdrawalFlowAction,
  getWithdrawalRequirementAmounts,
  getWithdrawalRequirementCopy,
  getWithdrawalRequirementEmailCopy,
  getWithdrawalRequirementLabel,
  getCardPreview,
  getSafePayoutSummary,
  resolveWithdrawalRequirement,
  resolveWithdrawalStage,
  validateWithdrawalRequirement,
  validateWithdrawalRequirementAmounts,
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

test('withdrawal requirement statuses show information before requests and enable requests only for enabled stage', () => {
  assert.equal(resolveWithdrawalStage({ withdrawalStage: 'processing_fee' }), 'processing_fee');
  assert.deepEqual(resolveWithdrawalRequirement({}), {
    stage: 'upgrade',
    status: 'required',
    reason: '',
    instructions: '',
  });
  assert.equal(getWithdrawalFlowAction({ withdrawalStage: 'upgrade' }), 'show_information');
  assert.equal(getWithdrawalFlowAction({ withdrawalStage: 'processing_fee' }), 'show_information');
  assert.equal(getWithdrawalFlowAction({ withdrawalStage: 'enabled', isPro: true }), 'continue');
  assert.equal(getWithdrawalRequirementLabel('upgrade'), 'Premium upgrade information');
  assert.equal(getWithdrawalRequirementLabel('processing_fee'), 'Processing fee information');
  assert.equal(getWithdrawalRequirementLabel('enabled'), 'Withdrawals enabled');
  assert.equal(getWithdrawalRequirementCopy('upgrade').title, 'Premium Account Upgrade');
  assert.equal(getWithdrawalRequirementCopy('upgrade').subtitle, 'Please review the upgrade requirement before proceeding.');
  assert.equal(getWithdrawalRequirementCopy('processing_fee').title, 'Withdrawal Processing Fee');
  assert.equal(getWithdrawalRequirementCopy('processing_fee').subtitle, 'Please review the processing fee before proceeding.');
  assert.equal(getWithdrawalRequirementCopy('upgrade').amountLabel, 'Upgrade required amount');
  assert.equal(getWithdrawalRequirementCopy('processing_fee').amountLabel, 'Processing fee');
  assert.equal(getWithdrawalRequirementCopy('enabled').subtitle, '');
  assert.equal(getWithdrawalRequirementEmailCopy('enabled', {}, 5000), null);
});

test('renders distinct upgrade and processing-fee descriptions and EUR amounts', () => {
  const profile = {
    requiredAmountMinor: 12500,
    processingFeeMinor: 2500,
    withdrawalRequirement: {
      reason: 'Account information review.',
      instructions: 'Contact support for details.',
    },
  };
  assert.deepEqual(getWithdrawalRequirementAmounts('upgrade', profile), {
    upgradeAmountMinor: 12500,
    processingFeeMinor: 0,
    currency: 'EUR',
  });
  assert.match(getWithdrawalRequirementCopy('upgrade').description, /optional/);
  assert.match(getWithdrawalRequirementCopy('processing_fee').description, /does not collect, verify, or deduct it/);
  assert.equal(formatMinorUnits(12500), '125.00');
  const upgradeEmail = getWithdrawalRequirementEmailCopy('upgrade', profile, 5000).text;
  const feeEmail = getWithdrawalRequirementEmailCopy('processing_fee', profile, 5000).text;
  assert.match(upgradeEmail, /EUR 125\.00/);
  assert.match(upgradeEmail, /possible withdrawal of EUR 50\.00/);
  assert.doesNotMatch(upgradeEmail, /request .* recorded/i);
  assert.match(upgradeEmail, /optional/);
  assert.doesNotMatch(upgradeEmail, /immediately upon payment confirmation/);
  assert.match(upgradeEmail, /Admin-provided note \(informational only\): Account information review/);
  assert.doesNotMatch(upgradeEmail, /Processing fee information/);
  assert.match(feeEmail, /EUR 25\.00/);
  assert.match(feeEmail, /possible withdrawal of EUR 50\.00/);
  assert.match(feeEmail, /does not collect, verify, or deduct/);
  assert.doesNotMatch(feeEmail, /24.?48 hours/);
  assert.match(feeEmail, /not a payment request\): Contact support for details/);
  assert.doesNotMatch(feeEmail, /Premium upgrade information/);
});

test('validates stored upgrade and disclosed fee amounts as EUR minor units', () => {
  assert.equal(validateWithdrawalRequirementAmounts({
    stage: 'upgrade',
    requiredAmountMinor: 10000,
    processingFeeMinor: 0,
  }), '');
  assert.equal(validateWithdrawalRequirementAmounts({
    stage: 'processing_fee',
    requiredAmountMinor: 0,
    processingFeeMinor: 125,
  }), '');
  assert.match(validateWithdrawalRequirementAmounts({
    stage: 'upgrade',
    requiredAmountMinor: 0,
    processingFeeMinor: 0,
  }), /upgrade information amount/);
  assert.match(validateWithdrawalRequirementAmounts({
    stage: 'processing_fee',
    requiredAmountMinor: 0,
    processingFeeMinor: -1,
  }), /processing fee information amount/);
});

test('email status distinguishes sending, confirmed delivery, and failed delivery', () => {
  assert.match(getRequirementEmailStatusMessage('sending'), /Sending/);
  assert.match(getRequirementEmailStatusMessage('sent'), /accepted.*delivery/);
  assert.equal(getRequirementEmailStatusMessage('failed', 'Provider unavailable; no email was sent.'), 'Provider unavailable; no email was sent.');
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
