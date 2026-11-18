import { useEffect, useState } from 'react';
import { getAppDefaults, setAppDefaults } from '../../firebase/firestore';
import {
  DEFAULT_MINIMUM_WITHDRAWAL_MINOR,
  formatMinorUnits,
  parseAmountToMinorUnits,
} from '../../utils/withdrawal';

const AppDefaultsEditor = () => {
  const [upgradePlanId, setUpgradePlanId] = useState('');
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(
    formatMinorUnits(DEFAULT_MINIMUM_WITHDRAWAL_MINOR)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let active = true;
    getAppDefaults()
      .then((defaults) => {
        if (!active) return;
        setUpgradePlanId(defaults.upgradePlanId || '');
        setMinimumWithdrawal(formatMinorUnits(
          defaults.minimumWithdrawalMinor ?? DEFAULT_MINIMUM_WITHDRAWAL_MINOR
        ));
      })
      .catch((error) => {
        if (active) setFeedback({ type: 'error', text: error.message || 'Could not load app defaults.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    const minimumWithdrawalMinor = parseAmountToMinorUnits(minimumWithdrawal);
    if (minimumWithdrawalMinor === null || minimumWithdrawalMinor <= 0) {
      setFeedback({ type: 'error', text: 'Enter a minimum withdrawal greater than zero, with up to two decimals.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await setAppDefaults({ upgradePlanId, minimumWithdrawalMinor });
      setFeedback({ type: 'success', text: 'App defaults saved.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not save app defaults.' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    marginTop: 6,
    padding: '11px 12px',
    borderRadius: 10,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  };

  return (
    <section style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 18,
    }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Shared app defaults</h2>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
        These settings apply to withdrawal requests. Requirement amounts are displayed only; no payment is collected here.
      </p>
      {loading ? (
        <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading settings…</p>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Upgrade plan ID
            <input
              value={upgradePlanId}
              disabled={saving}
              onChange={(event) => {
                setUpgradePlanId(event.target.value);
                setFeedback(null);
              }}
              maxLength={100}
              placeholder="Optional"
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Minimum withdrawal (€)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={minimumWithdrawal}
              disabled={saving}
              onChange={(event) => {
                setMinimumWithdrawal(event.target.value);
                setFeedback(null);
              }}
              style={inputStyle}
            />
          </label>
          {feedback && (
            <p role={feedback.type === 'error' ? 'alert' : 'status'} style={{
              color: feedback.type === 'error' ? '#ef4444' : '#10b981',
              fontSize: 13,
              marginBottom: 12,
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
              padding: 12,
              border: 'none',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              color: '#fff',
              fontWeight: 700,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save app defaults'}
          </button>
        </>
      )}
    </section>
  );
};

export default AppDefaultsEditor;
