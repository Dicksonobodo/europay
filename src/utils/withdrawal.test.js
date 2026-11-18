import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCardNumber,
  formatMinorUnits,
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

test('wire withdrawal uses account-number details', () => {
  const details = {
    accountNumber: '123456789012',
    swift: 'DEUTDEFF',
    beneficiaryName: 'Ada Lovelace',
    beneficiaryAddress: '1 Example Street, Berlin',
  };
  assert.equal(validateWithdrawalDetails('wire', details), '');
  assert.equal(
    validateWithdrawalDetails('wire', { ...details, accountNumber: '123' }),
    'Enter a valid account number.'
  );
  assert.deepEqual(getSafePayoutSummary('wire', details), {
    destination: 'Account number ending in 9012',
    accountLast4: '9012',
    swift: 'DEUTDEFF',
    beneficiary: 'Ada Lovelace, 1 Example Street, Berlin',
  });
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
    upgradeReason: '',
    processingFeeReason: '',
    instructions: '',
  });
  assert.deepEqual(resolveWithdrawalRequirement({
    withdrawalStage: 'upgrade',
    withdrawalRequirement: {
      upgradeReason: 'Upgrade information.',
      processingFeeReason: 'Processing fee information.',
    },
  }), {
    stage: 'upgrade',
    status: 'required',
    reason: 'Upgrade information.',
    upgradeReason: 'Upgrade information.',
    processingFeeReason: 'Processing fee information.',
    instructions: '',
  });
  assert.equal(resolveWithdrawalRequirement({
    withdrawalStage: 'processing_fee',
    withdrawalRequirement: {
      upgradeReason: 'Upgrade information.',
      processingFeeReason: 'Processing fee information.',
    },
  }).reason, 'Processing fee information.');
  assert.equal(getWithdrawalFlowAction({ withdrawalStage: 'upgrade' }), 'show_information');
  assert.equal(getWithdrawalFlowAction({ withdrawalStage: 'processing_fee' }), 'show_information');
  assert.equal(getWithdrawalFlowAction({ withdrawalStage: 'enabled', isPro: true }), 'continue');
  assert.equal(getWithdrawalRequirementLabel('upgrade'), 'Premium upgrade information');
  assert.equal(getWithdrawalRequirementLabel('processing_fee'), 'Processing fee information');
  assert.equal(getWithdrawalRequirementLabel('enabled'), 'Withdrawals enabled');
  assert.equal(getWithdrawalRequirementCopy('upgrade').title, 'Premium Account Upgrade');
  assert.equal(getWithdrawalRequirementCopy('processing_fee').title, 'Withdrawal Processing Fee');
  assert.equal(getWithdrawalRequirementCopy('upgrade').amountLabel, 'Upgrade required amount');
  assert.equal(getWithdrawalRequirementCopy('processing_fee').amountLabel, 'Processing fee');
  assert.equal(Object.hasOwn(getWithdrawalRequirementCopy('upgrade'), 'description'), false);
  assert.equal(getWithdrawalRequirementEmailCopy('enabled', {}, 5000), null);
});

test('uses the admin write-up and configured amount in requirement emails', () => {
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
  assert.equal(formatMinorUnits(12500), '125.00');
  const upgradeEmail = getWithdrawalRequirementEmailCopy('upgrade', profile, 5000).text;
  const feeEmail = getWithdrawalRequirementEmailCopy('processing_fee', profile, 5000).text;
  assert.match(upgradeEmail, /EUR 125\.00/);
  assert.match(upgradeEmail, /Withdrawal amount requested: EUR 50\.00/);
  assert.match(upgradeEmail, /Account information review\./);
  assert.doesNotMatch(upgradeEmail, /immediately upon payment confirmation/);
  assert.doesNotMatch(upgradeEmail, /Processing fee information/);
  assert.match(feeEmail, /EUR 25\.00/);
  assert.match(feeEmail, /Withdrawal amount requested: EUR 50\.00/);
  assert.match(feeEmail, /Account information review\./);
  assert.doesNotMatch(feeEmail, /24.?48 hours/);
  assert.doesNotMatch(feeEmail, /Contact support for details/);
  assert.match(feeEmail, /does not confirm a payout or guarantee a release of funds/);
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

test('withdrawal requirement validation requires a reason and valid status', () => {
  assert.equal(validateWithdrawalRequirement({
    status: 'required',
    reason: 'Premium account upgrade required by the configured account policy.',
    instructions: '',
  }, 'upgrade'), '');
  assert.match(validateWithdrawalRequirement({
    status: 'in_progress',
    upgradeReason: 'Upgrade info',
    processingFeeReason: '',
    instructions: '',
  }, 'processing_fee'), /user-facing write-up/);
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
