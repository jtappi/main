'use strict';

/**
 * extract.controller.js — Claude Vision image extraction.
 *
 * POST /api/extract
 *
 * Accepts a base64-encoded image, calls the Anthropic API, parses and
 * validates the response, and returns a structured extraction result.
 *
 * This endpoint NEVER saves data. It only returns extracted values for
 * the client to review before saving via POST /api/readings.
 *
 * The ANTHROPIC_API_KEY is read from process.env — never hardcoded.
 * The raw Claude response is never forwarded to the client.
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

/** Plausible BP/HR ranges for server-side validation. */
const RANGES = {
  systolic:  { min: 60,  max: 250 },
  diastolic: { min: 40,  max: 150 },
  heartRate: { min: 30,  max: 200 },
};

const EXTRACTION_PROMPT = `You are a medical data extraction assistant. You will be given an image of a blood pressure monitor display.

Extract exactly these three values:
1. Systolic pressure (the top/larger number, mmHg)
2. Diastolic pressure (the bottom/smaller number, mmHg)
3. Heart rate / pulse (beats per minute)

Respond ONLY with a JSON object in this exact format, nothing else:
{
  "systolic": <integer or null>,
  "diastolic": <integer or null>,
  "heartRate": <integer or null>,
  "confidence": "high" | "low"
}

Use "high" confidence when all three values are clearly readable.
Use "low" confidence when the image is blurry, partially obscured, or any value is uncertain.
Use null for any individual value you cannot read with confidence.`;

/**
 * Parse the raw text response from Claude into a structured object.
 * Returns null if the response cannot be parsed as valid JSON.
 *
 * @param {string} text
 * @returns {{ systolic: number|null, diastolic: number|null, heartRate: number|null, confidence: string }|null}
 */
function parseClaudeResponse(text) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Validate extracted values against plausible ranges.
 * If any non-null value is outside its range, override confidence to 'low'.
 *
 * @param {{ systolic, diastolic, heartRate, confidence }} data
 * @returns {{ systolic, diastolic, heartRate, confidence }}
 */
function validateRanges(data) {
  const result = { ...data };
  const fields = ['systolic', 'diastolic', 'heartRate'];
  for (const field of fields) {
    const val = result[field];
    if (val === null) continue;
    const { min, max } = RANGES[field];
    if (val < min || val > max) {
      result.confidence = 'low';
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// POST /api/extract
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { imageData, mediaType } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: 'imageData is required.' });
  }

  const client = new Anthropic();

  let rawText;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageData,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });
    rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
  } catch (err) {
    console.error('[extract] Anthropic API error:', err.message);
    return res.status(502).json({ error: 'extraction_failed', message: 'Extraction service unavailable.' });
  }

  const parsed = parseClaudeResponse(rawText);
  if (!parsed) {
    console.error('[extract] Failed to parse Claude response:', rawText);
    return res.status(502).json({ error: 'extraction_failed', message: 'Extraction service returned an unreadable response.' });
  }

  const validated = validateRanges(parsed);

  if (validated.systolic === null && validated.diastolic === null && validated.heartRate === null) {
    return res.status(422).json({ error: 'image_unreadable', message: 'Could not read the monitor display. Please retake in better light.' });
  }

  res.json({
    systolic:   validated.systolic,
    diastolic:  validated.diastolic,
    heartRate:  validated.heartRate,
    confidence: validated.confidence,
  });
});

module.exports = router;
module.exports.parseClaudeResponse = parseClaudeResponse;
module.exports.validateRanges = validateRanges;
