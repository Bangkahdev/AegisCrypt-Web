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
import { Switch } from "./ui/switch";

interface LoginScreenProps {
  onLogin: (session: AuthSession) => void;
}

const FEATURES = [
  "AES-256-GCM authenticated encryption",
  "PBKDF2-HMAC-SHA256 key derivation",
  "Optional keyfile as a second factor",
  "Streaming engine for multi-gigabyte files",
];

const FACTS = [
  { label: "Cipher", value: "AES-256-GCM" },
    { label: "Key derivation", value: "PBKDF2 / 600k" },
  { label: "Data path", value: "Browser only" },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [useKeyFile, setUseKeyFile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const keyFileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsAnimating(true);

    let keyFileBuffer: ArrayBuffer | null = null;
    if (useKeyFile && keyFile) {
      keyFileBuffer = await keyFile.arrayBuffer();
    }

    setTimeout(() => {
      onLogin({
        password,
        keyFile: useKeyFile ? keyFile : null,
        keyFileBuffer,
      });
    }, 450);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b-2 border-border bg-card">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">AegisCrypt</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Zero-knowledge suite
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://docs.aegiscrypt.bangkah.tech"
              className="hidden items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground sm:flex"
            >
              Documentation
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-8 lg:py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <section className="order-2 text-left lg:order-1">
            <Badge variant="outline" className="bg-accent">
              <span className="h-2 w-2 bg-accent-foreground" />
              RUNS ENTIRELY IN YOUR BROWSER
            </Badge>
            <h2 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Private by default.
              <br />
              Encrypted by you.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              AegisCrypt turns any file into a sealed{" "}
              <span className="font-mono text-foreground">.aegis</span> container
              using AES-256-GCM. Keys are derived on your device and never
              transmitted, logged, or stored.
            </p>

            <ul className="mt-7 grid max-w-xl gap-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {FACTS.map((fact) => (
                <div key={fact.label} className="border-2 border-border bg-card p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {fact.label}
                  </p>
                  <p className="mt-1 text-xs font-bold">{fact.value}</p>
                </div>
              ))}
            </div>
          </section>

          <Card className="order-1 w-full border-2 bg-card p-6 sm:p-8 lg:order-2">
            <div className="mb-7 text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">AegisCrypt</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Start a secure, local-only session
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordInput value={password} onChange={setPassword} disabled={isAnimating} />

              <div
                className={`border-2 border-border p-3.5 ${
                  useKeyFile ? "bg-accent" : "bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">Use keyfile</p>
                      <p className="text-[11px] text-muted-foreground">Second factor (2FA)</p>
                    </div>
                  </div>
                  <Switch
                    checked={useKeyFile}
                    onCheckedChange={(checked) => {
                      setUseKeyFile(checked);
                      if (!checked) setKeyFile(null);
                    }}
                    disabled={isAnimating}
                    aria-label="Toggle keyfile second factor"
                  />
                </div>

                {useKeyFile && (
                  <div
                    onClick={() => keyFileInputRef.current?.click()}
                    className="mt-3 flex cursor-pointer items-center gap-3 border-2 border-dashed border-border bg-card p-3 hover:bg-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-background text-muted-foreground">
                      {keyFile ? (
                        <FileCheck className="h-4 w-4 text-foreground" />
                      ) : (
                        <FileUp className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {keyFile ? keyFile.name : "Select keyfile..."}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Image, audio, document - any file works
                      </p>
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

              <Button
                type="submit"
                size="lg"
                disabled={!password || isAnimating || (useKeyFile && !keyFile)}
                className="w-full"
              >
                {isAnimating ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Start Session
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Files never leave your device
              </p>
            </form>
          </Card>
        </div>
      </main>

      <footer className="flex flex-col justify-between gap-2 border-t-2 border-border bg-card px-4 py-4 text-[11px] text-muted-foreground sm:flex-row sm:px-8">
        <p>AegisCrypt Web / Zero-knowledge encryption workspace</p>
        <a
          href="https://docs.aegiscrypt.bangkah.tech"
          className="flex items-center gap-1 font-semibold hover:text-foreground"
        >
          Read the docs
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </footer>
    </div>
  );
};
