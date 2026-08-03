---
name: develop-feature-settings
description: >-
  Develop AgentX unified Pengaturan shell (Integrasi, Model, Channel WhatsApp).
  Use when changing settings layout, category nav, routes, or role-gated settings
  pages under /dashboard/settings.
---

## When to Use

- Changing the unified Pengaturan page shell or category navigation
- Adding a new settings category under `/dashboard/settings`
- Updating redirects from legacy settings routes
- Deciding where admin-only vs all-user settings belong

## Key locations

| Area | Path |
|------|------|
| Route constants | `lib/site-config.ts` (`settings`, `settingsModel`, `settingsWhatsappChannel`) |
| Category config | `lib/settings/nav.ts` |
| Settings layout (header + two-pane shell) | `app/dashboard/settings/layout.tsx` |
| Category nav (desktop left / mobile strip) | `components/settings/settings-category-nav.tsx` |
| Integrasi (default) | `app/dashboard/settings/page.tsx` |
| Model (admin) | `app/dashboard/settings/model/page.tsx` |
| Channel WhatsApp (admin) | `app/dashboard/settings/whatsapp-channel/page.tsx` |
| Legacy redirects | `app/dashboard/model-settings/page.tsx`, `app/dashboard/whatsapp-channel/page.tsx` |
| Main sidebar entry | `components/dashboard/app-sidebar.tsx` — single **Pengaturan** item |

## References

- (none)

## Learned user preferences

- (none)

## Behavior agents must know

- **One sidebar item:** Main nav shows **Pengaturan** only — not separate Integrations / Pengaturan Model / Channel WhatsApp entries.
- **Cursor-like shell:** Layout provides shared breadcrumb + left category nav (~260px on `md+`) + right content pane. Mobile uses horizontal scrollable category strip.
- **Categories:** Integrasi (all users), Model (admin), Channel WhatsApp (admin). Config lives in `lib/settings/nav.ts`; filter with `getSettingsCategoriesForRole`.
- **Admin gate:** Non-admin visiting `/dashboard/settings/model` or `/dashboard/settings/whatsapp-channel` redirects to `/dashboard/settings` (Integrasi).
- **Legacy URLs:** `/dashboard/model-settings` → `/dashboard/settings/model`; `/dashboard/whatsapp-channel` → `/dashboard/settings/whatsapp-channel`.
- **OAuth callbacks:** Google/Microsoft still redirect to `/dashboard/settings` (Integrasi). Do not change unless updating integration cards too.
- **Profil** stays in `NavUser` avatar menu. **Kelola User** stays a separate admin sidebar item.
- **Surface rules:** Do not nest `surface-panel` inside another `surface-panel`. Integrasi list and `ModelSettingsCard` each own their panel; the layout shell does not wrap content in an extra panel.

## Learned Workspace Facts

- Integrations cards: `components/settings/*` — see `develop-feature-integrations`
- Model card: `components/dashboard/model-settings-card.tsx` — see `develop-feature-model-settings`
- WhatsApp channel card: `components/settings/whatsapp-channel-card.tsx`
