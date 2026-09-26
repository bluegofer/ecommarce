/** Jest config for @ecommarce/api. Uses a test-specific tsconfig. */
module.exports = {
  preset: 'ts-jest',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  testMatch: undefined,
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        isolatedModules: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@ecommarce/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  testTimeout: 60000,
};