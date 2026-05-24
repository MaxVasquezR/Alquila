export interface MarketCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: MarketCategory[] = [
  { id: 'construccion', label: 'Construcción', icon: '🏗️', color: '#fef3c7' },
  { id: 'herramientas', label: 'Herramientas', icon: '🔧', color: '#dbeafe' },
  { id: 'fiestas', label: 'Fiestas', icon: '🎉', color: '#fce7f3' },
  { id: 'hogar', label: 'Hogar', icon: '🏠', color: '#dcfce7' },
  { id: 'deportes', label: 'Deportes', icon: '⚽', color: '#e0e7ff' },
  { id: 'carga', label: 'Carga', icon: '🛒', color: '#ffedd5' },
  { id: 'otros', label: 'Otros', icon: '📦', color: '#f3f4f6' },
];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryColor(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.color ?? CATEGORIES[6].color;
}
