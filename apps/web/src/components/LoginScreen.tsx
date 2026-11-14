import React, { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileCheck,
  FileUp,
  Key,
  Lock,
  Shield,
} from "lucide-react";
import { PasswordInput } from "./PasswordInput";
import { AuthSession } from "../types";
import { ThemeToggle } from "./ui/theme-toggle";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { LanguageToggle } from "./ui/language-toggle";
import { parseRecoveryKey } from "../lib/recovery";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";

interface LoginScreenProps {
  onLogin: (session: AuthSession) => void;
  notice?: string | null;
}

const FEATURES = ["login.feature1", "login.feature2", "login.feature3", "login.feature4"] as const;

const FACTS = [
  { label: "login.factCipher", value: "AES-256-GCM" },
  { label: "login.factKdf", value: "PBKDF2 / 600k" },
  { label: "login.factDataPath", value: "login.factDataPathValue" },
] as const;

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, notice }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<"password" | "recovery">("password");
  const [password, setPassword] = useState("");
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [useKeyFile, setUseKeyFile] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const keyFileInputRef = useRef<HTMLInputElement>(null);
  const parsedRecovery = parseRecoveryKey(recoveryInput);

  const switchMode = (next: "password" | "recovery") => {
    setMode(next);
    setPassword("");
    setRecoveryInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "recovery") {
      if (!parsedRecovery) return;
      setIsAnimating(true);
      setRecoveryInput("");
      setTimeout(() => {
        onLogin({
          passwordBytes: new Uint8Array(0),
          keyFile: null,
          keyFileBuffer: null,
          recoveryKey: parsedRecovery,
        });
      }, 450);
      return;
    }

    if (!password) return;

    setIsAnimating(true);

    let keyFileBuffer: ArrayBuffer | null = null;
    if (useKeyFile && keyFile) {
      keyFileBuffer = await keyFile.arrayBuffer();
    }

    const passwordBytes = new TextEncoder().encode(password);
    setPassword("");

    setTimeout(() => {
      onLogin({
        passwordBytes,
        keyFile: useKeyFile ? keyFile : null,
        keyFileBuffer,
        recoveryKey: null,
      });
    }, 450);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#main-content" tabIndex={0} className="skip-link">
        {t("common.skipToContent")}
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">AegisCrypt</p>
              <p className="text-[11px] text-muted-foreground">{t("login.zeroKnowledgeSuite")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="https://docs.aegiscrypt.bangkah.tech"
              className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground sm:inline-flex"
            >
              {t("common.documentation")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_440px] lg:items-center lg:px-8 lg:py-16">
          <section className="order-2 lg:order-1">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t("login.badge")}
            </Badge>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {t("login.headline1")}
              <span className="block text-muted-foreground">{t("login.headline2")}</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("login.introBefore")} <span className="font-mono text-foreground">.aegis</span>{" "}
              {t("login.introAfter")}
            </p>

            <ul className="mt-8 grid max-w-xl gap-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{t(feature)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {FACTS.map((fact) => (
                <div key={fact.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t(fact.label)}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">
                    {fact.value.startsWith("login.") ? t(fact.value as "login.factDataPathValue") : fact.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <Card className="order-1 w-full p-6 sm:p-7 lg:order-2">
            {notice && (
              <div
                role="status"
                className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground"
              >
                {notice}
              </div>
            )}

            <div className="mb-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">AegisCrypt</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("login.startSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 p-1" role="group" aria-label={t("login.modePassword")}>
                {(["password", "recovery"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => switchMode(value)}
                    disabled={isAnimating}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      mode === value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(value === "password" ? "login.modePassword" : "login.modeRecovery")}
                  </button>
                ))}
              </div>

              <div className={mode === "recovery" ? "hidden" : "space-y-5"}>
                <PasswordInput value={password} onChange={setPassword} disabled={isAnimating} />

                <div className={cn("rounded-xl border p-3.5 transition-colors", useKeyFile ? "border-primary/20 bg-primary/5" : "border-border bg-card")}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{t("login.useKeyfile")}</p>
                        <p className="text-[11px] text-muted-foreground">{t("login.secondFactor")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={useKeyFile}
                      onCheckedChange={(checked) => {
                        setUseKeyFile(checked);
                        if (!checked) setKeyFile(null);
                      }}
                      disabled={isAnimating}
                      aria-label={t("login.toggleKeyfile")}
                    />
                  </div>

                  {useKeyFile && (
                    <div
                      onClick={() => keyFileInputRef.current?.click()}
                      className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-card p-3 hover:bg-secondary/60"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                        {keyFile ? <FileCheck className="h-4 w-4 text-primary" /> : <FileUp className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {keyFile ? keyFile.name : t("login.selectKeyfile")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{t("login.keyfileHint")}</p>
                      </div>
                      <input
                        type="file"
                        ref={keyFileInputRef}
                        className="hidden"
                        onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {mode === "recovery" && (
                <div className="space-y-2">
                  <label htmlFor="recovery-key" className="text-sm font-medium">
                    {t("login.recoveryLabel")}
                  </label>
                  <Input
                    id="recovery-key"
                    value={recoveryInput}
                    onChange={(event) => setRecoveryInput(event.target.value)}
                    disabled={isAnimating}
                    placeholder={t("login.recoveryPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">{t("login.recoveryHint")}</p>
                  {recoveryInput.length > 0 && !parsedRecovery && (
                    <p role="alert" className="text-[11px] font-medium text-destructive">
                      {t("login.recoveryInvalid")}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={
                  isAnimating ||
                  (mode === "password" ? !password || (useKeyFile && !keyFile) : !parsedRecovery)
                }
                className="w-full"
              >
                {isAnimating ? (
                  <>
                    <Lock className="h-4 w-4" />
                    {t("login.initializing")}
                  </>
                ) : (
                  <>
                    {t("login.startSession")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                {t("login.filesNeverLeave")}
              </p>
            </form>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-2 px-4 py-4 text-[11px] text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>{t("login.footer")}</p>
          <a
            href="https://docs.aegiscrypt.bangkah.tech"
            className="inline-flex items-center gap-1 font-medium hover:text-foreground"
          >
            {t("common.readDocs")}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};
