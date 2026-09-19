/**
 * Mock for expo/src/winter/fetch under Jest test environment.
 * Bypasses native ExpoFetchModule TurboModule while retaining standard fetch API.
 */
module.exports = {
  fetch: typeof globalThis.fetch !== 'undefined' ? globalThis.fetch : jest.fn(),
  FetchResponse: class FetchResponse {},
  FetchError: class FetchError extends Error {},
};
