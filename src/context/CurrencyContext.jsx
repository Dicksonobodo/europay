import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AuthContext from './AuthContext';
import CurrencyContext from './CurrencyStateContext';
import { updateUserPreferredCurrency } from '../firebase/firestore';
import {
  BASE_CURRENCY,
  CURRENCY_SELECTION_PENDING_KEY,
  formatCurrency as formatMoney,
  getStoredCurrency,
  isSupportedCurrency,
  parseExchangeRate,
  setStoredCurrency,
} from '../utils/currency';

const RATE_CACHE_PREFIX = 'europay_exchange_rate_';
const RATE_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;

const getCachedRate = (currency) => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const cached = JSON.parse(localStorage.getItem(`${RATE_CACHE_PREFIX}${currency}`));
    if (
      Number.isFinite(cached?.rate)
      && cached.rate > 0
      && Date.now() - cached.fetchedAt < RATE_CACHE_MAX_AGE
    ) return cached.rate;
  } catch {
    return null;
  }
  return null;
};

export const CurrencyProvider = ({ children }) => {
  const { currentUser, userData, loading: authLoading } = useContext(AuthContext);
  const [currency, setCurrencyState] = useState(getStoredCurrency);
  const [rate, setRate] = useState(currency === BASE_CURRENCY ? 1 : null);
  const [rateCurrency, setRateCurrency] = useState(currency);
  const [rateError, setRateError] = useState('');
  const [preferenceError, setPreferenceError] = useState('');

  useEffect(() => {
    if (authLoading || !currentUser || !userData) return;
    const pendingSelection = localStorage.getItem(CURRENCY_SELECTION_PENDING_KEY) === 'true';
    if (pendingSelection) {
      updateUserPreferredCurrency(currentUser.uid, currency).then(() => {
        localStorage.removeItem(CURRENCY_SELECTION_PENDING_KEY);
        setPreferenceError('');
      }).catch((error) => {
        setPreferenceError(error.message || 'Could not save your currency preference.');
      });
      return;
    }

    if (isSupportedCurrency(userData.preferredCurrency)) {
      if (userData.preferredCurrency !== currency) {
        setCurrencyState(userData.preferredCurrency);
        setStoredCurrency(userData.preferredCurrency);
      }
      return;
    }

    updateUserPreferredCurrency(currentUser.uid, currency).catch((error) => {
      setPreferenceError(error.message || 'Could not save your currency preference.');
    });
  }, [authLoading, currentUser, userData, currency]);

  useEffect(() => {
    let active = true;
    setRateError('');
    if (currency === BASE_CURRENCY) {
      setRate(1);
      setRateCurrency(currency);
      return () => { active = false; };
    }

    const cachedRate = getCachedRate(currency);
    if (cachedRate) setRate(cachedRate);
    else setRate(null);
    setRateCurrency(currency);

    fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`)
      .then((response) => {
        if (!response.ok) throw new Error('Exchange-rate service is unavailable.');
        return response.json();
      })
      .then((payload) => {
        const nextRate = parseExchangeRate(payload, currency);
        if (!active) return;
        setRate(nextRate);
        localStorage.setItem(`${RATE_CACHE_PREFIX}${currency}`, JSON.stringify({
          rate: nextRate,
          fetchedAt: Date.now(),
        }));
      })
      .catch((error) => {
        if (!active) return;
        setRateError(error.message || 'Could not load exchange rates.');
      });

    return () => { active = false; };
  }, [currency]);

  const setCurrency = useCallback(async (nextCurrency) => {
    if (!isSupportedCurrency(nextCurrency)) throw new Error('Choose a supported currency.');
    setPreferenceError('');
    setCurrencyState(nextCurrency);
    setStoredCurrency(nextCurrency);
    if (currentUser && userData) {
      try {
        await updateUserPreferredCurrency(currentUser.uid, nextCurrency);
      } catch (error) {
        setPreferenceError(error.message || 'Could not save your currency preference.');
        throw error;
      }
    }
  }, [currentUser, userData]);

  const activeRate = rateCurrency === currency ? rate : null;
  const format = useCallback(
    (amount) => formatMoney(amount, activeRate ? currency : BASE_CURRENCY, activeRate || 1),
    [currency, activeRate],
  );
  const value = useMemo(() => ({
    currency,
    rate: activeRate,
    rateError,
    preferenceError,
    setCurrency,
    formatCurrency: format,
  }), [currency, activeRate, rateError, preferenceError, setCurrency, format]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};
