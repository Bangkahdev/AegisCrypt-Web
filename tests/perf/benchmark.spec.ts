import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const SIZE_MB = 16;
const SIZE_BYTES = SIZE_MB * 1024 * 1024;

const makePayload = (): Buffer => {
  const buffer = Buffer.alloc(SIZE_BYTES);
  for (let i = 0; i < buffer.length; i++) buffer[i] = (i * 31 + 7) & 0xff;
  return buffer;
};

test('reports encrypt and decrypt throughput', async ({ page }, testInfo) => {
  const original = makePayload();

  await page.goto('/');
  await page.getByPlaceholder('Enter encryption password').fill('BenchmarkPassword123!');
  await page.getByRole('button', { name: 'Start Session' }).click();

  await page.locator('input[type=file]').first().setInputFiles({
    name: 'benchmark.bin',
    mimeType: 'application/octet-stream',
    buffer: original,
  });

  const encryptedPath = testInfo.outputPath('benchmark.bin.aegis');
  const encryptStart = performance.now();
  const [encryptDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Encrypt', { exact: true }).click(),
  ]);
  await encryptDownload.saveAs(encryptedPath);
  const encryptSeconds = (performance.now() - encryptStart) / 1000;

  const encrypted = await readFile(encryptedPath);
  expect(encrypted.length).toBeGreaterThan(SIZE_BYTES);

  await page.locator('input[type=file]').first().setInputFiles(encryptedPath);

  const decryptedPath = testInfo.outputPath('benchmark.decrypted.bin');
  const decryptStart = performance.now();
  const [decryptDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Decrypt', { exact: true }).click(),
  ]);
  await decryptDownload.saveAs(decryptedPath);
  const decryptSeconds = (performance.now() - decryptStart) / 1000;

  expect(decryptDownload.suggestedFilename()).toBe('benchmark.bin');

  const decrypted = await readFile(decryptedPath);
  expect(decrypted.length).toBe(SIZE_BYTES);

  const encryptMbps = SIZE_MB / encryptSeconds;
  const decryptMbps = SIZE_MB / decryptSeconds;

  console.log(
    `[benchmark] ${SIZE_MB} MiB | encrypt ${encryptMbps.toFixed(1)} MB/s in ${encryptSeconds.toFixed(2)}s | ` +
      `decrypt ${decryptMbps.toFixed(1)} MB/s in ${decryptSeconds.toFixed(2)}s ` +
      `(includes PBKDF2 600k and browser download)`,
  );
});
