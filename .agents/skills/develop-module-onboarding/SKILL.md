## When to Use

- Adding or changing client onboarding flow, Panduan page content, or completion tracking
- Changing first-login redirect behavior for client role
- Adding new onboarding steps or sidebar Panduan menu visibility

## Key locations

| Area | Path |
|------|------|
| Step content (single source of truth) | `lib/onboarding/steps.ts` |
| Completion DB write | `lib/onboarding/repository.ts` |
| Complete API | `app/api/onboarding/complete/route.ts` |
| Panduan page | `app/dashboard/panduan/page.tsx` |
| Panduan UI (scroll + checklist) | `components/dashboard/panduan/panduan-workspace.tsx` |
| Sidebar menu (client-only) | `components/dashboard/app-sidebar.tsx` |
| Layout guards | None — all routes stay accessible before completion |
| Login redirect | `app/api/auth/login/route.ts`, `components/auth/login-form.tsx` |
| Schema column | `users.onboarding_completed_at` in `lib/db/schema.ts` |
| Route constant | `appRoutes.panduan` in `lib/site-config.ts` |

## References

- (none)

## Learned user preferences

- Onboarding is client-only; admin and guest are excluded from menu.
- Format: scroll sections with sticky checklist sidebar (desktop) and progress bar; not a modal wizard.
- Panduan is optional: Chat, Dashboard, and other features stay accessible until the client chooses **Selesaikan panduan**.

## Learned Workspace Facts

- `UserContext.onboardingCompletedAt` is ISO string or `null`; loaded via `getUserById`.
- Existing users were backfilled on migration `0022_user_onboarding_completed.sql`; only new clients with `NULL` are treated as not completed (for UI state only, not route blocking).
- WhatsApp credential message on admin user create (`lib/admin/users/onboarding-messages.ts`) is separate from in-app Panduan.
- Panduan menu uses `BookOpen` icon, placed before Pengaturan, visible only when `role === "client"`.
