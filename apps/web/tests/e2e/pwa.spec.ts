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

  test('boots a cold start from cache while offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));

    const readCachedPaths = () =>
      page.evaluate(async () => {
        const paths: string[] = [];
        for (const key of await caches.keys()) {
          const cache = await caches.open(key);
          for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
        }
        return paths;
      });

    await expect
      .poll(
        async () => {
          const paths = await readCachedPaths();
          return (
            paths.some((path) => /^\/assets\/index-.*\.js$/.test(path)) &&
            paths.some((path) => /^\/assets\/.*\.css$/.test(path)) &&
            paths.some((path) => /^\/assets\/cryptoWorker-.*\.js$/.test(path))
          );
        },
        { timeout: 20000 },
      )
      .toBe(true);

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByPlaceholder('Enter encryption password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Start Session' })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
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

  test('serves a JSON precache manifest for the app shell', async ({ request }) => {
    const manifestResponse = await request.get('/precache-manifest.json');
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()['content-type']).toContain('application/json');
    const manifest = await manifestResponse.json();
    expect(Array.isArray(manifest.assets)).toBe(true);
    expect(manifest.assets).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\/assets\/index-.*\.js$/)])
    );
    expect(manifest.assets).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\/assets\/cryptoWorker-.*\.js$/)])
    );
  });
});
