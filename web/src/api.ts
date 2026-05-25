const API = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api/v1`.replace(
  /^\/api/,
  '/api',
);

export function getToken(): string | null {
  return localStorage.getItem('alquila_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('alquila_token', token);
  else localStorage.removeItem('alquila_token');
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

function formatApiError(data: {
  error?: string;
  details?: Record<string, string[] | undefined>;
}, status?: number): string {
  const details = data.details;
  if (!details) {
    if (!data.error && status && status >= 500) {
      return 'El backend no responde o está caído';
    }
    return data.error ?? 'Error en la solicitud';
  }

  const labels: Record<string, string> = {
    title: 'Título',
    category: 'Categoría',
    pricePerDay: 'Precio',
    district: 'Distrito',
    imageUrl: 'Foto URL',
    phone: 'Celular',
    code: 'Código',
    dni: 'DNI',
    legalName: 'Nombre legal',
  };

  for (const [field, msgs] of Object.entries(details)) {
    if (msgs?.[0]) {
      const label = labels[field] ?? field;
      const msg = msgs[0]
        .replace('Too small: expected string to have >=3 characters', 'debe tener al menos 3 caracteres')
        .replace('Too small: expected number to be >0', 'debe ser mayor a 0')
        .replace('Invalid input: expected number, received null', 'ingresa un número válido')
        .replace('Invalid input: expected number, received string', 'debe ser un número')
        .replace('Distrito no válido en Lima Metropolitana', 'elige un distrito válido de Lima')
        .replace('Categoría no válida', 'elige una categoría');
      return `${label}: ${msg}`;
    }
  }

  return data.error ?? 'Error en la solicitud';
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  }).catch(() => {
    throw new ApiError('No se pudo conectar con el backend', 0, 'NETWORK_ERROR');
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      formatApiError(data, res.status),
      res.status,
      data.code,
      data.details,
    );
  }

  return data as T;
}
