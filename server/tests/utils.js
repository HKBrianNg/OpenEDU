// server/tests/utils.js
import { logger } from '../src/utils/logger.js';
import { pool } from '../src/utils/db.js';

function logTestResult(testName, passed, details = {}) {
  if (passed) {
    logger.info(testName, details);
  } else {
    logger.error(testName, details);
  }
}

function logTestSuite(name) {
  logger.info(`Test Suite: ${name}`);
}

function logTestSummary(total, passed, failed) {
  logger.info(`Test Summary: ${passed}/${total} passed, ${failed} failed`, {
    total,
    passed,
    failed,
  });
}

async function cleanupTestUsers(emails) {
  if (emails.length === 0) return;

  try {
    const placeholders = emails.map((_, i) => `$${i + 1}`).join(', ');
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE email IN (${placeholders})`,
      emails
    );
    logger.info(`Cleanup: Deleted ${rowCount} test users`, {
      deletedCount: rowCount,
    });
  } catch (error) {
    logger.error('Cleanup: Failed to clean up test users');
  }
}

export { logTestResult, logTestSuite, logTestSummary, cleanupTestUsers };