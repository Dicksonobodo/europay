export const WITHDRAWAL_STAGES = ['upgrade', 'processing_fee', 'enabled'];
export const WITHDRAWAL_REQUIREMENT_STATUSES = ['required', 'in_progress', 'completed'];
export const WITHDRAWAL_REQUIREMENT_CURRENCY = 'EUR';

export const DEFAULT_MINIMUM_WITHDRAWAL_MINOR = 1000;

export const parseAmountToMinorUnits = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ''] = normalized.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
};

export const formatMinorUnits = (minorUnits) => (minorUnits / 100).toFixed(2);

export const resolveWithdrawalStage = (profile) => {
  if (WITHDRAWAL_STAGES.includes(profile?.withdrawalStage)) {
    return profile.withdrawalStage;
  }
  return profile?.isPro || profile?.tier === 2 ? 'enabled' : 'upgrade';
};

export const resolveWithdrawalRequirement = (profile) => {
  const stored = profile?.withdrawalRequirement || {};
  const stage = resolveWithdrawalStage(profile);
  const storedStatus = WITHDRAWAL_REQUIREMENT_STATUSES.includes(stored.status) ? stored.status : '';
  const status = stage === 'enabled'
    ? 'completed'
    : storedStatus && storedStatus !== 'completed' ? storedStatus : 'required';
  const upgradeReason = typeof stored.upgradeReason === 'string'
    ? stored.upgradeReason
    : stage === 'upgrade' && typeof stored.reason === 'string' ? stored.reason : '';
  const processingFeeReason = typeof stored.processingFeeReason === 'string'
    ? stored.processingFeeReason
    : stage === 'processing_fee' && typeof stored.reason === 'string' ? stored.reason : '';

  return {
    stage,
    status,
    reason: stage === 'processing_fee' ? processingFeeReason : upgradeReason,
    upgradeReason,
    processingFeeReason,
    instructions: typeof stored.instructions === 'string' ? stored.instructions : '',
  };
};

export const validateWithdrawalRequirement = (requirement, stage) => {
  if (!WITHDRAWAL_STAGES.includes(stage)) return 'Choose a valid withdrawal stage.';
  const validStatus = stage === 'enabled'
    ? requirement?.status === 'completed'
    : ['required', 'in_progress'].includes(requirement?.status);
  if (!validStatus) {
    if (stage === 'enabled') {
      return 'Withdrawals can only be enabled when the current step is completed.';
    }
    return 'Choose a valid status for the current withdrawal step.';
  }
  const reason = stage === 'processing_fee'
    ? requirement.processingFeeReason ?? requirement.reason
    : requirement.upgradeReason ?? requirement.reason;
  if (typeof reason !== 'string' || reason.trim().length > 1000) {
    return 'The user-facing write-up must be 1,000 characters or fewer.';
  }
  if (stage !== 'enabled' && !reason.trim()) {
    return 'Enter the user-facing write-up.';
  }
  return '';
};

export const getWithdrawalRequirementLabel = (stage) => ({
  upgrade: 'Premium upgrade information',
  processing_fee: 'Processing fee information',
  enabled: 'Withdrawals enabled',
}[stage] || 'Withdrawal requirement');

export const getWithdrawalRequirementCopy = (stage) => ({
  upgrade: {
    title: 'Premium Account Upgrade',
    amountLabel: 'Upgrade required amount',
    action: 'Contact support',
  },
  processing_fee: {
    title: 'Withdrawal Processing Fee',
    amountLabel: 'Processing fee',
    action: 'Contact support',
  },
  enabled: {
    title: 'Withdrawals enabled',
    action: 'Continue',
  },
}[stage] || {
  title: 'Withdrawal information',
  action: 'Contact support',
});

export const getWithdrawalRequirementAmounts = (stage, profile = {}) => ({
  upgradeAmountMinor: stage === 'upgrade' && Number.isSafeInteger(profile.requiredAmountMinor)
    ? profile.requiredAmountMinor
    : 0,
  processingFeeMinor: stage === 'processing_fee' && Number.isSafeInteger(profile.processingFeeMinor)
    ? profile.processingFeeMinor
    : 0,
  currency: profile.withdrawalRequirementCurrency || WITHDRAWAL_REQUIREMENT_CURRENCY,
});

export const validateWithdrawalRequirementAmounts = ({
  stage,
  requiredAmountMinor,
  processingFeeMinor,
}) => {
  if (!WITHDRAWAL_STAGES.includes(stage)) return 'Choose a valid withdrawal status.';
  if (!Number.isSafeInteger(requiredAmountMinor) || requiredAmountMinor < 0) {
    return 'Enter a valid premium upgrade information amount in EUR.';
  }
  if (!Number.isSafeInteger(processingFeeMinor) || processingFeeMinor < 0) {
    return 'Enter a valid processing fee information amount in EUR.';
  }
  if (stage === 'upgrade' && requiredAmountMinor <= 0) {
    return 'Enter the premium upgrade information amount in EUR.';
  }
  return '';
};

export const getWithdrawalRequirementEmailCopy = (stage, profile = {}, amountMinor = 0) => {
  const requestedAmount = formatMinorUnits(amountMinor);
  const requirement = profile.withdrawalRequirement || {};
  if (stage === 'upgrade') {
    const requirementAmount = Number.isSafeInteger(profile.requiredAmountMinor) && profile.requiredAmountMinor > 0
      ? formatMinorUnits(profile.requiredAmountMinor)
      : 'Not configured';
    return {
      subject: 'Information about your Europay withdrawal request',
      text: [
        `Withdrawal amount requested: EUR ${requestedAmount}.`,
        `Upgrade required amount: EUR ${requirementAmount}.`,
        requirement.upgradeReason || requirement.reason,
        'This message does not confirm a payout or guarantee a release of funds. Europay does not process or verify real-world payouts.',
      ].filter(Boolean).join('\n\n'),
    };
  }
  if (stage === 'processing_fee') {
    const feeAmount = Number.isSafeInteger(profile.processingFeeMinor)
      ? formatMinorUnits(profile.processingFeeMinor)
      : 'Not configured';
    return {
      subject: 'Information about your Europay withdrawal request',
      text: [
        `Withdrawal amount requested: EUR ${requestedAmount}.`,
        `Processing fee amount: EUR ${feeAmount}.`,
        requirement.processingFeeReason || requirement.reason,
        'This message does not confirm a payout or guarantee a release of funds. Europay does not process or verify real-world payouts.',
      ].filter(Boolean).join('\n\n'),
    };
  }
  return null;
};

export const getWithdrawalFlowAction = (profile) =>
  resolveWithdrawalStage(profile) === 'enabled' ? 'continue' : 'show_information';

export const getWithdrawalRequirementStatusLabel = (status) => ({
  not_required: 'Not required',
  required: 'Required',
  in_progress: 'In progress',
  completed: 'Completed',
}[status] || 'Required');

export const validateWithdrawalAmount = (amountMinor, balanceMinor, minimumMinor, isFrozen) => {
  if (isFrozen) return 'Your account is frozen. Contact support before requesting a withdrawal.';
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return 'Enter a valid withdrawal amount.';
  if (amountMinor < minimumMinor) return `The minimum withdrawal is €${formatMinorUnits(minimumMinor)}.`;
  if (!Number.isSafeInteger(balanceMinor) || amountMinor > balanceMinor) return 'The amount exceeds your available balance.';
  return '';
};

const isValidLuhn = (digits) => {
  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
};

export const getCardBrand = (digits) => {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover';
  return 'Card';
};

export const formatCardNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 19);
  const brand = getCardBrand(digits);
  const groupSizes = brand === 'American Express' ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const groups = [];
  let offset = 0;
  for (const size of groupSizes) {
    if (offset >= digits.length) break;
    groups.push(digits.slice(offset, offset + size));
    offset += size;
  }
  return groups.join(' ');
};

export const getCardPreview = ({ cardNumber = '', cardholderName = '', expiry = '' }) => ({
  brand: getCardBrand(String(cardNumber).replace(/\D/g, '')) || 'Card',
  number: formatCardNumber(cardNumber) || '•••• •••• •••• ••••',
  name: cardholderName.trim() || 'CARDHOLDER NAME',
  expiry: expiry.trim() || 'MM/YY',
});

const isUnexpiredCardExpiry = (value, now = new Date()) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
};

const isValidBitcoinAddress = (address) => {
  if (/^bc1/i.test(address) && address !== address.toLowerCase() && address !== address.toUpperCase()) {
    return false;
  }
  const normalized = address.toLowerCase();
  return /^(bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address)
    || /^bc1[ac-hj-np-z02-9]{11,71}$/.test(normalized);
};

const isValidAccountNumber = (value) => /^[A-Za-z0-9 -]{4,34}$/.test(value.trim());

export const validateWithdrawalDetails = (method, details, now = new Date()) => {
  if (method === 'bitcoin') {
    const address = details.address.trim();
    return isValidBitcoinAddress(address) ? '' : 'Enter a valid Bitcoin address.';
  }

  if (method === 'card') {
    const number = details.cardNumber.replace(/\D/g, '');
    if (!/^\d{13,19}$/.test(number) || !isValidLuhn(number)) return 'Enter a valid card number.';
    if (!details.cardholderName.trim()) return 'Enter the name on the card.';
    if (!isUnexpiredCardExpiry(details.expiry.trim(), now)) return 'Enter a valid, unexpired MM/YY expiry.';
    return '';
  }

  if (method === 'bank') {
    if (!details.bankName.trim()) return 'Enter the bank name.';
    if (!details.country.trim()) return 'Enter the bank country.';
    if (!isValidAccountNumber(details.accountNumber)) return 'Enter a valid account number.';
    if (details.routingCode.trim() && !/^[A-Za-z0-9 -]{4,17}$/.test(details.routingCode.trim())) {
      return 'Enter a valid routing code or leave it blank.';
    }
    return '';
  }

  if (method === 'wire') {
    if (!isValidAccountNumber(details.accountNumber)) return 'Enter a valid account number.';
    if (!/^[A-Za-z]{4}[A-Za-z]{2}[A-Za-z0-9]{2}(?:[A-Za-z0-9]{3})?$/.test(details.swift.trim())) {
      return 'Enter a valid 8- or 11-character SWIFT/BIC.';
    }
    if (!details.beneficiaryName.trim()) return 'Enter the beneficiary name.';
    if (!details.beneficiaryAddress.trim()) return 'Enter the beneficiary address.';
    return '';
  }

  return 'Choose a supported withdrawal method.';
};

export const getSafePayoutSummary = (method, details) => {
  if (method === 'bitcoin') {
    return { destination: details.address.trim(), beneficiary: '' };
  }

  if (method === 'card') {
    const digits = details.cardNumber.replace(/\D/g, '');
    return {
      destination: `${getCardBrand(digits)} ending in ${digits.slice(-4)}`,
      cardBrand: getCardBrand(digits),
      cardLast4: digits.slice(-4),
      cardExpiry: details.expiry.trim(),
      beneficiary: details.cardholderName.trim(),
    };
  }

  if (method === 'bank') {
    const account = details.accountNumber.replace(/\s/g, '');
    const selectedSwift = details.selectedBank?.swiftCode === details.routingCode
      ? details.selectedBank.swiftCode.toUpperCase()
      : '';
    return {
      destination: `${details.bankName.trim()} account ending in ${account.slice(-4)}`,
      bankName: details.bankName.trim(),
      country: details.country.trim(),
      accountLast4: account.slice(-4),
      routingCodeLast4: details.routingCode.trim().slice(-4),
      ...(selectedSwift ? { swift: selectedSwift } : {}),
      beneficiary: '',
    };
  }

  const account = details.accountNumber.trim().replace(/\s/g, '');
  return {
    destination: `Account number ending in ${account.slice(-4)}`,
    accountLast4: account.slice(-4),
    swift: details.swift.trim().toUpperCase(),
    beneficiary: `${details.beneficiaryName.trim()}, ${details.beneficiaryAddress.trim()}`,
  };
};
