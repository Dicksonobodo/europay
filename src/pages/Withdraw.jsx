import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Bitcoin, Building2, Check, Clock3, CreditCard, Globe2, LockKeyhole,
} from 'lucide-react';
import { getAppDefaults, getRecentWithdrawals, withdrawFunds } from '../firebase/firestore';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import BottomNav from '../components/ui/BottomNav';
import CardWithdrawalDetails from '../components/withdrawal/CardWithdrawalDetails';
import BankTransferDetails from '../components/withdrawal/BankTransferDetails';
import { useCurrency } from '../hooks/useCurrency';
import {
  DEFAULT_MINIMUM_WITHDRAWAL_MINOR,
  formatMinorUnits,
  getWithdrawalRequirementCopy,
  getWithdrawalRequirementAmounts,
  getWithdrawalFlowAction,
  getSafePayoutSummary,
  parseAmountToMinorUnits,
  resolveWithdrawalRequirement,
  resolveWithdrawalStage,
  validateWithdrawalAmount,
  validateWithdrawalDetails,
} from '../utils/withdrawal';

const METHODS = [
  { id: 'bitcoin', label: 'Bitcoin', Icon: Bitcoin },
  { id: 'card', label: 'Card', Icon: CreditCard },
  { id: 'bank', label: 'Bank transfer', Icon: Building2 },
  { id: 'wire', label: 'International wire', Icon: Globe2 },
];

const INITIAL_DETAILS = {
  bitcoin: { address: '' },
  card: { cardNumber: '', cardholderName: '', expiry: '' },
  bank: {
    bankName: '',
    country: '',
    accountNumber: '',
    routingCode: '',
    selectedBank: null,
    manualEntry: false,
  },
  wire: { accountNumber: '', swift: '', beneficiaryName: '', beneficiaryAddress: '' },
};

const Withdraw = () => {
  const navigate = useNavigate();
  const { currentUser, userData, refreshUserData } = useAuth();
  const { currency, rate, formatCurrency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bitcoin');
  const [details, setDetails] = useState(INITIAL_DETAILS);
  const [defaults, setDefaults] = useState({});
  const [defaultsError, setDefaultsError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageNotice, setPageNotice] = useState('');
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');

  const fmt = formatCurrency;

  const minimumMinor = defaults.minimumWithdrawalMinor ?? DEFAULT_MINIMUM_WITHDRAWAL_MINOR;
  const balanceMinor = Math.max(0, Math.round(Number(userData?.balance || 0) * 100));
  const stage = resolveWithdrawalStage(userData);
  const withdrawalRequirement = resolveWithdrawalRequirement(userData);
  const requirementAmounts = getWithdrawalRequirementAmounts(stage, userData);
  const formatRequirementAmount = (minorUnits) => {
    const eurAmount = `EUR ${formatMinorUnits(minorUnits)}`;
    return currency === 'EUR' || !rate
      ? eurAmount
      : `${eurAmount} (${fmt(minorUnits / 100)} display estimate)`;
  };
  const upgradeAmountLabel = requirementAmounts.upgradeAmountMinor > 0
    ? formatRequirementAmount(requirementAmounts.upgradeAmountMinor)
    : 'Not configured';
  const parsedAmountMinor = parseAmountToMinorUnits(amount);
  const selectedMethod = METHODS.find((item) => item.id === method);

  useEffect(() => {
    let active = true;
    getAppDefaults()
      .then((appDefaults) => {
        if (active) setDefaults(appDefaults);
      })
      .catch((loadError) => {
        if (active) setDefaultsError(loadError.message || 'Could not load withdrawal settings.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;
    let active = true;
    getRecentWithdrawals(currentUser.uid)
      .then((items) => {
        if (active) setHistory(items);
      })
      .catch((loadError) => {
        if (active) setHistoryError(loadError.message || 'Could not load withdrawal history.');
      });
    return () => {
      active = false;
    };
  }, [currentUser]);

  const amountError = useMemo(() => {
    if (!amount) return '';
    if (parsedAmountMinor === null) return 'Enter an amount with no more than two decimal places.';
    return validateWithdrawalAmount(
      parsedAmountMinor,
      balanceMinor,
      minimumMinor,
      Boolean(userData?.isFrozen)
    );
  }, [amount, parsedAmountMinor, balanceMinor, minimumMinor, userData?.isFrozen]);

  const updateDetail = (field, value) => {
    setDetails((previous) => ({
      ...previous,
      [method]: {
        ...previous[method],
        [field]: value,
        ...(method === 'bank' && ['bankName', 'country', 'routingCode'].includes(field)
          ? { selectedBank: null }
          : {}),
      },
    }));
    setError('');
  };

  const handleBankSelect = (bankDetails) => {
    setDetails((previous) => ({ ...previous, bank: bankDetails }));
    setError('');
  };

  const setQuickAmount = (percentage) => {
    const value = percentage === 100
      ? balanceMinor
      : Math.floor(balanceMinor * percentage / 100);
    setAmount(formatMinorUnits(value));
    setError('');
  };

  const openWithdrawalConfirmation = () => {
    const methodError = validateWithdrawalDetails(method, details[method]);
    if (methodError) {
      setError(methodError);
      return;
    }
    setError('');
    setRequirementOpen(false);
    setConfirm(true);
  };

  const handleContinue = () => {
    setError('');
    if (parsedAmountMinor === null) {
      setError('Enter a valid withdrawal amount with up to two decimal places.');
      return;
    }

    const validationError = validateWithdrawalAmount(
      parsedAmountMinor,
      balanceMinor,
      minimumMinor,
      Boolean(userData?.isFrozen)
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    if (userData?.isSuspended) {
      setError('Your account is suspended. Contact support before requesting a withdrawal.');
      return;
    }

    if (getWithdrawalFlowAction(userData) === 'show_information') {
      setRequirementOpen(true);
      return;
    }
    openWithdrawalConfirmation();
  };

  const handleWithdraw = async () => {
    setLoading(true);
    setError('');
    setPageNotice('');
    try {
      const payout = getSafePayoutSummary(method, details[method]);
      const result = await withdrawFunds(currentUser.uid, parsedAmountMinor, method, payout);
      setDetails((previous) => ({
        ...previous,
        card: { ...previous.card, cardNumber: '' },
      }));
      const nextReceipt = {
        ...result,
        amountMinor: parsedAmountMinor,
        method: selectedMethod.label,
        destination: payout.destination,
        beneficiary: payout.beneficiary || 'Not specified',
        status: 'Manual review requested — not paid out',
        arrival: 'No verified payout estimate; this app records simulated/manual requests only.',
        createdAt: new Date(),
      };
      setReceipt(nextReceipt);
      setHistory((previous) => [nextReceipt, ...previous].slice(0, 5));
      setConfirm(false);
      try {
        await refreshUserData();
      } catch (refreshError) {
        setPageNotice(`Request recorded, but the balance display could not refresh: ${refreshError.message}`);
      }
    } catch (withdrawError) {
      setError(withdrawError.message || 'Could not record this withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    padding: '12px 14px',
    color: 'var(--text-primary)',
    marginTop: 6,
  };

  const detailInput = (field, label, options = {}) => (
    <label key={field} style={{
      display: 'block',
      fontSize: 13,
      color: 'var(--text-secondary)',
      marginBottom: 12,
      ...options.wrapperStyle,
    }}>
      {label}
      <input
        data-withdrawal-field={field}
        type={options.type || 'text'}
        inputMode={options.inputMode}
        autoComplete="off"
        maxLength={options.maxLength}
        placeholder={options.placeholder}
        value={details[method][field]}
        onChange={(event) => updateDetail(field, event.target.value)}
        style={inputStyle}
      />
    </label>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      <header style={{ padding: '56px 20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 10,
          }}
        >
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Withdraw</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Create a simulated/manual withdrawal request</p>
        </div>
      </header>

      <main style={{ padding: '0 20px' }}>
        {pageNotice && (
          <p role="status" style={{ color: '#fbbf24', fontSize: 12, marginBottom: 12 }}>
            {pageNotice}
          </p>
        )}
        <section style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          padding: '16px 20px',
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Available balance</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(userData?.balance)}</p>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            Minimum withdrawal: {fmt(minimumMinor / 100)}
          </p>
        </section>

        {defaultsError && (
          <p role="alert" style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{defaultsError}</p>
        )}
        {userData?.isFrozen && (
          <p role="alert" style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            padding: 12,
            color: '#ef4444',
            fontSize: 13,
            marginBottom: 16,
          }}>
            <LockKeyhole size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Account frozen. Withdrawals are unavailable until support resolves the freeze.
          </p>
        )}
        <label htmlFor="withdrawal-amount" style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Withdrawal amount (EUR)
        </label>
        <input
          id="withdrawal-amount"
          type="number"
          min={formatMinorUnits(minimumMinor)}
          max={formatMinorUnits(balanceMinor)}
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError('');
          }}
          style={{ ...inputStyle, fontSize: 22, fontWeight: 700, marginTop: 0 }}
          aria-describedby="withdrawal-amount-help"
        />
        <div id="withdrawal-amount-help" style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 22 }}>
          {[25, 50, 75, 100].map((percentage) => (
            <button
              key={percentage}
              type="button"
              onClick={() => setQuickAmount(percentage)}
              style={{
                flex: 1,
                padding: '9px 4px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {percentage === 100 ? 'Max' : `${percentage}%`}
            </button>
          ))}
        </div>
        {(amountError || error) && (
          <p role="alert" style={{ color: '#ef4444', fontSize: 13, margin: '-12px 0 16px' }}>
            {error || amountError}
          </p>
        )}

        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Payout method
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          {METHODS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={method === id}
              onClick={() => {
                setMethod(id);
                setError('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${method === id ? 'rgba(124,58,237,0.6)' : 'var(--border)'}`,
                background: method === id ? 'rgba(124,58,237,0.15)' : 'var(--bg-card)',
                color: method === id ? '#c4b5fd' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        <section aria-label={`${selectedMethod.label} payout details`}>
          {method === 'bitcoin' && detailInput('address', 'Bitcoin address', {
            placeholder: 'bc1… or a legacy BTC address',
            maxLength: 90,
          })}
          {method === 'card' && (
            <>
              <CardWithdrawalDetails
                details={details.card}
                onChange={(field, value) => updateDetail(field, value)}
              />
              <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
                The full card number is held only in this form for validation and is never sent to or stored by the app.
              </p>
            </>
          )}
          {method === 'bank' && (
            <BankTransferDetails
              details={details.bank}
              onChange={(field, value) => updateDetail(field, value)}
              onBankSelect={handleBankSelect}
              onManualEntry={(bankDetails) => setDetails((previous) => ({ ...previous, bank: bankDetails }))}
              onChangeSelection={(bankDetails) => setDetails((previous) => ({ ...previous, bank: bankDetails }))}
              onSearchDirectory={() => updateDetail('manualEntry', false)}
            >
              {detailInput('accountNumber', 'Account number', { inputMode: 'text', maxLength: 34 })}
              {details.bank.manualEntry && (
                <>
                  {detailInput('bankName', 'Bank name')}
                  {detailInput('country', 'Country')}
                  {detailInput('routingCode', 'SWIFT/BIC or routing code (optional)', { maxLength: 17 })}
                </>
              )}
            </BankTransferDetails>
          )}
          {method === 'wire' && (
            <>
              {detailInput('accountNumber', 'Account number', { maxLength: 34 })}
              {detailInput('swift', 'SWIFT/BIC', { maxLength: 11 })}
              {detailInput('beneficiaryName', 'Beneficiary name')}
              {detailInput('beneficiaryAddress', 'Beneficiary address', { maxLength: 200 })}
            </>
          )}
        </section>

        <section style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          borderRadius: 14,
          padding: 14,
          margin: '8px 0 18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Withdrawal amount</span>
            <strong>{fmt(parsedAmountMinor === null ? 0 : parsedAmountMinor / 100)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>App withdrawal fee</span>
            <strong>€0.00</strong>
          </div>
          
        </section>

        <Button
          onClick={handleContinue}
          disabled={loading || Boolean(amountError) || !amount}
          fullWidth
        >
          Continue
        </Button>

        <section style={{ marginTop: 28, paddingBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Recent withdrawals</h2>
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              style={{ border: 0, background: 'transparent', color: '#a78bfa', fontSize: 12, fontWeight: 700 }}
            >
              All transactions
            </button>
          </div>
          {historyError && <p role="alert" style={{ color: '#ef4444', fontSize: 12 }}>{historyError}</p>}
          {history.length === 0 && !historyError ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No withdrawal requests yet.</p>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {history.map((item, index) => (
                <div key={item.id} style={{
                  padding: 12,
                  borderBottom: index < history.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>
                      {METHODS.find((entry) => entry.id === item.method)?.label || item.method}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {item.destination || 'Destination not available'}
                    </p>
                    <p style={{ fontSize: 10, color: '#fbbf24', marginTop: 4 }}>
                      Manual review — not paid out
                    </p>
                  </div>
                  <strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {fmt((item.amountMinor || 0) / 100)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Modal
        open={requirementOpen}
        onClose={() => setRequirementOpen(false)}
        title={getWithdrawalRequirementCopy(stage).title}
        headerIcon={AlertTriangle}
        headerStyle={{
          background: 'linear-gradient(120deg, #f97316, #fbbf24)',
          borderRadius: 16,
          padding: '14px 12px',
          margin: '-8px -8px 18px',
        }}
        titleStyle={{ color: '#111827' }}
        closeButtonStyle={{
          background: 'rgba(15,23,42,0.18)',
          color: '#111827',
          borderColor: 'rgba(15,23,42,0.25)',
        }}
        surfaceStyle={{
          background: '#071a2e',
          borderColor: 'rgba(148,163,184,0.2)',
          borderRadius: 24,
        }}
      >
        <div style={{ display: 'grid', gap: 12, fontSize: 14, color: '#cbd5e1' }}>
          <p>
            Requested withdrawal amount: <strong style={{ color: '#f8fafc' }}>{formatRequirementAmount(parsedAmountMinor || 0)}</strong>
          </p>
          {stage === 'upgrade' && (
            <p>
              {getWithdrawalRequirementCopy(stage).amountLabel}:{' '}
              <strong style={{ color: '#f8fafc' }}>{upgradeAmountLabel}</strong>
            </p>
          )}
          {stage === 'processing_fee' && (
            <p>
              {getWithdrawalRequirementCopy(stage).amountLabel}:{' '}
              <strong style={{ color: '#f8fafc' }}>{formatRequirementAmount(requirementAmounts.processingFeeMinor)}</strong>
            </p>
          )}
          {withdrawalRequirement.reason && (
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{withdrawalRequirement.reason}</p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={() => setRequirementOpen(false)} variant="secondary" fullWidth>Close</Button>
            <Button
              onClick={() => {
                setRequirementOpen(false);
                navigate('/support');
              }}
              fullWidth
            >
              Contact support
            </Button>
          </div>
          {error && <p role="alert" style={{ color: '#fca5a5', fontSize: 12 }}>{error}</p>}
        </div>
      </Modal>

      <Modal open={confirm} onClose={() => !loading && setConfirm(false)} title="Review withdrawal request">
        <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
          <p style={{ fontSize: 25, fontWeight: 800 }}>{fmt((parsedAmountMinor || 0) / 100)}</p>
          <p><span style={{ color: 'var(--text-secondary)' }}>Method: </span>{selectedMethod.label}</p>
          <p><span style={{ color: 'var(--text-secondary)' }}>Destination: </span>{getSafePayoutSummary(method, details[method]).destination}</p>
          <p style={{ color: '#fbbf24', lineHeight: 1.5 }}>
            This creates a simulated/manual request only. It does not send funds or verify a payout.
          </p>
          {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={() => setConfirm(false)} variant="secondary" fullWidth disabled={loading}>Cancel</Button>
            <Button onClick={handleWithdraw} disabled={loading} fullWidth>
              {loading ? 'Recording…' : 'Record request'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Withdrawal request receipt">
        {receipt && (
          <div style={{ display: 'grid', gap: 11, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#10b981' }}>
              <Check size={18} />
              <strong>Request recorded — not paid out</strong>
            </div>
            <p><span style={{ color: 'var(--text-secondary)' }}>Amount: </span>{fmt(receipt.amountMinor / 100)}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>Method: </span>{receipt.method}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>Destination: </span>{receipt.destination}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>Beneficiary: </span>{receipt.beneficiary}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>Reference: </span>{receipt.id}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>Estimated arrival: </span>{receipt.arrival}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>Status: </span>{receipt.status}</p>
            <Button onClick={() => setReceipt(null)} fullWidth>Done</Button>
          </div>
        )}
      </Modal>
      <BottomNav />
    </div>
  );
};

export default Withdraw;
