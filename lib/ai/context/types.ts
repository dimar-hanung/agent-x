import type { UIMessage } from "ai";

export interface StoredChatMessage extends UIMessage {
  sequence: number;
}
