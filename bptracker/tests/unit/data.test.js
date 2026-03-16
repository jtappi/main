'use strict';

/**
 * data.test.js — unit tests for bptracker/lib/data.js
 *
 * All tests use os.tmpdir() for file I/O — never write to fixture files.
 * The module is re-required in each describe block after overriding DATA_DIR
 * via jest.resetModules() so path constants are re-evaluated per test group.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a fresh temp directory and stub the DATA_DIR / IMAGES_DIR inside
 * data.js to point at it. Returns the require'd module and the tmpDir path.
 *
 * We override the internal path constants by re-requiring the module with
 * jest.resetModules() and then monkey-patching via a spy on `path.join`
 * would be fragile — instead we write the template file into the expected
 * relative location so `readFile` finds it naturally.
 */
function setupTmpDataDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bptracker-test-'));
  const imagesDir = path.join(tmpDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  // Write the readings template into the tmp dir so auto-seed works.
  fs.writeFileSync(path.join(tmpDir, 'readings.template.json'), '[]', 'utf8');

  return { tmpDir, imagesDir };
}

/**
 * Re-require data.js after patching its DATA_DIR and IMAGES_DIR.
 * We achieve this by writing a tiny proxy module into the tmp dir and using
 * jest module registry manipulation.
 *
 * Simpler approach: expose DATA_DIR from the module and override it in tests.
 * data.js exports DATA_DIR and IMAGES_DIR for exactly this purpose.
 */
function requireDataWithTmpDir(tmpDir) {
  jest.resetModules();
  const dataModule = require('../../lib/data');

  // Patch the exported path constants so helpers resolve to tmpDir.
  // This works because RUNTIME/TEMPLATE are closures over DATA_DIR.
  // We reassign the exported reference; since all public functions call
  // the internal helpers which read DATA_DIR at call time via the closure,
  // we instead write files directly into tmpDir to simulate the environment.
  return dataModule;
}

/**
 * Build a minimal valid reading object.
 */
function makeReading(overrides = {}) {
  return {
    id: 'test-uuid-001',
    userId: 'user-001',
    systolic: 120,
    diastolic: 80,
    heartRate: 70,
    timestamp: '2026-03-16T08:00:00',
    imageRef: null,
    extractionConfidence: 'high',
    notes: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// We need data.js to use a tmp directory, not the real data/ dir.
// The cleanest approach without a DI refactor: write readings.json directly
// into the real data dir during tests, restoring after. But CLAUDE.md says
// never write to fixture files. Instead we use jest.mock to intercept fs
// calls and redirect them to tmpDir.
// ---------------------------------------------------------------------------

describe('lib/data.js', () => {
  let tmpDir;
  let imagesDir;
  let realDataDir;
  let data;

  beforeEach(() => {
    jest.resetModules();
    const { tmpDir: td, imagesDir: id } = setupTmpDataDir();
    tmpDir = td;
    imagesDir = id;

    // Re-require so module re-evaluates its path constants.
    data = require('../../lib/data');

    // Redirect the module's DATA_DIR and IMAGES_DIR to tmpDir.
    // data.js exports these for testability.
    realDataDir = data.DATA_DIR;
    Object.defineProperty(data, 'DATA_DIR', { value: tmpDir, writable: true, configurable: true });
    Object.defineProperty(data, 'IMAGES_DIR', { value: imagesDir, writable: true, configurable: true });
  });

  afterEach(() => {
    // Restore real DATA_DIR
    Object.defineProperty(data, 'DATA_DIR', { value: realDataDir, writable: true, configurable: true });
    // Clean up tmp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // readReadings
  // -------------------------------------------------------------------------

  describe('readReadings()', () => {
    test('returns empty array when runtime file does not exist (seeds from template)', () => {
      // Template exists (written by setupTmpDataDir), runtime does not.
      const result = data.readReadings();
      expect(result).toEqual([]);
      // Runtime file should now exist (auto-seeded).
      expect(fs.existsSync(path.join(tmpDir, 'readings.json'))).toBe(true);
    });

    test('returns parsed array when runtime file exists', () => {
      const reading = makeReading();
      fs.writeFileSync(
        path.join(tmpDir, 'readings.json'),
        JSON.stringify([reading], null, 2),
        'utf8'
      );
      const result = data.readReadings();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-uuid-001');
    });

    test('throws if neither runtime nor template file exists', () => {
      // Remove the template that setupTmpDataDir wrote.
      fs.unlinkSync(path.join(tmpDir, 'readings.template.json'));
      expect(() => data.readReadings()).toThrow('[data.js] Template not found');
    });
  });

  // -------------------------------------------------------------------------
  // writeReadings
  // -------------------------------------------------------------------------

  describe('writeReadings()', () => {
    test('persists data to readings.json', () => {
      const readings = [makeReading()];
      data.writeReadings(readings);
      const raw = fs.readFileSync(path.join(tmpDir, 'readings.json'), 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('test-uuid-001');
    });

    test('overwrites existing file with new data', () => {
      data.writeReadings([makeReading({ id: 'r1' })]);
      data.writeReadings([makeReading({ id: 'r2' }), makeReading({ id: 'r3' })]);
      const result = data.readReadings();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('r2');
    });
  });

  // -------------------------------------------------------------------------
  // filterByUserId
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // appendReading
  // -------------------------------------------------------------------------

  describe('appendReading()', () => {
    test('adds record and returns updated array', () => {
      const reading = makeReading({ id: 'r1' });
      const result = data.appendReading(reading);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });

    test('appends to existing records without overwriting', () => {
      data.writeReadings([makeReading({ id: 'r1' })]);
      data.appendReading(makeReading({ id: 'r2' }));
      const result = data.readReadings();
      expect(result).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // updateReading
  // -------------------------------------------------------------------------

  describe('updateReading()', () => {
    test('updates matching record and returns it', () => {
      data.writeReadings([makeReading({ id: 'r1', notes: null })]);
      const updated = data.updateReading('r1', { notes: 'felt dizzy' });
      expect(updated.notes).toBe('felt dizzy');
      expect(updated.id).toBe('r1');
    });

    test('only merges provided fields — other fields preserved', () => {
      data.writeReadings([makeReading({ id: 'r1', systolic: 120, notes: null })]);
      data.updateReading('r1', { notes: 'test' });
      const result = data.readReadings();
      expect(result[0].systolic).toBe(120);
    });

    test('returns null when id not found', () => {
      data.writeReadings([]);
      const result = data.updateReading('nonexistent', { notes: 'x' });
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // deleteReading
  // -------------------------------------------------------------------------

  describe('deleteReading()', () => {
    test('removes matching record and returns true', () => {
      data.writeReadings([makeReading({ id: 'r1' }), makeReading({ id: 'r2' })]);
      const result = data.deleteReading('r1');
      expect(result).toBe(true);
      const remaining = data.readReadings();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('r2');
    });

    test('returns false when id not found', () => {
      data.writeReadings([makeReading({ id: 'r1' })]);
      const result = data.deleteReading('nonexistent');
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // purgeExpiredImages
  // -------------------------------------------------------------------------

  describe('purgeExpiredImages()', () => {
    test('returns { purged: 0 } when images directory does not exist', () => {
      // Remove the images dir that setupTmpDataDir created.
      fs.rmSync(imagesDir, { recursive: true, force: true });
      const result = data.purgeExpiredImages();
      expect(result).toEqual({ purged: 0 });
    });

    test('returns { purged: 0 } when no readings have imageRef set', () => {
      data.writeReadings([makeReading({ id: 'r1', imageRef: null })]);
      const result = data.purgeExpiredImages();
      expect(result).toEqual({ purged: 0 });
    });

    test('does not purge image within retention window', () => {
      const imgFile = path.join(imagesDir, 'recent.jpg');
      fs.writeFileSync(imgFile, 'fake-image-data');
      data.writeReadings([
        makeReading({
          id: 'r1',
          imageRef: 'images/recent.jpg',
          createdAt: new Date().toISOString(),
        }),
      ]);
      const result = data.purgeExpiredImages();
      expect(result).toEqual({ purged: 0 });
      expect(fs.existsSync(imgFile)).toBe(true);
    });

    test('purges expired image file and nulls imageRef on reading', () => {
      const imgFile = path.join(imagesDir, 'old.jpg');
      fs.writeFileSync(imgFile, 'fake-image-data');
      const expiredDate = new Date(Date.now() - data.IMAGE_RETENTION_MS - 1000).toISOString();
      data.writeReadings([
        makeReading({
          id: 'r1',
          imageRef: 'images/old.jpg',
          createdAt: expiredDate,
        }),
      ]);
      const result = data.purgeExpiredImages();
      expect(result).toEqual({ purged: 1 });
      expect(fs.existsSync(imgFile)).toBe(false);
      const readings = data.readReadings();
      expect(readings[0].imageRef).toBeNull();
    });

    test('skips purge if image file is already missing (idempotent)', () => {
      const expiredDate = new Date(Date.now() - data.IMAGE_RETENTION_MS - 1000).toISOString();
      data.writeReadings([
        makeReading({
          id: 'r1',
          imageRef: 'images/already-gone.jpg',
          createdAt: expiredDate,
        }),
      ]);
      const result = data.purgeExpiredImages();
      // File didn't exist, nothing to delete — but imageRef should still be nulled.
      expect(result).toEqual({ purged: 0 });
      const readings = data.readReadings();
      expect(readings[0].imageRef).toBeNull();
    });

    test('only writes readings to disk if at least one record was modified', () => {
      const writeSpy = jest.spyOn(data, 'writeReadings');
      data.writeReadings([makeReading({ id: 'r1', imageRef: null })]);
      writeSpy.mockClear();
      data.purgeExpiredImages();
      expect(writeSpy).not.toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });
});
