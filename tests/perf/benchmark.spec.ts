import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { WriteStream, createWriteStream } from 'node:fs';
import { test, expect } from '@playwright/test';

const SIZE_MB = Number(process.env.BENCH_SIZE_MB ?? 16);
const CHUNK_BYTES = 1024 * 1024;

if (!Number.isInteger(SIZE_MB) || SIZE_MB < 1) {
  throw new Error('BENCH_SIZE_MB must be a positive integer');
}

const writeChunk = (stream: WriteStream, chunk: Buffer): Promise<void> =>
  new Promise((resolve, reject) => {
    stream.write(chunk, (error) => (error ? reject(error) : resolve()));
  });

const writePayload = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');
  const stream = createWriteStream(filePath);

  for (let index = 0; index < SIZE_MB; index++) {
    const chunk = Buffer.alloc(CHUNK_BYTES);
    chunk.fill((index * 31 + 7) & 0xff);
    chunk.writeUInt32BE(index, 0);
    hash.update(chunk);
    await writeChunk(stream, chunk);
  }

  await new Promise<void>((resolve, reject) => {
    stream.on('error', reject);
    stream.end(resolve);
  });

  return hash.digest('hex');
};

const sha256File = (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(filePath)
      .on('data', (data) => hash.update(data))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });

const gib = (bytes: number): string => (bytes / 1024 ** 3).toFixed(2);

test('reports encrypt and decrypt throughput', async ({ page }, testInfo) => {
  test.setTimeout(600_000);

  page.on('console', (message) => {
    if (message.type() === 'error') console.log('[page]', message.text());
  });
  page.on('pageerror', (error) => console.log('[pageerror]', error.message));

  const inputPath = testInfo.outputPath('benchmark-input.bin');
  const inputHash = await writePayload(inputPath);

  await page.goto('/');
  await page.getByPlaceholder('Enter encryption password').fill('BenchmarkPassword123!');
  await page.getByRole('button', { name: 'Start Session' }).click();

  const estimate = await page.evaluate(async () => {
    if (!navigator.storage?.estimate) return null;
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    return { quota, usage };
  });
  if (estimate) {
    console.log(
      `[benchmark] storage quota ${gib(estimate.quota)} GiB, usage ${gib(estimate.usage)} GiB`,
    );
  }

  const fileInput = page.locator('input[type=file]').first();
  await fileInput.setInputFiles(inputPath);

  const encryptedPath = testInfo.outputPath('benchmark-input.bin.aegis');
  const encryptStart = performance.now();
  const [encryptDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Encrypt', { exact: true }).click(),
  ]);
  await encryptDownload.saveAs(encryptedPath);
  const encryptSeconds = (performance.now() - encryptStart) / 1000;

  const [plainStat, encryptedStat] = await Promise.all([stat(inputPath), stat(encryptedPath)]);
  expect(encryptedStat.size).toBeGreaterThan(plainStat.size);

  await fileInput.setInputFiles(encryptedPath);

  const quotaNotice = page.getByText(/not have enough storage|Penyimpanan browser tidak cukup/i);
  const decryptedPath = testInfo.outputPath('benchmark-decrypted.bin');
  const decryptStart = performance.now();
  let decryptDownload;

  try {
    [decryptDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      page.getByText('Decrypt', { exact: true }).click(),
    ]);
  } catch (error) {
    if ((await quotaNotice.count()) > 0) {
      throw new Error(
        `Browser storage quota reached while decrypting ${SIZE_MB} MiB. Peak usage is roughly twice the ` +
          'file size because the previous OPFS temp file is still inside its cleanup window. ' +
          'Lower BENCH_SIZE_MB or free disk space.',
        { cause: error },
      );
    }
    throw error;
  }

  await decryptDownload.saveAs(decryptedPath);
  const decryptSeconds = (performance.now() - decryptStart) / 1000;

  expect(decryptDownload.suggestedFilename()).toBe('benchmark-input.bin');
  expect(await sha256File(decryptedPath)).toBe(inputHash);

  const encryptMbps = SIZE_MB / encryptSeconds;
  const decryptMbps = SIZE_MB / decryptSeconds;

  console.log(
    `[benchmark] ${SIZE_MB} MiB | encrypt ${encryptMbps.toFixed(1)} MB/s in ${encryptSeconds.toFixed(2)}s | ` +
      `decrypt ${decryptMbps.toFixed(1)} MB/s in ${decryptSeconds.toFixed(2)}s ` +
      `(includes PBKDF2 600k and browser download)`,
  );
});
