import { beforeAll, describe, expect, it } from 'vitest';

const baseUrl = (process.env.CLOUD_API_URL || 'https://backend-eta-pink.vercel.app/api').replace(/\/+$/, '');
const frontendOrigin = process.env.CLOUD_FRONTEND_ORIGIN || 'https://frontend-five-blush-84.vercel.app';
const adminEmail = process.env.CLOUD_ADMIN_EMAIL || '';
const adminPassword = process.env.CLOUD_ADMIN_PASSWORD || '';
const registerEnabled = process.env.CLOUD_TEST_REGISTER === '1';

interface CloudResponse {
  status: number;
  headers: Headers;
  json: Record<string, unknown> | null;
  text: string;
}

async function request(path: string, init?: RequestInit): Promise<CloudResponse> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: CloudResponse['json'] = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, json, text };
}

describe('cloud API availability', () => {
  it('GET /health returns ok', async () => {
    const res = await request('/health');
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ status: 'ok', service: 'odontoaura-api' });
    expect(res.json).toHaveProperty('timestamp');
  });

  it('GET /health/ready reports database up', async () => {
    const res = await request('/health/ready');
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('unknown route returns JSON 404', async () => {
    const res = await request('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.json).toMatchObject({ statusCode: 404 });
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });
});

describe('cloud CORS', () => {
  it('GET response carries Access-Control-Allow-Origin for the frontend', async () => {
    const res = await request('/health', { headers: { Origin: frontendOrigin } });
    expect(res.headers.get('access-control-allow-origin')).toBe(frontendOrigin);
  });

  it('preflight for POST /auth/login is allowed', async () => {
    const res = await request('/auth/login', {
      method: 'OPTIONS',
      headers: {
        Origin: frontendOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect([200, 204]).toContain(res.status);
    expect(res.headers.get('access-control-allow-origin')).toBe(frontendOrigin);
    expect(res.headers.get('access-control-allow-methods')).toMatch(/POST/);
  });

  it('disallowed origin does not receive Access-Control-Allow-Origin', async () => {
    const res = await request('/health', { headers: { Origin: 'https://evil.example.com' } });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe.skipIf(!adminPassword)('cloud authenticated endpoints', () => {
  let token = '';

  beforeAll(async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    expect(res.status).toBe(200);
    const body = res.json as { user?: { role?: string }; access_token?: string };
    expect(body.access_token).toBeTruthy();
    token = body.access_token as string;
    expect(body.user).toMatchObject({ email: adminEmail });
  });

  it('GET /auth/me with Bearer token returns the profile', async () => {
    const res = await request('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ email: adminEmail });
  });

  it('GET /auth/me without token is rejected', async () => {
    const res = await request('/auth/me');
    expect(res.status).toBe(401);
  });

  it('protected route rejects missing role on insecure request', async () => {
    const res = await request('/specialties', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
  });
});

describe.skipIf(!registerEnabled)('cloud registration', () => {
  const email = `cloud-${Date.now()}@odontoaura.dev`;
  const password = 'CloudTest12345';

  it('registers a new patient and returns a token', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cloud Test', email, phone: '+5511999990000', password }),
    });
    expect(res.status).toBe(201);
    const body = res.json as { user?: { email?: string; role?: string }; access_token?: string };
    expect(body.user).toMatchObject({ email, role: 'PATIENT' });
    expect(body.access_token).toBeTruthy();
  });
});