import React, { useCallback, useRef, useState } from "react";
import {
  Clock3,
  FilePlus,
  Gauge,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  ShieldCheck,
  StopCircle,
  Trash2,
  Unlock,
} from "lucide-react";
import { AuthSession, CryptoProgress, LogEntry, LogLevel } from "./types";
import { LogBox } from "./components/LogBox";
import { LoginScreen } from "./components/LoginScreen";
import { FileList } from "./components/FileList";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { ThemeToggle } from "./components/ui/theme-toggle";
import {
  downloadBlob,
  getDecryptedFilename,
  getEncryptedFilename,
  processFileDecrypt,
  processFileEncrypt,
} from "./services/cryptoService";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<CryptoProgress | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((message: string, level: LogLevel = LogLevel.INFO) => {
    setLogs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        message,
        level,
      },
    ]);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...newFiles]);
      addLog(`Added ${newFiles.length} files to queue.`, LogLevel.INFO);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      addLog(`Added ${newFiles.length} files to queue.`, LogLevel.INFO);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog("Operation cancelled by user.", LogLevel.WARNING);
    }
  };

  const handleLogout = () => {
    if (isProcessing) return;
    setSession(null);
    setFiles([]);
    setLogs([]);
    setProgress(null);
  };

  const runCrypto = async (mode: "ENCRYPT" | "DECRYPT") => {
    if (!session) return;
    if (!files.length) return addLog("No files in queue.", LogLevel.WARNING);

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        if (signal.aborted) break;

        const file = files[i];
        const startTime = performance.now();

        addLog(`Starting ${mode}: ${file.name}`, LogLevel.INFO);

        let resultData: Blob | ArrayBuffer;

        const updateProgress = (bytes: number) => {
          const now = performance.now();
          const elapsedSec = (now - startTime) / 1000;
          const speed = elapsedSec > 0 ? bytes / 1024 / 1024 / elapsedSec : 0;
          const remainingBytes = file.size - bytes;
          const eta = speed > 0 ? remainingBytes / 1024 / 1024 / speed : 0;

          setProgress({
            percent: Math.min(100, (bytes / file.size) * 100),
            currentFile: file.name,
            bytesProcessed: bytes,
            totalBytes: file.size,
            speed,
            eta,
          });
        };

        try {
          if (mode === "ENCRYPT") {
            resultData = await processFileEncrypt(
              file,
              session.password,
              session.keyFileBuffer,
              signal,
              updateProgress
            );
            downloadBlob(resultData, getEncryptedFilename(file.name));
          } else {
            const buffer = await file.arrayBuffer();
            resultData = await processFileDecrypt(
              buffer,
              session.password,
              session.keyFileBuffer,
              signal,
              updateProgress
            );
            downloadBlob(resultData, getDecryptedFilename(file.name));
          }
          addLog(`${mode} Success: ${file.name}`, LogLevel.SUCCESS);
          successCount++;
        } catch (err: any) {
          if (signal.aborted) break;
          addLog(`Failed ${file.name}: ${err.message}`, LogLevel.ERROR);
        }
      }
    } catch (err: any) {
      if (!signal.aborted) addLog(`System Error: ${err.message}`, LogLevel.ERROR);
    } finally {
      setIsProcessing(false);
      setProgress(null);
      abortControllerRef.current = null;
      if (successCount === files.length && files.length > 0 && !signal.aborted) {
        addLog("Batch Process Completed.", LogLevel.SUCCESS);
        setFiles([]);
      }
    }
  };

  if (!session) return <LoginScreen onLogin={setSession} />;

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const canProcess = files.length > 0 && !isProcessing;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b-2 border-border bg-card">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-bold tracking-tight">AegisCrypt</h1>
                <Badge variant="outline" className="hidden font-mono text-[9px] sm:inline-flex">
                  ZERO-KNOWLEDGE
                </Badge>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                Secure workspace / session active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border-2 border-border bg-secondary px-3 py-1.5 text-[11px] md:flex">
              <span className="h-2 w-2 bg-success" />
              <span className="text-muted-foreground">Auth</span>
              <span className="font-semibold">Password</span>
              {session.keyFile && (
                <>
                  <span className="text-muted-foreground">+</span>
                  <Key className="h-3 w-3" />
                </>
              )}
            </div>

            <ThemeToggle />

            <Button variant="outline" size="sm" onClick={handleLogout} disabled={isProcessing}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col px-4 py-6 sm:px-8 lg:py-8">
        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="flex min-h-[480px] flex-col overflow-hidden">
            <CardHeader className="flex-row items-start justify-between space-y-0 border-b-2 border-border bg-secondary py-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <FilePlus className="h-4 w-4 text-muted-foreground" />
                  Processing Queue
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {files.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {files.length
                    ? `${formatBytes(totalSize)} queued for processing`
                    : "Drop files or folders to get started"}
                </CardDescription>
              </div>
              {files.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={isProcessing}
                  className="h-8 shrink-0 text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </Button>
              )}
            </CardHeader>

            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex flex-1 flex-col p-4"
            >
              <div
                className={cn(
                  "relative flex flex-1 flex-col overflow-hidden border-2 border-dashed transition-colors",
                  isDragging ? "border-border bg-accent" : "border-border bg-card"
                )}
              >
                {isDragging && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-start justify-center gap-2 bg-accent p-8">
                    <FilePlus className="h-9 w-9 text-accent-foreground" />
                    <p className="text-sm font-semibold text-accent-foreground">Drop files to secure</p>
                    <p className="text-[11px] text-accent-foreground">
                      Release to add them to the queue
                    </p>
                  </div>
                )}

                {files.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className="group flex flex-1 flex-col items-start justify-center p-8 text-left"
                  >
                    <div className="mb-5 flex h-16 w-16 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
                      <FilePlus className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">Drop files to secure</h3>
                    <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      Drag and drop documents, images, archives, or entire folders. Bulk
                      processing is supported.
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 text-xs font-semibold">
                      Click to browse
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-1 flex-col gap-3 p-3">
                    <FileList files={files} onRemove={removeFile} disabled={isProcessing} />
                    <Button
                      variant="outline"
                      onClick={() => !isProcessing && fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="w-full border-dashed text-muted-foreground"
                    >
                      <FilePlus className="h-4 w-4" />
                      Add more files
                    </Button>
                  </div>
                )}
              </div>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => runCrypto("ENCRYPT")}
                disabled={!canProcess}
                className={cn(
                  "flex flex-col items-start gap-3 border-2 border-border p-4 text-left",
                  canProcess
                    ? "bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center border-2 border-border",
                    canProcess ? "bg-card text-foreground" : "bg-background"
                  )}
                >
                  <Lock className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Encrypt</span>
                  <span className="mt-0.5 block text-[11px]">
                    Seal into .aegis
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => runCrypto("DECRYPT")}
                disabled={!canProcess}
                className={cn(
                  "flex flex-col items-start gap-3 border-2 border-border p-4 text-left",
                  canProcess
                    ? "bg-card text-foreground hover:bg-secondary"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center border-2 border-border bg-secondary">
                  <Unlock className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Decrypt</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Restore originals
                  </span>
                </span>
              </button>
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b-2 border-border bg-secondary py-3.5">
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 text-muted-foreground",
                      isProcessing && "text-primary"
                    )}
                  />
                  Operation Status
                </CardTitle>
                {isProcessing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelOperation}
                    className="h-7 px-2 text-[11px] text-muted-foreground"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                ) : (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    IDLE
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono font-medium">
                      {Math.round(progress?.percent ?? 0)}%
                    </span>
                  </div>
                  <Progress
                    value={progress?.percent ?? 0}
                    indicatorClassName="bg-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="border-2 border-border bg-secondary p-2.5">
                    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      Speed
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {progress ? progress.speed.toFixed(1) : "0.0"}
                      <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">
                        MB/s
                      </span>
                    </p>
                  </div>
                  <div className="border-2 border-border bg-secondary p-2.5">
                    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      ETA
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {progress ? progress.eta.toFixed(0) : "0"}
                      <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">
                        s
                      </span>
                    </p>
                  </div>
                  <div className="border-2 border-border bg-secondary p-2.5">
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      Current
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] font-medium">
                      {progress ? progress.currentFile : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>AES-256-GCM / PBKDF2</span>
                  <span className="font-mono">100k iterations</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex-1">
              <LogBox logs={logs} onClear={() => setLogs([])} />
            </div>

            <div className="flex items-start gap-2 border-2 border-dashed border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
              <span>
                Zero-knowledge by design. Files are sealed in browser memory and never
                uploaded to a server.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
