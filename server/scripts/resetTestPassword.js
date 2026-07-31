import bcrypt from 'bcryptjs';
import { pool } from '../src/utils/db.js';

const emails = [
  'reader@openedu.com',
  'author@openedu.com',
  'admin@openedu.com'
];

const password = 'Test123456';

async function main() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  for (const email of emails) {
    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE email = $2
       RETURNING email, status, email_verified`,
      [passwordHash, email]
    );

    console.log('updated:', result.rows[0]);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});