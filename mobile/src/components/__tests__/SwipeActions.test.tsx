import React, { act } from 'react';
import { Text, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { SwipeRow } from '../SwipeRow';
import { SwipeToast } from '../SwipeToast';

describe('SwipeRow and SwipeToast Components', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('SwipeRow', () => {
    it('renders children correctly', async () => {
      let testRenderer: any;
      await act(async () => {
        testRenderer = TestRenderer.create(
          <SwipeRow onArchive={jest.fn()} onDelete={jest.fn()}>
            <View>
              <Text>Morning Cardio Workout</Text>
            </View>
          </SwipeRow>
        );
      });

      expect(testRenderer).toBeDefined();
      const textNodes = testRenderer.root.findAllByType('Text' as any);
      const hasWorkoutTitle = textNodes.some(
        (node: any) => node.props.children === 'Morning Cardio Workout'
      );
      expect(hasWorkoutTitle).toBe(true);
    });

    it('renders archive and delete action buttons', async () => {
      let testRenderer: any;
      await act(async () => {
        testRenderer = TestRenderer.create(
          <SwipeRow
            archiveLabel="Archive"
            deleteLabel="Delete"
            onArchive={jest.fn()}
            onDelete={jest.fn()}
          >
            <View>
              <Text>Upper Body Hypertrophy</Text>
            </View>
          </SwipeRow>
        );
      });

      const textNodes = testRenderer.root.findAllByType('Text' as any);
      const hasArchive = textNodes.some((node: any) => node.props.children === 'Archive');
      const hasDelete = textNodes.some((node: any) => node.props.children === 'Delete');
      expect(hasArchive).toBe(true);
      expect(hasDelete).toBe(true);
    });

    it('fires onArchive when Archive button is pressed', async () => {
      const onArchiveMock = jest.fn();
      let testRenderer: any;
      await act(async () => {
        testRenderer = TestRenderer.create(
          <SwipeRow onArchive={onArchiveMock} onDelete={jest.fn()}>
            <View>
              <Text>Leg Day Circuit</Text>
            </View>
          </SwipeRow>
        );
      });

      const archiveBtn = testRenderer.root.findByProps({ accessibilityLabel: 'Archive' });
      expect(archiveBtn).toBeTruthy();

      await act(async () => {
        archiveBtn.props.onPress();
        jest.advanceTimersByTime(400);
      });

      expect(onArchiveMock).toHaveBeenCalledTimes(1);
    });

    it('fires onDelete when Delete button is pressed', async () => {
      const onDeleteMock = jest.fn();
      let testRenderer: any;
      await act(async () => {
        testRenderer = TestRenderer.create(
          <SwipeRow onArchive={jest.fn()} onDelete={onDeleteMock}>
            <View>
              <Text>Shoulder Press & Traps</Text>
            </View>
          </SwipeRow>
        );
      });

      const deleteBtn = testRenderer.root.findByProps({ accessibilityLabel: 'Delete' });
      expect(deleteBtn).toBeTruthy();

      await act(async () => {
        deleteBtn.props.onPress();
        jest.advanceTimersByTime(400);
      });

      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('SwipeToast', () => {
    it('renders toast title, description, and action label', async () => {
      let testRenderer: any;
      await act(async () => {
        testRenderer = TestRenderer.create(
          <SwipeToast
            open={true}
            title="Workout archived"
            description="Push Day Routine moved to archive"
            actionLabel="Undo"
            onAction={jest.fn()}
            onClose={jest.fn()}
          />
        );
      });

      const textNodes = testRenderer.root.findAllByType('Text' as any);
      const hasTitle = textNodes.some(
        (node: any) => node.props.children === 'Workout archived'
      );
      const hasDesc = textNodes.some(
        (node: any) => node.props.children === 'Push Day Routine moved to archive'
      );
      const hasUndo = textNodes.some((node: any) => node.props.children === 'Undo');

      expect(hasTitle).toBe(true);
      expect(hasDesc).toBe(true);
      expect(hasUndo).toBe(true);
    });

    it('invokes onAction when Undo button is pressed', async () => {
      const onActionMock = jest.fn();
      let testRenderer: any;
      await act(async () => {
        testRenderer = TestRenderer.create(
          <SwipeToast
            open={true}
            title="Workout deleted"
            actionLabel="Undo"
            onAction={onActionMock}
          />
        );
      });

      const undoBtn = testRenderer.root.findByProps({ accessibilityLabel: 'Undo' });
      expect(undoBtn).toBeTruthy();

      await act(async () => {
        undoBtn.props.onPress();
      });

      expect(onActionMock).toHaveBeenCalledTimes(1);
    });

    it('auto-closes after duration timeout', async () => {
      const onCloseMock = jest.fn();
      await act(async () => {
        TestRenderer.create(
          <SwipeToast
            open={true}
            title="Workout archived"
            duration={2000}
            onClose={onCloseMock}
          />
        );
      });

      expect(onCloseMock).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(2100);
        // Advance for animation completion
        jest.advanceTimersByTime(300);
      });

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('returns null when open is false', async () => {
      let testRenderer: any;
      await act(async () => {
        testRenderer = TestRenderer.create(
          <SwipeToast open={false} title="Hidden toast" />
        );
      });

      expect(testRenderer.toJSON()).toBeNull();
    });
  });
});
