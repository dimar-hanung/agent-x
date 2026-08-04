"use client";

import { useState, type ReactNode } from "react";
import {
  Download,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isImageFile, isPdfFile } from "@/lib/files/constants";
import type { FileListItem } from "@/lib/files/schemas";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

interface FileQuickPreviewDialogProps {
  file: FileListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (item: FileListItem) => void;
}

function ToolbarIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function FileQuickPreviewDialog({
  file,
  open,
  onOpenChange,
  onDownload,
}: FileQuickPreviewDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const isImage = file ? isImageFile(file.mimeType, file.name) : false;
  const isPdf = file ? isPdfFile(file.mimeType, file.name) : false;
  const previewUrl =
    open && file
      ? `/api/files/${file.id}/stream?disposition=inline`
      : null;

  function zoomIn() {
    setZoom((current) => Math.min(ZOOM_MAX, current + ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((current) => Math.max(ZOOM_MIN, current - ZOOM_STEP));
  }

  function rotateLeft() {
    setRotation((current) => (current - 90 + 360) % 360);
  }

  function rotateRight() {
    setRotation((current) => (current + 90) % 360);
  }

  function resetView() {
    setZoom(100);
    setRotation(0);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setZoom(100);
      setRotation(0);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate pr-2">{file?.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Pratinjau file
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {file ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(file)}
                >
                  <Download />
                  Unduh
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {isImage ? (
          <div className="bg-muted/30 flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
            <ToolbarIconButton
              label="Perkecil"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
            >
              <ZoomOut />
            </ToolbarIconButton>
            <span className="text-muted-foreground min-w-12 text-center text-xs tabular-nums">
              {zoom}%
            </span>
            <ToolbarIconButton
              label="Perbesar"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
            >
              <ZoomIn />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Putar kiri"
              onClick={rotateLeft}
            >
              <RotateCcw />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Putar kanan"
              onClick={rotateRight}
            >
              <RotateCw />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Reset"
              onClick={resetView}
              disabled={zoom === 100 && rotation === 0}
            >
              <RefreshCw />
            </ToolbarIconButton>
          </div>
        ) : null}

        <div className="bg-muted/20 relative min-h-[min(60svh,480px)] flex-1 overflow-auto">
          {previewUrl && isImage ? (
            <div className="flex min-h-full items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={file?.name ?? "Pratinjau gambar"}
                className={cn(
                  "max-h-[min(70svh,560px)] max-w-full object-contain transition-transform duration-150"
                )}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
              />
            </div>
          ) : null}

          {previewUrl && isPdf ? (
            <iframe
              src={previewUrl}
              title={`Pratinjau ${file?.name ?? "PDF"}`}
              className="h-[min(70svh,560px)] w-full border-0"
              sandbox="allow-same-origin"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
