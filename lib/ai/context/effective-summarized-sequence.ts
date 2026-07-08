/**
 * Chats created before summarizedUpToSequence defaulted to -1 may have 0 with no
 * summary yet. Treat that as "nothing summarized" so sequence 0 stays in context.
 */
export function effectiveSummarizedUpToSequence(
  summarizedUpToSequence: number,
  contextSummary: string | null
): number {
  if (summarizedUpToSequence === 0 && !contextSummary) {
    return -1;
  }

  return summarizedUpToSequence;
}
