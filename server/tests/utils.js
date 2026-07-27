import { logger } from '../src/utils/logger.js';
import { pool } from '../src/utils/db.js';

function logTestResult(testName, passed, details = {}) {
  if (passed) {
    logger.info(`[TEST PASS] ${testName}`, details);
  } else {
    logger.error(`[TEST FAIL] ${testName}`, details);
  }
}

function logTestSuite(name) {
  logger.info(`[TEST SUITE] ===== ${name} =====`);
}

function logTestSummary(total, passed, failed) {
  logger.info(`[TEST SUMMARY] ${passed}/${total} passed, ${failed} failed`);
}

async function cleanupTestUsers(emails) {
  if (emails.length === 0) return;

  try {
    const placeholders = emails.map((_, i) => `$${i + 1}`).join(', ');
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE email IN (${placeholders})`,
      emails
    );
    logger.info(`[CLEANUP] Deleted ${rowCount} test users`);
  } catch (error) {
    logger.error('[CLEANUP] Failed to clean up test users:', error);
  }
}

export { logTestResult, logTestSuite, logTestSummary, cleanupTestUsers };