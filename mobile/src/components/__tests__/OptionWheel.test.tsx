import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { OptionWheel } from '../OptionWheel';

describe('OptionWheel Component', () => {
  const sampleItems = [60, 65, 70, 75, 80, 85, 90];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders active selected item and unit label', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <OptionWheel
          items={sampleItems}
          selectedIndex={2} // value 70
          unit="kg"
          onChange={jest.fn()}
        />
      );
    });

    expect(testRenderer).toBeDefined();
    const textNodes = testRenderer.root.findAllByType('Text' as any);
    const has70 = textNodes.some((node: any) => node.props.children === 70);
    const hasKg = textNodes.some((node: any) => node.props.children === 'kg');

    expect(has70).toBe(true);
    expect(hasKg).toBe(true);
  });

  it('allows clicking an adjacent item to select it', async () => {
    const onChangeMock = jest.fn();
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <OptionWheel
          items={sampleItems}
          selectedIndex={2} // 70
          unit="kg"
          onChange={onChangeMock}
        />
      );
    });

    // Find the TouchableOpacity for item index 3 (value 75)
    const item3 = testRenderer.root.findByProps({ testID: 'wheel-item-3' });
    expect(item3).toBeDefined();

    // Press the adjacent touchable
    await act(async () => {
      item3.props.onPress();
      jest.advanceTimersByTime(350);
    });

    expect(onChangeMock).toHaveBeenCalled();
  }, 15000);

  it('supports side="left" and side="right" rendering without crashing', async () => {
    let leftRenderer: any;
    let rightRenderer: any;

    await act(async () => {
      leftRenderer = TestRenderer.create(
        <OptionWheel
          items={sampleItems}
          selectedIndex={1}
          side="left"
          onChange={jest.fn()}
        />
      );
      rightRenderer = TestRenderer.create(
        <OptionWheel
          items={sampleItems}
          selectedIndex={1}
          side="right"
          onChange={jest.fn()}
        />
      );
    });

    expect(leftRenderer).toBeDefined();
    expect(rightRenderer).toBeDefined();
  });
});
