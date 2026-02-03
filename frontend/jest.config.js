/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@components$': '<rootDir>/src/components/index.ts',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@stores$': '<rootDir>/src/stores/index.ts',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    // Mock Wails bindings for tests
    '^\\.\\./\\.\\./wailsjs/go/main/App$':
      '<rootDir>/src/__mocks__/wailsjs/go/main/App.ts',
    '^\\.\\./\\.\\./wailsjs/go/models$':
      '<rootDir>/src/__mocks__/wailsjs/go/models.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/components/App.tsx', // Exclude Wails boilerplate for now
    '!src/components/index.ts',
    '!src/stores/index.ts',
  ],
  // Coverage thresholds - enable when we have real code
  // coverageThreshold: {
  //   global: {
  //     branches: 60,
  //     functions: 60,
  //     lines: 60,
  //     statements: 60,
  //   },
  // },
}
