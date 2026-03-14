import { test, expect } from '@playwright/test';

test.describe('View Data', () => {
  // ── Smoke check ─────────────────────────────────────────────────────────────
  // Confirms the page loads and the day chart (which calls the entries API) renders.
  test('page loads with day chart visible', async ({ page }) => {
    await page.goto('/trackmyweek/view');
    await expect(page.getByRole('heading', { name: 'View Data' })).toBeVisible();
    await expect(page.getByTestId('day-chart')).toBeVisible();
    await expect(page.getByTestId('filter-bar')).toBeVisible();
  });
});

test.describe('View Data — timestamp inline edit', () => {
  // ── Critical flow ────────────────────────────────────────────────────────────
  // Verifies the timezone fix: editing a timestamp must not shift the stored UTC value.

  let entryId;
  // A fixed UTC timestamp we can reason about regardless of the CI runner timezone.
  // 2026-03-14T21:00:00.000Z = 5:00 PM EDT / 3:00 PM MDT / 2:00 PM PDT
  const SEED_UTC = '2026-03-14T21:00:00.000Z';

  test.beforeEach(async ({ request, page }) => {
    const res = await request.post('/trackmyweek/api/entries', {
      data: { text: 'E2E tz test entry', category: 'Health', notes: '' },
    });
    expect(res.ok()).toBeTruthy();
    const entry = await res.json();
    entryId = entry.id;
    const patch = await request.put(`/trackmyweek/api/entries/${entryId}`, {
      data: { timestamp: SEED_UTC },
    });
    expect(patch.ok()).toBeTruthy();
    await page.goto('/trackmyweek/view');
  });

  test.afterEach(async ({ request }) => {
    if (entryId) await request.delete(`/trackmyweek/api/entries/${entryId}`);
  });

  test('timestamp cell displays local time, not raw UTC', async ({ page }) => {
    const cell = page.locator(`[data-testid="cell-timestamp-${entryId}"]`);
    await expect(cell).toBeVisible();
    const text = await cell.textContent();
    expect(text).not.toContain('Z');
    expect(text).not.toContain('000Z');
  });

  test('editing timestamp input shows local time and round-trips to correct UTC', async ({ page }) => {
    const cell = page.locator(`[data-testid="cell-timestamp-${entryId}"]`);
    await cell.click();
    const input = page.locator('input[type="datetime-local"]');
    await expect(input).toBeVisible();
    const inputValue = await input.inputValue();
    expect(inputValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const parsedMs   = new Date(inputValue).getTime();
    const expectedMs = new Date(SEED_UTC).getTime();
    expect(Math.abs(parsedMs - expectedMs)).toBeLessThan(60 * 1000);
  });

  test('cancelling edit does not alter stored timestamp', async ({ page, request }) => {
    const cell = page.locator(`[data-testid="cell-timestamp-${entryId}"]`);
    await cell.click();
    await page.locator('input[type="datetime-local"]').press('Escape');
    const res   = await request.get('/trackmyweek/api/entries');
    const data  = await res.json();
    const entry = data.find((e) => e.id === entryId);
    expect(entry.timestamp).toBe(SEED_UTC);
  });
});
