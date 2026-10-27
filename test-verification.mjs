/**
 * Automated test script to verify:
 * 1. Line parsing (blank line elimination, trimming, order preservation, duplicate retention)
 * 2. Mock deliverability evaluation (Bounce for syntax errors, Unknown for role-based/reserved, Delivered for standard)
 * 3. Summary count matching
 * 4. Exact status label compliance
 */

import { evaluateMockEmail, verifyEmailsMock, STATUS_LABELS } from './src/services/mockVerification.js';

function parseEmailLines(rawText) {
  if (!rawText) return [];
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('--- Testing Status Labels ---');
  assert(STATUS_LABELS.DELIVERED === 'Likely Delivered', 'STATUS_LABELS.DELIVERED matches exact requirement');
  assert(STATUS_LABELS.BOUNCE === 'Likely Bounce', 'STATUS_LABELS.BOUNCE matches exact requirement');
  assert(STATUS_LABELS.UNKNOWN === 'Unknown', 'STATUS_LABELS.UNKNOWN matches exact requirement');

  console.log('\n--- Testing Line Parsing ---');
  // 1. Empty input
  assert(parseEmailLines('').length === 0, 'Empty string returns empty array');
  assert(parseEmailLines('   \n  \n\t  ').length === 0, 'Whitespace and newlines only returns empty array');

  // 2. Trimming and Blank lines
  const rawSample = `
    alex.smith@company.com  
    
    invalid-email@domain   
       
    contact@organization.org
  `;
  const parsed = parseEmailLines(rawSample);
  assert(parsed.length === 3, 'Correctly parses 3 non-empty lines ignoring blanks');
  assert(parsed[0] === 'alex.smith@company.com', 'Line 0 trimmed');
  assert(parsed[1] === 'invalid-email@domain', 'Line 1 trimmed');
  assert(parsed[2] === 'contact@organization.org', 'Line 2 trimmed');

  // 3. Duplicate handling and order preservation
  const duplicatesSample = `
    user@example.com
    another@example.com
    user@example.com
  `;
  const parsedDups = parseEmailLines(duplicatesSample);
  assert(parsedDups.length === 3, 'Does not silently remove duplicates');
  assert(parsedDups[0] === 'user@example.com', 'Order preserved - item 0');
  assert(parsedDups[1] === 'another@example.com', 'Order preserved - item 1');
  assert(parsedDups[2] === 'user@example.com', 'Order preserved - item 2 (duplicate)');

  console.log('\n--- Testing Mock Verification Evaluation ---');
  // 4. Malformed email -> Likely Bounce
  const bounce1 = evaluateMockEmail('notanemail', 0);
  assert(bounce1.status === 'Likely Bounce', 'Missing @ is Likely Bounce');
  assert(bounce1.explanation.includes('Simulated demo result'), 'Bounce explanation contains simulated demo disclaimer');

  const bounce2 = evaluateMockEmail('missingdomain@', 1);
  assert(bounce2.status === 'Likely Bounce', 'Missing domain is Likely Bounce');

  const bounce3 = evaluateMockEmail('nodot@domain', 2);
  assert(bounce3.status === 'Likely Bounce', 'Domain without TLD dot is Likely Bounce');

  // 5. Role-based or test domain -> Unknown
  const unknown1 = evaluateMockEmail('admin@company.com', 3);
  assert(unknown1.status === 'Unknown', 'Role-based admin@ is Unknown');
  assert(unknown1.explanation.includes('Simulated demo result'), 'Unknown explanation contains simulated demo disclaimer');

  const unknown2 = evaluateMockEmail('test@mail.unknown', 4);
  assert(unknown2.status === 'Unknown', 'Unknown/test domain is Unknown');

  // 6. Valid syntax -> Likely Delivered
  const delivered1 = evaluateMockEmail('alex.smith@company.com', 5);
  assert(delivered1.status === 'Likely Delivered', 'Standard valid email format is Likely Delivered (simulated)');
  assert(delivered1.explanation.includes('Simulated demo result'), 'Delivered explanation contains simulated demo disclaimer');

  console.log('\n--- Testing verifyEmailsMock Batch Execution and Summary Counts ---');
  const batchList = [
    'user1@example.com',
    'bad-email',
    'admin@company.com',
    'user1@example.com', // duplicate
    'another.valid@domain.org',
  ];

  const batchResult = await verifyEmailsMock(batchList);
  assert(batchResult.results.length === 5, 'Results length matches input list length (5)');
  assert(batchResult.summary.total === 5, 'Summary total is 5');
  assert(batchResult.summary.delivered === 3, 'Summary delivered count matches (3)');
  assert(batchResult.summary.bounce === 1, 'Summary bounce count matches (1)');
  assert(batchResult.summary.unknown === 1, 'Summary unknown count matches (1)');
  assert(
    batchResult.summary.total ===
      batchResult.summary.delivered + batchResult.summary.bounce + batchResult.summary.unknown,
    'Summary counts partition total exactly'
  );

  console.log('\nAll automated test assertions passed successfully!');
}

runTests();
