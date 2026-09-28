// server/generate-hash.mjs
import bcrypt from 'bcryptjs';

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash('Admin123456', salt);
console.log(hash);