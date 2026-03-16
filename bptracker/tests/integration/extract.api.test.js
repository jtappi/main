'use strict';

/**
 * extract.api.test.js — integration tests for POST /bptracker/api/extract
 *
 * The Anthropic SDK is mocked in testApp.js — no real API calls are made.
 * Each test configures the mock's return value to simulate different
 * Claude responses.
 */

const request  = require('supertest');
const Anthropic = require('@anthropic-ai/sdk');
const { buildApp } = require('../unit/testApp');

/** Build a fake Anthropic messages.create response for a given JSON payload. */
function mockClaudeResponse(jsonPayload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(jsonPayload) }],
  };
}

let anthropicInstance;

beforeEach(() => {
  jest.clearAllMocks();
  anthropicInstance = new Anthropic();
  Anthropic.mockImplementation(() => anthropicInstance);
});

const validBody = {
  imageData: 'base64encodedstring',
  mediaType: 'image/jpeg',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /bptracker/api/extract', () => {
  test('returns extracted values for a high-confidence response', async () => {
    anthropicInstance.messages.create.mockResolvedValue(
      mockClaudeResponse({ systolic: 122, diastolic: 78, heartRate: 64, confidence: 'high' })
    );

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).post('/bptracker/api/extract').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.systolic).toBe(122);
    expect(res.body.diastolic).toBe(78);
    expect(res.body.heartRate).toBe(64);
    expect(res.body.confidence).toBe('high');
  });

  test('propagates low confidence from Claude to client', async () => {
    anthropicInstance.messages.create.mockResolvedValue(
      mockClaudeResponse({ systolic: 130, diastolic: 85, heartRate: 70, confidence: 'low' })
    );

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).post('/bptracker/api/extract').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe('low');
  });

  test('overrides confidence to low when a value is outside plausible range', async () => {
    anthropicInstance.messages.create.mockResolvedValue(
      mockClaudeResponse({ systolic: 999, diastolic: 78, heartRate: 64, confidence: 'high' })
    );

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).post('/bptracker/api/extract').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe('low');
    expect(res.body.systolic).toBe(999);
  });

  test('returns 422 image_unreadable when all values are null', async () => {
    anthropicInstance.messages.create.mockResolvedValue(
      mockClaudeResponse({ systolic: null, diastolic: null, heartRate: null, confidence: 'low' })
    );

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).post('/bptracker/api/extract').send(validBody);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('image_unreadable');
  });

  test('returns 502 extraction_failed when Claude API throws', async () => {
    anthropicInstance.messages.create.mockRejectedValue(new Error('Network error'));

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).post('/bptracker/api/extract').send(validBody);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('extraction_failed');
  });

  test('returns 502 extraction_failed when Claude returns unparseable output', async () => {
    anthropicInstance.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot read this image.' }],
    });

    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).post('/bptracker/api/extract').send(validBody);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('extraction_failed');
  });

  test('returns 400 when imageData is missing', async () => {
    const app = buildApp({ user: { id: 'user-001', role: 'guest' } });
    const res = await request(app).post('/bptracker/api/extract').send({});

    expect(res.status).toBe(400);
    expect(anthropicInstance.messages.create).not.toHaveBeenCalled();
  });
});
