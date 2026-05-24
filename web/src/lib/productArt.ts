const TITLE_ICONS: [RegExp, string][] = [
  [/andamio|andamios/i, '🏗️'],
  [/mezcladora|concreto/i, '🌀'],
  [/taladro|percutor|rotomartillo|martillo/i, '🔩'],
  [/escalera/i, '🪜'],
  [/carpa|carpas|toldo/i, '⛺'],
  [/silla|sillas|mesa/i, '🪑'],
  [/licuadora|batidora/i, '🥤'],
  [/vaporera|olla|vapor/i, '🍲'],
  [/cooler|nevera|hielera/i, '🧊'],
  [/carretilla|carrito/i, '🛞'],
  [/plataforma|elevador|hidr[aá]ulica/i, '⬆️'],
  [/sonido|parlante|bocina|audio/i, '🔊'],
  [/generador|luz el[eé]ctrica/i, '⚡'],
  [/soldad|soldar/i, '🔥'],
  [/pintura|rodillo|brocha/i, '🎨'],
  [/cortadora|sierra|motosierra/i, '🪚'],
  [/compresor|aire/i, '💨'],
  [/bomba|agua/i, '💧'],
  [/cable|extension/i, '🔌'],
  [/linterna|iluminaci/i, '💡'],
  [/camping|tienda/i, '🏕️'],
  [/bici|bicicleta/i, '🚲'],
  [/pelota|deporte|f[uú]tbol/i, '⚽'],
  [/parrilla|asador|bbq/i, '🍖'],
  [/buffet|banquete/i, '🍽️'],
];

const CATEGORY_ICONS: Record<string, string> = {
  construccion: '🏗️',
  herramientas: '🔧',
  fiestas: '🎉',
  hogar: '🏠',
  deportes: '⚽',
  carga: '🛒',
  otros: '📦',
};

const CATEGORY_COLORS: Record<string, string> = {
  construccion: '#fef3c7',
  herramientas: '#dbeafe',
  fiestas: '#fce7f3',
  hogar: '#dcfce7',
  deportes: '#e0e7ff',
  carga: '#ffedd5',
  otros: '#f3f4f6',
};

export function getProductIcon(title: string, category: string): string {
  for (const [re, icon] of TITLE_ICONS) {
    if (re.test(title)) return icon;
  }
  return CATEGORY_ICONS[category] ?? '📦';
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.otros;
}

/** Solo fotos subidas por el usuario (no placeholders del sistema) */
export function isUserPhoto(url?: string | null): boolean {
  if (!url) return false;
  if (url.includes('unsplash.com')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}
