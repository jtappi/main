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

// Warn loudly on startup if the API key is missing so the problem is
// immediately visible in pm2 logs rather than discovered on the first request.
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[bptracker/extract] WARNING: ANTHROPIC_API_KEY is not set. ' +
    'All extraction requests will fail. Add it to .env and restart.');
} else {
  console.log('[bptracker/extract] ANTHROPIC_API_KEY is present (' +
    process.env.ANTHROPIC_API_KEY.slice(0, 10) + '...)');
}

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

  console.log('[bptracker/extract] POST /api/extract called');
  console.log('[bptracker/extract]   mediaType:', mediaType || 'not provided');
  console.log('[bptracker/extract]   imageData length:', imageData ? imageData.length : 0);
  console.log('[bptracker/extract]   API key present:', !!process.env.ANTHROPIC_API_KEY);

  if (!imageData) {
    console.error('[bptracker/extract] Missing imageData in request body');
    return res.status(400).json({ error: 'imageData is required.' });
  }

  const client = new Anthropic();

  let rawText;
  try {
    console.log('[bptracker/extract] Calling Anthropic API...');
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
    console.log('[bptracker/extract] Anthropic response received, rawText:', rawText);
  } catch (err) {
    console.error('[bptracker/extract] Anthropic API error:');
    console.error('  message:', err.message);
    console.error('  status:', err.status);
    console.error('  error type:', err.error?.type);
    console.error('  error detail:', JSON.stringify(err.error));
    console.error('  stack:', err.stack);
    return res.status(502).json({ error: 'extraction_failed', message: 'Extraction service unavailable.' });
  }

  const parsed = parseClaudeResponse(rawText);
  if (!parsed) {
    console.error('[bptracker/extract] Failed to parse Claude response:', rawText);
    return res.status(502).json({ error: 'extraction_failed', message: 'Extraction service returned an unreadable response.' });
  }

  const validated = validateRanges(parsed);
  console.log('[bptracker/extract] Validated result:', JSON.stringify(validated));

  if (validated.systolic === null && validated.diastolic === null && validated.heartRate === null) {
    console.error('[bptracker/extract] All values null — image unreadable');
    return res.status(422).json({ error: 'image_unreadable', message: 'Could not read the monitor display. Please retake in better light.' });
  }

  console.log('[bptracker/extract] Success — returning extracted values');
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
