
import React, { useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from '../types';
import { Terminal, XCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface LogBoxProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogBox: React.FC<LogBoxProps> = ({ logs, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.SUCCESS: return <CheckCircle className="w-4 h-4 text-white" />;
      case LogLevel.ERROR: return <XCircle className="w-4 h-4 text-white" />;
      case LogLevel.WARNING: return <AlertTriangle className="w-4 h-4 text-neutral-300" />;
      default: return <Info className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.SUCCESS: return 'text-neutral-200';
      case LogLevel.ERROR: return 'text-white font-semibold';
      case LogLevel.WARNING: return 'text-neutral-300';
      default: return 'text-neutral-400';
    }
  };

  return (
    <div className="flex flex-col h-64 bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Operation Log</span>
        </div>
        <button 
          onClick={onClear}
          className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-neutral-600 italic">Ready for operations...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <span className="text-neutral-600 text-xs mt-0.5 min-w-[60px]">{log.timestamp}</span>
              <div className="mt-0.5">{getIcon(log.level)}</div>
              <span className={`break-all ${getColor(log.level)}`}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};