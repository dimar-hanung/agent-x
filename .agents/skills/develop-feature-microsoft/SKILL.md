## When to Use

Develop or extend AgentX Microsoft OAuth integration (Outlook Mail, Calendar, OneDrive), Graph API clients, AI tools, and Settings connect/disconnect UI.

## Overview

Microsoft integration mirrors the Google stack: one OAuth connection per user stored in `user_integrations` with `provider = "microsoft"`. Eight parallel AI tools call Microsoft Graph via native `fetch` (no `@microsoft/microsoft-graph-client`).

Users may connect both Google and Microsoft; Settings shows a warning modal when connecting the second provider.

## Key locations

- OAuth: `lib/microsoft/oauth.ts`, `lib/microsoft/token.ts`
- Repository: `lib/integrations/microsoft-repository.ts` (`MICROSOFT_PROVIDER = "microsoft"`)
- Graph helper: `lib/microsoft/graph-fetch.ts`
- API clients: `lib/microsoft/outlook/client.ts`, `lib/microsoft/calendar/client.ts`, `lib/microsoft/onedrive/client.ts`
- API routes: `app/api/integrations/microsoft/{authorize,callback,route.ts}`
- AI tools: `lib/ai/tools/send-microsoft-email/`, `search-microsoft-inbox/`, `read-microsoft-email/`, `list-microsoft-calendar-events/`, `create-microsoft-calendar-event/`, `search-onedrive/`, `read-onedrive-file/`, `upload-onedrive-file/`
- Tool constant: `lib/ai/tools/microsoft/constants.ts` (`MICROSOFT_NOT_CONNECTED_MESSAGE`)
- Settings UI: `components/settings/microsoft-integration-card.tsx`, `components/settings/dual-provider-connect-warning-dialog.tsx`
- System prompt: `lib/ai/chat-config.ts` (`PROMPT_MICROSOFT`)

## References

- (none)

## Behavior agents must know

- **Scopes** (delegated): `openid`, `profile`, `email`, `offline_access`, `User.Read`, `Mail.ReadWrite`, `Calendars.ReadWrite`, `Files.ReadWrite`
- **OAuth endpoints**: `https://login.microsoftonline.com/common/oauth2/v2.0/{authorize,token}` with tenant `common`
- **State cookie**: `agentx_microsoft_oauth_state` (10 min, httpOnly)
- **Callback redirect**: `/dashboard/settings?microsoft=connected|denied|invalid_state|unauthorized|error`
- **Token refresh**: `getValidMicrosoftAccessToken` in `lib/microsoft/token.ts` — 60s skew before expiry
- **Disconnect**: `DELETE /api/integrations/microsoft` — hard delete row; no Microsoft revoke endpoint
- **Google vs Microsoft tools**: Google tools (`send_email`, etc.) only use Google; Microsoft tools (`send_microsoft_email`, etc.) only use Microsoft. System prompt instructs model to pick the right set.
- **Dual-provider warning**: When connecting Google while Microsoft is active (or vice versa), `DualProviderConnectWarningDialog` warns but allows continue.
- **Azure prerequisite**: App Registration in Microsoft Entra → Web redirect URI = `MICROSOFT_REDIRECT_URI` → delegated permissions above → client secret → env vars `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`
- **Env**: Reuse `INTEGRATIONS_ENCRYPTION_KEY` and `AGENTX_PUBLIC_URL`
- **No schema migration**: Reuses `user_integrations` table (same as Google)

## Learned user preferences

- (none)

## Learned Workspace Facts

- AgentX private file storage (`list_files` / `upload_file` / `read_file`) is SeaweedFS — not OneDrive or Google Drive.
