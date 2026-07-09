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
}

export function TodoDescriptionEditor({
  id,
  value,
  disabled = false,
  onChange,
  rows = 10,
  placeholder = "Tulis deskripsi dalam Markdown…",
}: TodoDescriptionEditorProps) {
  const [mode, setMode] = useState<DescriptionMode>("preview");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 rounded-md border p-1 w-fit">
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
            "border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
      ) : (
        <div
          className={cn(
            "border-input bg-background min-h-40 rounded-md border px-3 py-2 shadow-xs",
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
