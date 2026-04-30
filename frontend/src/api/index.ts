import { apiFetch, apiFetchWithMeta } from './client';

export const valueProp = {
  list: (audience?: string) =>
    apiFetch<Array<{ id: string; title: string; summary: string; audience: string; orderIndex: number }>>(
      audience ? `/value-propositions?audience=${encodeURIComponent(audience)}` : '/value-propositions',
    ),
  matrix: () =>
    apiFetch<{
      capabilities: Array<{ id: string; name: string; orderIndex: number }>;
      competitors: Array<{ id: string; name: string; isOwn: boolean; orderIndex: number }>;
      cells: Array<{ capabilityId: string; competitorId: string; value: string; note: string | null }>;
    }>('/differentiation-matrix'),
  gaps: () =>
    apiFetch<Array<{ id: string; title: string; description: string; ourAnswer: string }>>(
      '/competitive-gaps',
    ),
};

export const roles = {
  list: () =>
    apiFetch<Array<{
      id: string;
      name: string;
      description: string | null;
      isSystem: boolean;
      parentId: string | null;
      permissions: Array<{ permission: { key: string; description: string | null } }>;
    }>>('/roles'),
  create: (input: { name: string; description?: string; parentId?: string }) =>
    apiFetch<{ id: string }>('/roles', { method: 'POST', body: JSON.stringify(input) }),
  delete: (id: string) => apiFetch<void>(`/roles/${id}`, { method: 'DELETE' }),
  setPermissions: (id: string, permissionKeys: string[]) =>
    apiFetch<void>(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionKeys }),
    }),
  assign: (userId: string, roleId: string) =>
    apiFetch<{ id: string }>('/roles/assignments', {
      method: 'POST',
      body: JSON.stringify({ userId, roleId }),
    }),
};

export const audit = {
  list: (params: { userId?: string; action?: string; limit?: number; cursor?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.userId) qs.set('userId', params.userId);
    if (params.action) qs.set('action', params.action);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.cursor) qs.set('cursor', params.cursor);
    return apiFetchWithMeta<
      Array<{
        id: string;
        userId: string | null;
        action: string;
        resource: string;
        occurredAt: string;
      }>
    >(`/audit?${qs.toString()}`);
  },
};

export const recommendations = {
  list: () =>
    apiFetch<Array<{
      id: string;
      kind: string;
      payload: Record<string, unknown>;
      confidence: number;
      modelName: string;
      modelVersion: string;
      accepted: boolean | null;
      createdAt: string;
    }>>('/recommendations'),
  generate: (input: { userId: string; context?: { role?: string; location?: string; skills?: string[] }; k?: number }) =>
    apiFetch('/recommendations', { method: 'POST', body: JSON.stringify(input) }),
  accept: (id: string) => apiFetch(`/recommendations/${id}/accept`, { method: 'POST' }),
  reject: (id: string, feedback?: string) =>
    apiFetch(`/recommendations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),
};

export const notifications = {
  list: () =>
    apiFetch<Array<{
      id: string;
      channel: string;
      eventType: string;
      subject: string | null;
      status: string;
      attempts: number;
      lastError: string | null;
      sentAt: string | null;
      createdAt: string;
    }>>('/notifications'),
};

export const webhooks = {
  list: () =>
    apiFetch<Array<{
      id: string;
      url: string;
      events: string[];
      isActive: boolean;
      failures: number;
    }>>('/webhooks'),
  create: (input: { url: string; events: string[] }) =>
    apiFetch<{ id: string; secret: string }>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  test: (id: string, eventType: string) =>
    apiFetch(`/webhooks/${id}/test`, { method: 'POST', body: JSON.stringify({ eventType }) }),
  delete: (id: string) => apiFetch<void>(`/webhooks/${id}`, { method: 'DELETE' }),
};

export const analytics = {
  summary: () =>
    apiFetch<{ dau: number; wau: number; mau: number; topEvents: Array<{ eventName: string; count: number }> }>(
      '/analytics/summary',
    ),
};

export const forecast = {
  compute: (input: { scope: string; horizonDays: number; series: Array<{ date: string; value: number }> }) =>
    apiFetch('/forecast', { method: 'POST', body: JSON.stringify(input) }),
};

export const health = {
  check: () =>
    apiFetch<{ status: string; db: string; uptimeSeconds: number; version: string }>('/health'),
};
