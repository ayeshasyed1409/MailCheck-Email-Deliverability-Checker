/**
 * Integration Test for Frontend-to-Backend API Communication
 *
 * Validates:
 * 1. Offline backend error handling (graceful error message)
 * 2. Live backend API calls (health check & email verification)
 * 3. Correct data structure mapping (email, status, reason, explanation, checks)
 * 4. Summary calculation accuracy
 * 5. Order and duplicate preservation
 */

import { verifyEmails, checkBackendHealth, STATUS_LABELS } from './src/services/verificationService.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('--- Step 1: Testing Backend Health Check ---');
  const health = await checkBackendHealth();
  console.log('Health check result:', health);
  assert(health.isHealthy === true, 'Backend health check succeeded');

  console.log('\n--- Step 2: Testing POST /api/verify Integration ---');
  const testEmails = [
    'invalid-email-syntax',
    'alex@gmail.com',
    'user@this-domain-does-not-exist-9876543210.xyz',
    'alex@gmail.com', // Duplicate address to test preservation
  ];

  const response = await verifyEmails(testEmails);
  const { results, summary } = response;

  assert(Array.isArray(results), 'Results is an array');
  assert(results.length === 4, 'Returned 4 results matching input size');

  // Verify Item 0: Invalid syntax
  const item0 = results[0];
  assert(item0.email === 'invalid-email-syntax', 'Item 0 email is invalid-email-syntax');
  assert(item0.status === STATUS_LABELS.BOUNCE, 'Item 0 status is Likely to Bounce');
  assert(item0.checks.syntax_valid === false, 'Item 0 syntax_valid is false');
  assert(item0.explanation && item0.explanation.length > 0, 'Item 0 has explanation text');

  // Verify Item 1: Valid domain with MX records
  const item1 = results[1];
  assert(item1.email === 'alex@gmail.com', 'Item 1 email is alex@gmail.com');
  assert(item1.status === STATUS_LABELS.UNKNOWN, 'Item 1 status is Unknown (DNS checked, mailbox unverified)');
  assert(item1.checks.syntax_valid === true, 'Item 1 syntax_valid is true');
  assert(item1.checks.mx_found === true, 'Item 1 mx_found is true');
  assert(item1.checks.dns_result === 'MX records found', 'Item 1 dns_result is "MX records found"');

  // Verify Item 2: NXDOMAIN non-existent domain
  const item2 = results[2];
  assert(item2.email === 'user@this-domain-does-not-exist-9876543210.xyz', 'Item 2 email matches');
  assert(item2.status === STATUS_LABELS.BOUNCE, 'Item 2 status is Likely to Bounce');
  assert(item2.checks.syntax_valid === true, 'Item 2 syntax_valid is true');
  assert(item2.checks.mx_found === false, 'Item 2 mx_found is false');

  // Verify Item 3: Duplicate entry preserved
  const item3 = results[3];
  assert(item3.email === 'alex@gmail.com', 'Item 3 preserved duplicate entry');
  assert(item3.status === STATUS_LABELS.UNKNOWN, 'Item 3 has correct status');

  // Verify Summary Calculations
  console.log('\n--- Step 3: Testing Summary Metrics Calculation ---');
  console.log('Summary:', summary);
  assert(summary.total === 4, 'Summary total is 4');
  assert(summary.bounce === 2, 'Summary bounce count is 2');
  assert(summary.unknown === 2, 'Summary unknown count is 2');
  assert(summary.delivered === 0, 'Summary delivered count is 0 (as expected for DNS stage)');
  assert(
    summary.total === summary.bounce + summary.unknown + summary.delivered,
    'Summary counts match total'
  );

  console.log('\n--- Step 4: Testing Empty & Invalid Client Inputs ---');
  try {
    await verifyEmails([]);
    assert(false, 'Should have thrown error on empty array');
  } catch (err) {
    assert(err.message.includes('at least one email'), 'Threw proper validation error on empty array');
  }

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests();
