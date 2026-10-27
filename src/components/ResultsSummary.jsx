import React from 'react';

/**
 * ResultsSummary displays stat cards for Total Addresses, Likely Delivered,
 * Likely Bounce, and Unknown counts.
 */
export default function ResultsSummary({ summary }) {
  const { total = 0, delivered = 0, bounce = 0, unknown = 0 } = summary || {};

  return (
    <div className="summary-grid" role="region" aria-label="Verification Results Summary">
      <div className="summary-card total">
        <div className="summary-meta">
          <span className="summary-label">Total Addresses</span>
          <span className="summary-value">{total}</span>
        </div>
        <div className="summary-indicator total" aria-hidden="true" />
      </div>

      <div className="summary-card delivered">
        <div className="summary-meta">
          <span className="summary-label">Likely Delivered</span>
          <span className="summary-value">{delivered}</span>
        </div>
        <div className="summary-indicator delivered" aria-hidden="true" />
      </div>

      <div className="summary-card bounce">
        <div className="summary-meta">
          <span className="summary-label">Likely Bounce</span>
          <span className="summary-value">{bounce}</span>
        </div>
        <div className="summary-indicator bounce" aria-hidden="true" />
      </div>

      <div className="summary-card unknown">
        <div className="summary-meta">
          <span className="summary-label">Unknown</span>
          <span className="summary-value">{unknown}</span>
        </div>
        <div className="summary-indicator unknown" aria-hidden="true" />
      </div>
    </div>
  );
}
