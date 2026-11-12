import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock3,
  FilePlus,
  Gauge,
  Key,
  KeyRound,
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
import { LanguageToggle } from "./components/ui/language-toggle";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { RecoveryDialog } from "./components/RecoveryDialog";
import { RewrapDialog, RewrapRequest } from "./components/RewrapDialog";
import { collectDroppedFiles } from "./lib/files";
import { isStorageQuotaMessage } from "./lib/errors";
import { generateRecoveryKey } from "./lib/recovery";
import {
  downloadBlob,
  getDecryptedFilename,
  getEncryptedFilename,
} from "./services/cryptoService";
import {
  decryptFileTask,
  encryptFileTask,
  rewrapFileTask,
} from "./services/cryptoWorkerClient";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";

const AUTO_LOCK_MS = 10 * 60 * 1000;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function App() {
  const { t } = useI18n();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<CryptoProgress | null>(null);
  const [isRewrapping, setIsRewrapping] = useState(false);
  const [rewrapOpen, setRewrapOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const changePasswordRef = useRef<HTMLButtonElement>(null);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);

  const describeError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return isStorageQuotaMessage(message) ? t("errors.storageQuota") : message;
    },
    [t]
  );

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

  const zeroizeSession = useCallback((current: AuthSession | null) => {
    if (!current) return;
    current.passwordBytes.fill(0);
    current.recoveryKey?.fill(0);
    if (current.keyFileBuffer) new Uint8Array(current.keyFileBuffer).fill(0);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let timer: number;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // Never interrupt an in-flight operation; re-arm instead.
        if (abortControllerRef.current) {
          arm();
          return;
        }
        zeroizeSession(sessionRef.current);
        setSession(null);
        setFiles([]);
        setLogs([]);
        setProgress(null);
        setRewrapOpen(false);
        setRecoveryOpen(false);
        setLockNotice(t("login.noticeLockedInactivity"));
      }, AUTO_LOCK_MS);
    };

    arm();
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, arm, { passive: true }));

    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, arm));
    };
  }, [session, zeroizeSession, t]);

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const newFiles = await collectDroppedFiles(e.dataTransfer);
    if (newFiles.length) {
      setFiles((prev) => [...prev, ...newFiles]);
      addLog(t("logs.added", { count: newFiles.length }), LogLevel.INFO);
    } else {
      addLog(t("logs.noneInDrop"), LogLevel.WARNING);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      addLog(t("logs.added", { count: newFiles.length }), LogLevel.INFO);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog(t("logs.cancelled"), LogLevel.WARNING);
    }
  };

  const handleLogout = () => {
    if (isProcessing || isRewrapping) return;
    zeroizeSession(session);
    setSession(null);
    setFiles([]);
    setLogs([]);
    setProgress(null);
    setLockNotice(null);
    setRewrapOpen(false);
    setRecoveryOpen(false);
  };

  const runCrypto = async (mode: "ENCRYPT" | "DECRYPT") => {
    if (!session) return;
    if (!files.length) return addLog(t("logs.noFiles"), LogLevel.WARNING);

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        if (signal.aborted) break;

        const file = files[i];
        const startTime = performance.now();

        addLog(
          t("logs.starting", {
            mode: t(mode === "ENCRYPT" ? "mode.encrypt" : "mode.decrypt"),
            name: file.name,
          }),
          LogLevel.INFO,
        );

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
            resultData = await encryptFileTask(
              file,
              session.passwordBytes,
              session.keyFileBuffer,
              signal,
              updateProgress,
              { filename: file.name, recoveryKey: session.recoveryKey }
            );
            downloadBlob(resultData, getEncryptedFilename(file.name));
          } else {
            let decryptedName: string | null = null;
            resultData = await decryptFileTask(
              file,
              session.passwordBytes,
              session.keyFileBuffer,
              signal,
              updateProgress,
              (name) => (decryptedName = name),
              {
                recoveryKey:
                  session.passwordBytes.length === 0 ? session.recoveryKey : null,
              }
            );
            downloadBlob(resultData, decryptedName ?? getDecryptedFilename(file.name));
          }
          addLog(
            t("logs.success", {
              mode: t(mode === "ENCRYPT" ? "mode.encrypt" : "mode.decrypt"),
              name: file.name,
            }),
            LogLevel.SUCCESS,
          );
          successCount++;
        } catch (err: any) {
          if (signal.aborted) break;
          addLog(t("logs.failed", { name: file.name, error: describeError(err) }), LogLevel.ERROR);
        }
      }
    } catch (err: any) {
      if (!signal.aborted) addLog(t("logs.systemError", { error: describeError(err) }), LogLevel.ERROR);
    } finally {
      setIsProcessing(false);
      setProgress(null);
      abortControllerRef.current = null;
      if (successCount === files.length && files.length > 0 && !signal.aborted) {
        addLog(t("logs.batchComplete"), LogLevel.SUCCESS);
        setFiles([]);
      }
    }
  };

  const handleRewrap = async ({ newPassword, newKeyFile, iterations }: RewrapRequest) => {
    if (!session) return;

    const targets = files.filter((file) => file.name.endsWith(".aegis"));
    if (targets.length === 0) {
      setRewrapOpen(false);
      addLog(t("logs.noContainers"), LogLevel.WARNING);
      return;
    }

    setRewrapOpen(false);
    setIsRewrapping(true);
    setLockNotice(null);

    const newPasswordBytes = new TextEncoder().encode(newPassword);
    let newKeyFileBuffer: ArrayBuffer | null = null;
    if (newKeyFile) newKeyFileBuffer = await newKeyFile.arrayBuffer();

    try {
      for (let i = 0; i < targets.length; i++) {
        const file = targets[i];
        addLog(t("logs.rewrapping", { name: file.name }), LogLevel.INFO);
        setProgress({
          percent: Math.round((i / targets.length) * 100),
          currentFile: file.name,
          bytesProcessed: i,
          totalBytes: targets.length,
          speed: 0,
          eta: 0,
        });

        try {
          const result = await rewrapFileTask(
            file,
            session.passwordBytes,
            session.keyFileBuffer,
            newPasswordBytes,
            newKeyFileBuffer,
            { iterations }
          );
          downloadBlob(result, file.name);
          addLog(t("logs.rewrapped", { name: file.name }), LogLevel.SUCCESS);
        } catch (err: any) {
          addLog(t("logs.failed", { name: file.name, error: describeError(err) }), LogLevel.ERROR);
        }
      }
      setProgress(null);
      addLog(t("logs.rewrapComplete"), LogLevel.SUCCESS);
    } finally {
      newPasswordBytes.fill(0);
      if (newKeyFileBuffer) new Uint8Array(newKeyFileBuffer).fill(0);
      setIsRewrapping(false);
      setProgress(null);
    }
  };

  const lockNow = () => {
    if (isProcessing || isRewrapping) return;
    zeroizeSession(session);
    setSession(null);
    setFiles([]);
    setLogs([]);
    setProgress(null);
    setRewrapOpen(false);
    setRecoveryOpen(false);
    setLockNotice(t("login.noticeLockedManual"));
  };

  if (!session)
    return (
      <LoginScreen
        onLogin={(next) => {
          setLockNotice(null);
          setSession(next);
        }}
        notice={lockNotice}
      />
    );

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const canProcess = files.length > 0 && !isProcessing;
  const canEncrypt = canProcess && session.passwordBytes.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main-content" tabIndex={0} className="skip-link">
        {t("common.skipToContent")}
      </a>
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
                  {t("app.badge")}
                </Badge>
                {session.recoveryKey && (
                  <Badge
                    variant="outline"
                    className="hidden border-2 font-mono text-[9px] sm:inline-flex"
                  >
                    {t("app.recoveryActive")}
                  </Badge>
                )}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {t("app.workspaceActive")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border-2 border-border bg-secondary px-3 py-1.5 text-[11px] md:flex">
              <span className="h-2 w-2 bg-success" />
              <span className="text-muted-foreground">{t("app.auth")}</span>
              <span className="font-semibold">
                {session.passwordBytes.length === 0 ? t("app.recoveryKey") : t("app.password")}
              </span>
              {session.keyFile && (
                <>
                  <span className="text-muted-foreground">+</span>
                  <Key className="h-3 w-3" />
                </>
              )}
            </div>

            {session.passwordBytes.length > 0 && (
              <Button
                ref={recoveryButtonRef}
                variant="outline"
                size="sm"
                onClick={() => setRecoveryOpen(true)}
                disabled={isProcessing || isRewrapping}
                title={t("recovery.title")}
                aria-label={t("recovery.title")}
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden xl:inline">{t("recovery.title")}</span>
              </Button>
            )}

            <Button
              ref={changePasswordRef}
              variant="outline"
              size="sm"
              onClick={() => setRewrapOpen(true)}
              disabled={session.passwordBytes.length === 0 || isProcessing || isRewrapping}
              title={t("app.changePasswordTitle")}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden lg:inline">{t("app.changePassword")}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={lockNow}
              disabled={isProcessing || isRewrapping}
              title={t("app.lockTitle")}
            >
              <Lock className="h-4 w-4" />
              <span className="hidden lg:inline">{t("app.lock")}</span>
            </Button>

            <LanguageToggle />
            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isProcessing || isRewrapping}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("app.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        aria-busy={isProcessing || isRewrapping}
        className="flex w-full flex-1 flex-col px-4 py-6 sm:px-8 lg:py-8"
      >
        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="flex min-h-[480px] flex-col overflow-hidden">
            <CardHeader className="flex-row items-start justify-between space-y-0 border-b-2 border-border bg-secondary py-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <FilePlus className="h-4 w-4 text-muted-foreground" />
                  {t("queue.title")}
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {files.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {files.length
                    ? t("queue.queued", { size: formatBytes(totalSize) })
                    : t("queue.empty")}
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
                  {t("queue.clearAll")}
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
                    <p className="text-sm font-semibold text-accent-foreground">{t("queue.dropTitle")}</p>
                    <p className="text-[11px] text-accent-foreground">
                      {t("queue.dropRelease")}
                    </p>
                  </div>
                )}

                {files.length === 0 ? (
                  <div className="flex flex-1 flex-col items-start justify-center gap-4 p-8">
                    <button
                      type="button"
                      onClick={() => !isProcessing && fileInputRef.current?.click()}
                      className="group flex w-full flex-col items-start text-left"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
                        <FilePlus className="h-7 w-7" />
                      </div>
                      <h3 className="text-lg font-bold tracking-tight">{t("queue.dropTitle")}</h3>
                      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        {t("queue.dropDescription")}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 text-xs font-semibold">
                        {t("queue.browse")}
                      </span>
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => !isProcessing && folderInputRef.current?.click()}
                      disabled={isProcessing}
                      className="border-dashed text-muted-foreground"
                    >
                      <FilePlus className="h-4 w-4" />
                      {t("queue.addFolder")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-3 p-3">
                    <FileList files={files} onRemove={removeFile} disabled={isProcessing} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full border-dashed text-muted-foreground"
                      >
                        <FilePlus className="h-4 w-4" />
                        {t("queue.addMoreFiles")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => !isProcessing && folderInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full border-dashed text-muted-foreground"
                      >
                        <FilePlus className="h-4 w-4" />
                        {t("queue.addFolder")}
                      </Button>
                    </div>
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
              <input
                type="file"
                multiple
                ref={folderInputRef}
                className="hidden"
                onChange={handleFileSelect}
                {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              />
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => runCrypto("ENCRYPT")}
                disabled={!canEncrypt}
                className={cn(
                  "flex flex-col items-start gap-3 border-2 border-border p-4 text-left",
                  canEncrypt
                    ? "bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center border-2 border-border",
                    canEncrypt ? "bg-card text-foreground" : "bg-background"
                  )}
                >
                  <Lock className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{t("actions.encrypt")}</span>
                  <span className="mt-0.5 block text-[11px]">
                    {t("actions.encryptHint")}
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
                  <span className="block text-sm font-bold">{t("actions.decrypt")}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {t("actions.decryptHint")}
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
                  {t("status.title")}
                </CardTitle>
                {isProcessing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelOperation}
                    className="h-7 px-2 text-[11px] text-muted-foreground"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    {t("status.cancel")}
                  </Button>
                ) : (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {t("status.idleBadge")}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{t("status.progress")}</span>
                    <span className="font-mono font-medium">
                      {Math.round(progress?.percent ?? 0)}%
                    </span>
                  </div>
                  <Progress
                    value={progress?.percent ?? 0}
                    indicatorClassName="bg-primary"
                    aria-label={t("status.batchProgress")}
                    aria-valuetext={
                      progress
                        ? t("status.percentOf", {
                            percent: Math.round(progress.percent),
                            file: progress.currentFile,
                          })
                        : t("status.idle")
                    }
                  />
                </div>

                <p role="status" aria-live="polite" className="sr-only">
                  {isProcessing
                    ? progress
                      ? t("status.processing", { file: progress.currentFile })
                      : t("status.processingFiles")
                    : isRewrapping
                      ? t("status.rewrapping")
                      : t("status.idle")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="border-2 border-border bg-secondary p-2.5">
                    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      {t("status.speed")}
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
                      {t("status.eta")}
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
                      {t("status.current")}
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] font-medium">
                      {progress ? progress.currentFile : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{t("status.aesLine")}</span>
                  <span className="font-mono">{t("status.iterations")}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex-1">
              <LogBox logs={logs} onClear={() => setLogs([])} />
            </div>

            <div className="flex items-start gap-2 border-2 border-dashed border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
              <span>
                {t("app.zeroKnowledgeFooter")}
              </span>
            </div>
          </div>
        </div>
      </main>

      <RewrapDialog
        open={rewrapOpen}
        fileCount={files.filter((file) => file.name.endsWith(".aegis")).length}
        isProcessing={isRewrapping}
        onCancel={() => setRewrapOpen(false)}
        onSubmit={handleRewrap}
        returnFocusRef={changePasswordRef}
      />

      <RecoveryDialog
        open={recoveryOpen}
        recoveryKey={session.recoveryKey}
        onGenerate={() =>
          setSession((current) =>
            current ? { ...current, recoveryKey: generateRecoveryKey() } : current
          )
        }
        onRemove={() => {
          session.recoveryKey?.fill(0);
          setSession({ ...session, recoveryKey: null });
        }}
        onClose={() => setRecoveryOpen(false)}
        returnFocusRef={recoveryButtonRef}
      />
    </div>
  );
}
