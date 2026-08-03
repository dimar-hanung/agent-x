## When to Use

Develop or extend AgentX Settings → Integrations (Google, Microsoft, WhatsApp channel pairing, WhatsApp pribadi, API keys / MCP). Use when changing connect/disconnect UI, OAuth callbacks, or destructive confirmation dialogs on this page.

## Overview

Integrations live under dashboard settings. Each provider is a card/row component. Connect flows differ (OAuth redirect, phone pairing, QR scan, API key create). Disconnect / remove / revoke actions must open an `AlertDialog` that names the object and consequence before mutating.

## Key locations

- Shell layout: `app/dashboard/settings/layout.tsx`, `components/settings/settings-category-nav.tsx`, `lib/settings/nav.ts`
- Integrasi page: `app/dashboard/settings/page.tsx`
- Legacy redirect: `app/settings/integrations/page.tsx` → `/dashboard/settings`
- Shared row chrome: `components/settings/integration-row.tsx`
- Cards:
  - `components/settings/google-integration-card.tsx`
  - `components/settings/microsoft-integration-card.tsx`
  - `components/settings/whatsapp-pairing-card.tsx` (channel phone pairing)
  - `components/settings/whatsapp-inbox-connect-card.tsx` (WhatsApp pribadi)
  - `components/settings/whatsapp-channel-card.tsx` (admin global channel)
  - `components/settings/api-key-integration-card.tsx` (MCP API keys — already has revoke confirm)
  - `components/settings/dual-provider-connect-warning-dialog.tsx`
- AlertDialog primitive: `components/ui/alert-dialog.tsx`
- APIs under `app/api/integrations/` and admin WhatsApp channel routes

## References

- (none)

## Behavior agents must know

- **Destructive confirms**: Putuskan / Hapus pairing / Cabut API key open `AlertDialog` — never fire DELETE on the row button click alone. Pattern matches memories/todos/files: open dialog → confirm runs action → `event.preventDefault()` on `AlertDialogAction` so the dialog stays open on failure.
- **Copy**: Title names the object (`Putuskan Google?`); description states consequence; confirm button repeats the verb (`Putuskan` / `Hapus pairing` / `Cabut`); cancel is `Batal`. Bahasa Indonesia.
- **Errors**: Disconnect/remove errors show inside the dialog (`role="alert"`), not only on the row.
- **API key revoke** already confirmed in `api-key-integration-card.tsx` — keep that pattern when extending.
- Provider-specific OAuth/tool details: see `develop-feature-microsoft` and WhatsApp inbox skill when touching those backends.

## Learned user preferences

- Disconnecting integrations requires an explicit confirmation modal (not one-click Putuskan/Hapus).

## Learned Workspace Facts

- Settings Integrations lists Google, Microsoft, WhatsApp channel, WhatsApp pribadi, and API Key / MCP in one stacked list.
