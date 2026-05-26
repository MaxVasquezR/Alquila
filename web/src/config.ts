const configuredApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();

const renderApiFallbacks: Record<string, string> = {
  'alquila-1.onrender.com': 'https://alquila.onrender.com',
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

  return '';
}
