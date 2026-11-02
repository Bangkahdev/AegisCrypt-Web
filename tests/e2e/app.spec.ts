import { expect, test } from '@playwright/test';

test.describe('AegisCrypt user journey', () => {
  test('starts a password session and exposes the processing workspace', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'AegisCrypt' })).toBeVisible();
    await page.getByPlaceholder('Enter encryption password').fill('BlackboxPassword123!');
    await page.getByRole('button', { name: 'Start Session' }).click();

    await expect(page.getByText('Processing Queue')).toBeVisible();
    await expect(page.getByText('Encrypt')).toBeVisible();
    await expect(page.getByText('Decrypt')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('requires a password before starting a session', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Start Session' })).toBeDisabled();
    await expect(page.getByText('Password required')).toBeVisible();
  });
});
