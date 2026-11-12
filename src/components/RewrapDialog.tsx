import React, { useEffect, useRef, useState } from "react";
import { FileUp, Key, RefreshCw, X } from "lucide-react";
import { PasswordInput } from "./PasswordInput";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

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
}

const ITERATION_OPTIONS = [
  { value: 600_000, label: "600k (default)" },
  { value: 1_000_000, label: "1M" },
  { value: 2_000_000, label: "2M" },
];

export const RewrapDialog: React.FC<RewrapDialogProps> = ({
  open,
  fileCount,
  isProcessing,
  onCancel,
  onSubmit,
}) => {
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
      previous?.focus();
    };
  }, [open]);

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
      setError("New passwords do not match.");
      return;
    }
    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }
    setError(null);
    onSubmit({ newPassword, newKeyFile: useKeyFile ? keyFile : null, iterations });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewrap-title"
        aria-describedby="rewrap-description"
        className="w-full max-w-md border-2 border-border bg-card p-5 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 id="rewrap-title" className="text-lg font-bold tracking-tight">
                Change password
              </h2>
              <p id="rewrap-description" className="mt-0.5 text-[11px] text-muted-foreground">
                Re-wraps the file key for {fileCount} container{fileCount === 1 ? "" : "s"}.
                Records are not re-encrypted.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Close change password dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            disabled={isProcessing}
            label="New password"
            id="rewrap-password"
          />

          <div className="space-y-2">
            <label htmlFor="rewrap-confirm" className="text-sm font-semibold">
              Confirm new password
            </label>
            <Input
              id="rewrap-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isProcessing}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rewrap-iterations" className="text-sm font-semibold">
              PBKDF2 iterations
            </label>
            <select
              id="rewrap-iterations"
              value={iterations}
              onChange={(event) => setIterations(Number(event.target.value))}
              disabled={isProcessing}
              className="h-11 w-full border-2 border-border bg-card px-3 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              {ITERATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-2 border-border p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">New keyfile</p>
                  <p className="text-[11px] text-muted-foreground">
                    Optional second factor for the new password
                  </p>
                </div>
              </div>
              <Switch
                checked={useKeyFile}
                onCheckedChange={(checked) => {
                  setUseKeyFile(checked);
                  if (!checked) setKeyFile(null);
                }}
                disabled={isProcessing}
                aria-label="Toggle new keyfile"
              />
            </div>

            {useKeyFile && (
              <label className="mt-3 flex cursor-pointer items-center gap-3 border-2 border-dashed border-border bg-card p-3 hover:bg-secondary">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {keyFile ? keyFile.name : "Select keyfile..."}
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
            <p role="alert" className="text-[11px] font-semibold text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={!canSubmit} className="flex-1">
              <RefreshCw className="h-4 w-4" />
              {isProcessing ? "Re-wrapping..." : "Re-wrap files"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
