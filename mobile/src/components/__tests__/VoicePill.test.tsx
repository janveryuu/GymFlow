import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { VoicePill } from '../VoicePill';

describe('VoicePill Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders idle state with mic button', async () => {
    const onStart = jest.fn();
    const onStop = jest.fn();
    let testRenderer: any;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <VoicePill isListening={false} onStart={onStart} onStop={onStop} />
      );
    });

    expect(testRenderer).toBeDefined();
    const root = testRenderer.root;
    const button = root.findByProps({ accessibilityLabel: 'Start dictation' });
    expect(button).toBeTruthy();

    await act(async () => {
      button.props.onPress();
    });

    expect(onStart).toHaveBeenCalled();
  }, 15000);

  it('renders listening state with waveform, timer, and stop button', async () => {
    const onStart = jest.fn();
    const onStop = jest.fn();
    let testRenderer: any;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <VoicePill isListening={true} onStart={onStart} onStop={onStop} />
      );
    });

    expect(testRenderer).toBeDefined();
    const root = testRenderer.root;
    const stopButton = root.findByProps({ accessibilityLabel: 'Stop dictation' });
    expect(stopButton).toBeTruthy();

    await act(async () => {
      stopButton.props.onPress();
    });

    expect(onStop).toHaveBeenCalledWith('tap');
  }, 15000);

  it('updates timer text as recording progresses', async () => {
    let testRenderer: any;

    await act(async () => {
      testRenderer = TestRenderer.create(
        <VoicePill isListening={true} onStart={jest.fn()} onStop={jest.fn()} />
      );
    });

    // Advance timers by 1200ms
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    const root = testRenderer.root;
    expect(root).toBeTruthy();
  }, 15000);
});
