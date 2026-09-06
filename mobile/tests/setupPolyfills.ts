/**
 * Polyfills for Jest environment to support MSW v2 and Fetch API primitives.
 * Runs in setupFiles BEFORE the test framework is installed.
 */
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as unknown as typeof globalThis.ReadableStream;
}

if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = TransformStream as unknown as typeof globalThis.TransformStream;
}

if (typeof globalThis.WritableStream === 'undefined') {
  globalThis.WritableStream = WritableStream as unknown as typeof globalThis.WritableStream;
}

if (typeof (globalThis as any).__DEV__ === 'undefined') {
  (globalThis as any).__DEV__ = true;
}

if (typeof (globalThis as any).__fbBatchedBridgeConfig === 'undefined') {
  (globalThis as any).__fbBatchedBridgeConfig = {
    remoteModuleConfig: [],
  };
}

// Silence noisy console warnings if any
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Constants.manifest')) return;
  originalWarn(...args);
};
