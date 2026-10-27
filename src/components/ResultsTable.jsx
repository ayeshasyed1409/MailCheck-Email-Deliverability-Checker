import React from 'react';
import StatusBadge from './StatusBadge';
import ResultsSummary from './ResultsSummary';

/**
 * ResultsTable handles displaying the verification results, summary stats,
 * live backend indicator, explanatory note, and empty-state placeholder.
 */
export default function ResultsTable({ results, summary, hasValidated }) {
  return (
    <section className="results-section" aria-labelledby="results-heading">
      <div className="results-header-row">
        <h2 id="results-heading" className="results-title">
          Verification Results
        </h2>
      </div>

      {!hasValidated ? (
        /* Empty State before first validation */
        <div className="empty-state" role="status">
          <div className="empty-icon" aria-hidden="true">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              <path d="M12 12v3M12 18v.01" />
            </svg>
          </div>
          <h3 className="empty-title">No email addresses validated yet</h3>
          <p className="empty-description">
            Enter one or more email addresses in the box above and click{' '}
            <strong>Validate Emails</strong>.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <ResultsSummary summary={summary} />

          {/* Table Container with Horizontal Scroll Fallback */}
          <div className="table-responsive-wrapper" tabIndex={0} role="region" aria-label="Results table scroll container">
            <table className="results-table">
              <caption className="sr-only">
                List of validated email addresses with delivery status and explanations
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="col-index">#</th>
                  <th scope="col" className="col-email">Email Address</th>
                  <th scope="col" className="col-status">Status</th>
                  <th scope="col" className="col-explanation">Explanation & DNS Checks</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={item.id || `${item.email}-${index}`}>
                    <td className="cell-index">{index + 1}</td>
                    <td className="cell-email">
                      <span className="email-text">{item.email}</span>
                    </td>
                    <td className="cell-status">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="cell-explanation">
                      <div className="explanation-text">{item.explanation || item.reason}</div>
                      {item.checks && item.checks.dns_result && (
                        <div className="dns-check-detail">
                          <span className="dns-check-tag">
                            <span className="dns-check-dot" aria-hidden="true" />
                            {item.checks.dns_result}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
