/**
 * Barcode Scanner Macro Parser
 * Pure mapping and normalization utilities for Open Food Facts nutritional payloads.
 * Supports standard, prepared (_prepared_), and value fields with intelligent cross-scaling.
 */

import {
  OpenFoodFactsProductResponse,
  OpenFoodFactsProduct,
  OpenFoodFactsNutriments,
  MacroNutrientValues,
  MacroRatioPercentages,
  ProductMacroInfo,
} from './types';

/**
 * Safely parses any nutriment field into a clean number.
 * Handles strings, null, undefined, and NaN gracefully.
 */
export function parseNumeric(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') {
    return fallback;
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '.').trim();
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * Extracts a numeric nutrient value from Open Food Facts nutriments.
 * Checks direct, prepared, value, and fallback fields in priority order.
 */
export function extractNutrientValue(
  n: Record<string, any>,
  nutrientKey: string,
  basis: 'serving' | '100g'
): number | null {
  const candidateKeys =
    basis === 'serving'
      ? [
          `${nutrientKey}_serving`,
          `${nutrientKey}_prepared_serving`,
          `${nutrientKey}_value`,
          `${nutrientKey}_prepared_value`,
          `${nutrientKey}`,
          `${nutrientKey}_prepared`,
          `${nutrientKey}_100g`,
          `${nutrientKey}_prepared_100g`,
        ]
      : [
          `${nutrientKey}_100g`,
          `${nutrientKey}_prepared_100g`,
          `${nutrientKey}_value`,
          `${nutrientKey}_prepared_value`,
          `${nutrientKey}`,
          `${nutrientKey}_prepared`,
          `${nutrientKey}_serving`,
          `${nutrientKey}_prepared_serving`,
        ];

  for (const key of candidateKeys) {
    const val = n[key];
    if (val !== undefined && val !== null && val !== '') {
      const parsed = parseNumeric(val, -1);
      if (parsed >= 0) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Extracts calories in kcal.
 * Open Food Facts stores energy under:
 * - 'energy-kcal_serving' / 'energy-kcal_prepared_serving'
 * - 'energy-kcal_100g' / 'energy-kcal_prepared_100g'
 * - 'energy-kcal_value' / 'energy-kcal_prepared_value'
 * - 'energy-kcal' / 'energy-kcal_prepared'
 * - 'energy_serving' / 'energy_prepared_serving' / 'energy_100g' in kJ (1 kcal ≈ 4.184 kJ)
 */
export function extractCalories(
  n: Record<string, any>,
  basis: 'serving' | '100g'
): number {
  const kcalKeys =
    basis === 'serving'
      ? [
          'energy-kcal_serving',
          'energy-kcal_prepared_serving',
          'energy-kcal_value',
          'energy-kcal_prepared_value',
          'energy-kcal',
          'energy-kcal_prepared',
          'energy-kcal_100g',
          'energy-kcal_prepared_100g',
        ]
      : [
          'energy-kcal_100g',
          'energy-kcal_prepared_100g',
          'energy-kcal_value',
          'energy-kcal_prepared_value',
          'energy-kcal',
          'energy-kcal_prepared',
          'energy-kcal_serving',
          'energy-kcal_prepared_serving',
        ];

  for (const key of kcalKeys) {
    const val = n[key];
    if (val !== undefined && val !== null && val !== '') {
      const parsed = parseNumeric(val, -1);
      if (parsed > 0) return Math.round(parsed);
    }
  }

  // Fallback: Check energy in kJ and convert to kcal (1 kcal ≈ 4.184 kJ)
  const kjKeys =
    basis === 'serving'
      ? [
          'energy_serving',
          'energy_prepared_serving',
          'energy-kj_serving',
          'energy-kj_prepared_serving',
          'energy_value',
          'energy_prepared_value',
          'energy',
          'energy_prepared',
          'energy_100g',
          'energy_prepared_100g',
          'energy-kj_100g',
          'energy-kj_prepared_100g',
        ]
      : [
          'energy_100g',
          'energy_prepared_100g',
          'energy-kj_100g',
          'energy-kj_prepared_100g',
          'energy_value',
          'energy_prepared_value',
          'energy',
          'energy_prepared',
          'energy_serving',
          'energy_prepared_serving',
          'energy-kj_serving',
          'energy-kj_prepared_serving',
        ];

  for (const key of kjKeys) {
    const val = n[key];
    if (val !== undefined && val !== null && val !== '') {
      const parsedKj = parseNumeric(val, -1);
      if (parsedKj > 0) {
        return Math.round(parsedKj / 4.184);
      }
    }
  }

  return 0;
}

/**
 * Parses numeric serving weight in grams from serving_size string (e.g. "60 g", "30g (1 scoop)", "250ml")
 * or from product.serving_quantity.
 */
export function parseServingGrams(servingSize?: string, servingQuantity?: unknown): number | null {
  if (servingQuantity !== undefined && servingQuantity !== null) {
    const parsedQty = parseNumeric(servingQuantity, 0);
    if (parsedQty > 0) return parsedQty;
  }

  if (servingSize && typeof servingSize === 'string') {
    const match = servingSize.match(/(\d+(?:[.,]\d+)?)\s*(?:g|ml|grams?)\b/i);
    if (match && match[1]) {
      const parsed = parseNumeric(match[1], 0);
      if (parsed > 0) return parsed;
    }
  }

  return null;
}

/**
 * Computes caloric distribution percentages among Protein, Carbs, and Fats.
 * Protein: 4 kcal/g | Carbs: 4 kcal/g | Fat: 9 kcal/g
 */
export function calculateMacroPercentages(macros: MacroNutrientValues): MacroRatioPercentages {
  const proteinKcal = Math.max(0, macros.protein_g * 4);
  const carbsKcal = Math.max(0, macros.carbs_g * 4);
  const fatKcal = Math.max(0, macros.fat_g * 9);
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  if (totalMacroKcal <= 0) {
    return { proteinPct: 0, carbPct: 0, fatPct: 0 };
  }

  return {
    proteinPct: Math.round((proteinKcal / totalMacroKcal) * 100),
    carbPct: Math.round((carbsKcal / totalMacroKcal) * 100),
    fatPct: Math.round((fatKcal / totalMacroKcal) * 100),
  };
}

/**
 * Validates whether a barcode string matches standard supported formats:
 * - UPC-A (12 numeric digits)
 * - EAN-13 (13 numeric digits)
 * - EAN-8 (8 numeric digits)
 * - UPC-E (6-8 numeric digits)
 */
export function isValidFoodBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') return false;
  const cleaned = barcode.trim().replace(/[-\s]/g, '');
  return /^\d{6,14}$/.test(cleaned);
}

/**
 * Parses raw Open Food Facts API response into our normalized ProductMacroInfo model.
 * Resiliently handles:
 * 1. Prepared foods with `_prepared_` nutrient keys (e.g. Pancit Canton, instant noodles, mixes).
 * 2. Missing per-serving or per-100g values with proportional serving-weight cross-calculation.
 * 3. Salt to sodium conversion (Sodium = Salt / 2.5).
 * 4. Missing names fall back through candidate title fields.
 */
export function parseOpenFoodFactsProduct(
  response: OpenFoodFactsProductResponse,
  scannedBarcode: string
): ProductMacroInfo {
  const p: OpenFoodFactsProduct = response.product ?? {};
  const n: Record<string, any> = p.nutriments ?? {};

  // 1. Resolve Product Name
  const productName =
    (p.product_name && p.product_name.trim()) ||
    (p.product_name_en && p.product_name_en.trim()) ||
    (p.generic_name && p.generic_name.trim()) ||
    'Unknown Product';

  // 2. Resolve Brand
  const brand =
    (p.brands && p.brands.trim()) ||
    (p.brands_tags && p.brands_tags.length > 0 ? p.brands_tags[0] : '') ||
    'Brand Unknown';

  // 3. Resolve Image URL
  const imageUrl = p.image_front_url || p.image_front_small_url || p.image_url || null;

  // 4. Resolve Serving Size & Weight
  const servingSize =
    (p.serving_size && p.serving_size.trim()) ||
    (p.serving_quantity ? `${p.serving_quantity}g` : '100g');
  const servingGrams = parseServingGrams(servingSize, p.serving_quantity);

  // 5. Extract Per-Serving Nutrients
  let calServing = extractCalories(n, 'serving');
  let protServing = extractNutrientValue(n, 'proteins', 'serving');
  let carbServing = extractNutrientValue(n, 'carbohydrates', 'serving');
  let fatServing = extractNutrientValue(n, 'fat', 'serving');
  let fiberServing = extractNutrientValue(n, 'fiber', 'serving');
  let sodiumServing = extractNutrientValue(n, 'sodium', 'serving');

  // Fallback: If sodium is missing, compute from salt (Sodium = Salt / 2.5)
  if (sodiumServing === null) {
    const saltServing = extractNutrientValue(n, 'salt', 'serving');
    if (saltServing !== null) {
      sodiumServing = saltServing / 2.5;
    }
  }

  // 6. Extract Per-100g Nutrients
  let cal100g = extractCalories(n, '100g');
  let prot100g = extractNutrientValue(n, 'proteins', '100g');
  let carb100g = extractNutrientValue(n, 'carbohydrates', '100g');
  let fat100g = extractNutrientValue(n, 'fat', '100g');
  let fiber100g = extractNutrientValue(n, 'fiber', '100g');
  let sodium100g = extractNutrientValue(n, 'sodium', '100g');

  if (sodium100g === null) {
    const salt100g = extractNutrientValue(n, 'salt', '100g');
    if (salt100g !== null) {
      sodium100g = salt100g / 2.5;
    }
  }

  // 7. Intelligent Cross-Calculation:
  // If 100g is missing but serving is known and serving weight is known:
  if (servingGrams && servingGrams > 0) {
    if (cal100g === 0 && calServing > 0) {
      cal100g = Math.round((calServing / servingGrams) * 100);
    }
    if (prot100g === null && protServing !== null) {
      prot100g = +((protServing / servingGrams) * 100).toFixed(1);
    }
    if (carb100g === null && carbServing !== null) {
      carb100g = +((carbServing / servingGrams) * 100).toFixed(1);
    }
    if (fat100g === null && fatServing !== null) {
      fat100g = +((fatServing / servingGrams) * 100).toFixed(1);
    }
    if (fiber100g === null && fiberServing !== null) {
      fiber100g = +((fiberServing / servingGrams) * 100).toFixed(1);
    }
    if (sodium100g === null && sodiumServing !== null) {
      sodium100g = (sodiumServing / servingGrams) * 100;
    }

    // Vice versa: If serving is missing but 100g is known:
    if (calServing === 0 && cal100g > 0) {
      calServing = Math.round((cal100g * servingGrams) / 100);
    }
    if (protServing === null && prot100g !== null) {
      protServing = +((prot100g * servingGrams) / 100).toFixed(1);
    }
    if (carbServing === null && carb100g !== null) {
      carbServing = +((carb100g * servingGrams) / 100).toFixed(1);
    }
    if (fatServing === null && fat100g !== null) {
      fatServing = +((fat100g * servingGrams) / 100).toFixed(1);
    }
    if (fiberServing === null && fiber100g !== null) {
      fiberServing = +((fiber100g * servingGrams) / 100).toFixed(1);
    }
    if (sodiumServing === null && sodium100g !== null) {
      sodiumServing = (sodium100g * servingGrams) / 100;
    }
  }

  // Final direct fallbacks if still null
  if (calServing === 0 && cal100g > 0) calServing = cal100g;
  if (cal100g === 0 && calServing > 0) cal100g = calServing;

  const resolvedProtServing = +(protServing ?? prot100g ?? 0).toFixed(1);
  const resolvedProt100g = +(prot100g ?? protServing ?? 0).toFixed(1);

  const resolvedCarbServing = +(carbServing ?? carb100g ?? 0).toFixed(1);
  const resolvedCarb100g = +(carb100g ?? carbServing ?? 0).toFixed(1);

  const resolvedFatServing = +(fatServing ?? fat100g ?? 0).toFixed(1);
  const resolvedFat100g = +(fat100g ?? fatServing ?? 0).toFixed(1);

  const resolvedFiberServing =
    fiberServing !== null || fiber100g !== null
      ? +((fiberServing ?? fiber100g) as number).toFixed(1)
      : undefined;
  const resolvedFiber100g =
    fiber100g !== null || fiberServing !== null
      ? +((fiber100g ?? fiberServing) as number).toFixed(1)
      : undefined;

  const resolvedSodiumServing =
    sodiumServing !== null || sodium100g !== null
      ? Math.round(((sodiumServing ?? sodium100g) as number) * 1000)
      : undefined;
  const resolvedSodium100g =
    sodium100g !== null || sodiumServing !== null
      ? Math.round(((sodium100g ?? sodiumServing) as number) * 1000)
      : undefined;

  const perServing: MacroNutrientValues = {
    calories: calServing,
    protein_g: resolvedProtServing,
    carbs_g: resolvedCarbServing,
    fat_g: resolvedFatServing,
    fiber_g: resolvedFiberServing,
    sodium_mg: resolvedSodiumServing,
  };

  const per100g: MacroNutrientValues = {
    calories: cal100g,
    protein_g: resolvedProt100g,
    carbs_g: resolvedCarb100g,
    fat_g: resolvedFat100g,
    fiber_g: resolvedFiber100g,
    sodium_mg: resolvedSodium100g,
  };

  // Determine which basis is primary based on raw payload keys:
  const hasRawServingData =
    n['energy-kcal_serving'] !== undefined ||
    n['energy-kcal_prepared_serving'] !== undefined ||
    n['energy_serving'] !== undefined ||
    n['energy_prepared_serving'] !== undefined ||
    n['proteins_serving'] !== undefined ||
    n['proteins_prepared_serving'] !== undefined ||
    n['carbohydrates_serving'] !== undefined ||
    n['carbohydrates_prepared_serving'] !== undefined ||
    n['fat_serving'] !== undefined ||
    n['fat_prepared_serving'] !== undefined;

  const hasRaw100gData =
    n['energy-kcal_100g'] !== undefined ||
    n['energy-kcal_prepared_100g'] !== undefined ||
    n['energy_100g'] !== undefined ||
    n['energy_prepared_100g'] !== undefined ||
    n['proteins_100g'] !== undefined ||
    n['proteins_prepared_100g'] !== undefined ||
    n['carbohydrates_100g'] !== undefined ||
    n['carbohydrates_prepared_100g'] !== undefined ||
    n['fat_100g'] !== undefined ||
    n['fat_prepared_100g'] !== undefined;

  const basisAvailable: 'serving' | '100g' | 'both' =
    hasRawServingData && hasRaw100gData
      ? 'both'
      : hasRawServingData
      ? 'serving'
      : '100g';

  // Calculate Macro Percentages using perServing
  const macroPercentages = calculateMacroPercentages(perServing);

  return {
    barcode: scannedBarcode,
    productName,
    brand,
    imageUrl,
    servingSize,
    perServing,
    per100g,
    basisAvailable,
    macroPercentages,
    rawNutriments: n,
  };
}
