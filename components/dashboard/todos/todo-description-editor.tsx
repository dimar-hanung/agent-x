"use client";

import { useState } from "react";

import { MessageMarkdown } from "@/components/chat/message-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DescriptionMode = "markdown" | "preview";

interface TodoDescriptionEditorProps {
  id?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  /** Detail page: no border around the editor surface. */
  borderless?: boolean;
}

export function TodoDescriptionEditor({
  id,
  value,
  disabled = false,
  onChange,
  rows = 10,
  placeholder = "Tulis deskripsi dalam Markdown…",
  borderless = false,
}: TodoDescriptionEditorProps) {
  const [mode, setMode] = useState<DescriptionMode>("preview");

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex w-fit items-center gap-0.5 rounded-md p-0.5",
          borderless ? "bg-muted/50" : "border p-1"
        )}
      >
        <Button
          type="button"
          size="sm"
          variant={mode === "markdown" ? "secondary" : "ghost"}
          disabled={disabled}
          onClick={() => setMode("markdown")}
        >
          Markdown
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "preview" ? "secondary" : "ghost"}
          disabled={disabled}
          onClick={() => setMode("preview")}
        >
          Preview
        </Button>
      </div>

      {mode === "markdown" ? (
        <textarea
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "placeholder:text-muted-foreground flex w-full font-mono text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
            borderless
              ? "bg-transparent px-0 py-1 focus-visible:ring-0"
              : "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 shadow-xs focus-visible:ring-[3px]"
          )}
        />
      ) : (
        <div
          className={cn(
            "min-h-40",
            borderless
              ? "bg-transparent px-0 py-1"
              : "border-input bg-background rounded-md border px-3 py-2 shadow-xs",
            !value.trim() && "flex items-center"
          )}
        >
          {value.trim() ? (
            <MessageMarkdown content={value} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Belum ada deskripsi untuk dipreview.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
