/** @type {import('ts-jest').JestjestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', 
  },
  roots: ['<rootDir>/src'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*',
    '!<rootDir>/node_modules/**/*',
    '!<rootDir>/src/obfuscator.js' 
  ],
  globals: {
    // Explicitly setting module settings to guide the environment
    'ts-jest': {
      useESModules: true,
      tsconfig: 'tsconfig.json', // Assuming a tsconfig will handle module resolution
    }
  },
};