import { test, expect } from '@playwright/test';

test.describe('Questions page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trackmyweek/questions');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Questions' })).toBeVisible();
  });

  test('add question form is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="new-question-input"]')).toBeVisible();
  });

  test('can add a new question', async ({ page }) => {
    const input = page.locator('[data-testid="new-question-input"]');
    await input.fill('What did I learn today?');
    await page.locator('[data-testid="add-question-btn"]').click();

    // Input clears on success
    await expect(input).toHaveValue('', { timeout: 5000 });

    // Question appears in the unanswered column
    await expect(page.getByText('What did I learn today?')).toBeVisible();
  });

  test('Enter key submits the question', async ({ page }) => {
    const input = page.locator('[data-testid="new-question-input"]');
    await input.fill('Keyboard submit test?');
    await input.press('Enter');
    await expect(input).toHaveValue('', { timeout: 5000 });
  });

  test('answer button appears on hover', async ({ page }) => {
    // Add a question first
    const input = page.locator('[data-testid="new-question-input"]');
    await input.fill('Do I see the answer button?');
    await page.locator('[data-testid="add-question-btn"]').click();

    // Hover the card
    const card = page.locator('[data-testid^="q-card-"]').first();
    await card.hover();
    await expect(card.locator('[data-testid^="answer-btn-"]')).toBeVisible();
  });
});
