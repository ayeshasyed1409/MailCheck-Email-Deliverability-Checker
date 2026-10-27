import React from 'react';

/**
 * Header component displaying the branding, badge, and introductory copy.
 */
export default function Header() {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-lockup">
          {/* Inline SVG Mail + Check Icon */}
          <div className="brand-icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              <path d="m16 19 2 2 4-4" stroke="#0d9488" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="brand-info">
            <span className="brand-name">MailCheck</span>
            <span className="brand-badge">EMAIL VERIFICATION TOOL</span>
          </div>
        </div>
      </div>

      <div className="header-content">
        <h1 className="header-title">Check your email deliverability</h1>
        <p className="header-subtitle">
          Validate multiple email addresses and review their verification status in one place.
        </p>
      </div>
    </header>
  );
}
