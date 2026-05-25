export interface MarketCategory {
  id: string;
  label: string;
  icon: string;
  image: string;
}

export const MARKET_CATEGORIES = [
  {
    id: 'construccion',
    label: 'Construcción',
    icon: '🏗️',
    image: 'https://images.unsplash.com/photo-1504917593495-bee395f959ea?w=600&q=80',
  },
  {
    id: 'herramientas',
    label: 'Herramientas',
    icon: '🔧',
    image: 'https://images.unsplash.com/photo-1504148455325-0c3f5a69e0b4?w=600&q=80',
  },
  {
    id: 'fiestas',
    label: 'Fiestas',
    icon: '🎉',
    image: 'https://images.unsplash.com/photo-1530103862675-de8c9a41ab18?w=600&q=80',
  },
  {
    id: 'hogar',
    label: 'Hogar',
    icon: '🏠',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80',
  },
  {
    id: 'deportes',
    label: 'Deportes',
    icon: '⚽',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80',
  },
  {
    id: 'carga',
    label: 'Carga',
    icon: '🛒',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80',
  },
  {
    id: 'otros',
    label: 'Otros',
    icon: '📦',
    image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a2a?w=600&q=80',
  },
] as const satisfies readonly MarketCategory[];

export type MarketCategoryId = (typeof MARKET_CATEGORIES)[number]['id'];

export function getCategoryImage(category: string): string {
  const found = MARKET_CATEGORIES.find(
    (item) => item.id === category.toLowerCase().replace(/\s+/g, ''),
  );
  return found?.image ?? MARKET_CATEGORIES[MARKET_CATEGORIES.length - 1].image;
}

export function isValidCategory(category: string): boolean {
  return MARKET_CATEGORIES.some((item) => item.id === category);
}
