'use strict';

/**
 * extract.api.test.js — integration tests for POST /bptracker/api/extract
 *
 * jest.mock() calls are hoisted by Jest to the top of this file.
 * The Google Generative AI SDK is mocked so no real API calls are made.
 */

jest.mock('../../../core/auth/middleware', () => ({
  requireAuth:          (_req, _res, next) => next(),
  requireAdmin:         (_req, _res, next) => next(),
  requireProjectAccess: () => (_req, _res, next) => next(),
}));

jest.mock('../../lib/data', () => ({
  readReadings:       jest.fn(() => []),
  writeReadings:      jest.fn(),
  filterByUserId:     jest.fn((r) => r),
  appendReading:      jest.fn(),
  updateReading:      jest.fn(),
  deleteReading:      jest.fn(),
  purgeExpiredImages: jest.fn(() => ({ purged: 0 })),
  IMAGE_RETENTION_MS: 90 * 24 * 60 * 60 * 1000,
  DATA_DIR:           '/tmp/bptracker-test',
  IMAGES_DIR:         '/tmp/bptracker-test/images',
}));

const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

const request = require('supertest');
const express = require('express');

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.session = { user }; next(); });
  app.use('/bptracker', require('../../server'));
  return app;
}

function mockGeminiResponse(jsonPayload) {
  return { response: { text: () => JSON.stringify(jsonPayload) } };
}

beforeEach(() => {
  jest.clearAllMocks();
});

const validBody = { imageData: 'base64encodedstring', mediaType: 'image/jpeg' };
const guestUser = { id: 'user-001', role: 'guest' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /bptracker/api/extract', () => {
  test('returns extracted values for a high-confidence response', async () => {
    mockGenerateContent.mockResolvedValue(
      mockGeminiResponse({ systolic: 122, diastolic: 78, heartRate: 64, confidence: 'high' })
    );

    const res = await request(buildApp(guestUser))
      .post('/bptracker/api/extract')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.systolic).toBe(122);
    expect(res.body.diastolic).toBe(78);
    expect(res.body.heartRate).toBe(64);
    expect(res.body.confidence).toBe('high');
  });

  test('propagates low confidence to client', async () => {
    mockGenerateContent.mockResolvedValue(
      mockGeminiResponse({ systolic: 130, diastolic: 85, heartRate: 70, confidence: 'low' })
    );

    const res = await request(buildApp(guestUser))
      .post('/bptracker/api/extract')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe('low');
  });

  test('overrides confidence to low when a value is outside plausible range', async () => {
    mockGenerateContent.mockResolvedValue(
      mockGeminiResponse({ systolic: 999, diastolic: 78, heartRate: 64, confidence: 'high' })
    );

    const res = await request(buildApp(guestUser))
      .post('/bptracker/api/extract')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe('low');
    expect(res.body.systolic).toBe(999);
  });

  test('returns 422 image_unreadable when all values are null', async () => {
    mockGenerateContent.mockResolvedValue(
      mockGeminiResponse({ systolic: null, diastolic: null, heartRate: null, confidence: 'low' })
    );

    const res = await request(buildApp(guestUser))
      .post('/bptracker/api/extract')
      .send(validBody);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('image_unreadable');
  });

  test('returns 502 extraction_failed when Gemini API throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Network error'));

    const res = await request(buildApp(guestUser))
      .post('/bptracker/api/extract')
      .send(validBody);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('extraction_failed');
  });

  test('returns 502 extraction_failed when Gemini returns unparseable output', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Sorry, I cannot read this image.' },
    });

    const res = await request(buildApp(guestUser))
      .post('/bptracker/api/extract')
      .send(validBody);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('extraction_failed');
  });

  test('returns 400 when imageData is missing', async () => {
    const res = await request(buildApp(guestUser))
      .post('/bptracker/api/extract')
      .send({});

    expect(res.status).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
