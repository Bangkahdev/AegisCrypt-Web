import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, KeyRound, ShieldAlert, X } from "lucide-react";
import { Button } from "./ui/button";
import { encodeRecoveryKey } from "../lib/recovery";
import { downloadBlob } from "../services/cryptoService";
import { useI18n } from "@/i18n/I18nProvider";

interface RecoveryDialogProps {
  open: boolean;
  recoveryKey: Uint8Array | null;
  onGenerate: () => void;
  onRemove: () => void;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  open,
  recoveryKey,
  onGenerate,
  onRemove,
  onClose,
  returnFocusRef,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<number | null>(null);
  const encoded = recoveryKey ? encodeRecoveryKey(recoveryKey) : null;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
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
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = null;
    }
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!encoded) return;
    try {
      await navigator.clipboard?.writeText(encoded);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      /* clipboard unavailable; the key stays selectable */
    }
  };

  const handleDownload = () => {
    if (!encoded) return;
    const content = t("recovery.fileContent", { key: encoded });
    downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), "aegiscrypt-recovery-key.txt");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        aria-describedby="recovery-description"
        className="w-full max-w-md border-2 border-border bg-card p-5 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="recovery-title" className="text-lg font-bold tracking-tight">
                {t("recovery.title")}
              </h2>
              <p id="recovery-description" className="mt-0.5 text-[11px] text-muted-foreground">
                {encoded ? t("recovery.activeDescription") : t("recovery.description")}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={onClose}
            aria-label={t("recovery.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {encoded ? (
          <div className="space-y-4">
            <p
              data-testid="recovery-key-value"
              className="select-all break-all border-2 border-border bg-secondary p-3 font-mono text-sm font-bold leading-relaxed"
            >
              {encoded}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={handleCopy} className="flex-1">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("recovery.copied") : t("recovery.copy")}
              </Button>
              <Button type="button" variant="outline" onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4" />
                {t("recovery.download")}
              </Button>
            </div>

            <div className="flex items-start gap-2 border-2 border-border bg-accent px-3 py-2 text-[11px] font-semibold leading-relaxed text-accent-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("recovery.warning")}</span>
            </div>

            <Button type="button" variant="ghost" onClick={onRemove} className="w-full text-xs">
              {t("recovery.remove")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("recovery.generateHint")}
            </p>
            <Button type="button" onClick={onGenerate} className="w-full">
              <KeyRound className="h-4 w-4" />
              {t("recovery.generate")}
            </Button>
            <div className="flex items-start gap-2 border-2 border-border bg-accent px-3 py-2 text-[11px] font-semibold leading-relaxed text-accent-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("recovery.generateWarning")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
