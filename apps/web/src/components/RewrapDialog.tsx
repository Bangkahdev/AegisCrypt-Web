import React, { useEffect, useRef, useState } from "react";
import { FileUp, Key, RefreshCw, X } from "lucide-react";
import { PasswordInput } from "./PasswordInput";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { useI18n } from "@/i18n/I18nProvider";

export interface RewrapRequest {
  newPassword: string;
  newKeyFile: File | null;
  iterations: number;
}

interface RewrapDialogProps {
  open: boolean;
  fileCount: number;
  isProcessing: boolean;
  onCancel: () => void;
  onSubmit: (request: RewrapRequest) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

const ITERATION_OPTIONS = [600_000, 1_000_000, 2_000_000];

export const RewrapDialog: React.FC<RewrapDialogProps> = ({
  open,
  fileCount,
  isProcessing,
  onCancel,
  onSubmit,
  returnFocusRef,
}) => {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [useKeyFile, setUseKeyFile] = useState(false);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [iterations, setIterations] = useState(600_000);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;

    const firstField = document.getElementById("rewrap-password");
    firstField?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      (returnFocusRef?.current ?? previous)?.focus();
    };
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
      setUseKeyFile(false);
      setKeyFile(null);
      setIterations(600_000);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessing) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isProcessing, onCancel]);

  if (!open) return null;

  const canSubmit =
    !isProcessing &&
    newPassword.length > 0 &&
    newPassword === confirmPassword &&
    (!useKeyFile || keyFile !== null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t("rewrap.mismatch"));
      return;
    }
    if (!newPassword) {
      setError(t("rewrap.enterPassword"));
      return;
    }
    setError(null);
    onSubmit({ newPassword, newKeyFile: useKeyFile ? keyFile : null, iterations });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/20 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewrap-title"
        aria-describedby="rewrap-description"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 id="rewrap-title" className="text-lg font-semibold tracking-tight">
                {t("rewrap.title")}
              </h2>
              <p id="rewrap-description" className="mt-0.5 text-sm text-muted-foreground">
                {t("rewrap.description", { count: fileCount })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label={t("rewrap.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            disabled={isProcessing}
            label={t("rewrap.newPassword")}
            id="rewrap-password"
          />

          <div className="space-y-2">
            <label htmlFor="rewrap-confirm" className="text-sm font-medium">
              {t("rewrap.confirmPassword")}
            </label>
            <Input
              id="rewrap-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isProcessing}
              placeholder={t("rewrap.confirmPlaceholder")}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rewrap-iterations" className="text-sm font-medium">
              {t("rewrap.iterations")}
            </label>
            <select
              id="rewrap-iterations"
              value={iterations}
              onChange={(event) => setIterations(Number(event.target.value))}
              disabled={isProcessing}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {ITERATION_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value === 600_000 ? t("rewrap.iterationsDefault") : `${value / 1_000_000}M`}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border p-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("rewrap.newKeyfile")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("rewrap.newKeyfileHint")}</p>
                </div>
              </div>
              <Switch
                checked={useKeyFile}
                onCheckedChange={(checked) => {
                  setUseKeyFile(checked);
                  if (!checked) setKeyFile(null);
                }}
                disabled={isProcessing}
                aria-label={t("rewrap.toggleNewKeyfile")}
              />
            </div>

            {useKeyFile && (
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-card p-3 hover:bg-secondary/60">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {keyFile ? keyFile.name : t("rewrap.selectKeyfile")}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => setKeyFile(event.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={!canSubmit} className="flex-1">
              <RefreshCw className="h-4 w-4" />
              {isProcessing ? t("rewrap.submitting") : t("rewrap.submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              {t("rewrap.cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
