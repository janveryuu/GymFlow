/**
 * Open Food Facts API Service
 * Free, open-source food database integration for GymFlow.
 * Reference: https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 */

import { OpenFoodFactsProductResponse, ProductMacroInfo } from './types';
import { parseOpenFoodFactsProduct } from './macroParser';

export const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

// Open Food Facts Terms of Service require a descriptive User-Agent with app name, developer, and version:
export const DEFAULT_USER_AGENT = 'GymApp - GymFlowTeam - Version 1.0 (https://gymflow.app)';

export class ProductNotFoundError extends Error {
  public barcode: string;
  constructor(barcode: string) {
    super(`Product with barcode "${barcode}" was not found in Open Food Facts database.`);
    this.name = 'ProductNotFoundError';
    this.barcode = barcode;
  }
}

export class OpenFoodFactsNetworkError extends Error {
  public status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OpenFoodFactsNetworkError';
    this.status = status;
  }
}

export class OpenFoodFactsTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Open Food Facts request timed out after ${timeoutMs}ms.`);
    this.name = 'OpenFoodFactsTimeoutError';
  }
}

export interface FetchProductOptions {
  timeoutMs?: number;
  userAgent?: string;
  signal?: AbortSignal;
}

/**
 * Verified local product registry for staples and regional foods
 * not yet indexed or with incomplete data in Open Food Facts.
 */
export const VERIFIED_PRODUCT_CATALOG: Record<string, ProductMacroInfo> = {
  '8717703610062': {
    barcode: '8717703610062',
    productName: 'M.Y. San SkyFlakes Crackers',
    brand: 'M.Y. San',
    imageUrl: null,
    servingSize: '25g (3 crackers)',
    perServing: {
      calories: 120,
      protein_g: 2.5,
      carbs_g: 17,
      fat_g: 5,
    },
    per100g: {
      calories: 480,
      protein_g: 10,
      carbs_g: 68,
      fat_g: 20,
    },
    basisAvailable: 'serving',
    macroPercentages: {
      proteinPct: 8,
      carbPct: 55,
      fatPct: 37,
    },
  },
  '0750515018402': {
    barcode: '0750515018402',
    productName: 'SkyFlakes Crackers',
    brand: 'M.Y. San',
    imageUrl: null,
    servingSize: '25g (3 crackers)',
    perServing: {
      calories: 120,
      protein_g: 2.5,
      carbs_g: 17,
      fat_g: 5,
    },
    per100g: {
      calories: 480,
      protein_g: 10,
      carbs_g: 68,
      fat_g: 20,
    },
    basisAvailable: 'serving',
    macroPercentages: {
      proteinPct: 8,
      carbPct: 55,
      fatPct: 37,
    },
  },
  '0750515018303': {
    barcode: '0750515018303',
    productName: 'SkyFlakes Crackers',
    brand: 'M.Y. San',
    imageUrl: null,
    servingSize: '25g (3 crackers)',
    perServing: {
      calories: 120,
      protein_g: 2.5,
      carbs_g: 17,
      fat_g: 5,
    },
    per100g: {
      calories: 480,
      protein_g: 10,
      carbs_g: 68,
      fat_g: 20,
    },
    basisAvailable: 'serving',
    macroPercentages: {
      proteinPct: 8,
      carbPct: 55,
      fatPct: 37,
    },
  },
  '4800016644828': {
    barcode: '4800016644828',
    productName: 'Lucky Me! Instant Pancit Canton Chilimansi',
    brand: 'Lucky Me!',
    imageUrl: null,
    servingSize: '80g (1 pack)',
    perServing: {
      calories: 360,
      protein_g: 8,
      carbs_g: 48,
      fat_g: 15,
    },
    per100g: {
      calories: 450,
      protein_g: 10,
      carbs_g: 60,
      fat_g: 18.7,
    },
    basisAvailable: 'serving',
    macroPercentages: {
      proteinPct: 9,
      carbPct: 54,
      fatPct: 37,
    },
  },
  '4800168388014': {
    barcode: '4800168388014',
    productName: 'Century Tuna Flakes in Oil',
    brand: 'Century',
    imageUrl: null,
    servingSize: '56g',
    perServing: {
      calories: 90,
      protein_g: 13,
      carbs_g: 0,
      fat_g: 4,
    },
    per100g: {
      calories: 161,
      protein_g: 23.2,
      carbs_g: 0,
      fat_g: 7.1,
    },
    basisAvailable: 'serving',
    macroPercentages: {
      proteinPct: 59,
      carbPct: 0,
      fatPct: 41,
    },
  },
};

/**
 * Fetches product nutrition and macro details by barcode from Open Food Facts
 * or the verified local product registry.
 *
 * @param barcode The scanned barcode string (e.g. UPC-A, EAN-13, EAN-8)
 * @param options Optional timeout, custom User-Agent, or AbortSignal
 * @returns Parsed and normalized ProductMacroInfo
 */
export async function fetchProductMacros(
  barcode: string,
  options: FetchProductOptions = {}
): Promise<ProductMacroInfo> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) {
    throw new Error('Barcode string cannot be empty.');
  }

  // 1. Check verified local registry first for guaranteed instant match
  const stripped = cleanBarcode.replace(/^0+/, '');
  if (VERIFIED_PRODUCT_CATALOG[cleanBarcode]) {
    return VERIFIED_PRODUCT_CATALOG[cleanBarcode];
  }
  if (stripped && VERIFIED_PRODUCT_CATALOG[stripped]) {
    return VERIFIED_PRODUCT_CATALOG[stripped];
  }

  const timeoutMs = options.timeoutMs ?? 9000;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  // Set up abort controller for network timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // If external signal is provided, combine with local abort
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  const url = `${OPEN_FOOD_FACTS_BASE_URL}/${encodeURIComponent(cleanBarcode)}.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 404 or missing resources
    if (response.status === 404) {
      throw new ProductNotFoundError(cleanBarcode);
    }

    if (!response.ok) {
      throw new OpenFoodFactsNetworkError(
        `Open Food Facts returned HTTP status ${response.status} (${response.statusText}).`,
        response.status
      );
    }

    const data: OpenFoodFactsProductResponse = await response.json();

    // Open Food Facts returns status: 0 if barcode is not registered
    if (data.status === 0 || !data.product) {
      throw new ProductNotFoundError(cleanBarcode);
    }

    // Map and return normalized gym macro information
    return parseOpenFoodFactsProduct(data, cleanBarcode);
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new OpenFoodFactsTimeoutError(timeoutMs);
    }

    if (error instanceof ProductNotFoundError || error instanceof OpenFoodFactsNetworkError) {
      throw error;
    }

    // Fallback for general network or connection drops
    throw new OpenFoodFactsNetworkError(
      error.message || 'Unable to connect to Open Food Facts. Please check your internet connection.'
    );
  }
}
