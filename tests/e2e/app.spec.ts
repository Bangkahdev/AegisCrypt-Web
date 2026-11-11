import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

  test('encrypts and decrypts a file end to end', async ({ page }, testInfo) => {
    const original = 'AegisCrypt browser round-trip\n';
    await page.goto('/');
    await page.getByPlaceholder('Enter encryption password').fill('RoundTripPassword123!');
    await page.getByRole('button', { name: 'Start Session' }).click();

    await page.locator('input[type=file]').first().setInputFiles({
      name: 'round-trip.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(original, 'utf8'),
    });

    const encryptedPath = testInfo.outputPath('round-trip.txt.aegis');
    const [encryptedDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Encrypt', { exact: true }).click(),
    ]);
    expect(encryptedDownload.suggestedFilename()).toBe('round-trip.txt.aegis');
    await encryptedDownload.saveAs(encryptedPath);
    await expect(page.getByText('ENCRYPT Success: round-trip.txt')).toBeVisible();

    await page.locator('input[type=file]').first().setInputFiles(encryptedPath);
    const decryptedPath = testInfo.outputPath('round-trip.txt');
    const [decryptedDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Decrypt', { exact: true }).click(),
    ]);
    expect(decryptedDownload.suggestedFilename()).toBe('round-trip.txt');
    await decryptedDownload.saveAs(decryptedPath);
    await expect(page.getByText('DECRYPT Success: round-trip.txt.aegis')).toBeVisible();

    expect(await readFile(encryptedPath)).not.toEqual(Buffer.from(original, 'utf8'));
    expect((await readFile(decryptedPath)).toString('utf8')).toBe(original);
  });

  test('changes the password without re-encrypting the payload', async ({ page }, testInfo) => {
    const original = 'Rewrap keeps this payload intact.\n';
    await page.goto('/');
    await page.getByPlaceholder('Enter encryption password').fill('OldPassword123!');
    await page.getByRole('button', { name: 'Start Session' }).click();

    await page.locator('input[type=file]').first().setInputFiles({
      name: 'rewrap.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(original, 'utf8'),
    });

    const oldPath = testInfo.outputPath('rewrap.txt.aegis');
    const [oldDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Encrypt', { exact: true }).click(),
    ]);
    await oldDownload.saveAs(oldPath);
    await expect(page.getByText('ENCRYPT Success: rewrap.txt')).toBeVisible();

    await page.locator('input[type=file]').first().setInputFiles(oldPath);
    await page.getByRole('button', { name: 'Change password' }).click();
    await page.getByLabel('New password', { exact: true }).fill('NewPassword456!');
    await page.getByLabel('Confirm new password').fill('NewPassword456!');

    const rewrappedPath = testInfo.outputPath('rewrap-new.txt.aegis');
    const [rewrapDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Re-wrap files' }).click(),
    ]);
    await rewrapDownload.saveAs(rewrappedPath);
    await expect(page.getByText('Rewrap completed.', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Lock' }).click();
    await page.getByPlaceholder('Enter encryption password').fill('NewPassword456!');
    await page.getByRole('button', { name: 'Start Session' }).click();

    await page.locator('input[type=file]').first().setInputFiles(rewrappedPath);
    const decryptedPath = testInfo.outputPath('rewrap-new.txt');
    const [decryptedDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Decrypt', { exact: true }).click(),
    ]);
    expect(decryptedDownload.suggestedFilename()).toBe('rewrap.txt');
    await decryptedDownload.saveAs(decryptedPath);
    await expect(page.getByText('DECRYPT Success: rewrap-new.txt.aegis')).toBeVisible();
    expect((await readFile(decryptedPath)).toString('utf8')).toBe(original);
  });
});
