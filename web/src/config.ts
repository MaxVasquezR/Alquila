const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();

const PRODUCTION_API_URL = 'https://alquila.onrender.com';

const renderApiFallbacks: Record<string, string> = {
  'alquila-1.onrender.com': PRODUCTION_API_URL,
};

export function getApiBaseUrl(): string {
  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const fallback = renderApiFallbacks[window.location.hostname];
    if (fallback) {
      return fallback;
    }
  }

  if (import.meta.env.PROD) {
    return PRODUCTION_API_URL;
  }

  return '';
}
