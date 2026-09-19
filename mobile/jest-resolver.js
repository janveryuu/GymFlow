/**
 * Composed Jest resolver for React Native + Reanimated 4.
 *
 * Prevents native TurboModule initialization crashes in worklets
 * while avoiding circular recursion when delegating back to Jest's default resolver.
 */
const rnResolver = require('@react-native/jest-preset/jest/resolver');
const workletsResolver = require('react-native-worklets/jest/resolver');
const path = require('path');

module.exports = (request, options) => {
  if (
    request.includes('winter/fetch') ||
    (request === './fetch' && options.basedir && options.basedir.includes(path.join('winter')))
  ) {
    return path.resolve(__dirname, 'tests/mocks/mockWinterFetch.js');
  }

  const jestDefault = options.defaultResolver;
  return workletsResolver(request, {
    ...options,
    defaultResolver: (req, opts) =>
      rnResolver(req, { ...opts, defaultResolver: jestDefault }),
  });
};
