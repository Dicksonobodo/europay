import { useEffect, useState } from 'react';
import { setWithdrawalSettings } from '../../firebase/firestore';
import {
  formatMinorUnits,
  parseAmountToMinorUnits,
  resolveWithdrawalRequirement,
  resolveWithdrawalStage,
  validateWithdrawalRequirementAmounts,
  validateWithdrawalRequirement,
} from '../../utils/withdrawal';

const fieldStyle = {
  width: '100%',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-light)',
  borderRadius: 10,
  padding: '10px 12px',
  color: 'var(--text-primary)',
};

const WithdrawalSettingsForm = ({ user, onSaved }) => {
  const [stage, setStage] = useState('upgrade');
  const [upgradeAmount, setUpgradeAmount] = useState('');
  const [processingFeeAmount, setProcessingFeeAmount] = useState('');
  const [requirement, setRequirement] = useState({
    status: 'required',
    reason: '',
    instructions: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setStage(resolveWithdrawalStage(user));
    setUpgradeAmount(formatMinorUnits(user.requiredAmountMinor || 0));
    setProcessingFeeAmount(formatMinorUnits(user.processingFeeMinor || 0));
    setRequirement(resolveWithdrawalRequirement(user));
  }, [user]);

  const updateRequirement = (field, value) => {
    setRequirement((previous) => ({ ...previous, [field]: value }));
    setFeedback(null);
  };

  const handleSave = async () => {
    const requiredAmountMinor = parseAmountToMinorUnits(upgradeAmount || '0');
    const processingFeeMinor = parseAmountToMinorUnits(processingFeeAmount || '0');
    const amountsError = validateWithdrawalRequirementAmounts({
      stage,
      requiredAmountMinor,
      processingFeeMinor,
    });
    if (amountsError) {
      setFeedback({ type: 'error', text: amountsError });
      return;
    }
    const requirementError = validateWithdrawalRequirement(requirement, stage);
    if (requirementError) {
      setFeedback({ type: 'error', text: requirementError });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const saved = await setWithdrawalSettings(user.uid, {
        stage,
        requiredAmountMinor,
        processingFeeMinor,
        requirement,
      });
      onSaved?.(user.uid, saved);
      setFeedback({ type: 'success', text: 'Withdrawal requirements saved.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not save withdrawal requirements.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label={`Withdrawal requirements for ${user.fullName}`}
      style={{
        marginTop: 12,
        padding: 14,
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--bg-secondary)',
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
        Withdrawal requirements
      </p>

      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
        Current withdrawal status
        <select
          disabled={saving}
          value={stage}
          onChange={(event) => {
            const nextStage = event.target.value;
            setStage(nextStage);
            setRequirement((previous) => ({
              ...previous,
              status: nextStage === 'enabled' ? 'completed' : (
                previous.status === 'completed' ? 'required' : previous.status
              ),
            }));
            setFeedback(null);
          }}
          style={{ ...fieldStyle, marginTop: 6 }}
        >
          <option value="upgrade">Premium account upgrade required (information only)</option>
          <option value="processing_fee">Withdrawal processing fee required (information only)</option>
          <option value="enabled">Withdrawals enabled</option>
        </select>
      </label>

      {stage === 'upgrade' && (
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Premium upgrade information amount (EUR)
          <input
            type="number"
            min="0.01"
            step="0.01"
            disabled={saving}
            value={upgradeAmount}
            onChange={(event) => {
              setUpgradeAmount(event.target.value);
              setFeedback(null);
            }}
            style={{ ...fieldStyle, marginTop: 6 }}
        />
        </label>
      )}
      {stage === 'processing_fee' && (
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Processing fee information amount (EUR)
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={saving}
            value={processingFeeAmount}
            onChange={(event) => {
              setProcessingFeeAmount(event.target.value);
              setFeedback(null);
            }}
            style={{ ...fieldStyle, marginTop: 6 }}
          />
        </label>
      )}

      {stage !== 'enabled' && (
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
          User-facing write-up
          <textarea
            maxLength={1000}
            rows={5}
            disabled={saving}
            value={requirement.reason}
            onChange={(event) => updateRequirement('reason', event.target.value)}
            placeholder="Write the information users will see for this withdrawal status."
            style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }}
          />
        </label>
      )}

      {feedback && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'} style={{
          marginTop: 8,
          fontSize: 12,
          color: feedback.type === 'error' ? '#ef4444' : '#10b981',
        }}>
          {feedback.text}
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          marginTop: 10,
          padding: 10,
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 10,
          background: 'rgba(124,58,237,0.15)',
          color: '#a78bfa',
          fontWeight: 700,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : `Save requirements for ${user.fullName}`}
      </button>
    </section>
  );
};

export default WithdrawalSettingsForm;
