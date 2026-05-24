import { env } from '../config/env';

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Desplaza coordenadas dentro de un radio aleatorio (anti-reglaje).
 * Nunca persistir lat/lng exactas en campos públicos.
 */
export function fuzzCoordinates(
  lat: number,
  lng: number,
  radiusMeters: number = env.locationFuzzRadiusMeters,
): { publicLat: number; publicLng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * radiusMeters;
  const latOffset = (distance * Math.cos(angle)) / EARTH_RADIUS_METERS;
  const lngOffset =
    (distance * Math.sin(angle)) /
    (EARTH_RADIUS_METERS * Math.cos((lat * Math.PI) / 180));

  const publicLat = lat + (latOffset * 180) / Math.PI;
  const publicLng = lng + (lngOffset * 180) / Math.PI;

  return {
    publicLat: roundCoord(publicLat),
    publicLng: roundCoord(publicLng),
  };
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Genera etiqueta segura sin calle ni número de manzana */
export function buildLocationLabel(district: string, reference?: string): string {
  if (reference && !containsSensitiveAddress(reference)) {
    return `Cerca a ${reference}, ${district}`;
  }
  return `Zona residencial en ${district}`;
}

function containsSensitiveAddress(text: string): boolean {
  const sensitivePatterns = [
    /\d+\s*(mz|manzana|lt|lote|av\.|avenida|calle|jr\.|jiron)/i,
    /#\s*\d+/,
  ];
  return sensitivePatterns.some((p) => p.test(text));
}
