import { test, expect } from '@playwright/test';

test.describe('Questions', () => {
  // ── Smoke check ─────────────────────────────────────────────────────────────
  // Confirms the page loads and the questions form is usable.
  // The add form renders regardless of API state, so it's a reliable load indicator.
  test('page loads with question form visible', async ({ page }) => {
    await page.goto('/trackmyweek/questions');
    await expect(page.getByTestId('new-question-input')).toBeVisible();
  });

  // ── Critical flow ────────────────────────────────────────────────────────────
  // Full round-trip: fill form → POST to API → question appears in unanswered list.
  test('adding a new question persists and appears in list', async ({ page, request }) => {
    await page.goto('/trackmyweek/questions');
    const input = page.getByTestId('new-question-input');
    await input.fill('E2E test question?');
    await page.getByTestId('add-question-btn').click();
    await expect(input).toHaveValue('', { timeout: 5000 });
    await expect(page.getByText('E2E test question?')).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    // Clean up any question created during the test run.
    try {
      const res = await request.get('/trackmyweek/api/questions');
      if (!res.ok()) return;
      const questions = await res.json();
      const target = questions.find((q) => q.question === 'E2E test question?');
      if (target) await request.delete(`/trackmyweek/api/questions/${target.id}`);
    } catch {
      // Best-effort — do not fail the test if cleanup fails
    }
  });
});
