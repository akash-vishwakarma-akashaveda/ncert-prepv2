import axios, { AxiosError, type Method } from 'axios';

// Behind Nginx the API is same-origin, so that is the right fallback for a production build with
// VITE_API_URL unset - defaulting to localhost there would silently point the whole app at nothing.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the session cookie across the frontend/backend ports
  headers: { 'Content-Type': 'application/json' },
});

function toApiError(err: unknown): ApiError {
  const axiosErr = err as AxiosError<{ error?: unknown }>;
  if (axiosErr.response) {
    const message = axiosErr.response.data?.error;
    return new ApiError(
      typeof message === 'string' ? message : `Request failed (${axiosErr.response.status})`,
      axiosErr.response.status,
      axiosErr.response.data
    );
  }
  // No response at all: network down, CORS blocked, DNS failure, etc.
  return new ApiError('Network error — check your connection and try again.', 0);
}

async function apiFetch<T>(path: string, method: Method, body?: unknown): Promise<T> {
  try {
    const res = await http.request<T>({ url: path, method, data: body });
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, 'POST', body),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, 'PUT', body),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, 'PATCH', body),
  delete: <T>(path: string) => apiFetch<T>(path, 'DELETE'),

  // Separate from `http` above: that instance forces Content-Type: application/json, which
  // breaks multipart uploads (the browser needs to set its own boundary). A plain axios.post
  // with FormData lets it do that.
  async uploadFile<T>(path: string, formData: FormData): Promise<T> {
    try {
      const res = await axios.post<T>(`${API_URL}${path}`, formData, { withCredentials: true });
      return res.data;
    } catch (err) {
      throw toApiError(err);
    }
  },
};
