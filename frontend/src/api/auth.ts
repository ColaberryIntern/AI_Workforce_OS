import { apiFetch } from './client';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export const auth = {
  register: (input: { email: string; password: string; displayName: string }) =>
    apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  login: (input: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),

  refresh: (refreshToken: string) =>
    apiFetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: () => apiFetch<{ user: AuthUser }>('/auth/me'),

  logout: (refreshToken: string) =>
    apiFetch<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiFetch<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
};
