import { useEffect, useState } from 'react';
import { setWithdrawalSettings } from '../../firebase/firestore';
import {
  formatMinorUnits,
  parseAmountToMinorUnits,
  resolveWithdrawalRequirement,
  resolveWithdrawalStage,
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
    setRequirement(resolveWithdrawalRequirement(user));
  }, [user]);

  const updateRequirement = (field, value) => {
    setRequirement((previous) => ({ ...previous, [field]: value }));
    setFeedback(null);
  };

  const handleSave = async () => {
    const requiredAmountMinor = parseAmountToMinorUnits(upgradeAmount);
    if (requiredAmountMinor === null) {
      setFeedback({ type: 'error', text: 'Enter an upgrade amount with no more than two decimal places.' });
      return;
    }
    if (stage === 'upgrade' && requiredAmountMinor <= 0) {
      setFeedback({ type: 'error', text: 'The upgrade requirement must be greater than zero.' });
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
        Current step
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
          <option value="upgrade">Premium account upgrade required</option>
          <option value="processing_fee">Withdrawal processing fee required</option>
          <option value="enabled">Withdrawals enabled</option>
        </select>
      </label>

      {stage === 'upgrade' && (
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Upgrade requirement amount (€)
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

      {stage !== 'enabled' && (
        <>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Step status
            <select
              disabled={saving}
              value={requirement.status}
              onChange={(event) => updateRequirement('status', event.target.value)}
              style={{ ...fieldStyle, marginTop: 6 }}
            >
              <option value="required">Required</option>
              <option value="in_progress">In progress</option>
            </select>
          </label>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Why this step applies
            <textarea
              maxLength={500}
              rows={3}
              disabled={saving}
              value={requirement.reason}
              onChange={(event) => updateRequirement('reason', event.target.value)}
              style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Supporting instructions (optional)
            <textarea
              maxLength={1000}
              rows={4}
              disabled={saving}
              value={requirement.instructions}
              onChange={(event) => updateRequirement('instructions', event.target.value)}
              style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }}
            />
          </label>
        </>
      )}

      <p style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)' }}>
        Processing fee steps are informational only: this app does not collect or verify fee payments, and a fee does not guarantee a payout.
      </p>
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
      {stage !== 'enabled' && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
          Current selection: {stage === 'upgrade' ? 'Premium account upgrade required' : 'Withdrawal processing fee required'} — {requirement.status === 'in_progress' ? 'In progress' : 'Required'}
        </p>
      )}
    </section>
  );
};

export default WithdrawalSettingsForm;
