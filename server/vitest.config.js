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
          name: 'auth-registration',
          include: ['tests/auth/registration.test.js'],
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'auth-login',
          include: ['tests/auth/login.test.js'],
          sequence: { groupOrder: 1 },
        },
      },
      {
        test: {
          name: 'auth-protected',
          include: ['tests/auth/protected-routes.test.js'],
          sequence: { groupOrder: 2 },
        },
      },
      {
        test: {
          name: 'auth-i18n',
          include: ['tests/auth/internationalization.test.js'],
          sequence: { groupOrder: 3 },
        },
      },
    ],
  },
});