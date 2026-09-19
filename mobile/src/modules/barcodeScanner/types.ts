/**
 * Barcode Scanner & Nutrition Macro Module Types
 * Open Food Facts API (v2) Integration for GymFlow
 */

// ---------------------------------------------------------------------------
// Open Food Facts API Raw Types (v2)
// ---------------------------------------------------------------------------

export interface OpenFoodFactsNutriments {
  // Energy / Calories (kcal)
  'energy-kcal'?: number | string;
  'energy-kcal_100g'?: number | string;
  'energy-kcal_serving'?: number | string;
  'energy-kcal_value'?: number | string;
  'energy-kcal_unit'?: string;

  // Energy in kJ (fallback if kcal is missing: 1 kcal ≈ 4.184 kJ)
  energy_100g?: number | string;
  energy_serving?: number | string;

  // Macronutrients (grams)
  proteins?: number | string;
  proteins_100g?: number | string;
  proteins_serving?: number | string;

  carbohydrates?: number | string;
  carbohydrates_100g?: number | string;
  carbohydrates_serving?: number | string;

  fat?: number | string;
  fat_100g?: number | string;
  fat_serving?: number | string;

  // Secondary nutrients (optional)
  fiber?: number | string;
  fiber_100g?: number | string;
  fiber_serving?: number | string;

  sodium?: number | string;
  sodium_100g?: number | string;
  sodium_serving?: number | string;

  sugars?: number | string;
  sugars_100g?: number | string;
  sugars_serving?: number | string;

  'saturated-fat'?: number | string;
  'saturated-fat_100g'?: number | string;
  'saturated-fat_serving'?: number | string;

  // Open Food Facts dynamic fields (e.g. _prepared_, _value, vitamins, minerals)
  [key: string]: any;
}

export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  brands_tags?: string[];
  serving_size?: string;
  serving_quantity?: number | string;
  image_front_url?: string;
  image_front_small_url?: string;
  image_url?: string;
  nutriments?: OpenFoodFactsNutriments;
  categories?: string;
  quantity?: string;
}

export interface OpenFoodFactsProductResponse {
  code: string;
  status: number; // 1 = found, 0 = not found
  status_verbose: string;
  product?: OpenFoodFactsProduct;
}

// ---------------------------------------------------------------------------
// Normalized Domain Model for Gym Application
// ---------------------------------------------------------------------------

export interface MacroNutrientValues {
  calories: number; // kcal
  protein_g: number; // grams
  carbs_g: number; // grams
  fat_g: number; // grams
  fiber_g?: number; // grams
  sodium_mg?: number; // milligrams
}

export interface MacroRatioPercentages {
  proteinPct: number; // 0-100% of macro calories
  carbPct: number; // 0-100% of macro calories
  fatPct: number; // 0-100% of macro calories
}

export interface ProductMacroInfo {
  barcode: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  servingSize: string;
  // Per-serving values (with fallback to 100g if per-serving not provided by manufacturer)
  perServing: MacroNutrientValues;
  // Standard 100g values
  per100g: MacroNutrientValues;
  // Which basis was default/available from source
  basisAvailable: 'serving' | '100g' | 'both';
  // Calculated caloric distribution
  macroPercentages: MacroRatioPercentages;
  rawNutriments?: OpenFoodFactsNutriments;
}

// ---------------------------------------------------------------------------
// Scanner Controller & UI State Machine Types
// ---------------------------------------------------------------------------

export type ScannerPhase =
  | 'scanning'
  | 'loading'
  | 'result'
  | 'not_found'
  | 'error'
  | 'permission_denied';

export type SupportedBarcodeFormat = 'upc_a' | 'ean13' | 'ean8' | 'upc_e';

export interface ScannerErrorState {
  type: 'network' | 'not_found' | 'permission' | 'timeout' | 'unknown';
  message: string;
  details?: string;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
