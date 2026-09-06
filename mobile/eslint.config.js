const expoConfig = require('eslint-config-expo/flat.js');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'android/**',
      'ios/**',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'eslint.config.js',
      '.detoxrc.js',
      'scripts/**',
    ],
  },
  {
    rules: {
      'import/no-named-as-default-member': 'off',
      // expo-camera is a native Expo module resolved at runtime; ESLint cannot
      // statically resolve it from node_modules in this project configuration.
      'import/no-unresolved': ['error', { ignore: ['expo-camera'] }],
    },
  },
];
