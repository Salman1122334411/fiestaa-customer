/** Base brand colors per store category (icon tile backgrounds use a light blend). */
export const STORE_CATEGORY_BASE_COLORS: Record<string, string> = {
  ALL: '#FE042B',
  RESTAURANT: '#7E3229',
  GROCERY: '#F0CD58',
  BAKERY: '#873600',
  PATISSERIE: '#873600',
  APPAREL: '#780A30',
  ELECTRONICS: '#504467',
  FLOWER_SHOP: '#D0D5B6',
  FLOWERS: '#D0D5B6',
  HEALTH_WELLBEING: '#DBE2E0',
  HOME_DIY: '#6AC7A2',
  STATIONERY: '#FFC8E5',
};

const DEFAULT_CATEGORY_COLOR = '#FE042B';

/** Mix category color with white for a subtle tinted background. */
export const blendCategoryWithWhite = (hex: string, colorWeight = 0.14): string => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#F9FAFB';

  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const whiteWeight = 1 - colorWeight;

  const nr = Math.round(r * colorWeight + 255 * whiteWeight);
  const ng = Math.round(g * colorWeight + 255 * whiteWeight);
  const nb = Math.round(b * colorWeight + 255 * whiteWeight);

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
};

export const resolveStoreCategoryKey = (typeOrId: string | null | undefined): string => {
  if (typeOrId == null || typeOrId === 'ALL') return 'ALL';
  return typeOrId.toUpperCase().replace(/-/g, '_');
};

export const getStoreCategoryBaseColor = (typeOrId: string | null | undefined): string => {
  const key = resolveStoreCategoryKey(typeOrId);
  return STORE_CATEGORY_BASE_COLORS[key] ?? DEFAULT_CATEGORY_COLOR;
};

/** Light background tint for category tiles. */
export const getStoreCategoryBackground = (
  typeOrId: string | null | undefined,
  active = false
): string => {
  const base = getStoreCategoryBaseColor(typeOrId);
  return blendCategoryWithWhite(base, active ? 0.22 : 0.14);
};
