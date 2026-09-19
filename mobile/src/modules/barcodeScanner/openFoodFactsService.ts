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
 * Fetches product nutrition and macro details by barcode from Open Food Facts.
 * Uses native fetch with timeout support and custom User-Agent.
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
