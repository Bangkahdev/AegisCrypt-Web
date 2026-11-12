import { expect, test } from '@playwright/test';

test.describe('progressive web app and accessibility', () => {
  test('publishes install metadata and an active service worker', async ({ page, request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();
    expect(manifest.name).toContain('AegisCrypt');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');

    await page.goto('/');
    const active = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000));
      const ready = navigator.serviceWorker.ready.then((registration) =>
        Boolean(registration.active),
      );
      return Promise.race([ready, timeout]);
    });
    expect(active).toBe(true);
  });

  test('supports keyboard skip link and dialog focus management', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to main content' }),
    ).toBeFocused();

    await page.getByPlaceholder('Enter encryption password').fill('A11yPassword123!');
    await page.getByRole('button', { name: 'Start Session' }).click();

    const changePassword = page.getByRole('button', { name: 'Change password' });
    await changePassword.click();

    const newPassword = page.getByLabel('New password', { exact: true });
    await expect(newPassword).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(changePassword).toBeFocused();
  });
});
