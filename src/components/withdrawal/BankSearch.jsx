import { useEffect, useMemo, useRef, useState } from 'react';
import { BANKS } from '../../data/banks';
import { filterBankResults, selectBankDetails } from '../../utils/bankDirectoryData';

const BankSearch = ({
  details,
  onBankSelect,
  onManualEntry,
  onChangeSelection,
  onSearchDirectory,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const optionsRef = useRef(null);
  const results = useMemo(() => filterBankResults(BANKS, query), [query]);
  const selectedBank = details.selectedBank;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const selectBank = (bank) => {
    onBankSelect(selectBankDetails(details, bank));
    setQuery('');
    setOpen(false);
  };

  const startManualEntry = () => {
    onManualEntry(details);
    setOpen(false);
    requestAnimationFrame(() => {
      containerRef.current?.querySelector('[data-withdrawal-field="bankName"]')?.focus();
    });
  };

  const changeBank = () => {
    const currentName = selectedBank?.name || details.bankName || '';
    onChangeSelection({ ...details, selectedBank: null });
    onSearchDirectory();
    setQuery(currentName);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' && open) {
      event.preventDefault();
      optionsRef.current?.querySelector('button[role="option"]')?.focus();
    }
  };

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const options = optionsRef.current?.querySelectorAll('button[role="option"]');
    if (!options?.length) return;
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    options[(index + direction + options.length) % options.length].focus();
  };

  return (
    <div ref={containerRef} style={{ marginBottom: 12 }}>
      {selectedBank ? (
        <section
          aria-label="Selected bank"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedBank.flag} {selectedBank.name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {selectedBank.country} · {selectedBank.swiftCode}
              </p>
            </div>
            <button
              type="button"
              onClick={changeBank}
              style={{
                border: 0,
                background: 'transparent',
                color: '#a78bfa',
                fontSize: 12,
                fontWeight: 700,
                padding: 4,
                cursor: 'pointer',
              }}
            >
              Change
            </button>
          </div>
        </section>
      ) : details.manualEntry ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Bank not listed? Enter your details manually.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchDirectory();
              setQuery('');
              setOpen(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            style={{
              border: 0,
              background: 'transparent',
              color: '#a78bfa',
              fontSize: 12,
              fontWeight: 700,
              padding: 4,
              cursor: 'pointer',
            }}
          >
            Search banks
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <label
              htmlFor="bank-search-query"
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Bank
            </label>
            <input
              ref={inputRef}
              id="bank-search-query"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="bank-search-results"
              autoComplete="off"
              placeholder="Search bank name, country, or SWIFT/BIC"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onKeyDown={handleInputKeyDown}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 12,
                padding: '12px 14px',
                color: 'var(--text-primary)',
              }}
            />
            {open && (
              <div
                id="bank-search-results"
                style={{
                  position: 'absolute',
                  zIndex: 20,
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  maxHeight: 'min(55vh, 360px)',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: 'var(--bg-card)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                  overscrollBehavior: 'contain',
                }}
              >
                {results.length ? (
                  <div ref={optionsRef} role="listbox" aria-label="Bank search results">
                    {results.map((bank, index) => (
                      <button
                        key={`${bank.country}-${bank.swiftCode}`}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onKeyDown={(event) => handleOptionKeyDown(event, index)}
                        onClick={() => selectBank(bank)}
                        style={{
                          display: 'block',
                          width: '100%',
                          border: 0,
                          borderBottom: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          padding: 12,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: 13 }}>
                          {bank.flag} {bank.name}
                        </strong>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                          {bank.country} · {bank.swiftCode}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p role="status" style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                    No banks match “{query.trim()}”.
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={startManualEntry}
            style={{
              display: 'block',
              border: 0,
              background: 'transparent',
              color: '#a78bfa',
              padding: '9px 0 2px',
              textAlign: 'left',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            My bank isn’t listed — enter it manually
          </button>
        </>
      )}
    </div>
  );
};

export default BankSearch;
