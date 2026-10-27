import React from 'react';
import { STATUS_LABELS } from '../services/verificationService';

/**
 * StatusBadge renders an accessible badge for verification statuses.
 * Green for Likely Delivered, Red for Likely to Bounce / Likely Bounce, Amber for Unknown.
 */
export default function StatusBadge({ status }) {
  let badgeClass = 'status-badge-unknown';
  let icon = null;

  if (status === STATUS_LABELS.DELIVERED) {
    badgeClass = 'status-badge-delivered';
    icon = (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M10 3L4.5 8.5L2 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else if (status === STATUS_LABELS.BOUNCE || status === STATUS_LABELS.BOUNCE_ALT) {
    badgeClass = 'status-badge-bounce';
    icon = (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M9 3L3 9M3 3l6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  } else {
    badgeClass = 'status-badge-unknown';
    icon = (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 3.5V6.5M6 8.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      {icon}
      <span>{status}</span>
    </span>
  );
}
