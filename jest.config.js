module.exports = {
  preset: 'ts-jest',
  testEnvironment: '<rootDir>/tests/custom-node-environment.js',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/cli.ts',
    '!src/index.ts',
    '!src/streaming.ts',
    '!src/api-server.ts',
    '!src/modal-deployment.ts',
    '!src/agents/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@anthropic-ai/claude-agent-sdk$': '<rootDir>/tests/mocks/anthropic-sdk.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@anthropic-ai|@modelcontextprotocol)/)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/swagger-ui-express',
    '<rootDir>/node_modules/swagger-jsdoc',
  ],
  // Default: no parallelization limit (runs all tests in parallel)
  // For integration tests, override with --maxWorkers flag
  maxWorkers: process.env.CI ? 2 : '50%',
};
