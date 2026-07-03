"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function useCreateChat() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createChat = useCallback(
    async (onCreated?: () => void) => {
      setIsCreating(true);

      try {
        const response = await fetch("/api/chats", { method: "POST" });

        if (!response.ok) {
          throw new Error("Failed to create chat.");
        }

        const data = (await response.json()) as { id: string };
        onCreated?.();
        router.push(`/chat/${data.id}`);
        router.refresh();
      } catch (error) {
        console.error(error);
      } finally {
        setIsCreating(false);
      }
    },
    [router]
  );

  return { createChat, isCreating };
}
