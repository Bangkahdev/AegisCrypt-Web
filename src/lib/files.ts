/**
 * Collects files from a drop event, walking directories recursively.
 *
 * `DataTransfer.files` only exposes top-level entries in most browsers, so a
 * dropped folder arrives as an empty/opaque item. `webkitGetAsEntry` gives us
 * the directory tree instead, with a plain `files` fallback.
 */

interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FsFileEntry extends FsEntry {
  file(onSuccess: (file: File) => void, onError?: (error: DOMException) => void): void;
}

interface FsDirectoryEntry extends FsEntry {
  createReader(): {
    readEntries(
      onSuccess: (entries: FsEntry[]) => void,
      onError?: (error: DOMException) => void,
    ): void;
  };
}

const readFile = (entry: FsFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

const readAllEntries = async (directory: FsDirectoryEntry): Promise<FsEntry[]> => {
  const reader = directory.createReader();
  const entries: FsEntry[] = [];

  // readEntries returns at most 100 entries per call; keep reading until empty.
  for (;;) {
    const batch = await new Promise<FsEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
};

const walk = async (entry: FsEntry, output: File[]): Promise<void> => {
  if (entry.isFile) {
    output.push(await readFile(entry as FsFileEntry));
    return;
  }
  if (entry.isDirectory) {
    const children = await readAllEntries(entry as FsDirectoryEntry);
    for (const child of children) {
      await walk(child, output);
    }
  }
};

export const collectDroppedFiles = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const items = Array.from(dataTransfer.items ?? []);
  const entries = items
    .map((item) => {
      if (typeof item.webkitGetAsEntry !== "function") return null;
      return item.webkitGetAsEntry() as unknown as FsEntry | null;
    })
    .filter((entry): entry is FsEntry => entry !== null);

  if (entries.length === 0) return Array.from(dataTransfer.files ?? []);

  const files: File[] = [];
  for (const entry of entries) {
    await walk(entry, files);
  }

  // Some browsers expose directories without readable children; fall back to
  // the flat file list rather than silently dropping the drop.
  return files.length > 0 ? files : Array.from(dataTransfer.files ?? []);
};
