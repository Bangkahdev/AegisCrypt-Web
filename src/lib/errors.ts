/**
 * Storage quota failures surface from OPFS/Blob writes as browser-native
 * English messages. They are matched here so the UI can show localized copy.
 */
export const isStorageQuotaMessage = (message: string): boolean =>
  /quota/i.test(message) || /penyimpanan penuh/i.test(message);
