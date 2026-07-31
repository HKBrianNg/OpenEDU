// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    sequence: {
      concurrent: false,
    },
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'admin-users',
          include: ['tests/admin/users.test.js'],
          sequence: { groupOrder: 11 },
        },
      },
    ],
  },
});