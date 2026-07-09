"use client";

import { XIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TodoTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  id?: string;
}

export function TodoTagInput({
  value,
  onChange,
  disabled,
  id,
}: TodoTagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return;
    }

    const next = [...value];
    const seen = new Set(value.map((tag) => tag.toLowerCase()));

    for (const part of parts) {
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      if (next.length >= 20) break;
      seen.add(key);
      next.push(part);
    }

    onChange(next);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
      return;
    }

    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-4 rounded-sm p-0"
                disabled={disabled}
                onClick={() => removeTag(tag)}
                aria-label={`Hapus tag ${tag}`}
              >
                <XIcon className="size-3" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : null}
      <Input
        id={id}
        value={draft}
        disabled={disabled}
        placeholder="Ketik tag, tekan Enter"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) {
            addTag(draft);
          }
        }}
      />
    </div>
  );
}
