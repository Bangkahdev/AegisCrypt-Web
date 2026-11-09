import React from "react";
import { Box, FileArchive, FileText, Film, Image, Lock, Music, X } from "lucide-react";
import { EXTENSION_ENCRYPTED } from "../constants";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
  disabled: boolean;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(filename: string) {
  if (filename.endsWith(EXTENSION_ENCRYPTED)) {
    return <Lock className="h-4 w-4 text-success" />;
  }
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return <Image className="h-4 w-4" />;
    case "mp4":
    case "mov":
    case "avi":
      return <Film className="h-4 w-4" />;
    case "mp3":
    case "wav":
      return <Music className="h-4 w-4" />;
    case "zip":
    case "rar":
    case "7z":
      return <FileArchive className="h-4 w-4" />;
    case "bin":
      return <Box className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export const FileList: React.FC<FileListProps> = ({ files, onRemove, disabled }) => {
  return (
    <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto pr-1">
      {files.map((file, idx) => {
        const isEncrypted = file.name.endsWith(EXTENSION_ENCRYPTED);

        return (
          <div
            key={`${file.name}-${idx}`}
            className="group flex items-center gap-3 border-2 border-border bg-background p-3 hover:bg-secondary"
          >
            <span className="hidden w-5 shrink-0 font-mono text-[10px] text-muted-foreground sm:block">
              {String(idx + 1).padStart(2, "0")}
            </span>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border bg-secondary text-foreground">
              {getFileIcon(file.name)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatSize(file.size)}
                </span>
                {isEncrypted && (
                  <Badge variant="success" className="px-1.5 py-0 text-[9px]">
                    ENCRYPTED
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(idx);
              }}
              disabled={disabled}
              aria-label={`Remove ${file.name}`}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};
