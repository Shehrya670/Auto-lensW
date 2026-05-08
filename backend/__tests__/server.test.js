const request = require('supertest');
const app = require('../server');

jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');

describe('Backend server endpoints', () => {
  test('GET / returns welcome payload', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('version');
  });

  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'auto-lens-backend' });
  });

  test('GET /readyz returns ready when DB responds', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });

  test('GET /readyz returns 503 when DB unavailable', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB down'));
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('not_ready');
  });

  test('GET /api/search returns results based on query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Car A' }] });
    const res = await request(app).get('/api/search').query({ q: 'Car' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('GET /api/recommendations returns recommendations', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5, title: 'Recommended Car' }] });
    const res = await request(app).get('/api/recommendations');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('recommendations');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  test('Unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Route not found');
  });
});
