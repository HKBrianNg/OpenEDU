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
          name: 'auth-protected-routes',
          include: ['tests/auth/protected-routes.test.js'],
          sequence: { groupOrder: 2 },
        },
      },
      {
        test: {
          name: 'auth-internationalization',
          include: ['tests/auth/internationalization.test.js'],
          sequence: { groupOrder: 3 },
        },
      },
      {
        test: {
          name: 'users-profile',
          include: ['tests/users/profile.test.js'],
          sequence: { groupOrder: 4 },
        },
      },
      {
        test: {
          name: 'users-password',
          include: ['tests/users/password.test.js'],
          sequence: { groupOrder: 5 },
        },
      },
      {
        test: {
          name: 'users-authors',
          include: ['tests/users/authors.test.js'],
          sequence: { groupOrder: 6 },
        },
      },
      {
        test: {
          name: 'users-avatar',
          include: ['tests/users/avatar.test.js'],
          sequence: { groupOrder: 7 },
        },
      },
      {
        test: {
          name: 'users-avatar-delete',
          include: ['tests/users/avatar-delete.test.js'],
          sequence: { groupOrder: 8 },
        },
      },
      {
        test: {
          name: 'users-public-profile',
          include: ['tests/users/public-profile.test.js'],
          sequence: { groupOrder: 9 },
        },
      },
      {
        test: {
          name: 'users-account-delete',
          include: ['tests/users/account-delete.test.js'],
          sequence: { groupOrder: 10 },
        },
      },
      {
        test: {
          name: 'admin-users',
          include: ['tests/admin/users.test.js'],
          sequence: { groupOrder: 11 },
        },
      },
      {
        test: {
          name: 'users-list',
          include: ['tests/users/list.test.js'],
          sequence: { groupOrder: 12 },
        },
      },
    ],
  },
});