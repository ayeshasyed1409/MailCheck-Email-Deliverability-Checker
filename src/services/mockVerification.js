/**
 * Mock Email Deliverability Service (Frontend Demo Only)
 *
 * IMPORTANT NOTE:
 * This is a local mock function for demonstrating the user interface.
 * - It does NOT perform real email verification, DNS resolution, MX lookups, or SMTP handshakes.
 * - Format validity alone NEVER guarantees that an inbox exists or can receive messages.
 * - All statuses and explanations explicitly state they are simulated demo results.
 * - This service will be replaced by the Python Flask backend API in the next development phase.
 */

export const STATUS_LABELS = {
  DELIVERED: 'Likely Delivered',
  BOUNCE: 'Likely Bounce',
  UNKNOWN: 'Unknown',
};

/**
 * Basic syntax validation regex based on standard email syntax rules.
 * Checks for a local part, single @, and a valid domain with at least one dot.
 */
const EMAIL_SYNTAX_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Common role-based prefixes that typically need live SMTP/MX verification.
 */
const ROLE_BASED_PREFIXES = [
  'admin@',
  'support@',
  'info@',
  'contact@',
  'sales@',
  'help@',
  'billing@',
  'postmaster@',
  'noreply@',
  'no-reply@',
];

/**
 * Evaluates a single email address in demo mode.
 *
 * @param {string} email - The trimmed email address.
 * @param {number} index - Original line index for stable identification.
 * @returns {object} Verification result item with email, status, explanation, and id.
 */
export function evaluateMockEmail(email, index) {
  const lowerEmail = email.toLowerCase();

  // 1. Check for obvious syntax malformations
  if (!email.includes('@')) {
    return {
      id: `${index}-${email}`,
      email,
      status: STATUS_LABELS.BOUNCE,
      explanation: 'Simulated demo result: Missing "@" symbol. Obvious syntax error.',
    };
  }

  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      id: `${index}-${email}`,
      email,
      status: STATUS_LABELS.BOUNCE,
      explanation: 'Simulated demo result: Invalid email structure around "@".',
    };
  }

  const [, domainPart] = parts;

  if (!domainPart.includes('.')) {
    return {
      id: `${index}-${email}`,
      email,
      status: STATUS_LABELS.BOUNCE,
      explanation: 'Simulated demo result: Domain is missing a top-level domain (TLD).',
    };
  }

  if (domainPart.endsWith('.') || domainPart.startsWith('.')) {
    return {
      id: `${index}-${email}`,
      email,
      status: STATUS_LABELS.BOUNCE,
      explanation: 'Simulated demo result: Domain cannot start or end with a dot.',
    };
  }

  if (!EMAIL_SYNTAX_REGEX.test(email)) {
    return {
      id: `${index}-${email}`,
      email,
      status: STATUS_LABELS.BOUNCE,
      explanation: 'Simulated demo result: Contains invalid characters or malformed format.',
    };
  }

  // 2. Ambiguous or Role-based addresses simulated as Unknown
  const isRoleBased = ROLE_BASED_PREFIXES.some((prefix) => lowerEmail.startsWith(prefix));
  const isDemoUnknownDomain =
    lowerEmail.includes('unknown') ||
    lowerEmail.endsWith('.test') ||
    lowerEmail.endsWith('.example') ||
    lowerEmail.endsWith('.invalid') ||
    lowerEmail.endsWith('.localhost');

  if (isRoleBased) {
    return {
      id: `${index}-${email}`,
      email,
      status: STATUS_LABELS.UNKNOWN,
      explanation:
        'Simulated demo result: Role-based address. Deliverability requires live MX/SMTP probing.',
    };
  }

  if (isDemoUnknownDomain) {
    return {
      id: `${index}-${email}`,
      email,
      status: STATUS_LABELS.UNKNOWN,
      explanation:
        'Simulated demo result: Test or reserved domain. Cannot establish deliverability without real DNS checks.',
    };
  }

  // 3. Simulated Likely Delivered
  // Explicitly qualified as a simulated demo status
  return {
    id: `${index}-${email}`,
    email,
    status: STATUS_LABELS.DELIVERED,
    explanation:
      'Simulated demo result: Standard syntax detected. Deliverability simulated as active for interface testing.',
  };
}

/**
 * Mock verification function that processes a list of emails.
 * Includes a small delay to simulate asynchronous validation and show the loading state.
 *
 * @param {string[]} emailList - List of trimmed non-empty email addresses.
 * @returns {Promise<{ results: Array, summary: object }>}
 */
export async function verifyEmailsMock(emailList) {
  // Simulate network/processing latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  const results = emailList.map((email, idx) => evaluateMockEmail(email, idx));

  const summary = {
    total: results.length,
    delivered: results.filter((r) => r.status === STATUS_LABELS.DELIVERED).length,
    bounce: results.filter((r) => r.status === STATUS_LABELS.BOUNCE).length,
    unknown: results.filter((r) => r.status === STATUS_LABELS.UNKNOWN).length,
  };

  return { results, summary };
}
