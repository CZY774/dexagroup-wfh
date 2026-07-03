import type {
  AttendanceSummary,
  AttendanceWithEmployee,
  AttendanceLocationInput,
  CreateEmployeeInput,
  CsrfResponse,
  EmployeeSummary,
  LoginResponse,
  PaginatedResult,
  PaginationParams,
  PublicUser,
  UpdateEmployeeInput,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

let csrfToken: string | null = null;

function appendPaginationParams(params: URLSearchParams, pagination: PaginationParams = {}) {
  if (pagination.page) {
    params.set('page', String(pagination.page));
  }

  if (pagination.limit) {
    params.set('limit', String(pagination.limit));
  }
}

async function request<TResponse>(path: string, options: RequestInit = {}): Promise<TResponse> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresCsrf(method)) {
    headers.set(CSRF_HEADER_NAME, await ensureCsrfToken());
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (requiresCsrf(method) && response.status === 403) {
    const message = await readError(response.clone());
    if (message === 'Invalid CSRF token.') {
      clearCsrfToken();
      headers.set(CSRF_HEADER_NAME, await ensureCsrfToken());
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const body = (await response.json()) as CsrfResponse;
  csrfToken = body.csrfToken;
  return csrfToken;
}

function clearCsrfToken() {
  csrfToken = null;
}

function requiresCsrf(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }

    return body.message || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export const api = {
  async login(email: string, password: string) {
    const result = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return result.user;
  },
  me() {
    return request<PublicUser>('/auth/me');
  },
  async logout() {
    await request<void>('/auth/logout', {
      method: 'POST',
    });
    clearCsrfToken();
  },
  listEmployees(pagination: PaginationParams = {}) {
    const params = new URLSearchParams();
    appendPaginationParams(params, pagination);
    const query = params.toString();
    return request<PaginatedResult<EmployeeSummary>>(`/employees${query ? `?${query}` : ''}`);
  },
  createEmployee(payload: CreateEmployeeInput) {
    return request<EmployeeSummary>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateEmployee(id: string, payload: UpdateEmployeeInput) {
    return request<EmployeeSummary>(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deactivateEmployee(id: string) {
    return request<EmployeeSummary>(`/employees/${id}`, {
      method: 'DELETE',
    });
  },
  activateEmployee(id: string) {
    return request<EmployeeSummary>(`/employees/${id}/activate`, {
      method: 'PATCH',
    });
  },
  submitAttendance(payload: { photo: File; notes?: string; location?: AttendanceLocationInput | null }) {
    const body = new FormData();
    body.append('photo', payload.photo);
    if (payload.location) {
      body.append('latitude', String(payload.location.latitude));
      body.append('longitude', String(payload.location.longitude));
      body.append('accuracyMeters', String(payload.location.accuracyMeters));
      body.append('locationCapturedAt', payload.location.capturedAt);
    }
    if (payload.notes) {
      body.append('notes', payload.notes);
    }

    return request<AttendanceSummary>('/attendance', {
      method: 'POST',
      body,
    });
  },
  listMyAttendance(pagination: PaginationParams = {}) {
    const params = new URLSearchParams();
    appendPaginationParams(params, pagination);
    const query = params.toString();
    return request<PaginatedResult<AttendanceSummary>>(`/attendance/me${query ? `?${query}` : ''}`);
  },
  listAttendance(filters: PaginationParams & { date?: string; employeeId?: string }) {
    const params = new URLSearchParams();
    if (filters.date) {
      params.set('date', filters.date);
    }
    if (filters.employeeId) {
      params.set('employeeId', filters.employeeId);
    }
    appendPaginationParams(params, filters);

    const query = params.toString();
    return request<PaginatedResult<AttendanceWithEmployee>>(`/attendance${query ? `?${query}` : ''}`);
  },
  async getProofBlob(recordId: string, signal?: AbortSignal) {
    const response = await fetch(`${API_BASE_URL}/attendance/${recordId}/proof`, {
      signal,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return response.blob();
  },
};
