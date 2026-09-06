/**
 * Jest configuration for GymFlow Mobile.
 * Extends jest-expo preset and bridges Reanimated 4 / MSW ESM dependencies.
 */
const preset = require('jest-expo/jest-preset');

module.exports = {
  setupFiles: [
    '<rootDir>/tests/setupPolyfills.ts',
    require.resolve('@react-native/jest-preset/jest/setup.js'),
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: [
    'ios.ts',
    'ios.tsx',
    'ios.js',
    'ios.jsx',
    'native.ts',
    'native.tsx',
    'native.js',
    'native.jsx',
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  resolver: '<rootDir>/jest-resolver.js',
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@handlers/(.*)$': '<rootDir>/handlers/$1',
    '^handlers/(.*)$': '<rootDir>/handlers/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    // Force Node build for MSW under Jest test environment
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^react-native/setup-env$': '<rootDir>/tests/setupPolyfills.ts',
    '^test-renderer$': '<rootDir>/tests/mocks/testRendererShim.js',
    '^test-renderer/(.*)$': '<rootDir>/node_modules/react-test-renderer/$1',
  },
  transform: {
    ...preset.transform,
    '\\.mjs$': preset.transform['\\.[jt]sx?$'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|moti|@tanstack|zustand|react-native-worklets|msw|@mswjs/.*|@open-draft/.*|rettime|until-async|lucide-react-native|victory-native|@shopify/.*)',
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.[jt]s?(x)',
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)',
    '<rootDir>/__tests__/**/*.test.[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'handlers/**/*.{ts,tsx}',
    '!src/theme/**',
    '!**/*.d.ts',
  ],
};
