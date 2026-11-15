import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AegisError } from "../../src/services/cryptoService";

const { FakeWorker, state } = vi.hoisted(() => {
  const state = { removed: [] as string[] };

  class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    posted: unknown[] = [];
    terminated = false;

    constructor() {
      FakeWorker.instances.push(this);
    }

    postMessage(message: unknown): void {
      this.posted.push(message);
    }

    terminate(): void {
      this.terminated = true;
    }

    emit(message: unknown): void {
      this.onmessage?.({ data: message } as MessageEvent);
    }
  }

  return { FakeWorker, state };
});

vi.mock("../../src/workers/cryptoWorker?worker", () => ({ default: FakeWorker }));

import { decryptFileTask } from "../../src/services/cryptoWorkerClient";

const startDecrypt = (signal: AbortSignal) =>
  decryptFileTask(new Blob([new Uint8Array(64)]), "sandi", null, signal, () => {});

describe("crypto worker client (worker protocol)", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    state.removed.length = 0;
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: async () => ({
          removeEntry: async (name: string) => {
            state.removed.push(name);
          },
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("waits for the worker cleanup ack before reporting cancellation", async () => {
    const controller = new AbortController();
    const pending = startDecrypt(controller.signal);
    const worker = FakeWorker.instances.at(-1)!;

    worker.emit({ id: 1, type: "temp", tempName: ".aegis-tmp-abc" });
    controller.abort();

    expect(worker.posted).toContainEqual({ type: "abort", id: 1 });
    expect(worker.terminated).toBe(false);

    worker.emit({ id: 1, type: "aborted" });
    await expect(pending).rejects.toThrow(AegisError.cancelled);

    expect(worker.terminated).toBe(true);
    expect(state.removed).toContain(".aegis-tmp-abc");
  });

  it("removes the temp file when the worker finishes after the abort was requested", async () => {
    const controller = new AbortController();
    const pending = startDecrypt(controller.signal);
    const worker = FakeWorker.instances.at(-1)!;

    controller.abort();
    worker.emit({ id: 1, type: "temp", tempName: ".aegis-tmp-race" });
    worker.emit({ id: 1, type: "done", blob: new Blob([]), tempName: ".aegis-tmp-race" });

    await expect(pending).rejects.toThrow(AegisError.cancelled);
    expect(state.removed).toContain(".aegis-tmp-race");
  });

  it("rejects without waiting for cleanup when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const pending = startDecrypt(controller.signal);
    const worker = FakeWorker.instances.at(-1)!;

    await expect(pending).rejects.toThrow(AegisError.cancelled);
    expect(worker.posted).toEqual([]);
    expect(worker.terminated).toBe(true);
  });

  it("resolves and reports progress on a successful job", async () => {
    const controller = new AbortController();
    const progress: number[] = [];
    const pending = decryptFileTask(
      new Blob([new Uint8Array(64)]),
      "sandi",
      null,
      controller.signal,
      (bytes) => progress.push(bytes),
    );
    const worker = FakeWorker.instances.at(-1)!;

    worker.emit({ id: 1, type: "progress", bytes: 64 });
    worker.emit({ id: 1, type: "done", blob: new Blob([new Uint8Array([7])]) });

    const blob = await pending;
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([7]));
    expect(progress).toEqual([64]);
    expect(worker.terminated).toBe(true);
  });
});
