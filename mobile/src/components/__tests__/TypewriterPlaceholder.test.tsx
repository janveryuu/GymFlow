import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { TypewriterPlaceholder } from '../TypewriterPlaceholder';
import { TypewriterText } from '../TypewriterText';

describe('TypewriterPlaceholder Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly with default prompts and initial state', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(<TypewriterPlaceholder />);
    });

    expect(testRenderer).toBeDefined();
    const testInstance = testRenderer.root;
    expect(testInstance).toBeTruthy();
  });

  it('types out characters progressively according to delays', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <TypewriterPlaceholder
          prompts={['Ask Alab AI…']}
          initialDelay={100}
          typingSpeed={50}
        />
      );
    });

    // Advance past initial delay
    await act(async () => {
      jest.advanceTimersByTime(110);
    });

    // Advance some typing steps
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const testInstance = testRenderer.root;
    const textNodes = testInstance.findAllByType('Text' as any);
    expect(textNodes.length).toBeGreaterThan(0);
  });

  it('handles isFocused state without throwing', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <TypewriterPlaceholder isFocused={true} />
      );
    });

    expect(testRenderer).toBeDefined();
  });
});

describe('TypewriterText Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('types out message text and triggers onComplete', async () => {
    const onComplete = jest.fn();
    let testRenderer: any;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <TypewriterText
          text="Hello Coach"
          speed={10}
          chunkSize={3}
          onComplete={onComplete}
        />
      );
    });

    // Advance timers iteratively so each effect cycle flushes
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        jest.advanceTimersByTime(20);
      });
    }

    expect(onComplete).toHaveBeenCalled();
  });

  it('hides cursor block when hideCursor is true', async () => {
    let testRenderer: any;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <TypewriterText
          text="Sample user message"
          speed={100}
          chunkSize={2}
          hideCursor={true}
        />
      );
    });

    const textNodes = testRenderer.root.findAllByType('Text');
    const hasCursor = textNodes.some((node: any) => node.props.children === '▌');
    expect(hasCursor).toBe(false);
  });
});
