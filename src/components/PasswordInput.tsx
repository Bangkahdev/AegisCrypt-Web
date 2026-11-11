import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
  label?: string;
  id?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  disabled,
  label = "Master password",
  id = "master-password",
}) => {
  const [show, setShow] = useState(false);
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    let score = 0;
    if (!value) {
      setStrength(0);
      return;
    }
    if (value.length > 7) score++;
    if (value.length > 12) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
    setStrength(score);
  }, [value]);

  const strengthLabel = () => {
    if (strength <= 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    return "Excellent";
  };

  const strengthColor = () => {
    if (strength <= 1) return "text-destructive";
    if (strength === 2) return "text-warning";
    if (strength === 3) return "text-success";
    return "text-success";
  };

  const barColor = (index: number) => {
    if (index >= strength) return "bg-muted";
    if (strength <= 1) return "bg-destructive";
    if (strength === 2) return "bg-warning";
    return "bg-success";
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <span className="font-mono text-[11px] text-muted-foreground">
          {value.length} chars
        </span>
      </div>

      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter encryption password"
          autoComplete="new-password"
          className="h-11 pl-9 pr-11"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          disabled={disabled}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-transparent p-1.5 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={cn("h-2 flex-1", barColor(index))} />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("font-semibold", value ? strengthColor() : "text-muted-foreground")}>
          {value ? strengthLabel() : "Password required"}
        </span>
            <span className="text-muted-foreground">PBKDF2 / 600k iterations</span>
      </div>
    </div>
  );
};
