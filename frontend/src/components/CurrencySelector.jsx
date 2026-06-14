import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, ChevronDown, Globe } from 'lucide-react';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext.jsx';

export default function CurrencySelector() {
  const { currency, setCurrency, loading, lastUpdated, fetchRates } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Select currency"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600, color: 'var(--text)',
          transition: 'var(--transition)',
        }}
      >
        <Globe size={14} style={{ color: 'var(--primary)' }} />
        <span>{current.flag} {current.code}</span>
        <ChevronDown size={12} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minWidth: '240px', zIndex: 1000, overflow: 'hidden',
          animation: 'fadeInDown 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px', background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              SELECT CURRENCY
            </span>
            <button
              onClick={() => fetchRates(true)}
              disabled={loading}
              title="Refresh live rates"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 600, padding: '2px 6px',
              }}
            >
              <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>

          {/* Currency list */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {CURRENCIES.map(c => (
              <div
                key={c.code}
                onClick={() => { setCurrency(c.code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 14px', cursor: 'pointer',
                  background: c.code === currency ? 'var(--surface)' : 'white',
                  borderLeft: c.code === currency ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--card-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = c.code === currency ? 'var(--surface)' : 'white'}
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{c.flag}</span>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontWeight: c.code === currency ? 700 : 500, fontSize: '14px', color: 'var(--text)' }}>
                    {c.code} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>— {c.name}</span>
                  </div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{c.symbol}</span>
              </div>
            ))}
          </div>

          {/* Footer: last updated */}
          {lastUpdated && (
            <div style={{
              padding: '7px 14px', borderTop: '1px solid var(--border)',
              fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface)',
            }}>
              🔄 Rates updated: {lastUpdated.toLocaleTimeString()} · Powered by open.er-api.com
            </div>
          )}
        </div>
      )}
    </div>
  );
}
