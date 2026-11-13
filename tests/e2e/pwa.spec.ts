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

  test('serves a strict content security policy without violations', async ({ page, request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    const csp = headers['content-security-policy'] ?? '';

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');

    const violations: string[] = [];
    await page.exposeFunction('recordCspViolation', (value: string) => {
      violations.push(value);
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        const report = (window as Window & { recordCspViolation?: (value: string) => void })
          .recordCspViolation;
        report?.(`${event.violatedDirective} ${event.blockedURI}`);
      });
    });

    await page.goto('/');
    await expect(page.getByPlaceholder('Enter encryption password')).toBeVisible();
    expect(violations).toEqual([]);
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
