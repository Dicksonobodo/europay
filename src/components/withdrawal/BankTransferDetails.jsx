import { useEffect, useRef, useState } from 'react';
import { searchBanks } from '../../utils/bankDirectory';
import {
  enableManualBankEntry,
  filterBankResults,
  selectBankDetails,
} from '../../utils/bankDirectoryData';

const BankTransferDetails = ({
  details,
  onChange,
  onBankSelect,
  onManualEntry,
  onChangeSelection,
  onSearchDirectory,
  children,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [coverageNote, setCoverageNote] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const selectedBank = details.selectedBank;

  useEffect(() => {
    if (!open || selectedBank || details.manualEntry) return undefined;
    const term = query.trim();
    if (term.length < 4) {
      setResults([]);
      setError('');
      setStatus(term ? 'short' : 'idle');
      return undefined;
    }

    const controller = new AbortController();
    setStatus('loading');
    setResults([]);
    setError('');
    setCoverageNote('');
    const timeout = setTimeout(async () => {
      try {
        const response = await searchBanks({ query: term, signal: controller.signal });
        const matches = filterBankResults(response.results, term);
        setResults(matches);
        setCoverageNote(response.coverageNote);
        setStatus(matches.length > 0 ? 'results' : 'empty');
      } catch (searchError) {
        if (searchError.name !== 'AbortError') {
          setResults([]);
          setError(searchError.message || 'Bank lookup failed. You can enter bank details manually.');
          setStatus('error');
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query, selectedBank, details.manualEntry]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleSelect = (bank) => {
    onBankSelect(selectBankDetails(details, bank));
    setQuery('');
    setOpen(false);
    setResults([]);
  };

  const handleManualEntry = () => {
    onManualEntry(enableManualBankEntry(details));
    setOpen(false);
    setResults([]);
    requestAnimationFrame(() => {
      containerRef.current?.querySelector('[data-withdrawal-field="bankName"]')?.focus();
    });
  };

  const handleChange = () => {
    const currentName = selectedBank?.name || details.bankName || '';
    onChangeSelection({ ...details, selectedBank: null });
    onSearchDirectory();
    setQuery(currentName);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const moveOptionFocus = (event, index) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const options = resultsRef.current?.querySelectorAll('button[role="option"]');
    if (!options?.length) return;
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + options.length) % options.length;
    options[nextIndex].focus();
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
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBank.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {selectedBank.country} · {selectedBank.swiftCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleChange}
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
      ) : (
        <>
          {!details.manualEntry && (
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <label
                htmlFor="bank-directory-query"
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
                id="bank-directory-query"
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls="bank-directory-options"
                autoComplete="off"
                placeholder="Search bank name, country, or SWIFT/BIC"
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setOpen(false);
                  } else if (event.key === 'ArrowDown' && open) {
                    event.preventDefault();
                    resultsRef.current?.querySelector('button[role="option"]')?.focus();
                  }
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={handleManualEntry}
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
                Can’t find your bank? Enter details manually
              </button>
              {open && (
                <div
                  id="bank-directory-results"
                  style={{
                    position: 'absolute',
                    zIndex: 20,
                    top: 'calc(100% + 28px)',
                    left: 0,
                    right: 0,
                    maxHeight: 'min(55vh, 360px)',
                    overflowY: 'auto',
                    marginTop: 4,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'var(--bg-card)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                    overscrollBehavior: 'contain',
                  }}
                >
                  {status === 'short' && (
                    <p style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                      Enter at least four characters to search the bank directory.
                    </p>
                  )}
                  {status === 'loading' && (
                    <p role="status" style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                      Searching banks…
                    </p>
                  )}
                  {status === 'empty' && (
                    <p role="status" style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                      No banks match “{query.trim()}”. Enter your bank details manually below.
                    </p>
                  )}
                  {error && (
                    <p role="alert" style={{ padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                      {error} You can enter your bank details manually below.
                    </p>
                  )}
                  {results.length > 0 && (
                    <div id="bank-directory-options" ref={resultsRef} role="listbox" aria-label="Bank search results">
                      {results.map((bank, index) => (
                        <button
                          id={`bank-result-${index}`}
                          key={`${bank.swiftCode}-${bank.name}`}
                          type="button"
                          role="option"
                          aria-selected={false}
                          onKeyDown={(event) => moveOptionFocus(event, index)}
                          onClick={() => handleSelect(bank)}
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
                          <strong style={{ display: 'block', fontSize: 13 }}>{bank.name}</strong>
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {bank.country} · {bank.swiftCode}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {coverageNote && results.length > 0 && (
                    <p style={{ padding: 10, fontSize: 10, lineHeight: 1.4, color: 'var(--text-muted)' }}>
                      Source: APIVerve SWIFT Code Lookup. {coverageNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {details.manualEntry && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Bank not listed? Enter your details manually.</p>
              <button
                type="button"
                onClick={handleChange}
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
                Search directory
              </button>
            </div>
          )}
        </>
      )}
      {children}
    </div>
  );
};

export default BankTransferDetails;
