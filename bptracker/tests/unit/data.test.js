'use strict';

/**
 * data.test.js — unit tests for bptracker/lib/data.js
 *
 * Strategy: mock the `fs` module so all file I/O is intercepted.
 *
 * Jest hoists jest.mock() before any variable declarations, so the mock
 * factory cannot reference external variables. The mock functions are
 * defined inline and retrieved via require('fs') after the mock is set up.
 */

const path = require('path');

jest.mock('fs', () => ({
  existsSync:   jest.fn(),
  readFileSync:  jest.fn(),
  writeFileSync: jest.fn(),
  copyFileSync:  jest.fn(),
  unlinkSync:    jest.fn(),
  mkdirSync:     jest.fn(),
}));

// Retrieve the mocked fs so tests can configure return values
const fs = require('fs');

// Load the module under test after the mock is in place
const data = require('../../lib/data');

// Derive the paths data.js uses internally so assertions are exact
const DATA_DIR    = data.DATA_DIR;
const runtimePath  = path.join(DATA_DIR, 'readings.json');
const templatePath = path.join(DATA_DIR, 'readings.template.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReading(overrides = {}) {
  return {
    id:                   'test-uuid-001',
    userId:               'user-001',
    systolic:             120,
    diastolic:            80,
    heartRate:            70,
    timestamp:            '2026-03-16T08:00:00',
    imageRef:             null,
    extractionConfidence: 'high',
    notes:                null,
    createdAt:            new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// readReadings
// ---------------------------------------------------------------------------

describe('readReadings()', () => {
  test('returns empty array when runtime file does not exist (seeds from template)', () => {
    fs.existsSync
      .mockReturnValueOnce(false)  // runtime file does not exist
      .mockReturnValueOnce(true);  // template file exists
    fs.readFileSync.mockReturnValue('[]');

    const result = data.readReadings();

    expect(result).toEqual([]);
    expect(fs.copyFileSync).toHaveBeenCalledWith(templatePath, runtimePath);
    expect(fs.readFileSync).toHaveBeenCalledWith(runtimePath, 'utf8');
  });

  test('returns parsed array when runtime file exists', () => {
    const reading = makeReading();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([reading]));

    const result = data.readReadings();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test-uuid-001');
  });

  test('throws if neither runtime nor template file exists', () => {
    fs.existsSync.mockReturnValue(false);

    expect(() => data.readReadings()).toThrow('[data.js] Template not found');
  });
});

// ---------------------------------------------------------------------------
// writeReadings
// ---------------------------------------------------------------------------

describe('writeReadings()', () => {
  test('persists data to readings.json', () => {
    const readings = [makeReading()];
    data.writeReadings(readings);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      runtimePath,
      JSON.stringify(readings, null, 2),
      'utf8'
    );
  });

  test('overwrites existing file with new data', () => {
    data.writeReadings([makeReading({ id: 'r1' })]);
    data.writeReadings([makeReading({ id: 'r2' })]);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    const lastCall = fs.writeFileSync.mock.calls[1];
    const written = JSON.parse(lastCall[1]);
    expect(written[0].id).toBe('r2');
  });
});

// ---------------------------------------------------------------------------
// filterByUserId
// ---------------------------------------------------------------------------

describe('filterByUserId()', () => {
  const readings = [
    makeReading({ id: 'r1', userId: 'user-001' }),
    makeReading({ id: 'r2', userId: 'user-002' }),
    makeReading({ id: 'r3', userId: 'user-001' }),
  ];

  test('returns only matching records for guest role', () => {
    const result = data.filterByUserId(readings, 'user-001', 'guest');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.userId === 'user-001')).toBe(true);
  });

  test('returns all records for admin role', () => {
    const result = data.filterByUserId(readings, 'user-001', 'admin');
    expect(result).toHaveLength(3);
  });

  test('returns empty array when guest has no matching records', () => {
    const result = data.filterByUserId(readings, 'user-999', 'guest');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// appendReading
// ---------------------------------------------------------------------------

describe('appendReading()', () => {
  test('adds record and returns updated array', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('[]');

    const reading = makeReading({ id: 'r1' });
    const result = data.appendReading(reading);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  test('appends to existing records without overwriting', () => {
    const existing = makeReading({ id: 'r1' });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([existing]));

    const result = data.appendReading(makeReading({ id: 'r2' }));

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});

// ---------------------------------------------------------------------------
// updateReading
// ---------------------------------------------------------------------------

describe('updateReading()', () => {
  test('updates matching record and returns it', () => {
    const reading = makeReading({ id: 'r1', notes: null });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([reading]));

    const updated = data.updateReading('r1', { notes: 'felt dizzy' });

    expect(updated.notes).toBe('felt dizzy');
    expect(updated.id).toBe('r1');
  });

  test('only merges provided fields — other fields preserved', () => {
    const reading = makeReading({ id: 'r1', systolic: 120, notes: null });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([reading]));

    data.updateReading('r1', { notes: 'test' });

    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written[0].systolic).toBe(120);
  });

  test('returns null when id not found', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('[]');

    const result = data.updateReading('nonexistent', { notes: 'x' });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteReading
// ---------------------------------------------------------------------------

describe('deleteReading()', () => {
  test('removes matching record and returns true', () => {
    const readings = [makeReading({ id: 'r1' }), makeReading({ id: 'r2' })];
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(readings));

    const result = data.deleteReading('r1');

    expect(result).toBe(true);
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written).toHaveLength(1);
    expect(written[0].id).toBe('r2');
  });

  test('returns false when id not found', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([makeReading({ id: 'r1' })]));

    const result = data.deleteReading('nonexistent');
    expect(result).toBe(false);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// purgeExpiredImages
// ---------------------------------------------------------------------------

describe('purgeExpiredImages()', () => {
  test('returns { purged: 0 } when images directory does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    const result = data.purgeExpiredImages();
    expect(result).toEqual({ purged: 0 });
  });

  test('returns { purged: 0 } when no readings have imageRef set', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([makeReading({ imageRef: null })]));

    const result = data.purgeExpiredImages();
    expect(result).toEqual({ purged: 0 });
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  test('does not purge image within retention window', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([
      makeReading({ imageRef: 'images/recent.jpg', createdAt: new Date().toISOString() }),
    ]));

    const result = data.purgeExpiredImages();
    expect(result).toEqual({ purged: 0 });
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  test('purges expired image file and nulls imageRef on reading', () => {
    const expiredDate = new Date(Date.now() - data.IMAGE_RETENTION_MS - 1000).toISOString();
    const reading = makeReading({ id: 'r1', imageRef: 'images/old.jpg', createdAt: expiredDate });
    const imgPath = path.join(DATA_DIR, 'images/old.jpg');

    fs.existsSync
      .mockReturnValueOnce(true)   // IMAGES_DIR exists
      .mockReturnValueOnce(true)   // runtime readings.json exists
      .mockReturnValueOnce(true);  // image file exists
    fs.readFileSync.mockReturnValue(JSON.stringify([reading]));

    const result = data.purgeExpiredImages();

    expect(result).toEqual({ purged: 1 });
    expect(fs.unlinkSync).toHaveBeenCalledWith(imgPath);
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written[0].imageRef).toBeNull();
  });

  test('skips unlink if image file is already missing but still nulls imageRef (idempotent)', () => {
    const expiredDate = new Date(Date.now() - data.IMAGE_RETENTION_MS - 1000).toISOString();
    const reading = makeReading({ id: 'r1', imageRef: 'images/gone.jpg', createdAt: expiredDate });

    fs.existsSync
      .mockReturnValueOnce(true)    // IMAGES_DIR exists
      .mockReturnValueOnce(true)    // runtime readings.json exists
      .mockReturnValueOnce(false);  // image file does not exist
    fs.readFileSync.mockReturnValue(JSON.stringify([reading]));

    const result = data.purgeExpiredImages();

    expect(result).toEqual({ purged: 0 });
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(written[0].imageRef).toBeNull();
  });

  test('only writes readings to disk if at least one record was modified', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify([makeReading({ imageRef: null })]));

    data.purgeExpiredImages();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
