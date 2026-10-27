import React from 'react';

const PLACEHOLDER_TEXT = `alex.smith@company.com
invalid-email@domain
contact@organization.org`;

/**
 * EmailInput renders the textarea input card, live counter, controls, and notice.
 */
export default function EmailInput({
  inputValue,
  onInputChange,
  onValidate,
  onClear,
  isLoading,
  nonEmptyCount,
  errorMessage,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (nonEmptyCount === 0 || isLoading) {
      return;
    }
    onValidate();
  };

  return (
    <section className="input-card" aria-labelledby="input-heading">
      <div className="card-header">
        <h2 id="input-heading" className="card-title">
          Enter Email Addresses
        </h2>
        <span className="live-counter" aria-live="polite" aria-atomic="true">
          <strong>{nonEmptyCount}</strong> {nonEmptyCount === 1 ? 'address' : 'addresses'} ready
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email-textarea" className="input-label">
            Email List
          </label>
          <p id="textarea-instruction" className="input-note">
            Enter one email address per line.
          </p>

          <textarea
            id="email-textarea"
            className={`email-textarea ${errorMessage ? 'has-error' : ''}`}
            rows={7}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={PLACEHOLDER_TEXT}
            aria-describedby="textarea-instruction input-error-msg"
            aria-invalid={Boolean(errorMessage)}
            disabled={isLoading}
            spellCheck="false"
            autoCapitalize="none"
            autoCorrect="off"
          />

          {errorMessage && (
            <div id="input-error-msg" className="error-banner" role="alert" aria-live="assertive">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4.5v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="actions-row">
          <div className="button-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={nonEmptyCount === 0 || isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M13.5 4.5L6.5 11.5L2.5 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Validate Emails</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClear}
              disabled={isLoading || (!inputValue && nonEmptyCount === 0)}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 4h10M6 4V2.5A1.5 1.5 0 0 1 7.5 1h1A1.5 1.5 0 0 1 10 2.5V4M5 4v9a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 11 13V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
