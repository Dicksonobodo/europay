import { useState } from 'react';
import { useCurrency } from '../../hooks/useCurrency';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

const CurrencySelector = () => {
  const { currency, setCurrency, rateError, preferenceError } = useCurrency();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async (event) => {
    setSaving(true);
    setError('');
    try {
      await setCurrency(event.target.value);
    } catch (saveError) {
      setError(saveError.message || 'Could not save currency preference.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label htmlFor="preferred-currency" style={{
        color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, letterSpacing: 0.4,
      }}>
        PREFERRED DISPLAY CURRENCY
      </label>
      <select
        id="preferred-currency"
        value={currency}
        onChange={handleChange}
        disabled={saving}
        style={{
          width: '100%', background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)', borderRadius: 12,
          padding: '12px 14px', color: 'var(--text-primary)', fontSize: 14,
        }}
      >
        {SUPPORTED_CURRENCIES.map(({ code, name }) => (
          <option key={code} value={code}>{code} — {name}</option>
        ))}
      </select>
      <p style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.4, margin: 0 }}>
        Display amounts are estimates converted from EUR. Account records and amount entry remain in EUR.
      </p>
      {(error || preferenceError) && (
        <p role="alert" style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error || preferenceError}</p>
      )}
      {rateError && currency !== 'EUR' && (
        <p role="status" style={{ color: '#f59e0b', fontSize: 12, margin: 0 }}>
          {rateError} Amounts use the last available rate when possible; otherwise they show in EUR.
        </p>
      )}
    </div>
  );
};

export default CurrencySelector;
