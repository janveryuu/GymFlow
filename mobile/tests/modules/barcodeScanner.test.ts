/**
 * Barcode Scanner & Open Food Facts Macro Parser Test Suite
 */

import {
  parseNumeric,
  calculateMacroPercentages,
  isValidFoodBarcode,
  parseOpenFoodFactsProduct,
  fetchProductMacros,
  ProductNotFoundError,
  OpenFoodFactsNetworkError,
  DEFAULT_USER_AGENT,
  detectBarcodeFromImage,
  POPULAR_TEST_BARCODES,
} from '../../src/modules/barcodeScanner';
import { OpenFoodFactsProductResponse } from '../../src/modules/barcodeScanner/types';

describe('Barcode Scanner Macro Module', () => {
  describe('parseNumeric Helper', () => {
    it('handles clean integers and floats', () => {
      expect(parseNumeric(100)).toBe(100);
      expect(parseNumeric(25.5)).toBe(25.5);
    });

    it('handles numeric strings with standard dot decimal', () => {
      expect(parseNumeric('42.8')).toBe(42.8);
      expect(parseNumeric('  150  ')).toBe(150);
    });

    it('handles european comma decimal formatting', () => {
      expect(parseNumeric('12,5')).toBe(12.5);
    });

    it('gracefully returns fallback on null, undefined, empty string, or NaN', () => {
      expect(parseNumeric(null)).toBe(0);
      expect(parseNumeric(undefined, 10)).toBe(10);
      expect(parseNumeric('')).toBe(0);
      expect(parseNumeric('not-a-number', 5)).toBe(5);
      expect(parseNumeric(NaN, 2)).toBe(2);
    });
  });

  describe('isValidFoodBarcode Helper', () => {
    it('accepts valid UPC-A barcodes (12 digits)', () => {
      expect(isValidFoodBarcode('012345678905')).toBe(true);
    });

    it('accepts valid EAN-13 barcodes (13 digits)', () => {
      expect(isValidFoodBarcode('7622210449283')).toBe(true);
    });

    it('accepts valid EAN-8 barcodes (8 digits)', () => {
      expect(isValidFoodBarcode('96385074')).toBe(true);
    });

    it('rejects invalid or non-numeric barcode strings', () => {
      expect(isValidFoodBarcode('')).toBe(false);
      expect(isValidFoodBarcode('123')).toBe(false); // too short
      expect(isValidFoodBarcode('ABC123456789')).toBe(false); // non-numeric
      expect(isValidFoodBarcode('12345678901234567')).toBe(false); // too long
    });
  });

  describe('calculateMacroPercentages Helper', () => {
    it('calculates accurate macro split according to 4/4/9 kcal rules', () => {
      // 25g protein (100 kcal), 25g carbs (100 kcal), 11.1g fat (100 kcal) -> total 300 kcal (~33% each)
      const percentages = calculateMacroPercentages({
        calories: 300,
        protein_g: 25,
        carbs_g: 25,
        fat_g: 11.1,
      });

      expect(percentages.proteinPct).toBe(33);
      expect(percentages.carbPct).toBe(33);
      expect(percentages.fatPct).toBe(33);
    });

    it('handles zero values without dividing by zero', () => {
      const percentages = calculateMacroPercentages({
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      });

      expect(percentages).toEqual({
        proteinPct: 0,
        carbPct: 0,
        fatPct: 0,
      });
    });
  });

  describe('parseOpenFoodFactsProduct Parser', () => {
    it('parses complete product with serving-size data', () => {
      const mockResponse: OpenFoodFactsProductResponse = {
        code: '012345678905',
        status: 1,
        status_verbose: 'product found',
        product: {
          product_name: 'Whey Protein Isolate',
          brands: 'Optimum Nutrition',
          image_front_url: 'https://images.openfoodfacts.org/images/1.jpg',
          serving_size: '30g',
          nutriments: {
            'energy-kcal_serving': 120,
            'energy-kcal_100g': 400,
            proteins_serving: 24,
            proteins_100g: 80,
            carbohydrates_serving: 3,
            carbohydrates_100g: 10,
            fat_serving: 1,
            fat_100g: 3.3,
            fiber_serving: 0.5,
            fiber_100g: 1.6,
            sodium_serving: 0.14,
            sodium_100g: 0.46,
          },
        },
      };

      const result = parseOpenFoodFactsProduct(mockResponse, '012345678905');

      expect(result.productName).toBe('Whey Protein Isolate');
      expect(result.brand).toBe('Optimum Nutrition');
      expect(result.barcode).toBe('012345678905');
      expect(result.imageUrl).toBe('https://images.openfoodfacts.org/images/1.jpg');
      expect(result.servingSize).toBe('30g');

      // Per-serving values
      expect(result.perServing.calories).toBe(120);
      expect(result.perServing.protein_g).toBe(24);
      expect(result.perServing.carbs_g).toBe(3);
      expect(result.perServing.fat_g).toBe(1);
      expect(result.perServing.sodium_mg).toBe(140); // 0.14g = 140mg

      // Per-100g values
      expect(result.per100g.calories).toBe(400);
      expect(result.per100g.protein_g).toBe(80);
      expect(result.basisAvailable).toBe('both');
    });

    it('falls back safely to 100g data when serving-size data is missing', () => {
      const mockResponse: OpenFoodFactsProductResponse = {
        code: '7622210449283',
        status: 1,
        status_verbose: 'product found',
        product: {
          product_name: 'Dark Chocolate 85%',
          brands_tags: ['lindt'],
          nutriments: {
            'energy-kcal_100g': '584',
            proteins_100g: '11',
            carbohydrates_100g: '19',
            fat_100g: '46',
          },
        },
      };

      const result = parseOpenFoodFactsProduct(mockResponse, '7622210449283');

      expect(result.productName).toBe('Dark Chocolate 85%');
      expect(result.brand).toBe('lindt');
      expect(result.servingSize).toBe('100g');
      expect(result.basisAvailable).toBe('100g');

      // perServing should fallback to per100g values
      expect(result.perServing.calories).toBe(584);
      expect(result.perServing.protein_g).toBe(11);
      expect(result.perServing.carbs_g).toBe(19);
      expect(result.perServing.fat_g).toBe(46);
    });

    it('falls back to converting kJ to kcal when energy-kcal is missing', () => {
      const mockResponse: OpenFoodFactsProductResponse = {
        code: '9999999999',
        status: 1,
        status_verbose: 'product found',
        product: {
          product_name: 'Raw Almonds',
          nutriments: {
            energy_100g: 2400, // 2400 kJ / 4.184 ≈ 574 kcal
            proteins_100g: 21,
            carbohydrates_100g: 22,
            fat_100g: 50,
          },
        },
      };

      const result = parseOpenFoodFactsProduct(mockResponse, '9999999999');
      expect(result.per100g.calories).toBe(574);
      expect(result.perServing.calories).toBe(574);
    });

    it('resolves product name via fallback chain when product_name is undefined', () => {
      const mockResponse: OpenFoodFactsProductResponse = {
        code: '88888888',
        status: 1,
        status_verbose: 'product found',
        product: {
          product_name_en: 'Oat Milk Organic',
          nutriments: {
            'energy-kcal_100g': 45,
            proteins_100g: 1.2,
            carbohydrates_100g: 6.5,
            fat_100g: 1.5,
          },
        },
      };

      const result = parseOpenFoodFactsProduct(mockResponse, '88888888');
      expect(result.productName).toBe('Oat Milk Organic');
    });

    it('correctly parses prepared foods with _prepared_ keys (e.g. Instant Pancit Canton)', () => {
      const mockPancitCanton: OpenFoodFactsProductResponse = {
        code: '4807770270055',
        status: 1,
        status_verbose: 'product found',
        product: {
          product_name: 'Instant Pancit Canton Original Flavour',
          brands: 'LUCKY ME!',
          serving_size: '60 g',
          serving_quantity: 60,
          nutriments: {
            'energy-kcal_prepared_serving': 270,
            'energy-kcal_prepared_100g': 450,
            proteins_prepared_serving: 7,
            proteins_prepared_100g: 11.6666666666667,
            carbohydrates_prepared_serving: 35,
            carbohydrates_prepared_100g: 58.3333333333333,
            fat_prepared_serving: 12,
            fat_prepared_100g: 20,
            fiber_prepared_serving: 2,
            fiber_prepared_100g: 3.33333333333333,
            sodium_prepared_serving: 0.8,
            sodium_prepared_100g: 1.33333333333333,
          },
        },
      };

      const result = parseOpenFoodFactsProduct(mockPancitCanton, '4807770270055');

      expect(result.productName).toBe('Instant Pancit Canton Original Flavour');
      expect(result.brand).toBe('LUCKY ME!');
      expect(result.servingSize).toBe('60 g');

      // Per serving (60g)
      expect(result.perServing.calories).toBe(270);
      expect(result.perServing.protein_g).toBe(7);
      expect(result.perServing.carbs_g).toBe(35);
      expect(result.perServing.fat_g).toBe(12);
      expect(result.perServing.fiber_g).toBe(2);
      expect(result.perServing.sodium_mg).toBe(800);

      // Per 100g
      expect(result.per100g.calories).toBe(450);
      expect(result.per100g.protein_g).toBe(11.7);
      expect(result.per100g.carbs_g).toBe(58.3);
      expect(result.per100g.fat_g).toBe(20);

      expect(result.basisAvailable).toBe('both');
    });
  });

  describe('fetchProductMacros API Service', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('sends the required User-Agent header and parses product on success', async () => {
      let interceptedHeaders: any = null;

      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        interceptedHeaders = init?.headers;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              code: '012345678905',
              status: 1,
              status_verbose: 'product found',
              product: {
                product_name: 'Greek Yogurt',
                brands: 'Chobani',
                nutriments: {
                  'energy-kcal_100g': 59,
                  proteins_100g: 10,
                  carbohydrates_100g: 3.6,
                  fat_100g: 0.4,
                },
              },
            }),
        } as Response);
      });

      const result = await fetchProductMacros('012345678905');

      expect(result.productName).toBe('Greek Yogurt');
      expect(result.brand).toBe('Chobani');
      expect(result.per100g.protein_g).toBe(10);
      expect(interceptedHeaders?.['User-Agent']).toBe(DEFAULT_USER_AGENT);
    });

    it('resolves verified staple items like SkyFlakes Crackers (8717703610062) directly', async () => {
      const result = await fetchProductMacros('8717703610062');
      expect(result.productName).toBe('M.Y. San SkyFlakes Crackers');
      expect(result.perServing.calories).toBe(120);
      expect(result.perServing.carbs_g).toBe(17);
      expect(result.perServing.protein_g).toBe(2.5);
      expect(result.perServing.fat_g).toBe(5);
    });

    it('throws ProductNotFoundError when Open Food Facts status is 0', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            code: '0000000000',
            status: 0,
            status_verbose: 'product not found',
          }),
      } as Response);

      await expect(fetchProductMacros('0000000000')).rejects.toThrow(ProductNotFoundError);
    });

    it('throws ProductNotFoundError on HTTP 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(fetchProductMacros('0000000000')).rejects.toThrow(ProductNotFoundError);
    });

    it('throws OpenFoodFactsNetworkError on HTTP 500 server error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(fetchProductMacros('012345678905')).rejects.toThrow(OpenFoodFactsNetworkError);
    });
  });

  describe('detectBarcodeFromImage & Test Presets', () => {
    it('provides popular gym food barcodes for localhost testing', () => {
      expect(POPULAR_TEST_BARCODES.length).toBeGreaterThan(0);
      POPULAR_TEST_BARCODES.forEach((preset) => {
        expect(isValidFoodBarcode(preset.code)).toBe(true);
        expect(preset.label).toBeDefined();
      });
    });

    it('returns null gracefully when no BarcodeDetector API is present in environment', async () => {
      const result = await detectBarcodeFromImage('mock-image-uri');
      expect(result).toBeNull();
    });
  });
});

