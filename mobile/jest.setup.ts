/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Global test harness setup for GymFlow Mobile.
 */
import type { ReactNode } from 'react';
import { server } from './handlers/server';

// MSW Server lifecycle for Jest
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Reanimated official mock
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

// Moti pass-through mock
jest.mock('moti', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const passthrough = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    React.createElement(View, { ...props, ref }),
  );
  passthrough.displayName = 'MotiView';
  return {
    __esModule: true,
    default: passthrough,
    MotiView: passthrough,
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    animate: () => ({ timing: async () => {}, spring: async () => {} }),
  };
});

// NetInfo official mock
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// FlashList mock (bypasses RecyclerView TurboModule requirements under Jest)
jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const { ScrollView } = jest.requireActual('react-native');
  const FlashList = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    const { data, renderItem, ...rest } = props as {
      data?: unknown[];
      renderItem?: (arg: { item: unknown; index: number }) => React.ReactNode;
    };
    return React.createElement(
      ScrollView,
      { ...rest, ref },
      (data ?? []).map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: index },
          renderItem?.({ item, index }),
        ),
      ),
    );
  });
  FlashList.displayName = 'FlashList';
  return { __esModule: true, default: FlashList, FlashList };
});

// Gesture Handler mock
jest.mock('react-native-gesture-handler', () => {
  const gesture: Record<string, unknown> = {};
  const chain = () => gesture;
  Object.assign(gesture, {
    activeOffsetX: chain,
    failOffsetY: chain,
    onUpdate: chain,
    onEnd: chain,
    onBegin: chain,
  });
  const passThrough = ({ children }: { children: ReactNode }) => children;
  return {
    __esModule: true,
    Gesture: { Pan: () => gesture },
    GestureDetector: passThrough,
    GestureHandlerRootView: passThrough,
  };
});

// Victory Native XL mock (isolates test runner from Skia native binaries)
jest.mock('victory-native', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    CartesianChart: (props: any) =>
      React.createElement(
        View,
        { testID: 'cartesian-chart', ...props },
        props.children ? props.children({ points: {} }) : null,
      ),
    Line: () => null,
    Bar: () => null,
    Area: () => null,
    useChartPressState: () => ({ state: {}, isActive: false }),
  };
});

// Expo Haptics mock
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Expo Secure Store mock
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

// Expo SQLite mock (backed by native node:sqlite DatabaseSync)
jest.mock('expo-sqlite', () => {
  const { getMockDatabase, resetMockDatabases } = require('./tests/mocks/mockExpoSqlite');
  return {
    __esModule: true,
    openDatabaseAsync: jest.fn(async (name: string) => getMockDatabase(name)),
    deleteDatabaseAsync: jest.fn(async () => resetMockDatabases()),
  };
});

// React Native Safe Area Context mock
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const MockSafeAreaView = ({ children, style, ...props }: any) =>
    React.createElement('SafeAreaView', { style, ...props }, children);
  MockSafeAreaView.displayName = 'SafeAreaView';
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: MockSafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// React Native SVG mock
jest.mock('react-native-svg', () => {
  const React = require('react');
  const createComponent = (name: string) => {
    const Comp = (props: any) => React.createElement(name, props, props.children);
    Comp.displayName = name;
    return Comp;
  };
  return {
    __esModule: true,
    default: createComponent('Svg'),
    Svg: createComponent('Svg'),
    Circle: createComponent('Circle'),
    Path: createComponent('Path'),
    Rect: createComponent('Rect'),
    G: createComponent('G'),
    Line: createComponent('Line'),
    Polygon: createComponent('Polygon'),
    Polyline: createComponent('Polyline'),
    Text: createComponent('Text'),
    TSpan: createComponent('TSpan'),
  };
});

// Lucide React Native icon mock
jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        return (props: any) => React.createElement('Icon', { ...props, name: String(prop) });
      },
    },
  );
});

