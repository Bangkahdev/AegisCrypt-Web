import { expect, test } from '@playwright/test';

test.describe('bilingual interface', () => {
  test('switches to Indonesian and remembers the choice', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Start Session' })).toBeVisible();
    await page.getByRole('button', { name: /switch language/i }).click();

    await expect(page.getByPlaceholder('Masukkan kata sandi enkripsi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mulai Sesi' })).toBeVisible();

    await page.getByPlaceholder('Masukkan kata sandi enkripsi').fill('BahasaPassword123!');
    await page.getByRole('button', { name: 'Mulai Sesi' }).click();

    await expect(page.getByText('Antrean Pemrosesan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ganti kata sandi' })).toBeVisible();
    await expect(page.getByText('Status Operasi')).toBeVisible();

    await page.reload();

    await expect(page.getByPlaceholder('Masukkan kata sandi enkripsi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mulai Sesi' })).toBeVisible();

    await page.getByRole('button', { name: /ganti bahasa/i }).click();
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeVisible();
  });
});
