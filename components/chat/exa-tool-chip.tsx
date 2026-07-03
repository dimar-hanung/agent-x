"use client";

import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Loader2,
  Search,
} from "lucide-react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";

import { cn } from "@/lib/utils";

interface ExaToolChipProps {
  part: UIMessage["parts"][number];
}

interface ToolOutput {
  success?: boolean;
  code?: string;
  message?: string;
}

function getToolInput(part: UIMessage["parts"][number]): Record<string, unknown> | null {
  if (!isToolUIPart(part) || !("input" in part)) {
    return null;
  }

  const input = part.input;

  if (input && typeof input === "object") {
    return input as Record<string, unknown>;
  }

  return null;
}

function getToolOutput(part: UIMessage["parts"][number]): ToolOutput | null {
  if (!isToolUIPart(part) || part.state !== "output-available" || !("output" in part)) {
    return null;
  }

  const output = part.output;

  if (output && typeof output === "object") {
    return output as ToolOutput;
  }

  return null;
}

export function isExaToolPart(part: UIMessage["parts"][number]): boolean {
  if (!isToolUIPart(part)) {
    return false;
  }

  const name = getToolName(part);
  return name === "exa_web_search" || name === "exa_web_fetch";
}

export function ExaToolChip({ part }: ExaToolChipProps) {
  if (!isToolUIPart(part)) {
    return null;
  }

  const toolName = getToolName(part);
  const state = part.state;
  const isSearch = toolName === "exa_web_search";
  const isRunning = state !== "output-available" && state !== "output-error";
  const input = getToolInput(part);
  const output = getToolOutput(part);
  const hasFailed =
    state === "output-error" ||
    (output?.success === false && output.message !== undefined);

  const Icon = isSearch ? Search : Globe;
  const StatusIcon = hasFailed
    ? AlertCircle
    : isRunning
      ? Loader2
      : CheckCircle2;

  let statusLabel = "Selesai";

  if (hasFailed) {
    statusLabel = "Gagal";
  } else if (isRunning) {
    statusLabel = isSearch ? "Mencari web…" : "Membaca halaman…";
  }

  let detail: string | null = null;

  if (isSearch && typeof input?.query === "string") {
    detail = input.query;
  } else if (!isSearch && Array.isArray(input?.urls)) {
    const count = input.urls.length;
    detail = `${count} URL`;
  }

  const errorMessage =
    output?.message ??
    (state === "output-error" ? "Tool gagal dijalankan." : null);

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
          hasFailed
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "text-muted-foreground bg-background/60"
        )}
      >
        <Icon className="size-3" />
        <span className="font-medium">
          {isSearch ? "Pencarian web" : "Baca halaman"}
        </span>
        {detail ? (
          <span className="max-w-[12rem] truncate opacity-70">{detail}</span>
        ) : null}
        <span className="inline-flex items-center gap-1 opacity-70">
          <StatusIcon className={cn("size-3", isRunning && "animate-spin")} />
          {statusLabel}
        </span>
      </span>
      {hasFailed && errorMessage ? (
        <p className="text-destructive max-w-md text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
}
