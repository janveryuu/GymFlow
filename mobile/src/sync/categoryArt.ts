/**
 * Category Artwork Mapping and Offline Fallback Resolver for GymFlow Mobile.
 * Bundled assets: chest.png, back.png, leg.png, arm.png, full-body.png.
 */

export const CATEGORY_ART_FALLBACKS: Record<string, string> = {
  chest: 'assets/category/chest.png',
  back: 'assets/category/back.png',
  leg: 'assets/category/leg.png',
  arm: 'assets/category/arm.png',
  'full-body': 'assets/category/full-body.png',
};

// Also support React Native image asset requires for UI rendering
export const CATEGORY_ART_REQUIRES: Record<string, any> = {
  chest: require('../../assets/category/chest.png'),
  back: require('../../assets/category/back.png'),
  leg: require('../../assets/category/leg.png'),
  arm: require('../../assets/category/arm.png'),
  'full-body': require('../../assets/category/full-body.png'),
};

export interface ResolvedWorkoutImage {
  isOfflineFallback: boolean;
  resolvedImage: string;
}

/**
 * Resolves workout image source taking into account online/offline status and category fallback.
 * If offline or missing remote image, cleanly falls back to bundled category artwork.
 * Unknown or empty categories default safely to 'full-body.png'.
 */
const DEFAULT_ART = 'assets/category/full-body.png';

export function resolveWorkoutImage(
  workout: { category?: string | null; image_url?: string | null } | null | undefined,
  isOffline: boolean = false
): ResolvedWorkoutImage {
  if (!workout) {
    return {
      isOfflineFallback: true,
      resolvedImage: CATEGORY_ART_FALLBACKS['full-body'] || DEFAULT_ART,
    };
  }

  const imgUrl = (workout.image_url || '').trim();
  const isValidRemote = imgUrl.startsWith('http://') || imgUrl.startsWith('https://');

  if (!isOffline && isValidRemote) {
    return {
      isOfflineFallback: false,
      resolvedImage: imgUrl,
    };
  }

  // Normalize category: lowercase, trim, replace underscores with hyphens
  const rawCat = (workout.category || '').toLowerCase().trim().replace(/_/g, '-');
  const resolved = CATEGORY_ART_FALLBACKS[rawCat] || CATEGORY_ART_FALLBACKS['full-body'] || DEFAULT_ART;

  return {
    isOfflineFallback: true,
    resolvedImage: resolved,
  };
}

/**
 * Returns the bundled React Native image source for a given category.
 */
export function getCategoryAssetSource(category?: string | null): any {
  const rawCat = (category || '').toLowerCase().trim().replace(/_/g, '-');
  return CATEGORY_ART_REQUIRES[rawCat] || CATEGORY_ART_REQUIRES['full-body'];
}
