/**
 * Verification API Service
 *
 * Communicates with the Python Flask backend at http://127.0.0.1:5000
 * Handles batch email verification requests, response mapping,
 * and comprehensive network/server error handling.
 */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const STATUS_LABELS = {
  DELIVERED: 'Likely Delivered',
  BOUNCE: 'Likely to Bounce',
  BOUNCE_ALT: 'Likely Bounce',
  UNKNOWN: 'Unknown',
};

/**
 * Checks if the backend server is online and healthy.
 *
 * @returns {Promise<{ isHealthy: boolean, message: string }>}
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        isHealthy: false,
        message: `Backend health check failed with status ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      isHealthy: true,
      message: data.message || 'Email verification backend is running',
    };
  } catch {
    return {
      isHealthy: false,
      message: 'Cannot connect to backend server at http://127.0.0.1:5000',
    };
  }
}

/**
 * Sends a batch of email addresses to the Flask backend for verification.
 *
 * @param {string[]} emailList - Non-empty array of email addresses.
 * @returns {Promise<{ results: Array, summary: object }>}
 * @throws {Error} Descriptive error message on network failure or HTTP error.
 */
export async function verifyEmails(emailList) {
  if (!Array.isArray(emailList) || emailList.length === 0) {
    throw new Error('Please enter at least one email address to verify.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ emails: emailList }),
    });
  } catch {
    // Network errors occur when the Flask backend is not running or blocked by CORS/firewall
    throw new Error(
      'Unable to connect to the verification server at http://127.0.0.1:5000. ' +
      'Please make sure the Python Flask backend is running (python app.py).'
    );
  }

  // Parse JSON response body
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
  }

  // Handle HTTP error statuses (4xx, 5xx)
  if (!response.ok) {
    const errorMessage = data && data.error
      ? data.error
      : `Verification request failed with HTTP ${response.status} (${response.statusText}).`;
    throw new Error(errorMessage);
  }

  if (!data || !Array.isArray(data.results)) {
    throw new Error('Server returned an unexpected response structure (missing results array).');
  }

  // Map results to ensure full compatibility with the existing UI table
  const mappedResults = data.results.map((item, index) => {
    const status = item.status || STATUS_LABELS.UNKNOWN;
    const explanation = item.reason || 'Verification check completed.';

    return {
      id: `${index}-${item.email}`,
      email: item.email,
      status: status,
      reason: item.reason,
      explanation: explanation,
      checks: item.checks || {},
    };
  });

  // Calculate summary metrics directly from actual returned results
  const summary = {
    total: mappedResults.length,
    delivered: mappedResults.filter((r) => r.status === STATUS_LABELS.DELIVERED).length,
    bounce: mappedResults.filter(
      (r) => r.status === STATUS_LABELS.BOUNCE || r.status === STATUS_LABELS.BOUNCE_ALT
    ).length,
    unknown: mappedResults.filter((r) => r.status === STATUS_LABELS.UNKNOWN).length,
  };

  return { results: mappedResults, summary };
}
