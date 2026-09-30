import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { ExerciseDetailScreen } from '../../src/screens/ExerciseDetailScreen';
import { useCustomWorkoutsStore } from '../../src/store/customWorkoutsStore';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('../../src/components/WorkoutIllustration', () => ({
  WorkoutIllustration: () => 'WorkoutIllustration',
}));

const mockWorkout = {
  id: 'workout-bench-press',
  title: 'Bench Press Power',
  slug: 'bench-press',
  category: 'chest',
  equipment: 'Barbell',
  difficulty: 'intermediate',
  sets: 4,
  reps: 10,
  description: 'Barbell bench progression with incline accessory work.',
};

describe('ExerciseDetailScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      useCustomWorkoutsStore.getState().clearSelectedRoutineExerciseIds();
    });
  });

  it('renders exercise info correctly', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <ExerciseDetailScreen
          navigation={mockNavigation}
          route={{ params: { workout: mockWorkout } }}
        />
      );
    });

    expect(testRenderer).toBeDefined();
    const textNodes = testRenderer.root.findAllByType('Text' as any);
    const textValues = textNodes.map((n: any) => n.props.children);

    expect(textValues).toContain('Bench Press Power');
    expect(textValues).toContain('Chest');
    expect(textValues).toContain('Barbell');
    expect(textValues).toContain('Intermediate');
    expect(textValues).toContain('4 sets');
    expect(textValues).toContain('10 reps');
  });

  it('toggles selection when action button is pressed', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <ExerciseDetailScreen
          navigation={mockNavigation}
          route={{ params: { workout: mockWorkout } }}
        />
      );
    });

    const actionButton = testRenderer.root.find(
      (node: any) =>
        node.props?.accessibilityRole === 'button' &&
        node.props?.accessibilityLabel === 'Select for routine'
    );
    expect(actionButton).toBeDefined();

    await act(async () => {
      actionButton.props.onPress();
    });

    expect(
      useCustomWorkoutsStore.getState().selectedRoutineExerciseIds
    ).toContain('workout-bench-press');
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('handles back button navigation', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <ExerciseDetailScreen
          navigation={mockNavigation}
          route={{ params: { workout: mockWorkout } }}
        />
      );
    });

    const backButton = testRenderer.root.find(
      (node: any) =>
        node.props?.accessibilityRole === 'button' &&
        node.props?.accessibilityLabel === 'Go back'
    );
    expect(backButton).toBeDefined();

    await act(async () => {
      backButton.props.onPress();
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('renders empty fallback when workout is missing', async () => {
    let testRenderer: any;
    await act(async () => {
      testRenderer = TestRenderer.create(
        <ExerciseDetailScreen
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      );
    });

    const textNodes = testRenderer.root.findAllByType('Text' as any);
    const hasEmptyMsg = textNodes.some(
      (n: any) => n.props.children === 'Exercise information not found.'
    );
    expect(hasEmptyMsg).toBe(true);
  });
});
