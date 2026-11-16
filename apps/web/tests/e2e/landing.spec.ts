import { expect, test } from '@playwright/test';

const TALLY = 'https://tally.so/r/Ar2XOk';

test.describe('Gate 1 landing pages', () => {
  test('EN landing states value prop, no-upload, and disclaimer', async ({ page }) => {
    const response = await page.goto('/awal/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Encrypt sensitive files in your browser'
    );
    await expect(page.getByRole('heading', { name: 'Three steps, no upload' })).toBeVisible();
    await expect(page.locator('.hero .fine-print')).toContainText(
      'AegisCrypt has not been independently audited'
    );
  });

  test('ID landing states value prop, no-upload, and disclaimer', async ({ page }) => {
    const response = await page.goto('/awal/id/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Enkripsi berkas sensitif di browser'
    );
    await expect(page.getByRole('heading', { name: 'Tiga langkah, tanpa unggahan' })).toBeVisible();
    await expect(page.locator('.hero .fine-print')).toContainText(
      'AegisCrypt belum diaudit pihak independen'
    );
  });

  test('EN and ID link to the same Tally form and language alternates', async ({ page }) => {
    await page.goto('/awal/');
    await expect(page.getByRole('link', { name: 'Give feedback' }).first()).toHaveAttribute('href', TALLY);
    await expect(page.getByRole('link', { name: 'Try the app now' })).toHaveAttribute('href', '/');
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', 'https://aegiscrypt.bangkah.tech/awal/');
    await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveAttribute('href', 'https://aegiscrypt.bangkah.tech/awal/id/');
    await expect(page.locator('.lang-switch a[aria-current="page"]')).toHaveAttribute('href', '/awal/');

    await page.goto('/awal/id/');
    await expect(page.getByRole('link', { name: 'Isi form masukan' }).first()).toHaveAttribute('href', TALLY);
    await expect(page.locator('.lang-switch a[aria-current="page"]')).toHaveAttribute('href', '/awal/id/');
  });

  test('links to published docs', async ({ page }) => {
    await page.goto('/awal/');
    await expect(page.getByRole('link', { name: 'Read the v3 format' })).toHaveAttribute('href', 'https://docs.aegiscrypt.bangkah.tech/format-file');
    await expect(page.getByRole('link', { name: 'See architecture' })).toHaveAttribute('href', 'https://docs.aegiscrypt.bangkah.tech/arsitektur');
    await expect(page.getByRole('link', { name: 'Security notes' })).toHaveAttribute('href', 'https://docs.aegiscrypt.bangkah.tech/keamanan');
  });

  test('landing is indexable with no console errors or inline resources', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/awal/');
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.locator('[style]').count()).toBe(0);
    expect(await page.locator('script').count()).toBe(0);
    expect(await page.locator('meta[name="robots"]').count()).toBe(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://aegiscrypt.bangkah.tech/awal/',
    );

    await page.goto('/awal/id/');
    expect(await page.locator('meta[name="robots"]').count()).toBe(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://aegiscrypt.bangkah.tech/awal/id/',
    );

    await page.goto('/awal/feedback/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await page.goto('/awal/id/feedback/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  test('EN feedback page links to Tally with third-party note and no local form', async ({ page }) => {
    const response = await page.goto('/awal/feedback/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Give feedback' })).toHaveAttribute('href', TALLY);
    await expect(page.getByText('managed by a third-party service (Tally)')).toBeVisible();
    await expect(page.getByText('AegisCrypt has not been independently audited')).toBeVisible();
    expect(await page.locator('form').count()).toBe(0);
  });

  test('ID feedback page links to Tally with third-party note and no local form', async ({ page }) => {
    const response = await page.goto('/awal/id/feedback/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('link', { name: 'Isi form masukan' })).toHaveAttribute('href', TALLY);
    await expect(page.getByText('dikelola oleh layanan pihak ketiga (Tally)')).toBeVisible();
    await expect(page.getByText('AegisCrypt belum diaudit pihak independen')).toBeVisible();
    expect(await page.locator('form').count()).toBe(0);
  });

  test('old /awal/masukan/ redirects to localized feedback page', async ({ page }) => {
    await page.goto('/awal/masukan/');
    await expect(page).toHaveURL(/\/awal\/id\/feedback\/?$/);
  });
});
