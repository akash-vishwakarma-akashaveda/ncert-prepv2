import axios, { AxiosError, type Method } from 'axios';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000';

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

async function apiFetch<T>(path: string, method: Method, body?: unknown): Promise<T> {
  try {
    const res = await http.request<T>({ url: path, method, data: body });
    return res.data;
  } catch (err) {
    const axiosErr = err as AxiosError<{ error?: unknown }>;
    if (axiosErr.response) {
      const message = axiosErr.response.data?.error;
      throw new ApiError(
        typeof message === 'string' ? message : `Request failed (${axiosErr.response.status})`,
        axiosErr.response.status,
        axiosErr.response.data
      );
    }
    // No response at all: network down, CORS blocked, DNS failure, etc.
    throw new ApiError('Network error — check your connection and try again.', 0);
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, 'POST', body),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, 'PATCH', body),
  delete: <T>(path: string) => apiFetch<T>(path, 'DELETE'),
};
