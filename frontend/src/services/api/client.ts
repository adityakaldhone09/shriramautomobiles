export const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '');

export function apiUrl(endpoint: string): string {
  const baseEndsInApi = /\/api$/i.test(API_BASE_URL);
  const path = endpoint.replace(/^\/+/, '');
  const normalizedPath =
    baseEndsInApi && (path === 'api' || path.startsWith('api/'))
      ? path.slice(3).replace(/^\/+/, '')
      : path;

  return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL;
}

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = apiUrl(endpoint);
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const responseText = await response.text();
  let json: unknown;
  if (responseText) {
    try {
      json = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error('API returned an invalid response');
      }
    }
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' &&
      json !== null &&
      'message' in json &&
      typeof json.message === 'string'
        ? json.message
        : 'API request failed';
    throw new Error(message);
  }

  if (typeof json === 'object' && json !== null && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}
