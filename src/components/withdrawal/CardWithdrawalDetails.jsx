import { getCardPreview } from '../../utils/withdrawal';
import './CardWithdrawalDetails.css';

const inputStyle = {
  width: '100%',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-light)',
  borderRadius: 10,
  padding: '10px 11px',
  color: 'var(--text-primary)',
  marginTop: 5,
};

const CardWithdrawalDetails = ({ details, onChange }) => {
  const preview = getCardPreview(details);

  return (
    <div className="card-withdrawal-layout">
      <div
        className="withdrawal-card-preview"
        aria-label={`${preview.brand} card ending ${details.cardNumber.slice(-4) || 'in placeholder digits'}`}
      >
        <div className="withdrawal-card-preview__top">
          <span className="withdrawal-card-preview__chip" aria-hidden="true" />
          <span className="withdrawal-card-preview__brand">{preview.brand}</span>
        </div>
        <p className="withdrawal-card-preview__number">{preview.number}</p>
        <div className="withdrawal-card-preview__bottom">
          <div className="withdrawal-card-preview__name">
            <span>Cardholder</span>
            <strong>{preview.name}</strong>
          </div>
          <div className="withdrawal-card-preview__expiry">
            <span>Expires</span>
            <strong>{preview.expiry}</strong>
          </div>
        </div>
      </div>

      <div className="card-withdrawal-fields">
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 9 }}>
          Card number
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            maxLength={23}
            placeholder="Card number"
            value={preview.number === '•••• •••• •••• ••••' ? '' : preview.number}
            onChange={(event) => onChange('cardNumber', event.target.value.replace(/\D/g, '').slice(0, 19))}
            style={inputStyle}
            aria-label="Card number"
          />
        </label>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 9 }}>
          Name on card
          <input
            type="text"
            autoComplete="cc-name"
            maxLength={80}
            placeholder="Cardholder name"
            value={details.cardholderName}
            onChange={(event) => onChange('cardholderName', event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>
          Expiry (MM/YY)
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={5}
            placeholder="MM/YY"
            value={details.expiry}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
              const expiry = digits.length > 2
                ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                : digits;
              onChange('expiry', expiry);
            }}
            style={inputStyle}
          />
        </label>
      </div>
    </div>
  );
};

export default CardWithdrawalDetails;
