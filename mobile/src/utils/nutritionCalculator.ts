/**
 * Nutrition Calculator Utility
 * Implements the Mifflin-St Jeor equation to calculate Basal Metabolic Rate (BMR),
 * Total Daily Energy Expenditure (TDEE), and goal-adjusted daily caloric/macro targets.
 */

export type FitnessGoal = 'build_muscle' | 'lose_fat' | 'athletic' | 'health' | string;
export type Gender = 'male' | 'female' | 'prefer_not_to_say' | string;

export interface CalorieTargetInput {
  weightKg: number;
  heightCm: number;
  gender: Gender;
  birthYear?: number;
  birthdate?: string;
  age?: number;
  fitnessGoal: FitnessGoal;
  activityMultiplier?: number;
}

export interface MacroSplit {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface CalorieTargetResult {
  targetCalories: number;
  bmr: number;
  tdee: number;
  age: number;
  goal: FitnessGoal;
  goalAdjustmentPercentage: number;
  macros: MacroSplit;
}

/**
 * Derives age in years from birthdate string, birthYear, or direct age.
 * Clamps result to a valid range [14, 100], defaulting to 25.
 */
export function resolveAge(params: { birthdate?: string; birthYear?: number; age?: number }): number {
  if (typeof params.age === 'number' && !isNaN(params.age) && params.age > 0) {
    return Math.min(100, Math.max(14, Math.round(params.age)));
  }

  const currentYear = new Date().getFullYear();

  if (params.birthdate) {
    const parts = params.birthdate.split('-');
    const year = parseInt(parts[0] ?? '', 10);
    const month = parseInt(parts[1] ?? '', 10);
    const day = parseInt(parts[2] ?? '', 10);

    if (!isNaN(year) && year > 1900 && year <= currentYear) {
      const today = new Date();
      let calculatedAge = today.getFullYear() - year;
      if (!isNaN(month) && !isNaN(day)) {
        const hasHadBirthdayThisYear =
          today.getMonth() + 1 > month ||
          (today.getMonth() + 1 === month && today.getDate() >= day);
        if (!hasHadBirthdayThisYear) {
          calculatedAge -= 1;
        }
      }
      return Math.min(100, Math.max(14, calculatedAge));
    }
  }

  if (typeof params.birthYear === 'number' && !isNaN(params.birthYear) && params.birthYear > 1900) {
    const calculatedAge = currentYear - params.birthYear;
    return Math.min(100, Math.max(14, calculatedAge));
  }

  return 25; // Default reference age
}

/**
 * Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation:
 * - Men:   10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
 * - Women: 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
 * - Other: 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 78
 */
export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const normalizedGender = (gender || '').toLowerCase();

  if (normalizedGender === 'female') {
    return Math.round(base - 161);
  }
  if (normalizedGender === 'male') {
    return Math.round(base + 5);
  }
  return Math.round(base - 78);
}

/**
 * Calculates daily calorie target and macro targets based on Mifflin-St Jeor and user fitness goal:
 * - Bulking ('build_muscle'): +15% surplus
 * - Cutting ('lose_fat'): -20% deficit (with safe floors: 1,500 kcal for male, 1,200 kcal for female)
 * - Athletic ('athletic'): +5% surplus for recovery and performance
 * - Health / Maintenance ('health'): 100% of TDEE
 *
 * Targets are rounded to the nearest 50 kcal for clear, actionable nutrition planning.
 */
export function calculateDailyCalorieTarget(input: CalorieTargetInput): CalorieTargetResult {
  const { weightKg, heightCm, gender, fitnessGoal } = input;
  const safeWeight = Math.max(30, Math.min(300, weightKg || 70));
  const safeHeight = Math.max(100, Math.min(250, heightCm || 175));
  const age = resolveAge({ birthdate: input.birthdate, birthYear: input.birthYear, age: input.age });

  const bmr = calculateBMR(safeWeight, safeHeight, age, gender);

  // Moderate lifter activity factor (GymFlow users train regularly 3-5 days/wk)
  const activityMultiplier = input.activityMultiplier ?? 1.45;
  const tdee = Math.round(bmr * activityMultiplier);

  let multiplier = 1.0;
  let goalAdjustmentPercentage = 0;

  const normalizedGoal = (fitnessGoal || 'build_muscle').toLowerCase();

  switch (normalizedGoal) {
    case 'build_muscle':
    case 'bulking':
      // Bulking: 15% caloric surplus for lean hypertrophy
      multiplier = 1.15;
      goalAdjustmentPercentage = 15;
      break;

    case 'lose_fat':
    case 'cutting':
      // Cutting: 20% caloric deficit for fat loss
      multiplier = 0.80;
      goalAdjustmentPercentage = -20;
      break;

    case 'athletic':
      // Athletic performance: slight 5% surplus
      multiplier = 1.05;
      goalAdjustmentPercentage = 5;
      break;

    case 'health':
    case 'maintenance':
    default:
      // Maintenance
      multiplier = 1.0;
      goalAdjustmentPercentage = 0;
      break;
  }

  let rawTarget = Math.round(tdee * multiplier);

  // Apply safety minimum floor for cutting
  const isFemale = (gender || '').toLowerCase() === 'female';
  const minFloor = isFemale ? 1200 : 1500;
  if (rawTarget < minFloor) {
    rawTarget = minFloor;
  }

  // Round to nearest 50 kcal for clean UX
  const targetCalories = Math.round(rawTarget / 50) * 50;

  // Derive recommended macronutrient split
  // Protein: 2.0g/kg for bulking/athletic, 2.2g/kg for cutting (preserve muscle), 1.8g/kg for health
  let proteinPerKg = 2.0;
  if (normalizedGoal === 'lose_fat' || normalizedGoal === 'cutting') {
    proteinPerKg = 2.2;
  } else if (normalizedGoal === 'health') {
    proteinPerKg = 1.8;
  }
  const proteinGrams = Math.round(safeWeight * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  // Fat: 25% of daily calories (9 kcal/g)
  const fatCalories = targetCalories * 0.25;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs: Remaining calories (4 kcal/g)
  const remainingCalories = Math.max(0, targetCalories - proteinCalories - (fatGrams * 9));
  const carbsGrams = Math.round(remainingCalories / 4);

  return {
    targetCalories,
    bmr,
    tdee,
    age,
    goal: fitnessGoal,
    goalAdjustmentPercentage,
    macros: {
      proteinGrams,
      carbsGrams,
      fatGrams,
    },
  };
}
