import React, { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, Terminal, XCircle } from "lucide-react";
import { LogEntry, LogLevel } from "../types";
import { Button } from "./ui/button";

interface LogBoxProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogBox: React.FC<LogBoxProps> = ({ logs, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.SUCCESS:
        return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case LogLevel.ERROR:
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case LogLevel.WARNING:
        return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
      default:
        return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.SUCCESS:
        return "text-success";
      case LogLevel.ERROR:
        return "text-destructive";
      case LogLevel.WARNING:
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="flex h-full min-h-[220px] flex-col overflow-hidden border-2 border-border bg-card">
      <div className="flex items-center justify-between border-b-2 border-border bg-secondary px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Operation Log
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2 text-[11px]">
          Clear
        </Button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="px-1 py-2 italic text-muted-foreground">Ready for operations...</p>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 px-1 py-0.5 hover:bg-secondary">
                <span className="mt-0.5 min-w-[54px] text-[10px] text-muted-foreground">
                  {log.timestamp}
                </span>
                <span className="mt-0.5">{getIcon(log.level)}</span>
                <span className={`break-all ${getColor(log.level)}`}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
