import {
  calculateBMR,
  calculateDailyCalorieTarget,
  resolveAge,
} from '../../src/utils/nutritionCalculator';

describe('nutritionCalculator', () => {
  describe('resolveAge', () => {
    it('resolves age directly if numeric age provided', () => {
      expect(resolveAge({ age: 28 })).toBe(28);
    });

    it('clamps age to valid range [14, 100]', () => {
      expect(resolveAge({ age: 10 })).toBe(14);
      expect(resolveAge({ age: 120 })).toBe(100);
    });

    it('resolves age from birthYear', () => {
      const currentYear = new Date().getFullYear();
      expect(resolveAge({ birthYear: currentYear - 30 })).toBe(30);
    });

    it('resolves age from birthdate YYYY-MM-DD', () => {
      const currentYear = new Date().getFullYear();
      const age = resolveAge({ birthdate: `${currentYear - 22}-01-01` });
      expect(age).toBeGreaterThanOrEqual(21);
      expect(age).toBeLessThanOrEqual(23);
    });

    it('defaults to 25 if no data given', () => {
      expect(resolveAge({})).toBe(25);
    });
  });

  describe('calculateBMR', () => {
    it('calculates male BMR accurately using Mifflin-St Jeor', () => {
      // 10 * 75 + 6.25 * 178 - 5 * 24 + 5 = 750 + 1112.5 - 120 + 5 = 1747.5 -> 1748
      const bmr = calculateBMR(75, 178, 24, 'male');
      expect(bmr).toBe(1748);
    });

    it('calculates female BMR accurately using Mifflin-St Jeor', () => {
      // 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
      const bmr = calculateBMR(60, 165, 25, 'female');
      expect(bmr).toBe(1345);
    });

    it('calculates neutral BMR accurately for unspecified gender', () => {
      // 10 * 70 + 6.25 * 170 - 5 * 30 - 78 = 700 + 1062.5 - 150 - 78 = 1534.5 -> 1535
      const bmr = calculateBMR(70, 170, 30, 'prefer_not_to_say');
      expect(bmr).toBe(1535);
    });
  });

  describe('calculateDailyCalorieTarget', () => {
    it('calculates bulking (build_muscle) target with 15% surplus', () => {
      const result = calculateDailyCalorieTarget({
        weightKg: 75,
        heightCm: 178,
        gender: 'male',
        age: 24,
        fitnessGoal: 'build_muscle',
      });

      // BMR = 1748
      // TDEE (1.45x) = 2535
      // Bulking (+15%) = 2535 * 1.15 = 2915 -> rounded to nearest 50 = 2900
      expect(result.targetCalories).toBe(2900);
      expect(result.goalAdjustmentPercentage).toBe(15);
      expect(result.macros.proteinGrams).toBe(150); // 75kg * 2.0g/kg
      expect(result.macros.fatGrams).toBeGreaterThan(0);
      expect(result.macros.carbsGrams).toBeGreaterThan(0);
    });

    it('calculates cutting (lose_fat) target with 20% deficit', () => {
      const result = calculateDailyCalorieTarget({
        weightKg: 75,
        heightCm: 178,
        gender: 'male',
        age: 24,
        fitnessGoal: 'lose_fat',
      });

      // BMR = 1748
      // TDEE (1.45x) = 2535
      // Cutting (-20%) = 2535 * 0.80 = 2028 -> rounded to nearest 50 = 2050
      expect(result.targetCalories).toBe(2050);
      expect(result.goalAdjustmentPercentage).toBe(-20);
      expect(result.macros.proteinGrams).toBe(165); // 75kg * 2.2g/kg
    });

    it('respects safety minimum calorie floor when cutting', () => {
      const result = calculateDailyCalorieTarget({
        weightKg: 42,
        heightCm: 145,
        gender: 'female',
        age: 35,
        fitnessGoal: 'lose_fat',
      });

      // Female floor is 1200 kcal
      expect(result.targetCalories).toBeGreaterThanOrEqual(1200);
    });

    it('calculates athletic target with 5% surplus', () => {
      const result = calculateDailyCalorieTarget({
        weightKg: 80,
        heightCm: 180,
        gender: 'male',
        age: 25,
        fitnessGoal: 'athletic',
      });

      expect(result.goalAdjustmentPercentage).toBe(5);
      expect(result.targetCalories).toBeGreaterThan(result.tdee);
    });

    it('calculates health maintenance target at 100% of TDEE', () => {
      const result = calculateDailyCalorieTarget({
        weightKg: 70,
        heightCm: 175,
        gender: 'male',
        age: 30,
        fitnessGoal: 'health',
      });

      expect(result.goalAdjustmentPercentage).toBe(0);
      expect(Math.abs(result.targetCalories - result.tdee)).toBeLessThanOrEqual(25);
    });

    it('calculates bulking with custom +300 and +500 calorie adjustment', () => {
      const baseInput = {
        weightKg: 75,
        heightCm: 178,
        gender: 'male' as const,
        age: 24,
        fitnessGoal: 'bulk',
      };

      const result300 = calculateDailyCalorieTarget({
        ...baseInput,
        calorieAdjustment: 300,
      });
      // TDEE is 2535. +300 = 2835 -> rounded to nearest 50 = 2850
      expect(result300.targetCalories).toBe(2850);
      expect(result300.macros.proteinGrams).toBe(150);

      const result500 = calculateDailyCalorieTarget({
        ...baseInput,
        calorieAdjustment: 500,
      });
      // TDEE is 2535. +500 = 3035 -> rounded to nearest 50 = 3050
      expect(result500.targetCalories).toBe(3050);
      expect(result500.macros.proteinGrams).toBe(150);
    });

    it('calculates cutting with custom -300 and -500 calorie adjustment', () => {
      const baseInput = {
        weightKg: 75,
        heightCm: 178,
        gender: 'male' as const,
        age: 24,
        fitnessGoal: 'cut',
      };

      const resultMinus300 = calculateDailyCalorieTarget({
        ...baseInput,
        calorieAdjustment: -300,
      });
      // TDEE is 2535. -300 = 2235 -> rounded to nearest 50 = 2250
      expect(resultMinus300.targetCalories).toBe(2250);
      expect(resultMinus300.macros.proteinGrams).toBe(165); // 75kg * 2.2g/kg

      const resultMinus500 = calculateDailyCalorieTarget({
        ...baseInput,
        calorieAdjustment: -500,
      });
      // TDEE is 2535. -500 = 2035 -> rounded to nearest 50 = 2050
      expect(resultMinus500.targetCalories).toBe(2050);
      expect(resultMinus500.macros.proteinGrams).toBe(165);
    });

    it('calculates maintain goal at 100% of TDEE with 0 adjustment', () => {
      const result = calculateDailyCalorieTarget({
        weightKg: 70,
        heightCm: 175,
        gender: 'male' as const,
        age: 26,
        fitnessGoal: 'maintain',
        calorieAdjustment: 0,
      });

      expect(Math.abs(result.targetCalories - result.tdee)).toBeLessThanOrEqual(25);
    });
  });
});

