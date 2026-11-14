import { expect, test } from '@playwright/test';

test.describe('Gate 1 landing page', () => {
  test('states the value proposition and no-upload guarantee', async ({ page }) => {
    const response = await page.goto('/awal/');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Enkripsi berkas sensitif di browser'
    );
    await expect(
      page.getByRole('heading', { name: 'Tiga langkah, tanpa unggahan' })
    ).toBeVisible();
    await expect(page.getByText('AegisCrypt belum diaudit pihak independen')).toBeVisible();
  });

  test('menyediakan tautan form masukan dan tautan masuk ke aplikasi', async ({ page }) => {
    await page.goto('/awal/');

    const form = page.getByRole('link', { name: 'Isi form masukan' }).first();
    await expect(form).toHaveAttribute('href', '/awal/masukan/');

    await expect(page.getByRole('link', { name: 'Coba versi sekarang' })).toHaveAttribute(
      'href',
      '/'
    );
  });

  test('links to the published specification and security notes', async ({ page }) => {
    await page.goto('/awal/');

    await expect(page.getByRole('link', { name: 'Baca format v3' })).toHaveAttribute(
      'href',
      'https://docs.aegiscrypt.bangkah.tech/format-file'
    );
    await expect(page.getByRole('link', { name: 'Lihat arsitektur' })).toHaveAttribute(
      'href',
      'https://docs.aegiscrypt.bangkah.tech/arsitektur'
    );
    await expect(page.getByRole('link', { name: 'Catatan keamanan' })).toHaveAttribute(
      'href',
      'https://docs.aegiscrypt.bangkah.tech/keamanan'
    );
  });

  test('stays out of search results while the brand is unconfirmed', async ({ page }) => {
    await page.goto('/awal/');

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  test('loads without console errors or inline resources', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/awal/');
    await expect(page.locator('body')).toBeVisible();

    expect(errors).toEqual([]);
    expect(await page.locator('[style]').count()).toBe(0);
    expect(await page.locator('script').count()).toBe(0);
  });
});
