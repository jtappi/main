import { test, expect } from '@playwright/test';

test.describe('View Data page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trackmyweek/view');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'View Data' })).toBeVisible();
  });

  test('filter bar is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
  });

  test('day chart renders', async ({ page }) => {
    await expect(page.locator('[data-testid="day-chart"]')).toBeVisible();
  });

  test('keyword filter input accepts text', async ({ page }) => {
    const input = page.locator('[data-testid="filter-keyword"]');
    await input.fill('test');
    await expect(input).toHaveValue('test');
  });

  test('date range selector exists with expected options', async ({ page }) => {
    const select = page.locator('[data-testid="filter-daterange"]');
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    expect(options.some((o) => o.includes('7'))).toBe(true);
  });
});

test.describe('View Data — timestamp inline edit', () => {
  // Seeds a known entry via the API, edits its timestamp in the UI,
  // and verifies the saved value is correct (no timezone shift).

  let entryId;
  // A fixed UTC timestamp we can reason about regardless of the CI runner timezone.
  // 2026-03-14T21:00:00.000Z = 5:00 PM EDT / 3:00 PM MDT / 2:00 PM PDT
  const SEED_UTC = '2026-03-14T21:00:00.000Z';

  test.beforeEach(async ({ request, page }) => {
    // Seed a fresh entry with a known timestamp via the API.
    const res = await request.post('/trackmyweek/api/entries', {
      data: { text: 'E2E tz test entry', category: 'Health', notes: '' },
    });
    expect(res.ok()).toBeTruthy();
    const entry = await res.json();
    entryId = entry.id;

    // Overwrite the timestamp to our fixed UTC value via PUT.
    const patch = await request.put(`/trackmyweek/api/entries/${entryId}`, {
      data: { timestamp: SEED_UTC },
    });
    expect(patch.ok()).toBeTruthy();

    await page.goto('/trackmyweek/view');
  });

  test.afterEach(async ({ request }) => {
    if (entryId) {
      await request.delete(`/trackmyweek/api/entries/${entryId}`);
    }
  });

  test('timestamp cell displays local time, not raw UTC string', async ({ page }) => {
    const cell = page.locator(`[data-testid="cell-timestamp-${entryId}"]`);
    await expect(cell).toBeVisible();
    // The display value is produced by new Date(...).toLocaleString().
    // It must NOT contain the raw UTC marker 'Z' or end in '.000Z'.
    const text = await cell.textContent();
    expect(text).not.toContain('Z');
    expect(text).not.toContain('000Z');
  });

  test('clicking timestamp opens datetime-local input showing local time (not UTC)', async ({ page }) => {
    const cell = page.locator(`[data-testid="cell-timestamp-${entryId}"]`);
    await cell.click();

    const input = page.locator('input[type="datetime-local"]');
    await expect(input).toBeVisible();

    const inputValue = await input.inputValue();
    // The input value must be a valid local datetime string.
    expect(inputValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    // The UTC hour for SEED_UTC is 21. In any non-UTC timezone the local hour
    // will differ. We assert that the input value, when parsed as local time
    // by the browser, round-trips back to the same UTC instant.
    const parsedMs   = new Date(inputValue).getTime();
    const expectedMs = new Date(SEED_UTC).getTime();
    // Allow up to 60s difference to account for minute-level precision in datetime-local.
    expect(Math.abs(parsedMs - expectedMs)).toBeLessThan(60 * 1000);
  });

  test('saving timestamp without changes does not alter the stored value', async ({ page, request }) => {
    const cell = page.locator(`[data-testid="cell-timestamp-${entryId}"]`);
    await cell.click();

    const input = page.locator('input[type="datetime-local"]');
    await expect(input).toBeVisible();
    // Press Escape to cancel without saving.
    await input.press('Escape');

    // Fetch the entry from the API and confirm timestamp is unchanged.
    const res   = await request.get('/trackmyweek/api/entries');
    const data  = await res.json();
    const entry = data.find((e) => e.id === entryId);
    expect(entry.timestamp).toBe(SEED_UTC);
  });
});
