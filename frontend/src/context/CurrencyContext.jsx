import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ── Supported currencies ──────────────────────────────────────────────────────
export const CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar',         flag: '🇺🇸' },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee',      flag: '🇮🇳' },
  { code: 'EUR', symbol: '€',  name: 'Euro',              flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',  name: 'British Pound',     flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',      flag: '🇯🇵' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',       flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',  flag: '🇸🇬' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar',   flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan',      flag: '🇨🇳' },
];

const CurrencyContext = createContext(null);

// Rates are fetched based on USD (base). All prices in app are in USD.
const RATES_CACHE_KEY = 'fd_fx_rates';
const RATES_TS_KEY    = 'fd_fx_ts';
const CACHE_TTL_MS    = 60 * 60 * 1000; // 1 hour

export function CurrencyProvider({ children }) {
  const saved = localStorage.getItem('fd_currency') || 'INR';
  const [currency, _setCurrency] = useState(saved);
  const [rates, setRates]         = useState({ USD: 1 });
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRates = useCallback(async (force = false) => {
    // Use cached rates if fresh enough
    const cached   = localStorage.getItem(RATES_CACHE_KEY);
    const cachedTs = parseInt(localStorage.getItem(RATES_TS_KEY) || '0', 10);
    if (!force && cached && Date.now() - cachedTs < CACHE_TTL_MS) {
      setRates(JSON.parse(cached));
      setLastUpdated(new Date(cachedTs));
      setLoading(false);
      return;
    }

    try {
      // open.er-api.com — free tier, no API key required, 1500 req/month
      const res  = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data.result === 'success') {
        const r = data.rates;
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(r));
        localStorage.setItem(RATES_TS_KEY, String(Date.now()));
        setRates(r);
        setLastUpdated(new Date());
      }
    } catch (e) {
      // Fallback to hardcoded approximate rates if network fails
      const fallback = {
        USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 157.2,
        AED: 3.67, SGD: 1.34, CAD: 1.36, AUD: 1.51, CNY: 7.26,
      };
      setRates(fallback);
      console.warn('[Currency] Live rates unavailable — using fallback rates.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every hour
  useEffect(() => {
    fetchRates();
    const interval = setInterval(() => fetchRates(true), CACHE_TTL_MS);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const setCurrency = (code) => {
    _setCurrency(code);
    localStorage.setItem('fd_currency', code);
  };

  /** Convert a USD amount to the selected currency */
  const convert = useCallback((usdAmount) => {
    const rate = rates[currency] ?? 1;
    return usdAmount * rate;
  }, [rates, currency]);

  /** Format a converted amount with the currency's symbol */
  const format = useCallback((usdAmount) => {
    const converted = convert(usdAmount);
    const curr      = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    // JPY & INR: no decimal; others: 2 decimal places
    const decimals  = ['JPY'].includes(currency) ? 0 : 2;
    return `${curr.symbol}${converted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }, [convert, currency]);

  return (
    <CurrencyContext.Provider value={{
      currency, setCurrency, rates, convert, format,
      loading, lastUpdated, fetchRates,
      currencyMeta: CURRENCIES.find(c => c.code === currency) || CURRENCIES[0],
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside <CurrencyProvider>');
  return ctx;
}
