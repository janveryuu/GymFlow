import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { JellyRadio } from '../JellyRadio';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

describe('JellyRadio Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders all items correctly', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <JellyRadio
          items={['All', 'Chest', 'Back', 'Legs']}
          value="All"
        />
      );
    });

    expect(testRenderer).toBeDefined();
    const textNodes = testRenderer.root.findAllByType('Text' as any);
    const labels = textNodes.map((n: any) => n.props.children);

    expect(labels).toContain('All');
    expect(labels).toContain('Chest');
    expect(labels).toContain('Back');
    expect(labels).toContain('Legs');
  });

  it('calls onChange and triggers haptic feedback when a different item is clicked', async () => {
    const onChange = jest.fn();
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <JellyRadio
          items={[
            { value: 'all', label: 'All' },
            { value: 'chest', label: 'Chest' },
            { value: 'back', label: 'Back' },
          ]}
          value="all"
          onChange={onChange}
        />
      );
    });

    const chestButton = testRenderer.root.find(
      (node: any) => node.props?.accessibilityLabel === 'Chest' && typeof node.props?.onPress === 'function'
    );
    expect(chestButton).toBeDefined();

    // Tap "Chest"
    await act(async () => {
      chestButton.props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith('chest', 1);
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('does not trigger onChange when the currently selected item is clicked', async () => {
    const onChange = jest.fn();
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <JellyRadio
          items={['All', 'Chest', 'Back']}
          value="All"
          onChange={onChange}
        />
      );
    });

    const allButton = testRenderer.root.find(
      (node: any) => node.props?.accessibilityLabel === 'All' && typeof node.props?.onPress === 'function'
    );

    // Tap "All" (already selected)
    await act(async () => {
      allButton.props.onPress();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it('does not trigger onChange when a disabled item is clicked', async () => {
    const onChange = jest.fn();
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <JellyRadio
          items={[
            { value: 'all', label: 'All' },
            { value: 'chest', label: 'Chest', disabled: true },
          ]}
          value="all"
          onChange={onChange}
        />
      );
    });

    const chestButton = testRenderer.root.find(
      (node: any) => node.props?.accessibilityLabel === 'Chest' && typeof node.props?.onPress === 'function'
    );

    await act(async () => {
      chestButton.props.onPress();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports unscrollable static container mode', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <JellyRadio
          items={['A', 'B']}
          scrollable={false}
          testID="jelly-static"
        />
      );
    });

    const views = testRenderer.root.findAllByType('View' as any);
    const staticView = views.find((v: any) => v.props.testID === 'jelly-static');
    expect(staticView).toBeDefined();
  });
});
