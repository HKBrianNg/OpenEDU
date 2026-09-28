// scripts/genRootHash.js
import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const pwd = await rl.question('请输入 root 账号密码: ');
  rl.close();

  if (!pwd) {
    console.error('❌ 密码不能为空');
    process.exit(1);
  }

  const hash = await bcrypt.hash(pwd, 10);
  console.log('\n=== bcrypt hash ===');
  console.log(hash);
  console.log('\n=== 复制以下 SQL 执行 ===');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '1840764649@qq.com';`);
}

main();