# Use Evolution as the Personal WhatsApp Message Source

Status: ready-for-agent

## Problem Statement

AgentX currently duplicates every message from each connected personal WhatsApp account into AgentX PostgreSQL. Evolution already persists those chats and messages in its own PostgreSQL database and exposes provider operations for finding chats and messages.

For busy direct messages and groups, synchronous webhook ingestion performs repeated database operations for every message. This duplicates sensitive content, increases webhook latency, creates avoidable storage and retention work, and risks timeouts during bursts. AgentX needs enough local state to identify active chats and create executive summaries, but it does not need to own a permanent raw-message archive.

## Solution

Evolution becomes the source of truth for personal WhatsApp chats and raw messages. Personal-instance webhooks retain only lightweight chat activity metadata and return quickly without storing message bodies.

When a user asks the Agent for a catch-up, requests a named-chat summary, or generates a dashboard digest, AgentX identifies relevant chats from local metadata and fetches a bounded message window from Evolution on demand. AgentX generates the requested summary and persists only the derived per-chat summary or digest snapshot.

The global WhatsApp channel remains separate and unchanged. Personal WhatsApp instances remain read-only and must never trigger automatic replies, typing indicators, or read receipts.

## User Stories

1. As a client, I want to connect my personal WhatsApp account by QR, so that AgentX can summarize my chats.
2. As a client, I want new WhatsApp activity to become available without manual synchronization, so that summaries stay useful.
3. As a client, I want AgentX not to retain a second permanent copy of every message body, so that less sensitive data is duplicated.
4. As a client with busy chats, I want webhook ingestion to remain responsive during bursts, so that events are not lost to timeouts.
5. As a client, I want a catch-up across recently active chats, so that I can see what needs attention.
6. As a client, I want to summarize a named person or group, so that I can focus on one conversation.
7. As a client, I want summaries to respect a requested time window, so that results match my question.
8. As a client, I want outbound messages included, so that summaries reflect both sides of a discussion.
9. As a client, I want group sender attribution preserved in summary input, so that participants are distinguishable.
10. As a client, I want digest snapshots saved in AgentX, so that I can revisit generated catch-ups.
11. As a client, I want every explicit digest request to create a fresh snapshot, so that snapshot history reflects each request.
12. As a client, I want a clear empty state when no recent messages exist, so that an empty result is understandable.
13. As a client, I want provider failures reported as failures, so that they are not mistaken for an empty inbox.
14. As a client, I want a reconnect instruction when my account is disconnected, so that I know how to restore access.
15. As a client, I want my contacts never to receive AgentX replies from my personal account, so that read-only connection is safe.
16. As an operator, I want one Evolution instance associated with each user, so that provider data remains isolated.
17. As an operator, I want webhook events resolved by instance name, so that activity cannot cross user boundaries.
18. As an operator, I want stale and rotated personal instances ignored safely, so that they cannot enter the global bot path.
19. As an operator, I want webhook writes limited to metadata, so that load does not scale with message-history size.
20. As an operator, I want repeated events to update one chat record idempotently, so that retries do not create duplicates.
21. As an operator, I want chat, message, time-window, transcript, and concurrency limits, so that large inboxes cannot overload either service.
22. As an operator, I want partial provider failures visible, so that incomplete digests are not presented as complete.
23. As an operator, I want existing summaries and snapshots retained, so that users do not lose derived work.
24. As an operator, I want obsolete raw AgentX message data removed deliberately, so that duplicate content does not remain indefinitely.
25. As an operator, I want metrics without message bodies, so that failures and latency can be diagnosed safely.
26. As a developer, I want personal WhatsApp reads to use the provider interface, so that summary logic does not depend on Evolution HTTP details.
27. As a developer, I want provider behavior replaceable in tests, so that flows can be verified without a live account.
28. As a developer, I want global channel behavior unchanged, so that the redesign does not affect bot conversations.

## Implementation Decisions

- Evolution is the source of truth for raw personal WhatsApp chats and messages.
- AgentX will stop persisting personal message text, sender details, and WhatsApp message IDs from live webhook events.
- The personal webhook will identify the user and upsert lightweight chat activity metadata: remote JID, display name when available, chat type, and last activity time.
- Personal webhook handling must not invoke the Agent, generate summaries, reply, send presence, or mark messages read.
- Only the currently configured global-channel instance may enter the bot path. Unknown, stale, and personal-prefixed instances remain silent.
- Initial connection synchronizes bounded chat metadata from Evolution instead of backfilling raw messages.
- The WhatsApp provider interface remains the boundary for listing chats and fetching messages. Summary services must not call Evolution endpoints directly.
- General digests select locally known chats active in the requested window and fetch bounded recent messages for those chats from Evolution.
- Named-chat summaries resolve a display name or remote JID from local metadata and fetch only that chat.
- Provider reads have configurable limits for chats, messages per chat, transcript characters, and concurrent requests.
- Provider failure is distinguishable from a valid empty result and produces a concise Indonesian error.
- Digest generation continues to batch transcripts and persists one new snapshot per explicit request. Existing snapshots are historical records, not a cache returned in place of regeneration.
- Per-chat summaries and digest snapshots remain in AgentX as derived records.
- Existing chat records may be reshaped into the activity index when they contain the required ownership and chat identity fields.
- The raw personal-message table and write paths are removed only after the on-demand path is verified. Migration order preserves summary relationships and snapshots.
- Existing raw rows are not migrated into another AgentX archive; removal is documented as a privacy and storage change.
- No cron job or automatic per-message summary is introduced.
- QR pairing, per-user Evolution instance ownership, and Settings behavior remain unchanged.
- Global-channel phone pairing, inbound Agent processing, and outbound replies remain unchanged.
- Metrics cover webhook counts, metadata failures, Evolution read latency, fetched chat/message counts, partial failures, and digest duration without logging content.

## Testing Decisions

- Use one high-level seam: webhook and summary application services receive a fake WhatsApp provider implementing the provider contract.
- Test observable records, provider calls, results, and outbound side effects rather than private helpers.
- Verify a personal webhook updates chat activity without inserting a raw message body.
- Verify repeated events for one user and remote JID update one activity record.
- Verify personal, stale, and unknown instances never invoke the Agent or outbound WhatsApp operations.
- Verify the configured global channel retains its Agent reply behavior.
- Verify first connection synchronizes bounded chat metadata without storing message history.
- Verify a general digest fetches only chats active in the requested window.
- Verify named-chat summarization fetches only the selected chat.
- Verify chat, message, window, transcript, and concurrency bounds through provider calls.
- Verify inbound and outbound messages and group sender attribution reach summary input.
- Verify Evolution failures do not masquerade as an empty inbox.
- Verify an empty provider result produces the established no-recent-messages response.
- Verify every explicit digest request persists a new snapshot and retains earlier snapshots.
- Verify existing summaries and snapshots remain accessible after raw-message schema removal.
- Prefer integration tests at the application-service seam. Separate provider adapter contract tests may validate Evolution response parsing.

## Out of Scope

- Replacing Evolution or reading its PostgreSQL database directly.
- Adding a queue for copying raw messages.
- Periodic cron-based personal WhatsApp summaries.
- Automatic summaries for incoming messages.
- Sending messages, reactions, receipts, or presence from personal instances.
- Changing the global WhatsApp bot channel.
- Changing QR pairing or instance ownership.
- Storing media, attachments, voice notes, images, or complete webhook payloads in AgentX.
- Guaranteeing access to messages Evolution has deleted or no longer returns.
- Returning an old digest instead of generating a new snapshot on an explicit request.

## Further Notes

- The deployed Evolution service already uses its own PostgreSQL database and persistent volume.
- Before raw-message removal, verify Evolution retention and what happens to chats when an instance is disconnected, deleted, or rotated.
- If Evolution retention is insufficient, specify a short rolling cache with strict retention instead of restoring indefinite duplication.
- Roll out in stages: add metadata-only and on-demand reads, verify behavior and metrics, stop raw writes, then remove obsolete raw data and schema.
