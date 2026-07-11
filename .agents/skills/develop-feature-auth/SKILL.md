---
name: develop-feature-auth
description: >-
  Develop AgentX auth and user provisioning (login session, admin-only user
  create). Use when changing login UI, session cookies, or dashboard Users CRUD.
---

# Develop Feature: Auth & Users

## When to Use

- Changing login page / login form
- Touching session cookies, password hashing, or auth schemas
- Working on admin Users dashboard (create / edit / delete)
- Questions about how new accounts are provisioned

## Overview

Auth is email + password with a session cookie. Roles: `admin` | `client` | `guest`.
There is **no public Sign Up** — new users are created only by an admin from the dashboard.

## Key locations

| Area | Path |
|------|------|
| Login page | `app/login/page.tsx` |
| Login form | `components/auth/login-form.tsx` |
| Login API | `app/api/auth/login/route.ts` |
| Logout API | `app/api/auth/logout/route.ts` |
| Auth Zod | `lib/auth/schemas.ts` — `loginSchema` only |
| Session | `lib/auth/session.ts`, `lib/auth/get-session-user.ts` |
| Admin gate | `lib/auth/require-admin.ts` |
| Admin Users UI | `app/dashboard/users/`, `components/dashboard/users/` |
| Admin Users API | `app/api/admin/users/`, `app/api/admin/users/[id]/` |
| Admin Users repo | `lib/admin/users/repository.ts`, `lib/admin/users/schemas.ts` |

## Behavior agents must know

- Do **not** reintroduce `/api/auth/register` or a public register mode on the login form
- New accounts: admin creates via `POST /api/admin/users` (`createUserWithWhatsApp`)
- Login form is login-only; copy notes that accounts are admin-provisioned
- User-facing auth strings: Bahasa Indonesia
- Protected routes (`/chat`, `/dashboard`) gated in `middleware.ts`
