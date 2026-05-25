/** Coordenadas aproximadas por distrito (centro) para publicación express */
export const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  'Los Olivos': { lat: -11.9701, lng: -77.0693 },
  'San Miguel': { lat: -12.0775, lng: -77.0898 },
  Miraflores: { lat: -12.1211, lng: -77.0293 },
  'Santiago de Surco': { lat: -12.1358, lng: -76.9907 },
  Comas: { lat: -11.9432, lng: -77.0539 },
  'San Juan de Lurigancho': { lat: -11.9942, lng: -76.9998 },
  Breña: { lat: -12.0589, lng: -77.0501 },
  'La Molina': { lat: -12.0772, lng: -76.9407 },
  'Villa El Salvador': { lat: -12.2166, lng: -76.9422 },
  Ate: { lat: -12.0236, lng: -76.8708 },
};

export function getDistrictCoords(district: string): { lat: number; lng: number } {
  return DISTRICT_COORDS[district] ?? { lat: -12.0464, lng: -77.0428 };
}
