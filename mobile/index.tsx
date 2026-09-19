import './src/polyfills';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as React from 'react';

import App from './App';

// Eliminate FOUT and enforce Apple San Francisco (SF Pro) font in web browsers
if (typeof document !== 'undefined') {
  const fontStyleId = 'gymflow-apple-font-reset';
  if (!document.getElementById(fontStyleId)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.cdnfonts.com/css/sf-pro-display';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = fontStyleId;
    style.textContent = `
      @import url('https://fonts.cdnfonts.com/css/sf-pro-display');
      html, body, #root, #root *, [dir], div, span, p, a, input, button, textarea {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", system-ui, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
    `;
    if (document.head) {
      document.head.prepend(style);
    }
  }
}

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
